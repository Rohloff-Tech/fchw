/**
 * File-based JSON datastore for call records and configuration.
 * For production scale, swap this out for a proper database (Cosmos DB, Postgres, etc.)
 * without touching the route layer -- the exported API is stable.
 */
const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const CALLS_FILE = path.join(DATA_DIR, 'calls.json');
const THRESHOLDS_FILE = path.join(DATA_DIR, 'thresholds.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit.log');

const DEFAULT_THRESHOLDS = { mosMin: 3.5, jitterMax: 30, packetLossMax: 5.0, rttMax: 200, freezeMax: 3 };

let calls = [];
let thresholds = { ...DEFAULT_THRESHOLDS };
let writeQueue = Promise.resolve();

async function ensureDataDir() { await fs.mkdir(DATA_DIR, { recursive: true }); }

async function init() {
    await ensureDataDir();
    try {
        const raw = await fs.readFile(CALLS_FILE, 'utf8');
        calls = JSON.parse(raw, dateReviver);
    } catch (e) {
        if (e.code !== 'ENOENT') throw e;
        calls = [];
    }
    try {
        const raw = await fs.readFile(THRESHOLDS_FILE, 'utf8');
        thresholds = { ...DEFAULT_THRESHOLDS, ...JSON.parse(raw) };
    } catch (e) {
        if (e.code !== 'ENOENT') throw e;
        thresholds = { ...DEFAULT_THRESHOLDS };
    }
}

function dateReviver(_key, value) {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
        const d = new Date(value);
        if (!isNaN(d)) return d;
    }
    return value;
}

async function persistCalls() {
    writeQueue = writeQueue.then(async () => {
        await ensureDataDir();
        const tmp = CALLS_FILE + '.tmp';
        await fs.writeFile(tmp, JSON.stringify(calls), 'utf8');
        await fs.rename(tmp, CALLS_FILE);
    });
    return writeQueue;
}

async function persistThresholds() {
    await ensureDataDir();
    await fs.writeFile(THRESHOLDS_FILE, JSON.stringify(thresholds, null, 2), 'utf8');
}

async function audit(action, details) {
    try {
        await ensureDataDir();
        const line = JSON.stringify({ ts: new Date().toISOString(), action, ...details }) + '\n';
        await fs.appendFile(AUDIT_FILE, line, 'utf8');
    } catch (e) { console.warn('[audit] failed:', e.message); }
}

function getAll() { return calls; }
function getCallCount() { return calls.length; }
function getById(callId) { return calls.find(c => c.callId === callId); }

async function replaceAll(records) { calls = records; await persistCalls(); await audit('replaceAll', { count: records.length }); }
async function append(records) { calls = calls.concat(records); await persistCalls(); await audit('append', { count: records.length, total: calls.length }); }
function getThresholds() { return { ...thresholds }; }
async function setThresholds(next) { thresholds = { ...thresholds, ...next }; await persistThresholds(); await audit('setThresholds', thresholds); return thresholds; }

module.exports = { init, getAll, getCallCount, getById, replaceAll, append, getThresholds, setThresholds, audit, DATA_DIR };
