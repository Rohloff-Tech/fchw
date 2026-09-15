const express = require('express');
const multer = require('multer');
const sharepoint = require('../sharepoint');
const datastore = require('../datastore');
const router = express.Router();

const upload = multer({ limits: { fileSize: 200 * 1024 * 1024 } });

function requireConfigured(req, res, next) {
    if (!sharepoint.isConfigured()) return res.status(400).json({ error: 'SharePoint is not configured. Set SHAREPOINT_SITE_URL and Azure AD credentials in environment.' });
    next();
}

router.get('/status', (_req, res) => res.json(sharepoint.getStatus()));

router.get('/files', requireConfigured, async (req, res, next) => {
    try {
        const items = await sharepoint.listFiles(req.query.subfolder || '');
        res.json({ items });
    } catch (err) { next(err); }
});

router.post('/upload', requireConfigured, upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const uploaded = await sharepoint.uploadFile(req.file.originalname, req.file.buffer, req.file.mimetype);
        await datastore.audit('sharepoint.upload', { file: req.file.originalname, size: req.file.size });
        res.json({ ok: true, ...uploaded });
    } catch (err) { next(err); }
});

router.get('/download/:filename', requireConfigured, async (req, res, next) => {
    try {
        const result = await sharepoint.downloadFile(req.params.filename);
        res.setHeader('Content-Type', result.contentType || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${result.name}"`);
        res.send(result.buffer);
    } catch (err) { next(err); }
});

router.post('/pull', requireConfigured, async (req, res, next) => {
    try {
        const filename = req.body?.filename;
        if (!filename) return res.status(400).json({ error: 'filename required' });
        const file = await sharepoint.downloadFile(filename);
        const { parse } = require('csv-parse/sync');
        const alerts = require('../alerts');
        const rows = parse(file.buffer, { columns: true, skip_empty_lines: true, trim: true });
        const thresholds = datastore.getThresholds();
        const imported = rows.map((row, idx) => {
            const start = new Date(row.StartTime || Date.now());
            const duration = parseInt(row.Duration || 60);
            const c = {
                callId: row.CallID || `SP-${Date.now()}-${idx}`, startTime: start, endTime: new Date(start.getTime() + duration * 1000), duration,
                callType: row.CallType || 'audio', modality: (row.Modality || 'audio').split('|'),
                isConference: parseInt(row.ParticipantCount || 2) >= 3, participantCount: parseInt(row.ParticipantCount) || 2,
                participants: [{ name: 'SharePoint Import', email: row.OrganizerEmail || 'sp@contoso.com', department: row.OrganizerDept || 'Unknown', location: row.OrganizerLocation || 'Unknown', role: 'organizer' }],
                network: { jitter: parseFloat(row.Jitter) || 0, packetLoss: parseFloat(row.PacketLoss) || 0, roundTripTime: parseFloat(row.RTT) || 0, bandwidthEstimate: parseFloat(row.Bandwidth) || 1000, subnet: row.Subnet || '10.0.0.0/24', networkType: row.NetworkType || 'wifi', vpnUsed: row.VPN === 'Yes' },
                audio: { mosScore: parseFloat(row.MOS) || 4.0, echoPercentage: 0.5, noiseSuppression: true, audioCodec: row.AudioCodec || 'SILK', speakerDevice: row.Headset || 'Unknown', micDevice: row.Headset || 'Unknown' },
                video: row.Camera ? { resolutionSend: '1280x720', resolutionRecv: '1280x720', frameRateSend: 25, frameRateRecv: 25, freezeCount: 0, freezeDuration: 0, cameraDevice: row.Camera, videoCodec: row.VideoCodec || 'H264' } : null,
                device: { os: row.OS || 'Windows 11', teamsVersion: row.TeamsVersion || 'sp', clientType: row.ClientType || 'desktop', headset: row.Headset || 'Unknown', camera: row.Camera || null, driver: 'sp', firmwareVersion: 'sp' },
                qualityRating: row.QualityRating || 'good', qualityScore: 80, timelineSegments: [], alerts: []
            };
            c.alerts = alerts.computeForCall(c, thresholds);
            return c;
        });
        await datastore.replaceAll(imported);
        await datastore.audit('sharepoint.pull', { filename, count: imported.length });
        res.json({ ok: true, count: imported.length });
    } catch (err) { next(err); }
});

router.delete('/files/:filename', requireConfigured, async (req, res, next) => {
    try {
        await sharepoint.deleteFile(req.params.filename);
        await datastore.audit('sharepoint.delete', { file: req.params.filename });
        res.json({ ok: true });
    } catch (err) { next(err); }
});

module.exports = router;
