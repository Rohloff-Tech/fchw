/**
 * SharePoint integration via Microsoft Graph API.
 * Uses MSAL client credentials flow (app-only auth).
 */
require('isomorphic-fetch');
const { ConfidentialClientApplication } = require('@azure/msal-node');
const { Client } = require('@microsoft/microsoft-graph-client');

const state = { msal: null, graph: null, siteId: null, driveId: null, folderPath: null, initialized: false, initError: null };

function isConfigured() {
    return !!(process.env.SHAREPOINT_SITE_URL && process.env.AZURE_TENANT_ID && process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET);
}

function parseSiteUrl(url) {
    const m = url.match(/^https?:\/\/([^/]+)\/(sites|teams)\/([^/?#]+)/i);
    if (!m) throw new Error('SHAREPOINT_SITE_URL must be like https://tenant.sharepoint.com/sites/SiteName');
    return { hostname: m[1], sitePath: `/${m[2]}/${m[3]}` };
}

async function initClients() {
    if (!isConfigured()) throw new Error('SharePoint is not configured');
    state.msal = new ConfidentialClientApplication({
        auth: { clientId: process.env.AZURE_CLIENT_ID, authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`, clientSecret: process.env.AZURE_CLIENT_SECRET }
    });
    state.graph = Client.initWithMiddleware({
        authProvider: {
            getAccessToken: async () => {
                const result = await state.msal.acquireTokenByClientCredential({ scopes: ['https://graph.microsoft.com/.default'] });
                if (!result || !result.accessToken) throw new Error('Failed to acquire Graph token');
                return result.accessToken;
            }
        }
    });
    const { hostname, sitePath } = parseSiteUrl(process.env.SHAREPOINT_SITE_URL);
    const site = await state.graph.api(`/sites/${hostname}:${sitePath}`).get();
    state.siteId = site.id;
    if (process.env.SHAREPOINT_DRIVE_NAME) {
        const drives = await state.graph.api(`/sites/${state.siteId}/drives`).get();
        const match = drives.value.find(d => d.name === process.env.SHAREPOINT_DRIVE_NAME);
        if (!match) throw new Error(`SharePoint drive '${process.env.SHAREPOINT_DRIVE_NAME}' not found`);
        state.driveId = match.id;
    } else {
        const drive = await state.graph.api(`/sites/${state.siteId}/drive`).get();
        state.driveId = drive.id;
    }
    state.folderPath = (process.env.SHAREPOINT_FOLDER_PATH || '/TeamsCQM').replace(/^\/+|\/+$/g, '');
    await ensureFolder(state.folderPath);
    state.initialized = true;
}

async function ensureInit() {
    if (state.initialized) return;
    if (state.initError && Date.now() - state.initError.time < 30_000) throw state.initError.err;
    try { await initClients(); } catch (err) { state.initError = { err, time: Date.now() }; throw err; }
}

async function ensureFolder(folderPath) {
    const segments = folderPath.split('/').filter(Boolean);
    let currentPath = '';
    for (const seg of segments) {
        const parentApi = currentPath ? `/drives/${state.driveId}/root:/${currentPath}:` : `/drives/${state.driveId}/root`;
        try {
            await state.graph.api(`${parentApi}/children`).post({ name: seg, folder: {}, '@microsoft.graph.conflictBehavior': 'replace' });
        } catch (err) {
            if (err.statusCode !== 409 && !(err.statusCode === 400 && /already exists/i.test(err.message || ''))) throw err;
        }
        currentPath = currentPath ? `${currentPath}/${seg}` : seg;
    }
}

function makeItemPath(filename) { const clean = filename.replace(/^\/+/, '').replace(/[<>:"|?*]/g, '_'); return `${state.folderPath}/${clean}`; }

async function listFiles(subfolder = '') {
    await ensureInit();
    const target = subfolder ? `${state.folderPath}/${subfolder.replace(/^\/+|\/+$/g, '')}` : state.folderPath;
    const res = await state.graph.api(`/drives/${state.driveId}/root:/${target}:/children`).select('id,name,size,lastModifiedDateTime,file,folder,webUrl').get();
    return res.value.map(item => ({ id: item.id, name: item.name, size: item.size, modified: item.lastModifiedDateTime, isFolder: !!item.folder, webUrl: item.webUrl }));
}

async function uploadFile(filename, contentBuffer, contentType = 'application/octet-stream') {
    await ensureInit();
    const itemPath = makeItemPath(filename);
    if (contentBuffer.length < 4 * 1024 * 1024) {
        const item = await state.graph.api(`/drives/${state.driveId}/root:/${itemPath}:/content`).header('Content-Type', contentType).put(contentBuffer);
        return { id: item.id, name: item.name, size: item.size, webUrl: item.webUrl };
    }
    const session = await state.graph.api(`/drives/${state.driveId}/root:/${itemPath}:/createUploadSession`).post({ item: { '@microsoft.graph.conflictBehavior': 'replace' } });
    const chunkSize = 5 * 1024 * 1024;
    let uploaded = 0, last = null;
    while (uploaded < contentBuffer.length) {
        const end = Math.min(uploaded + chunkSize, contentBuffer.length);
        const chunk = contentBuffer.slice(uploaded, end);
        const res = await fetch(session.uploadUrl, { method: 'PUT', headers: { 'Content-Length': String(chunk.length), 'Content-Range': `bytes ${uploaded}-${end - 1}/${contentBuffer.length}` }, body: chunk });
        if (!res.ok && res.status !== 202) throw new Error(`Chunked upload failed: ${res.status}`);
        last = await res.json().catch(() => null);
        uploaded = end;
    }
    return last ? { id: last.id, name: last.name, size: last.size, webUrl: last.webUrl } : { name: filename };
}

async function downloadFile(filename) {
    await ensureInit();
    const itemPath = makeItemPath(filename);
    const item = await state.graph.api(`/drives/${state.driveId}/root:/${itemPath}`).select('@microsoft.graph.downloadUrl,name,size,file').get();
    const dlUrl = item['@microsoft.graph.downloadUrl'];
    if (!dlUrl) throw new Error('Item has no download URL');
    const res = await fetch(dlUrl);
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    return { buffer: buf, name: item.name, size: item.size, contentType: item.file?.mimeType || 'application/octet-stream' };
}

async function deleteFile(filename) {
    await ensureInit();
    const itemPath = makeItemPath(filename);
    await state.graph.api(`/drives/${state.driveId}/root:/${itemPath}`).delete();
}

function getStatus() {
    return { configured: isConfigured(), initialized: state.initialized, siteUrl: process.env.SHAREPOINT_SITE_URL || null, driveName: process.env.SHAREPOINT_DRIVE_NAME || '(default library)', folder: process.env.SHAREPOINT_FOLDER_PATH || '/TeamsCQM', lastInitError: state.initError ? { message: state.initError.err.message, at: new Date(state.initError.time).toISOString() } : null };
}

module.exports = { isConfigured, ensureInit, listFiles, uploadFile, downloadFile, deleteFile, getStatus };
