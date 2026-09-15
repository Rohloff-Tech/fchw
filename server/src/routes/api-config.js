const express = require('express');
const sharepoint = require('../sharepoint');
const datastore = require('../datastore');
const router = express.Router();

router.get('/', (_req, res) => {
    res.json({
        sharepoint: sharepoint.getStatus(),
        thresholds: datastore.getThresholds(),
        appName: process.env.APP_NAME || 'Teams Call Quality Monitor',
        organizationName: process.env.ORG_NAME || 'Contoso',
        callCount: datastore.getCallCount()
    });
});

module.exports = router;
