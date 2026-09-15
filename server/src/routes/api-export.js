const express = require('express');
const multer = require('multer');
const { stringify } = require('csv-stringify/sync');
const { parse } = require('csv-parse/sync');
const datastore = require('../datastore');
const alerts = require('../alerts');
const sharepoint = require('../sharepoint');
const router = express.Router();

const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } });

function callsToCsv(calls) {
    const records = calls.map(c => {
        const org = c.participants[0] || {};
        return {
            CallID: c.callId, StartTime: new Date(c.startTime).toISOString(), EndTime: new Date(c.endTime).toISOString(),
            Duration: c.duration, CallType: c.callType, ParticipantCount: c.participantCount,
            Modality: (c.modality || []).join('|'), QualityRating: c.qualityRating,
            MOS: c.audio.mosScore.toFixed(2), Jitter: c.network.jitter.toFixed(1),
            PacketLoss: c.network.packetLoss.toFixed(2), RTT: Math.round(c.network.roundTripTime),
            Bandwidth: Math.round(c.network.bandwidthEstimate), Subnet: c.network.subnet,
            NetworkType: c.network.networkType, VPN: c.network.vpnUsed ? 'Yes' : 'No',
            AudioCodec: c.audio.audioCodec, Headset: c.audio.speakerDevice,
            Camera: c.video ? c.video.cameraDevice : '', VideoCodec: c.video ? c.video.videoCodec : '',
            ResolutionSend: c.video ? c.video.resolutionSend : '', FrameRateSend: c.video ? c.video.frameRateSend : '',
            FreezeCount: c.video ? c.video.freezeCount : '', ClientType: c.device.clientType, OS: c.device.os,
            TeamsVersion: c.device.teamsVersion, OrganizerEmail: org.email || '',
            OrganizerDept: org.department || '', OrganizerLocation: org.location || '', AlertCount: (c.alerts || []).length
        };
    });
    return stringify(records, { header: true });
}

function filterCalls(query) {
    let calls = datastore.getAll();
    if (query.quality) { const arr = String(query.quality).split(','); calls = calls.filter(c => arr.includes(c.qualityRating)); }
    if (query.callType) { const arr = String(query.callType).split(','); calls = calls.filter(c => arr.includes(c.callType)); }
    if (query.from) { const from = new Date(query.from); calls = calls.filter(c => new Date(c.startTime) >= from); }
    if (query.to) { const to = new Date(query.to); calls = calls.filter(c => new Date(c.startTime) <= to); }
    if (query.q) { const q = String(query.q).toLowerCase(); calls = calls.filter(c => { const h = `${c.callId} ${c.network.subnet} ${c.device.headset} ${c.participants.map(p => p.name + ' ' + p.email + ' ' + p.department).join(' ')}`.toLowerCase(); return h.includes(q); }); }
    return calls;
}

