# Teams Call Quality Monitor - Server Edition

Node.js/Express server that hosts the full Teams Call Quality dashboard, persists call data to disk, computes alerts server-side, and (optionally) reads/writes reports and logs to a SharePoint site via Microsoft Graph.

## Contents

```
server/
├── server.js                    # Express app entry point
├── package.json                 # Dependencies
├── .env.example                 # Environment variable template
├── Dockerfile                   # Container build
├── docker-compose.yml           # docker-compose service
├── ecosystem.config.js          # PM2 process manager config
├── web.config                   # Azure App Service (Windows) + iisnode config
├── public/
│   ├── index.html               # Dashboard shell
│   ├── dashboard.css            # Styles (Teams-branded, dark theme)
│   └── dashboard.js             # Frontend (fetches from server API)
├── src/
│   ├── datastore.js             # JSON file persistence
│   ├── alerts.js                # Server-side alert computation
│   ├── demo-data.js             # Seed demo data generator
│   ├── sharepoint.js            # Microsoft Graph client
│   └── routes/
│       ├── api-calls.js         # /api/calls
│       ├── api-alerts.js        # /api/alerts
│       ├── api-config.js        # /api/config
│       ├── api-export.js        # /api/export/{csv,json,sharepoint,report,import}
│       └── api-sharepoint.js    # /api/sharepoint/{status,files,upload,download,pull}
└── data/                        # Runtime datastore (JSON files + audit log)
```

## Prerequisites

- Node.js 18 or later
- (Optional) An Azure AD app registration if you want SharePoint integration

## Quick start (local)

```bash
cd server
cp .env.example .env         # then edit .env with your settings
npm install
npm start
```

Open http://localhost:3000. The dashboard loads with 650 demo calls on first launch; subsequent restarts reuse the persisted `data/calls.json`.

## SharePoint integration (optional)

### 1. Register an Azure AD application

1. Azure Portal → **Microsoft Entra ID** → **App registrations** → **New registration**.
2. Give it a name (e.g. "Teams CQM Server"), single-tenant, no redirect URI required.
3. Copy the **Application (client) ID** and **Directory (tenant) ID**.
4. **Certificates & secrets** → **New client secret** → copy the *Value* immediately.
5. **API permissions** → **Add** → **Microsoft Graph** → **Application permissions** → `Sites.ReadWrite.All` (or `Sites.Selected` for tighter scoping).
6. **Grant admin consent** for the tenant.

### 2. Configure environment variables

```
AZURE_TENANT_ID=<tenant-id>
AZURE_CLIENT_ID=<client-id>
AZURE_CLIENT_SECRET=<secret-value>
SHAREPOINT_SITE_URL=https://contoso.sharepoint.com/sites/TeamsMonitor
SHAREPOINT_DRIVE_NAME=Documents
SHAREPOINT_FOLDER_PATH=/TeamsCQM
```

### 3. Verify

Restart the server. The **SharePoint** nav item shows "on". Open it to browse the configured folder, upload files, download files, and export filtered CSVs directly to SharePoint.

## Deployment options

### Docker

```bash
cd server
docker compose up -d
```

### Azure App Service (Linux, Node.js runtime)

1. Create an App Service on the **Node 20 LTS** runtime.
2. Zip the entire `server/` folder (excluding `node_modules` and `data`).
3. Deploy via **Deployment Center → ZIP Deploy** or Azure CLI.
4. Configure environment variables in **App Service → Configuration**.
5. Set `DATA_DIR=/home/site/data` for persistent storage.

### Azure App Service (Windows, iisnode)

The included `web.config` supports Windows plans with iisnode. Deploy the entire `server/` folder to `/site/wwwroot/`.

### On-premises with PM2

```bash
cd server
npm install --omit=dev
pm2 start ecosystem.config.js
pm2 save && pm2 startup
```

## Integrating real Microsoft Teams call data

1. Register a second Azure AD app with **`CallRecords.Read.All`** permission.
2. Run an Azure Function (Timer trigger, every 15 minutes) that queries `GET https://graph.microsoft.com/v1.0/communications/callRecords` and enriches with `GET .../callRecords/{id}/sessions`.
3. POST the transformed records to `/api/calls`, or write them as CSV to SharePoint and use `/api/sharepoint/pull` to import.

Reference: <https://learn.microsoft.com/en-us/graph/api/resources/callrecords-callrecord>

## API reference

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/health` | Liveness probe |
| GET | `/api/config` | Combined server + SharePoint status |
| GET | `/api/calls` | All call records + thresholds |
| GET | `/api/calls/:id` | Single call detail |
| POST | `/api/calls` | Append records (bulk ingest) |
| POST | `/api/calls/replace` | Replace entire dataset |
| POST | `/api/calls/regenerate` | Regenerate demo data |
| GET | `/api/alerts` | Flattened alert list |
| PUT | `/api/alerts/thresholds` | Update thresholds |
| GET | `/api/export/csv` | Download filtered CSV |
| POST | `/api/export/import` | Multipart CSV upload |
| POST | `/api/export/sharepoint` | Push CSV to SharePoint |
| POST | `/api/export/report` | Generate HTML report |
| GET | `/api/sharepoint/files` | List folder contents |
| POST | `/api/sharepoint/upload` | Upload file |
| GET | `/api/sharepoint/download/:filename` | Download file |
| POST | `/api/sharepoint/pull` | Import CSV from SharePoint |
| DELETE | `/api/sharepoint/files/:filename` | Delete file |

## Security notes

- The server has no built-in authentication. Front it with **Azure App Service Easy Auth**, **oauth2-proxy**, or similar.
- Do not commit `.env` (excluded via `.gitignore`).
- Client secrets belong in Azure Key Vault or equivalent, injected as env vars.
- Every mutation is logged to `data/audit.log`.
- Rate limiting: 300 requests/min per IP (tunable in `server.js`).
