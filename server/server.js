/**
 * Microsoft Teams Call Quality Monitor - Server Edition
 *
 * Node.js/Express server that serves the dashboard, persists call data,
 * computes alerts, and optionally mirrors reports & logs to a SharePoint site.
 *
 * Deployment: any Node.js host (Azure App Service Linux, Docker, on-prem).
 * See README-SERVER.md for setup instructions.
 */
require('dotenv').config();
const express = require('express');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const datastore = require('./src/datastore');
const alerts = require('./src/alerts');

const callsRoute = require('./src/routes/api-calls');
const alertsRoute = require('./src/routes/api-alerts');
const sharepointRoute = require('./src/routes/api-sharepoint');
const exportRoute = require('./src/routes/api-export');
const configRoute = require('./src/routes/api-config');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const app = express();

app.set('trust proxy', 1);
app.use(helmet({
    contentSecurityPolicy: {
        useDefaults: true,
        directives: {
            "default-src": ["'self'"],
            "script-src": ["'self'", "https://cdnjs.cloudflare.com", "'unsafe-inline'"],
            "style-src": ["'self'", "https://fonts.googleapis.com", "'unsafe-inline'"],
            "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
            "img-src": ["'self'", "data:", "blob:"],
            "connect-src": ["'self'"]
        }
    }
}));
app.use(compression());
app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
app.use('/api', apiLimiter);

app.use(express.static(path.join(__dirname, 'public'), { maxAge: process.env.NODE_ENV === 'production' ? '5m' : 0, etag: true }));

app.use('/api/calls', callsRoute);
app.use('/api/alerts', alertsRoute);
app.use('/api/sharepoint', sharepointRoute);
app.use('/api/export', exportRoute);
app.use('/api/config', configRoute);

app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        version: require('./package.json').version,
        callCount: datastore.getCallCount(),
        sharepointConfigured: Boolean(process.env.SHAREPOINT_SITE_URL && process.env.AZURE_CLIENT_ID),
        node: process.version,
        uptime: Math.round(process.uptime())
    });
});

app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.use((err, _req, res, _next) => {
    console.error('[error]', err.stack || err);
    res.status(err.status || 500).json({ error: err.message || 'Internal server error', code: err.code });
});

async function bootstrap() {
    console.log('[boot] loading datastore...');
    await datastore.init();
    if (datastore.getCallCount() === 0 && process.env.SEED_ON_EMPTY !== 'false') {
        console.log('[boot] datastore empty, seeding with demo data...');
        const seed = require('./src/demo-data');
        const records = seed.generate(parseInt(process.env.SEED_COUNT || '650'));
        await datastore.replaceAll(records);
    }
    alerts.recomputeAll(datastore.getAll(), datastore.getThresholds());
    console.log(`[boot] ${datastore.getCallCount()} call records loaded`);

    app.listen(PORT, HOST, () => {
        console.log(`[boot] Teams Call Quality Monitor listening on http://${HOST}:${PORT}`);
        if (process.env.SHAREPOINT_SITE_URL) {
            console.log(`[boot] SharePoint integration enabled: ${process.env.SHAREPOINT_SITE_URL}`);
        } else {
            console.log('[boot] SharePoint integration disabled (set SHAREPOINT_SITE_URL to enable)');
        }
    });
}

process.on('SIGTERM', () => { console.log('[shutdown] SIGTERM'); process.exit(0); });
process.on('SIGINT', () => { console.log('[shutdown] SIGINT'); process.exit(0); });
process.on('unhandledRejection', (r) => console.error('[unhandled rejection]', r));

bootstrap().catch(err => { console.error('[boot failed]', err); process.exit(1); });
