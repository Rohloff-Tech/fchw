# Deploying Teams Call Quality Monitor to Azure

This dashboard is a **single-file static HTML application** with no server-side dependencies. It can be deployed to Azure in three ways.

## Files in this deployment

| File | Purpose |
|------|---------|
| `teams-call-quality-dashboard.html` | The complete dashboard application (HTML + CSS + JS) |
| `web.config` | IIS configuration for **Azure App Service (Windows)** |
| `staticwebapp.config.json` | Routing / headers for **Azure Static Web Apps** |

---

## Option 1: Azure Static Web Apps (recommended, free tier available)

1. Push this folder to a GitHub repository.
2. In the Azure Portal → Create a resource → **Static Web App**.
3. Connect it to your GitHub repo and branch.
4. Set:
   - **App location:** `/` (root)
   - **Api location:** (leave blank)
   - **Output location:** (leave blank)
5. Azure will auto-deploy. The `staticwebapp.config.json` handles routing so `/` opens the dashboard.

## Option 2: Azure App Service (Windows)

1. Create an Azure Web App (any tier, Windows OS, .NET or PHP runtime).
2. Zip `teams-call-quality-dashboard.html` and `web.config` together.
3. Deploy via **Azure Portal → Deployment Center → ZIP Deploy**, or via CLI:

   ```bash
   az webapp deploy \
     --resource-group <rg-name> \
     --name <webapp-name> \
     --src-path deploy.zip \
     --type zip
   ```

4. Navigate to `https://<webapp-name>.azurewebsites.net` — the dashboard loads.

## Option 3: Azure App Service (Linux)

Linux plans do not use `web.config`. Use one of these approaches:

- Deploy behind Node.js and serve statically with `http-server`, or
- Use **Static Web Apps** (Option 1) instead, or
- Configure a startup script like: `pm2 serve /home/site/wwwroot 8080 --spa`.

## Option 4: Azure Blob Storage Static Website

1. Create a storage account → enable **Static website**.
2. Set index document name to `teams-call-quality-dashboard.html`.
3. Upload the HTML file to `$web` container.
4. Access via the primary endpoint URL.

---

## Integrating real Microsoft Teams call data

The dashboard ships with demo data. To integrate real call quality records:

1. Set up an **Azure Function** (Timer trigger, hourly).
2. Use the **Microsoft Graph API** — [Call Records API](https://learn.microsoft.com/en-us/graph/api/resources/callrecords-callrecord) requires the app permission `CallRecords.Read.All`.
3. Query `GET /communications/callRecords?$filter=...` and enrich with `GET /communications/callRecords/{id}/sessions`.
4. Write the records to a CSV in Blob Storage, or expose a JSON endpoint.
5. Modify the dashboard's `init()` function to `fetch()` the JSON instead of calling `generateDemoData()`.

### Required Azure AD app permissions

| Permission | Type | Purpose |
|------------|------|---------|
| `CallRecords.Read.All` | Application | Read all call records |
| `User.Read.All` | Application | Enrich participants with department/location |
| `Reports.Read.All` | Application | Access usage reports (optional) |

## Security & Compliance

- All processing happens **client-side** — call data never leaves the user's browser once loaded.
- The included `web.config` enforces HTTPS, adds security headers (X-Frame-Options, X-Content-Type-Options), and sets a Permissions-Policy to disable geolocation/microphone/camera.
- For production, consider adding **Azure AD authentication** via App Service Easy Auth (Authentication blade → Add identity provider → Microsoft).
