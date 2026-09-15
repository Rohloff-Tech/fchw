const express = require('express');
const datastore = require('../datastore');
const alerts = require('../alerts');
const router = express.Router();

router.get('/', (_req, res) => {
    const rows = [];
    for (const c of datastore.getAll()) {
        for (const a of (c.alerts || [])) {
            rows.push({ callId: c.callId, startTime: c.startTime, callType: c.callType, participants: c.participants.slice(0, 2).map(p => p.name), ...a });
        }
    }
    res.json({ count: rows.length, alerts: rows });
});

router.get('/thresholds', (_req, res) => res.json(datastore.getThresholds()));

router.put('/thresholds', async (req, res) => {
    const next = await datastore.setThresholds(req.body || {});
    alerts.recomputeAll(datastore.getAll(), next);
    await datastore.replaceAll(datastore.getAll());
    res.json(next);
});

module.exports = router;