router.get('/csv', (req, res) => {
    const calls = filterCalls(req.query);
    const csv = callsToCsv(calls);
    const filename = `teams-call-quality-${new Date().toISOString().slice(0,10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
});

router.get('/json', (req, res) => {
    const calls = filterCalls(req.query);
    res.setHeader('Content-Disposition', 'attachment; filename="teams-call-quality.json"');
    res.json({ exportedAt: new Date().toISOString(), count: calls.length, calls });
});

router.post('/sharepoint', async (req, res, next) => {
    try {
        if (!sharepoint.isConfigured()) return res.status(400).json({ error: 'SharePoint is not configured' });
        const calls = filterCalls(req.body || {});
        const csv = callsToCsv(calls);
        const filename = (req.body?.filename) || `teams-call-quality-${new Date().toISOString().replace(/[:.]/g,'-').slice(0,19)}.csv`;
        const uploaded = await sharepoint.uploadFile(filename, Buffer.from(csv, 'utf8'), 'text/csv');
        await datastore.audit('export.sharepoint', { filename, count: calls.length, item: uploaded });
        res.json({ ok: true, count: calls.length, filename, sharepoint: uploaded });
    } catch (err) { next(err); }
});

router.post('/report', async (req, res, next) => {
    try {
        const calls = filterCalls(req.body?.filter || {});
        const total = calls.length;
        const avgMos = calls.reduce((s, c) => s + c.audio.mosScore, 0) / (total || 1);
        const poor = calls.filter(c => c.qualityRating === 'poor').length;
        const now = new Date();
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Teams Call Quality Report</title>
<style>body{font-family:'Segoe UI',Arial;padding:32px;color:#242424}h1{color:#6264A7}table{border-collapse:collapse;width:100%}th,td{border:1px solid #E1DFDD;padding:6px 10px;font-size:12px;text-align:left}th{background:#6264A7;color:white}</style></head>
<body><h1>Teams Call Quality Report</h1>
<p>Generated ${now.toISOString()} &middot; ${total.toLocaleString()} calls</p>
<h3>Summary</h3><ul>
<li>Total calls: ${total}</li>
<li>Average MOS: ${avgMos.toFixed(2)}</li>
<li>Poor-quality calls: ${poor} (${((poor/(total||1))*100).toFixed(1)}%)</li>
</ul>
<h3>Sample rows (first 100)</h3>
<table><tr><th>Call ID</th><th>Start</th><th>Duration</th><th>Type</th><th>MOS</th><th>Jitter</th><th>Loss%</th><th>RTT</th><th>Quality</th></tr>
${calls.slice(0,100).map(c => `<tr><td>${c.callId}</td><td>${new Date(c.startTime).toISOString().slice(0,16).replace('T',' ')}</td><td>${c.duration}s</td><td>${c.callType}</td><td>${c.audio.mosScore.toFixed(2)}</td><td>${c.network.jitter.toFixed(1)}ms</td><td>${c.network.packetLoss.toFixed(2)}%</td><td>${Math.round(c.network.roundTripTime)}ms</td><td>${c.qualityRating}</td></tr>`).join('')}
</table></body></html>`;
        const filename = req.body?.filename || `teams-cq-report-${now.toISOString().replace(/[:.]/g,'-').slice(0,19)}.html`;
        if (req.body?.uploadToSharePoint && sharepoint.isConfigured()) {
            const up = await sharepoint.uploadFile(filename, Buffer.from(html, 'utf8'), 'text/html');
            return res.json({ ok: true, filename, sharepoint: up });
        }
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(html);
    } catch (err) { next(err); }
});

router.post('/import', upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const rows = parse(req.file.buffer, { columns: true, skip_empty_lines: true, trim: true });
        const thresholds = datastore.getThresholds();
        const imported = rows.map((row, idx) => {
            const start = new Date(row.StartTime || row.startTime || Date.now());
            const duration = parseInt(row.Duration || row.duration || 60);
            const c = {
                callId: row.CallID || row.callId || `IMPORT-${Date.now()}-${idx}`,
                startTime: start, endTime: new Date(start.getTime() + duration * 1000), duration,
                callType: row.CallType || 'audio', modality: (row.Modality || 'audio').split('|'),
                isConference: parseInt(row.ParticipantCount || 2) >= 3,
                participantCount: parseInt(row.ParticipantCount) || 2,
                participants: [{ name: 'Imported User', email: row.OrganizerEmail || 'imported@contoso.com', department: row.OrganizerDept || 'Unknown', location: row.OrganizerLocation || 'Unknown', role: 'organizer' }],
                network: { jitter: parseFloat(row.Jitter) || 0, packetLoss: parseFloat(row.PacketLoss) || 0, roundTripTime: parseFloat(row.RTT) || 0, bandwidthEstimate: parseFloat(row.Bandwidth) || 1000, subnet: row.Subnet || '10.0.0.0/24', networkType: row.NetworkType || 'wifi', vpnUsed: row.VPN === 'Yes' },
                audio: { mosScore: parseFloat(row.MOS) || 4.0, echoPercentage: 0.5, noiseSuppression: true, audioCodec: row.AudioCodec || 'SILK', speakerDevice: row.Headset || 'Unknown', micDevice: row.Headset || 'Unknown' },
                video: row.Camera ? { resolutionSend: row.ResolutionSend || '1280x720', resolutionRecv: row.ResolutionSend || '1280x720', frameRateSend: parseInt(row.FrameRateSend) || 25, frameRateRecv: parseInt(row.FrameRateSend) || 25, freezeCount: parseInt(row.FreezeCount) || 0, freezeDuration: 0, cameraDevice: row.Camera, videoCodec: row.VideoCodec || 'H264' } : null,
                device: { os: row.OS || 'Windows 11', teamsVersion: row.TeamsVersion || 'imported', clientType: row.ClientType || 'desktop', headset: row.Headset || 'Unknown', camera: row.Camera || null, driver: 'imported', firmwareVersion: 'imported' },
                qualityRating: row.QualityRating || 'good', qualityScore: 80, timelineSegments: [], alerts: []
            };
            c.alerts = alerts.computeForCall(c, thresholds);
            return c;
        });
        await datastore.replaceAll(imported);
        res.json({ ok: true, count: imported.length });
    } catch (err) { next(err); }
});

module.exports = router;
