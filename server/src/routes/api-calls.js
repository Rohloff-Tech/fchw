const express = require('express');
const datastore = require('../datastore');
const alerts = require('../alerts');
const router = express.Router();

router.get('/', (_req, res) => {
    res.json({ count: datastore.getCallCount(), thresholds: datastore.getThresholds(), calls: datastore.getAll() });
});

router.get('/:id', (req, res) => {
    const call = datastore.getById(req.params.id);
    if (!call) return res.status(404).json({ error: 'Call not found' });
    res.json(call);
});

router.post('/', async (req, res) => {
    const body = req.body;
    const records = Array.isArray(body) ? body : (Array.isArray(body.calls) ? body.calls : null);
    if (!records) return res.status(400).json({ error: 'Body must be an array or { calls: [...] }' });
    const thresholds = datastore.getThresholds();
    for (const c of records) {
        if (typeof c.startTime === 'string') c.startTime = new Date(c.startTime);
        if (typeof c.endTime === 'string') c.endTime = new Date(c.endTime);
        c.alerts = alerts.computeForCall(c, thresholds);
    }
    await datastore.append(records);
    res.status(201).json({ inserted: records.length, total: datastore.getCallCount() });
});

router.post('/replace', async (req, res) => {
    const body = req.body;
    const records = Array.isArray(body) ? body : (Array.isArray(body.calls) ? body.calls : null);
    if (!records) return res.status(400).json({ error: 'Body must be an array or { calls: [...] }' });
    const thresholds = datastore.getThresholds();
    for (const c of records) {
        if (typeof c.startTime === 'string') c.startTime = new Date(c.startTime);
        if (typeof c.endTime === 'string') c.endTime = new Date(c.endTime);
        c.alerts = alerts.computeForCall(c, thresholds);
    }
    await datastore.replaceAll(records);
    res.json({ count: records.length });
});

router.post('/regenerate', async (req, res) => {
    const count = Math.min(parseInt(req.body?.count) || 650, 5000);
    const seed = require('../demo-data');
    const records = seed.generate(count);
    const thresholds = datastore.getThresholds();
    for (const c of records) c.alerts = alerts.computeForCall(c, thresholds);
    await datastore.replaceAll(records);
    res.json({ count: records.length });
});

module.exports = router;
