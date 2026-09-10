/* Microsoft Teams Call Quality Monitor - Dashboard logic */
var CONFIG = { demoDataCount: 650, daysOfHistory: 90, thresholds: { mosMin: 3.5, jitterMax: 30, packetLossMax: 5.0, rttMax: 200, freezeMax: 3 } };
var DEPARTMENTS = ['Engineering','Sales','Marketing','Customer Success','Finance','HR','Product','Operations','Legal','IT'];
var LOCATIONS = ['Seattle','New York','San Francisco','Chicago','Austin','London','Dublin','Berlin','Paris','Tokyo','Sydney','Singapore','Toronto','Mumbai','Sao Paulo'];
var CALL_TYPES = ['audio','video','screenShare','pstn','conference'];
var CLIENT_TYPES = ['desktop','web','mobile-ios','mobile-android','room-device'];
var NETWORK_TYPES = ['wifi','wired','cellular','vpn'];
var OS_TYPES = ['Windows 11','Windows 10','macOS 14','macOS 13','iOS 17','Android 14','ChromeOS'];
var AUDIO_CODECS = ['SILK','G.722','G.711','SATIN','OPUS'];
var VIDEO_CODECS = ['H264','H265','VP8','VP9','AV1'];
var HEADSETS = ['Jabra Evolve2 75','Jabra Evolve2 65','Poly Voyager 5200','Bose 700','Microsoft Modern Wireless','Logitech Zone Wired','Sennheiser SC 60','Apple AirPods Pro','No Headset (Built-in)'];
var CAMERAS = ['Logitech C920','Logitech Brio','Microsoft LifeCam HD-3000','Poly Studio P15','Jabra PanaCast','Built-in Webcam'];
var SUBNETS = ['10.1.5.0/24','10.1.10.0/24','10.2.5.0/24','10.2.20.0/24','10.3.15.0/24','172.16.10.0/24','172.16.20.0/24','192.168.1.0/24','192.168.10.0/24','10.5.100.0/24','10.5.200.0/24','10.10.50.0/24'];
var FIRST_NAMES = ['Alex','Sarah','Michael','Emily','David','Jessica','Chris','Amanda','James','Nicole','Ryan','Lauren','Kevin','Rachel','Brian','Melissa','Daniel','Rebecca','Mark','Ashley','Tom','Erin','Andrew','Kayla','Jason','Michelle','Patrick','Stephanie','Eric','Jennifer','Sam','Priya','Raj','Yuki','Ken','Aiko','Liam','Sophia','Noah','Olivia','Ethan','Ava','Lucas','Isabella','Mason','Mia','Logan','Charlotte','Elijah','Amelia'];
var LAST_NAMES = ['Chen','Miller','Johnson','Williams','Brown','Davis','Wilson','Anderson','Taylor','Thomas','Moore','Jackson','Martin','Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson','Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores','Green','Adams','Nakamura','Kim','Patel','Singh','Kumar','Yamamoto','Garcia','Rodriguez','Martinez','Hernandez'];

var callData = [], currentView = 'overview', currentTheme = 'light', charts = {};
var sortState = { column: 'startTime', direction: 'desc' };
var filterState = { dateRange: { start: null, end: null }, callTypes: [], qualityRatings: [], departments: [], locations: [], networkTypes: [], clientTypes: [], searchQuery: '' };

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randChoices(arr, n) { var copy = arr.slice(), result = []; for (var i = 0; i < n && copy.length; i++) { var idx = Math.floor(Math.random() * copy.length); result.push(copy.splice(idx, 1)[0]); } return result; }
function normalRand(mean, stdDev) { var u = 0, v = 0; while(u === 0) u = Math.random(); while(v === 0) v = Math.random(); return mean + stdDev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v); }
function formatDateTime(d) { if (!(d instanceof Date)) d = new Date(d); return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
function formatDuration(sec) { if (sec < 60) return sec + 's'; var m = Math.floor(sec / 60), s = sec % 60; if (m < 60) return m + 'm ' + s + 's'; var h = Math.floor(m / 60); m = m % 60; return h + 'h ' + m + 'm'; }
function pctOf(n, total) { return total > 0 ? (n / total * 100) : 0; }
function fmtPct(n) { return (n || 0).toFixed(1) + '%'; }
function getInitials(name) { return name.split(' ').map(function(w){return w[0];}).slice(0,2).join('').toUpperCase(); }
function escapeHtml(str) { if (str == null) return ''; return String(str).replace(/[&<>"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function qualityCell(text, rating) { return '<span class="quality-badge ' + rating + '">' + text + '</span>'; }
function mosColor(mos) { if (mos < 2.5) return '#C50F1F'; if (mos < 3.2) return '#E64A2E'; if (mos < 3.7) return '#F7630C'; if (mos < 4.0) return '#FFB900'; if (mos < 4.3) return '#6BB700'; return '#13A10E'; }

function generateDemoData() {
    var users = [];
    for (var i = 0; i < 220; i++) {
        var first = randChoice(FIRST_NAMES), last = randChoice(LAST_NAMES);
        users.push({ name: first + ' ' + last, email: (first[0] + last).toLowerCase() + '@contoso.com', department: randChoice(DEPARTMENTS), location: randChoice(LOCATIONS) });
    }
    var problemSubnet = '10.5.200.0/24', problemDevice = 'No Headset (Built-in)', problemLocation = 'Mumbai';
    var records = [], now = new Date(), startBase = new Date(now.getTime() - CONFIG.daysOfHistory * 86400000);
    for (var i = 0; i < CONFIG.demoDataCount; i++) {
        var callDate = new Date(startBase.getTime() + Math.random() * CONFIG.daysOfHistory * 86400000);
        var hour = Math.random() < 0.75 ? randInt(9, 17) : randInt(0, 23);
        callDate.setHours(hour, randInt(0, 59), randInt(0, 59), 0);
        var duration = Math.max(30, Math.floor(normalRand(900, 800)));
        if (Math.random() < 0.15) duration = randInt(30, 180);
        if (Math.random() < 0.08) duration = randInt(3600, 7200);
        var participantCount = 2, r = Math.random();
        if (r < 0.15) participantCount = randInt(3, 5);
        else if (r < 0.05) participantCount = randInt(6, 20);
        var participants = randChoices(users, participantCount).map(function(u, idx) { return Object.assign({}, u, { role: idx === 0 ? 'organizer' : 'participant' }); });
        var callType;
        if (participantCount >= 3) callType = Math.random() < 0.7 ? 'conference' : 'video';
        else { var t = Math.random(); callType = t < 0.35 ? 'audio' : t < 0.75 ? 'video' : t < 0.9 ? 'screenShare' : 'pstn'; }
        var modality = ['audio'];
        if (callType === 'video' || callType === 'conference') modality.push('video');
        if (callType === 'screenShare' || (Math.random() < 0.3 && callType !== 'pstn')) modality.push('screenShare');
        var subnet = randChoice(SUBNETS), networkType = randChoice(NETWORK_TYPES);
        var hasProblem = subnet === problemSubnet || participants[0].location === problemLocation;
        var congested = (hour === 12 || hour === 13) && networkType === 'wifi';
        var jitter = Math.max(0, normalRand(hasProblem ? 40 : 12, hasProblem ? 25 : 8) + (congested ? 15 : 0));
        var packetLoss = Math.max(0, normalRand(hasProblem ? 4.0 : 0.6, hasProblem ? 3.0 : 1.0) + (congested ? 2 : 0));
        var rtt = Math.max(5, normalRand(hasProblem ? 180 : 55, hasProblem ? 60 : 25) + (congested ? 40 : 0));
        var bandwidth = Math.max(200, normalRand(networkType === 'cellular' ? 1500 : 3500, 800));
        var mos = 4.5 - (jitter / 30) - (packetLoss / 2.5) - (rtt / 300);
        mos = Math.max(1.0, Math.min(5.0, mos + normalRand(0, 0.15)));
        var headset = randChoice(HEADSETS);
        if (Math.random() < 0.15) headset = problemDevice;
        if (headset === problemDevice) mos = Math.max(1.5, mos - 0.5);
        var camera = modality.indexOf('video') >= 0 ? randChoice(CAMERAS) : null;
        var clientType = randChoice(CLIENT_TYPES), os = randChoice(OS_TYPES);
        var video = null;
        if (modality.indexOf('video') >= 0) {
            var res = randChoice(['1920x1080','1280x720','640x480','960x540']);
            var frameRate = res === '1920x1080' ? randInt(25, 30) : randInt(15, 30);
            var freezeCount = Math.random() < 0.15 ? randInt(1, 6) : 0;
            if (hasProblem) freezeCount = randInt(3, 12);
            video = { resolutionSend: res, resolutionRecv: randChoice(['1920x1080','1280x720','960x540']), frameRateSend: frameRate, frameRateRecv: randInt(20, 30), freezeCount: freezeCount, freezeDuration: freezeCount * randInt(1, 5), cameraDevice: camera, videoCodec: randChoice(VIDEO_CODECS) };
        }
        var qualityRating = (mos >= 4.0 && packetLoss < 1.5 && jitter < 25) ? 'good' : (mos >= 3.5 && packetLoss < 4 && jitter < 40) ? 'acceptable' : 'poor';
        var segments = [];
        for (var s = 0; s < 8; s++) { var segMos = mos + normalRand(0, 0.3); segments.push({ rating: segMos >= 4.0 ? 'good' : segMos >= 3.5 ? 'acceptable' : 'poor', mos: segMos }); }
        var endTime = new Date(callDate.getTime() + duration * 1000);
        var callId = 'CALL-' + callDate.toISOString().slice(0,10).replace(/-/g,'') + '-' + String(i).padStart(5,'0');
        records.push({ callId: callId, startTime: callDate, endTime: endTime, duration: duration, callType: callType, modality: modality, isConference: participantCount >= 3, participants: participants, participantCount: participantCount, network: { jitter: jitter, packetLoss: packetLoss, roundTripTime: rtt, bandwidthEstimate: bandwidth, subnet: subnet, networkType: networkType, vpnUsed: networkType === 'vpn' || Math.random() < 0.1 }, audio: { mosScore: mos, echoPercentage: Math.max(0, normalRand(0.3, 0.5)), noiseSuppression: Math.random() < 0.85, audioCodec: randChoice(AUDIO_CODECS), speakerDevice: headset, micDevice: headset }, video: video, device: { os: os, teamsVersion: '24' + randChoice(['033','052','074','091']) + '.1309.' + randInt(2000,3000) + '.' + randInt(4000,6000), clientType: clientType, headset: headset, camera: camera, driver: 'Driver ' + randInt(1,9) + '.' + randInt(0,9), firmwareVersion: randInt(1,4) + '.' + randInt(0,20) + '.' + randInt(0,50) }, qualityRating: qualityRating, qualityScore: Math.round(((mos - 1) / 4) * 100), timelineSegments: segments, alerts: [] });
    }
    records.sort(function(a, b) { return b.startTime - a.startTime; });
    return records;
}

function recomputeAlerts() {
    callData.forEach(function(c) {
        c.alerts = [];
        if (c.audio.mosScore < CONFIG.thresholds.mosMin) c.alerts.push({ type: 'lowMos', severity: c.audio.mosScore < 2.5 ? 'critical' : 'warning', message: 'Low MOS: ' + c.audio.mosScore.toFixed(2), value: c.audio.mosScore });
        if (c.network.jitter > CONFIG.thresholds.jitterMax) c.alerts.push({ type: 'highJitter', severity: c.network.jitter > 60 ? 'critical' : 'warning', message: 'High jitter: ' + c.network.jitter.toFixed(1) + 'ms', value: c.network.jitter });
        if (c.network.packetLoss > CONFIG.thresholds.packetLossMax) c.alerts.push({ type: 'packetLoss', severity: c.network.packetLoss > 8 ? 'critical' : 'warning', message: 'Packet loss: ' + c.network.packetLoss.toFixed(1) + '%', value: c.network.packetLoss });
        if (c.network.roundTripTime > CONFIG.thresholds.rttMax) c.alerts.push({ type: 'highRtt', severity: c.network.roundTripTime > 350 ? 'critical' : 'warning', message: 'High RTT: ' + Math.round(c.network.roundTripTime) + 'ms', value: c.network.roundTripTime });
        if (c.video && c.video.freezeCount > CONFIG.thresholds.freezeMax) c.alerts.push({ type: 'videoFreeze', severity: 'warning', message: c.video.freezeCount + ' video freezes', value: c.video.freezeCount });
    });
}

function applyFilters(data) {
    var f = filterState, q = f.searchQuery.toLowerCase();
    return data.filter(function(c) {
        if (f.dateRange.start && c.startTime < f.dateRange.start) return false;
        if (f.dateRange.end && c.startTime > f.dateRange.end) return false;
        if (f.callTypes.length && f.callTypes.indexOf(c.callType) < 0) return false;
        if (f.qualityRatings.length && f.qualityRatings.indexOf(c.qualityRating) < 0) return false;
        if (f.departments.length && !c.participants.some(function(p){ return f.departments.indexOf(p.department) >= 0; })) return false;
        if (f.locations.length && !c.participants.some(function(p){ return f.locations.indexOf(p.location) >= 0; })) return false;
        if (f.networkTypes.length && f.networkTypes.indexOf(c.network.networkType) < 0) return false;
        if (f.clientTypes.length && f.clientTypes.indexOf(c.device.clientType) < 0) return false;
        if (q) { var h = (c.callId + ' ' + c.network.subnet + ' ' + c.device.headset + ' ' + c.participants.map(function(p){return p.name + ' ' + p.email + ' ' + p.department;}).join(' ')).toLowerCase(); if (h.indexOf(q) < 0) return false; }
        return true;
    });
}

function updateFilterBadges() {
    function badge(id, count) { var el = document.getElementById('badge-' + id); if (!el) return; if (count > 0) { el.style.display = 'inline'; el.textContent = count; } else el.style.display = 'none'; }
    var f = filterState;
    badge('dateRange', (f.dateRange.start || f.dateRange.end) ? 1 : 0);
    badge('callType', f.callTypes.length); badge('quality', f.qualityRatings.length); badge('department', f.departments.length); badge('location', f.locations.length); badge('network', f.networkTypes.length); badge('client', f.clientTypes.length);
}

function buildFilterMenus() {
    function buildMulti(id, options, stateKey) {
        var menu = document.getElementById('menu-' + id);
        var html = '<div class="filter-menu-header"><button class="link-btn" onclick="selectAllFilter(\'' + stateKey + '\', ' + JSON.stringify(options).replace(/"/g, '&quot;') + ')">Select all</button><button class="link-btn" onclick="clearFilter(\'' + stateKey + '\')">Clear</button></div>';
        options.forEach(function(opt) {
            var checked = filterState[stateKey].indexOf(opt) >= 0 ? 'checked' : '';
            html += '<label class="filter-menu-item"><input type="checkbox" ' + checked + ' onchange="toggleFilterValue(\'' + stateKey + '\', \'' + opt.replace(/'/g,"\\'") + '\', this.checked)" />' + escapeHtml(opt) + '</label>';
        });
        menu.innerHTML = html;
    }
    buildMulti('callType', CALL_TYPES, 'callTypes');
    buildMulti('quality', ['good','acceptable','poor'], 'qualityRatings');
    buildMulti('department', DEPARTMENTS, 'departments');
    buildMulti('location', LOCATIONS, 'locations');
    buildMulti('network', NETWORK_TYPES, 'networkTypes');
    buildMulti('client', CLIENT_TYPES, 'clientTypes');
}

function toggleFilterValue(stateKey, value, checked) { var arr = filterState[stateKey]; var idx = arr.indexOf(value); if (checked && idx < 0) arr.push(value); else if (!checked && idx >= 0) arr.splice(idx, 1); onFiltersChanged(); }
function selectAllFilter(stateKey, options) { filterState[stateKey] = options.slice(); buildFilterMenus(); onFiltersChanged(); }
function clearFilter(stateKey) { filterState[stateKey] = []; buildFilterMenus(); onFiltersChanged(); }
function clearAllFilters() { filterState = { dateRange: { start: null, end: null }, callTypes: [], qualityRatings: [], departments: [], locations: [], networkTypes: [], clientTypes: [], searchQuery: '' }; document.getElementById('globalSearch').value = ''; document.getElementById('dateFrom').value = ''; document.getElementById('dateTo').value = ''; buildFilterMenus(); onFiltersChanged(); }
function setPresetRange(days) { var end = new Date(), start = new Date(end.getTime() - days * 86400000); filterState.dateRange.start = start; filterState.dateRange.end = end; document.getElementById('dateFrom').value = start.toISOString().slice(0,10); document.getElementById('dateTo').value = end.toISOString().slice(0,10); onFiltersChanged(); }
function toggleFilterMenu(id) { var menu = document.getElementById('menu-' + id); document.querySelectorAll('.filter-menu').forEach(function(m) { if (m !== menu) m.classList.remove('show'); }); menu.classList.toggle('show'); }
document.addEventListener('click', function(e) { if (!e.target.closest('.filter-dropdown')) { document.querySelectorAll('.filter-menu').forEach(function(m) { m.classList.remove('show'); }); } });
function onFiltersChanged() { updateFilterBadges(); var filtered = applyFilters(callData); document.getElementById('filterResultCount').textContent = filtered.length.toLocaleString() + ' calls'; document.getElementById('navBadgeExplorer').textContent = filtered.length.toLocaleString(); renderCurrentView(); }

function navigateTo(view) {
    currentView = view;
    document.querySelectorAll('.nav-item').forEach(function(n) { n.classList.toggle('active', n.dataset.view === view); });
    var titles = { overview: 'Overview', explorer: 'Call Explorer', users: 'User Analytics', network: 'Network Analysis', devices: 'Device Health', alerts: 'Alerts & Thresholds', settings: 'Settings' };
    document.getElementById('viewTitleHeader').textContent = titles[view] || view;
    renderCurrentView();
}

function destroyAllCharts() { Object.keys(charts).forEach(function(k) { if (charts[k]) { try { charts[k].destroy(); } catch(e){} delete charts[k]; } }); }

function renderCurrentView() {
    destroyAllCharts();
    var filtered = applyFilters(callData);
    var container = document.getElementById('viewContainer');
    container.scrollTop = 0;
    switch(currentView) {
        case 'overview': renderOverview(container, filtered); break;
        case 'explorer': renderCallExplorer(container, filtered); break;
        case 'users': renderUserAnalytics(container, filtered); break;
        case 'network': renderNetworkAnalysis(container, filtered); break;
        case 'devices': renderDeviceHealth(container, filtered); break;
        case 'alerts': renderAlertsView(container, filtered); break;
        case 'settings': renderSettings(container); break;
    }
    var el = document.getElementById('sidebarStats');
    if (el) { var poor = filtered.filter(function(c){return c.qualityRating === 'poor';}).length; el.innerHTML = filtered.length.toLocaleString() + ' calls · ' + poor + ' poor'; }
}

function chartColors() { var isDark = document.body.classList.contains('dark-theme'); return { text: isDark ? '#C8C8C8' : '#616161', grid: isDark ? '#3A3A3A' : '#EEEEEE', border: isDark ? '#404040' : '#E1DFDD', purple: '#6264A7', purpleLight: '#8B8CC7', purpleDark: '#464775', good: '#13A10E', acceptable: '#F7630C', poor: '#C50F1F', blue: '#0078D4' }; }
function commonChartOptions() { var c = chartColors(); return { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: c.text, font: { size: 11 } } }, tooltip: { backgroundColor: 'rgba(0,0,0,0.85)', titleColor: 'white', bodyColor: 'white', borderColor: c.purple, borderWidth: 1, padding: 10 } }, scales: { x: { ticks: { color: c.text, font: { size: 10 } }, grid: { color: c.grid } }, y: { ticks: { color: c.text, font: { size: 10 } }, grid: { color: c.grid }, beginAtZero: true } } }; }

function kpiCard(label, value, trend, direction, sparkId, extra) { var trendClass = direction || 'neutral'; var trendHtml = trend ? '<div class="kpi-trend ' + trendClass + '">' + trend + '</div>' : '<div class="kpi-trend neutral">—</div>'; return '<div class="kpi-card" ' + (extra || '') + '><div class="kpi-label">' + label + '</div><div class="kpi-value">' + value + '</div>' + trendHtml + '<canvas class="kpi-sparkline" id="' + sparkId + '"></canvas></div>'; }

function buildCallTable(rows) {
    var html = '<table class="data-table"><thead><tr><th onclick="sortBy(\'callId\')">Call ID<span class="sort-icon">↕</span></th><th onclick="sortBy(\'startTime\')">Start<span class="sort-icon">↕</span></th><th onclick="sortBy(\'duration\')">Duration<span class="sort-icon">↕</span></th><th onclick="sortBy(\'callType\')">Type<span class="sort-icon">↕</span></th><th>Participants</th><th onclick="sortBy(\'mos\')">MOS<span class="sort-icon">↕</span></th><th onclick="sortBy(\'jitter\')">Jitter<span class="sort-icon">↕</span></th><th onclick="sortBy(\'packetLoss\')">Loss%<span class="sort-icon">↕</span></th><th onclick="sortBy(\'rtt\')">RTT<span class="sort-icon">↕</span></th><th onclick="sortBy(\'quality\')">Quality<span class="sort-icon">↕</span></th></tr></thead><tbody>';
    rows.forEach(function(c) {
        var partSummary = c.participants.slice(0,2).map(function(p){return escapeHtml(p.name);}).join(', ');
        if (c.participants.length > 2) partSummary += ' +' + (c.participants.length-2);
        html += '<tr onclick="showCallDetail(\'' + c.callId + '\')"><td><strong style="color: var(--teams-purple)">' + c.callId + '</strong></td><td>' + formatDateTime(c.startTime) + '</td><td>' + formatDuration(c.duration) + '</td><td><span class="type-badge">' + c.callType + '</span></td><td>' + partSummary + '</td><td>' + c.audio.mosScore.toFixed(2) + '</td><td>' + Math.round(c.network.jitter) + 'ms</td><td>' + c.network.packetLoss.toFixed(2) + '%</td><td>' + Math.round(c.network.roundTripTime) + 'ms</td><td><span class="quality-badge ' + c.qualityRating + '">' + c.qualityRating + '</span></td></tr>';
    });
    return html + '</tbody></table>';
}

function sortBy(col) { if (sortState.column === col) sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc'; else { sortState.column = col; sortState.direction = 'asc'; } renderCurrentView(); }
function sortRows(rows) { var col = sortState.column, dir = sortState.direction === 'asc' ? 1 : -1; var accessors = { callId: function(r){return r.callId;}, startTime: function(r){return r.startTime;}, duration: function(r){return r.duration;}, callType: function(r){return r.callType;}, mos: function(r){return r.audio.mosScore;}, jitter: function(r){return r.network.jitter;}, packetLoss: function(r){return r.network.packetLoss;}, rtt: function(r){return r.network.roundTripTime;}, quality: function(r){return r.qualityScore;} }; var accessor = accessors[col] || accessors.startTime; return rows.slice().sort(function(a,b) { var av = accessor(a), bv = accessor(b); return av < bv ? -1 * dir : av > bv ? 1 * dir : 0; }); }

function drillMos() { filterState.qualityRatings = ['poor']; buildFilterMenus(); onFiltersChanged(); navigateTo('explorer'); }
function drillPacketLoss() { navigateTo('network'); }
function filterPoor() { filterState.qualityRatings = ['poor']; buildFilterMenus(); onFiltersChanged(); navigateTo('explorer'); }
function filterBySubnet(subnet) { filterState.searchQuery = subnet; document.getElementById('globalSearch').value = subnet; onFiltersChanged(); navigateTo('explorer'); }
function filterByDept(d) { filterState.departments = [d]; buildFilterMenus(); onFiltersChanged(); navigateTo('explorer'); }
function filterByLocation(l) { filterState.locations = [l]; buildFilterMenus(); onFiltersChanged(); navigateTo('explorer'); }
function filterByClient(t) { filterState.clientTypes = [t]; buildFilterMenus(); onFiltersChanged(); navigateTo('explorer'); }
function drillUser(email) { filterState.searchQuery = email; document.getElementById('globalSearch').value = email; closeModal(); onFiltersChanged(); navigateTo('explorer'); }
function filterByHour(d, h) { console.log('heatmap cell', d, h); }

function renderOverview(container, filtered) {
    var total = filtered.length;
    var avgMos = filtered.reduce(function(s,c){return s+c.audio.mosScore;},0) / (total||1);
    var avgPl = filtered.reduce(function(s,c){return s+c.network.packetLoss;},0) / (total||1);
    var avgJitter = filtered.reduce(function(s,c){return s+c.network.jitter;},0) / (total||1);
    var avgRtt = filtered.reduce(function(s,c){return s+c.network.roundTripTime;},0) / (total||1);
    var poor = filtered.filter(function(c){return c.qualityRating==='poor';}).length;
    var good = filtered.filter(function(c){return c.qualityRating==='good';}).length;
    var acc = filtered.filter(function(c){return c.qualityRating==='acceptable';}).length;
    var totalMin = Math.round(filtered.reduce(function(s,c){return s+c.duration;},0) / 60);
    var uniqUsers = new Set(); filtered.forEach(function(c){ c.participants.forEach(function(p){ uniqUsers.add(p.email); }); });
    container.innerHTML =
        '<div class="view-header"><div><div class="view-title">Overview Dashboard</div><div class="view-subtitle">Real-time Microsoft Teams call quality metrics and trends</div></div><div><span style="font-size: 12px; color: var(--text-secondary);">' + totalMin.toLocaleString() + ' min · ' + uniqUsers.size + ' users</span></div></div>' +
        '<div class="kpi-grid">' +
            kpiCard('Total Calls', total.toLocaleString(), '', 'neutral', 'kpiSpark1', 'onclick="navigateTo(\'explorer\')"') +
            kpiCard('Avg MOS Score', avgMos.toFixed(2), '', avgMos >= 4 ? 'up' : 'down', 'kpiSpark2', 'onclick="drillMos()"') +
            kpiCard('Packet Loss', avgPl.toFixed(2) + '%', '', avgPl < 1 ? 'up' : 'down', 'kpiSpark3', 'onclick="drillPacketLoss()"') +
            kpiCard('Avg Jitter', Math.round(avgJitter) + ' ms', '', avgJitter < 20 ? 'up' : 'down', 'kpiSpark4', '') +
            kpiCard('Avg RTT', Math.round(avgRtt) + ' ms', '', avgRtt < 100 ? 'up' : 'down', 'kpiSpark5', '') +
            kpiCard('Poor Calls', poor.toLocaleString() + ' (' + fmtPct(pctOf(poor, total)) + ')', '', 'down', 'kpiSpark6', 'onclick="filterPoor()"') +
        '</div>' +
        '<div class="card-grid two-thirds">' +
            '<div class="panel"><div class="panel-header"><div><div class="panel-title">Call Volume & MOS Trend</div><div class="panel-subtitle">Daily call counts by type with average quality overlay</div></div></div><div class="chart-container tall"><canvas id="chartVolume"></canvas></div></div>' +
            '<div class="panel"><div class="panel-header"><div class="panel-title">Quality Distribution</div></div><div class="chart-container tall"><canvas id="chartQuality"></canvas></div><div style="text-align: center; margin-top: 12px;"><span class="quality-badge good">Good ' + good + '</span> <span class="quality-badge acceptable">Acceptable ' + acc + '</span> <span class="quality-badge poor">Poor ' + poor + '</span></div></div>' +
        '</div>' +
        '<div class="card-grid cols-2"><div class="panel"><div class="panel-header"><div><div class="panel-title">Top Problem Subnets</div><div class="panel-subtitle">Sorted by average packet loss</div></div></div><div id="problemSubnets"></div></div><div class="panel"><div class="panel-header"><div><div class="panel-title">Top Problem Devices</div><div class="panel-subtitle">Sorted by average MOS (worst first)</div></div></div><div id="problemDevices"></div></div></div>' +
        '<div class="card-grid cols-2"><div class="panel"><div class="panel-header"><div class="panel-title">Call Types Breakdown</div></div><div class="chart-container"><canvas id="chartCallTypes"></canvas></div></div><div class="panel"><div class="panel-header"><div class="panel-title">Network Type Distribution</div></div><div class="chart-container"><canvas id="chartNetwork"></canvas></div></div></div>' +
        '<div class="panel"><div class="panel-header"><div><div class="panel-title">Recent Poor Quality Calls</div><div class="panel-subtitle">Click a row for full diagnostic details</div></div><span class="panel-action" onclick="filterPoor()">View all →</span></div><div class="table-wrapper" style="max-height: 320px;">' + buildCallTable(filtered.filter(function(c){return c.qualityRating==='poor';}).slice(0, 10)) + '</div></div>';
    buildOverviewCharts(filtered);
    buildKpiSparklines(filtered);
    buildProblemLists(filtered);
}

function buildKpiSparklines(filtered) {
    var days = 14, buckets = [], end = new Date(); end.setHours(23,59,59,999);
    for (var d = days - 1; d >= 0; d--) {
        var start = new Date(end.getTime() - d * 86400000); start.setHours(0,0,0,0);
        var stop = new Date(start.getTime() + 86400000);
        var day = filtered.filter(function(c){return c.startTime >= start && c.startTime < stop;});
        buckets.push({ count: day.length, mos: day.length ? day.reduce(function(s,c){return s+c.audio.mosScore;},0)/day.length : 0, pl: day.length ? day.reduce(function(s,c){return s+c.network.packetLoss;},0)/day.length : 0, jitter: day.length ? day.reduce(function(s,c){return s+c.network.jitter;},0)/day.length : 0, rtt: day.length ? day.reduce(function(s,c){return s+c.network.roundTripTime;},0)/day.length : 0, poor: day.filter(function(c){return c.qualityRating==='poor';}).length });
    }
    var labels = buckets.map(function(){return '';});
    var opts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } }, elements: { point: { radius: 0 }, line: { borderWidth: 2 } } };
    function sparkline(id, data, color) { var el = document.getElementById(id); if (!el) return; charts[id] = new Chart(el, { type: 'line', data: { labels: labels, datasets: [{ data: data, borderColor: color, backgroundColor: color + '33', fill: true, tension: 0.35 }] }, options: opts }); }
    var c = chartColors();
    sparkline('kpiSpark1', buckets.map(function(b){return b.count;}), c.purple);
    sparkline('kpiSpark2', buckets.map(function(b){return b.mos;}), c.good);
    sparkline('kpiSpark3', buckets.map(function(b){return b.pl;}), c.acceptable);
    sparkline('kpiSpark4', buckets.map(function(b){return b.jitter;}), c.blue);
    sparkline('kpiSpark5', buckets.map(function(b){return b.rtt;}), c.purpleLight);
    sparkline('kpiSpark6', buckets.map(function(b){return b.poor;}), c.poor);
}

function buildOverviewCharts(filtered) {
    var c = chartColors(), opts = commonChartOptions();
    var days = 30, buckets = [], end = new Date(); end.setHours(23,59,59,999);
    for (var d = days - 1; d >= 0; d--) {
        var start = new Date(end.getTime() - d * 86400000); start.setHours(0,0,0,0);
        var stop = new Date(start.getTime() + 86400000);
        var day = filtered.filter(function(cx){return cx.startTime >= start && cx.startTime < stop;});
        var counts = { audio:0, video:0, screenShare:0, pstn:0, conference:0 }, mosSum = 0, mosCount = 0;
        day.forEach(function(cx) { counts[cx.callType] = (counts[cx.callType]||0) + 1; mosSum += cx.audio.mosScore; mosCount++; });
        buckets.push({ date: start, counts: counts, mos: mosCount ? mosSum / mosCount : null });
    }
    var labels = buckets.map(function(b){return b.date.toLocaleDateString('en-US',{month:'short',day:'numeric'});});
    var vc = document.getElementById('chartVolume');
    if (vc) {
        var vo = JSON.parse(JSON.stringify(opts)); vo.plugins.tooltip = opts.plugins.tooltip;
        vo.scales.x.stacked = true; vo.scales.y.stacked = true;
        vo.scales.y1 = { position: 'right', min: 1, max: 5, ticks: { color: c.text, font: { size: 10 } }, grid: { display: false }, title: { display: true, text: 'MOS', color: c.text } };
        charts.chartVolume = new Chart(vc, { type: 'bar', data: { labels: labels, datasets: [
            { label: 'Audio', data: buckets.map(function(b){return b.counts.audio;}), backgroundColor: c.purpleLight, stack: 'a' },
            { label: 'Video', data: buckets.map(function(b){return b.counts.video;}), backgroundColor: c.purple, stack: 'a' },
            { label: 'Screen Share', data: buckets.map(function(b){return b.counts.screenShare;}), backgroundColor: c.blue, stack: 'a' },
            { label: 'PSTN', data: buckets.map(function(b){return b.counts.pstn;}), backgroundColor: c.acceptable, stack: 'a' },
            { label: 'Conference', data: buckets.map(function(b){return b.counts.conference;}), backgroundColor: c.purpleDark, stack: 'a' },
            { label: 'Avg MOS', data: buckets.map(function(b){return b.mos;}), type: 'line', yAxisID: 'y1', borderColor: c.good, backgroundColor: 'transparent', borderWidth: 2.5, tension: 0.3, pointRadius: 2 }
        ] }, options: vo });
    }
    var good = filtered.filter(function(cx){return cx.qualityRating==='good';}).length;
    var acc = filtered.filter(function(cx){return cx.qualityRating==='acceptable';}).length;
    var poor = filtered.filter(function(cx){return cx.qualityRating==='poor';}).length;
    var qc = document.getElementById('chartQuality');
    if (qc) { charts.chartQuality = new Chart(qc, { type: 'doughnut', data: { labels: ['Good','Acceptable','Poor'], datasets: [{ data: [good, acc, poor], backgroundColor: [c.good, c.acceptable, c.poor], borderWidth: 2, borderColor: c.border }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { color: c.text, font: { size: 12 }, padding: 10 } }, tooltip: opts.plugins.tooltip }, onClick: function(e, elements) { if (elements.length) { var ratings = ['good','acceptable','poor']; filterState.qualityRatings = [ratings[elements[0].index]]; buildFilterMenus(); onFiltersChanged(); } } } }); }
    var tc = {}; CALL_TYPES.forEach(function(t){tc[t]=0;}); filtered.forEach(function(c){tc[c.callType] = (tc[c.callType]||0)+1;});
    var ctc = document.getElementById('chartCallTypes');
    if (ctc) charts.chartCallTypes = new Chart(ctc, { type: 'bar', data: { labels: CALL_TYPES, datasets: [{ data: CALL_TYPES.map(function(t){return tc[t];}), backgroundColor: [c.purpleLight, c.purple, c.blue, c.acceptable, c.purpleDark] }] }, options: Object.assign({}, opts, { plugins: Object.assign({}, opts.plugins, { legend: { display: false } }) }) });
    var nc = {}; NETWORK_TYPES.forEach(function(t){nc[t]=0;}); filtered.forEach(function(c){nc[c.network.networkType]++;});
    var ncc = document.getElementById('chartNetwork');
    if (ncc) charts.chartNetwork = new Chart(ncc, { type: 'polarArea', data: { labels: NETWORK_TYPES, datasets: [{ data: NETWORK_TYPES.map(function(t){return nc[t];}), backgroundColor: [c.purple+'AA', c.good+'AA', c.acceptable+'AA', c.blue+'AA'], borderColor: c.border }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: c.text, font: { size: 11 } } }, tooltip: opts.plugins.tooltip } } });
}

function buildProblemLists(filtered) {
    var bs = {};
    filtered.forEach(function(c) { var k = c.network.subnet; if (!bs[k]) bs[k] = { count: 0, plSum: 0, mosSum: 0 }; bs[k].count++; bs[k].plSum += c.network.packetLoss; bs[k].mosSum += c.audio.mosScore; });
    var sr = Object.keys(bs).map(function(k) { var s = bs[k]; return { subnet: k, count: s.count, avgPl: s.plSum/s.count, avgMos: s.mosSum/s.count }; }).sort(function(a,b){return b.avgPl - a.avgPl;}).slice(0, 6);
    var html = '<table class="data-table"><thead><tr><th>Subnet</th><th>Calls</th><th>Avg Loss</th><th>Avg MOS</th></tr></thead><tbody>';
    sr.forEach(function(r) { html += '<tr onclick="filterBySubnet(\'' + r.subnet + '\')"><td><strong>' + r.subnet + '</strong></td><td>' + r.count + '</td><td>' + qualityCell(r.avgPl.toFixed(2)+'%', r.avgPl > 3 ? 'poor' : r.avgPl > 1.5 ? 'acceptable' : 'good') + '</td><td>' + qualityCell(r.avgMos.toFixed(2), r.avgMos < 3.5 ? 'poor' : r.avgMos < 4 ? 'acceptable' : 'good') + '</td></tr>'; });
    document.getElementById('problemSubnets').innerHTML = html + '</tbody></table>';
    var bd = {};
    filtered.forEach(function(c) { var k = c.device.headset; if (!bd[k]) bd[k] = { count: 0, mosSum: 0, poor: 0 }; bd[k].count++; bd[k].mosSum += c.audio.mosScore; if (c.qualityRating === 'poor') bd[k].poor++; });
    var dr = Object.keys(bd).filter(function(k){return bd[k].count >= 3;}).map(function(k) { var d = bd[k]; return { device: k, count: d.count, avgMos: d.mosSum/d.count, poorPct: d.poor/d.count*100 }; }).sort(function(a,b){return a.avgMos - b.avgMos;}).slice(0, 6);
    html = '<table class="data-table"><thead><tr><th>Device</th><th>Calls</th><th>Avg MOS</th><th>Poor %</th></tr></thead><tbody>';
    dr.forEach(function(r) { html += '<tr><td>' + escapeHtml(r.device) + '</td><td>' + r.count + '</td><td>' + qualityCell(r.avgMos.toFixed(2), r.avgMos < 3.5 ? 'poor' : r.avgMos < 4 ? 'acceptable' : 'good') + '</td><td>' + qualityCell(r.poorPct.toFixed(0)+'%', r.poorPct > 30 ? 'poor' : r.poorPct > 15 ? 'acceptable' : 'good') + '</td></tr>'; });
    document.getElementById('problemDevices').innerHTML = html + '</tbody></table>';
}

function renderCallExplorer(container, filtered) {
    var sorted = sortRows(filtered);
    container.innerHTML = '<div class="view-header"><div><div class="view-title">Call Explorer</div><div class="view-subtitle">Detailed searchable log of all calls · Click any row to drill down</div></div><div><span style="font-size: 13px; color: var(--text-secondary);">Showing <strong>' + Math.min(sorted.length, 200) + '</strong> of ' + sorted.length + '</span></div></div>' +
        '<div class="panel"><div class="table-wrapper" style="max-height: calc(100vh - 240px);">' + buildCallTable(sorted.slice(0, 200)) + '</div></div>';
}

function metricTile(label, value, tone) { return '<div class="metric-item ' + (tone || '') + '"><div class="metric-label">' + label + '</div><div class="metric-value">' + escapeHtml(String(value)) + '</div></div>'; }

function buildNetworkPathSvg(call) {
    var c = chartColors();
    var strokeColor = call.qualityRating === 'poor' ? c.poor : call.qualityRating === 'acceptable' ? c.acceptable : c.good;
    return '<svg class="network-path-svg" viewBox="0 0 700 140"><circle cx="80" cy="70" r="26" fill="' + c.purple + '" /><text x="80" y="75" fill="white" text-anchor="middle" font-size="12" font-weight="600">User</text><line x1="106" y1="70" x2="210" y2="70" stroke="' + strokeColor + '" stroke-width="3" stroke-dasharray="6,3" /><text x="158" y="55" fill="' + c.text + '" text-anchor="middle" font-size="11">' + call.network.networkType.toUpperCase() + '</text><rect x="210" y="45" width="90" height="50" rx="4" fill="' + c.purpleLight + '" /><text x="255" y="68" fill="white" text-anchor="middle" font-size="11" font-weight="600">Subnet</text><text x="255" y="82" fill="white" text-anchor="middle" font-size="9">' + call.network.subnet + '</text><line x1="300" y1="70" x2="400" y2="70" stroke="' + strokeColor + '" stroke-width="3" /><text x="350" y="55" fill="' + c.text + '" text-anchor="middle" font-size="11">' + Math.round(call.network.roundTripTime) + 'ms RTT · ' + call.network.packetLoss.toFixed(1) + '% loss</text><rect x="400" y="45" width="120" height="50" rx="4" fill="' + c.purpleDark + '" /><text x="460" y="68" fill="white" text-anchor="middle" font-size="12" font-weight="600">Teams Media</text><text x="460" y="82" fill="white" text-anchor="middle" font-size="9">Relay Edge</text><line x1="520" y1="70" x2="620" y2="70" stroke="' + strokeColor + '" stroke-width="3" /><text x="570" y="55" fill="' + c.text + '" text-anchor="middle" font-size="11">Peer</text><circle cx="640" cy="70" r="26" fill="' + c.purple + '" /><text x="640" y="75" fill="white" text-anchor="middle" font-size="12" font-weight="600">User</text></svg>';
}

function showCallDetail(callId) {
    var call = callData.find(function(c){return c.callId === callId;});
    if (!call) return;
    var netAlerts = call.alerts.length ? call.alerts.map(function(a){return '<span class="severity-badge ' + a.severity + '">' + a.message + '</span>';}).join(' ') : '<span style="color: var(--quality-good); font-weight: 600;">✓ No issues detected</span>';
    var timelineHtml = '<div class="timeline-bar">';
    call.timelineSegments.forEach(function(seg, i) { timelineHtml += '<div class="timeline-segment ' + seg.rating + '" style="width: ' + (100/call.timelineSegments.length) + '%;" title="Segment ' + (i+1) + ': MOS ' + seg.mos.toFixed(2) + '"></div>'; });
    timelineHtml += '</div><div class="timeline-legend"><span class="good">Good</span><span class="acceptable">Acceptable</span><span class="poor">Poor</span></div>';
    var participantsHtml = call.participants.map(function(p) {
        var pMos = Math.max(1, Math.min(5, call.audio.mosScore + (Math.random()-0.5) * 0.4));
        var pJitter = Math.max(0, call.network.jitter + (Math.random()-0.5) * 5);
        var pLoss = Math.max(0, call.network.packetLoss + (Math.random()-0.5) * 0.5);
        var pRtt = Math.max(5, call.network.roundTripTime + (Math.random()-0.5) * 20);
        return '<div class="participant-card"><div class="participant-header"><div class="avatar">' + getInitials(p.name) + '</div><div class="participant-info" style="flex:1;"><h4>' + escapeHtml(p.name) + (p.role === 'organizer' ? ' <span class="type-badge">Organizer</span>' : '') + '</h4><p>' + escapeHtml(p.email) + ' · ' + escapeHtml(p.department) + ' · ' + escapeHtml(p.location) + '</p></div><a class="panel-action" onclick="drillUser(\'' + p.email + '\')">View user →</a></div><div class="metric-grid">' +
            metricTile('MOS', pMos.toFixed(2), pMos < 3.5 ? 'bad' : pMos < 4 ? 'warn' : 'good') +
            metricTile('Jitter', Math.round(pJitter) + ' ms', pJitter > 30 ? 'bad' : pJitter > 20 ? 'warn' : 'good') +
            metricTile('Packet Loss', pLoss.toFixed(2) + '%', pLoss > 3 ? 'bad' : pLoss > 1 ? 'warn' : 'good') +
            metricTile('RTT', Math.round(pRtt) + ' ms', pRtt > 200 ? 'bad' : pRtt > 100 ? 'warn' : 'good') +
            metricTile('Client', call.device.clientType, '') + metricTile('OS', call.device.os, '') +
        '</div></div>';
    }).join('');
    var videoHtml = '';
    if (call.video) {
        videoHtml = '<div class="section-title">Video Quality</div><div class="metric-grid">' +
            metricTile('Resolution (Send)', call.video.resolutionSend, '') +
            metricTile('Resolution (Recv)', call.video.resolutionRecv, '') +
            metricTile('Frame Rate (Send)', call.video.frameRateSend + ' fps', call.video.frameRateSend < 20 ? 'warn' : 'good') +
            metricTile('Frame Rate (Recv)', call.video.frameRateRecv + ' fps', call.video.frameRateRecv < 20 ? 'warn' : 'good') +
            metricTile('Freezes', call.video.freezeCount, call.video.freezeCount > 3 ? 'bad' : call.video.freezeCount > 0 ? 'warn' : 'good') +
            metricTile('Freeze Duration', call.video.freezeDuration + 's', call.video.freezeDuration > 5 ? 'bad' : 'good') +
            metricTile('Codec', call.video.videoCodec, '') +
            metricTile('Camera', call.video.cameraDevice || 'N/A', '') +
        '</div>';
    }
    var body = '<div class="call-detail-summary"><div class="call-detail-item"><div class="label">Call ID</div><div class="value">' + call.callId + '</div></div><div class="call-detail-item"><div class="label">Start</div><div class="value">' + formatDateTime(call.startTime) + '</div></div><div class="call-detail-item"><div class="label">Duration</div><div class="value">' + formatDuration(call.duration) + '</div></div><div class="call-detail-item"><div class="label">Type</div><div class="value"><span class="type-badge">' + call.callType + '</span></div></div><div class="call-detail-item"><div class="label">Participants</div><div class="value">' + call.participants.length + '</div></div><div class="call-detail-item"><div class="label">Quality</div><div class="value"><span class="quality-badge ' + call.qualityRating + '">' + call.qualityRating + '</span></div></div></div>' +
        '<div class="section-title">Quality Timeline</div>' + timelineHtml +
        '<div class="section-title">Health Status</div><div style="padding: 8px;">' + netAlerts + '</div>' +
        '<div class="section-title">Network Path</div>' + buildNetworkPathSvg(call) +
        '<div class="section-title">Aggregate Network Metrics</div><div class="metric-grid">' +
            metricTile('Jitter', Math.round(call.network.jitter) + ' ms', call.network.jitter > 30 ? 'bad' : call.network.jitter > 20 ? 'warn' : 'good') +
            metricTile('Packet Loss', call.network.packetLoss.toFixed(2) + '%', call.network.packetLoss > 3 ? 'bad' : call.network.packetLoss > 1 ? 'warn' : 'good') +
            metricTile('RTT', Math.round(call.network.roundTripTime) + ' ms', call.network.roundTripTime > 200 ? 'bad' : call.network.roundTripTime > 100 ? 'warn' : 'good') +
            metricTile('Bandwidth', Math.round(call.network.bandwidthEstimate) + ' kbps', '') +
            metricTile('Subnet', call.network.subnet, '') +
            metricTile('Network', call.network.networkType.toUpperCase(), '') +
            metricTile('VPN', call.network.vpnUsed ? 'Yes' : 'No', '') +
        '</div>' +
        '<div class="section-title">Audio Quality</div><div class="metric-grid">' +
            metricTile('MOS Score', call.audio.mosScore.toFixed(2), call.audio.mosScore < 3.5 ? 'bad' : call.audio.mosScore < 4 ? 'warn' : 'good') +
            metricTile('Echo %', call.audio.echoPercentage.toFixed(2) + '%', call.audio.echoPercentage > 1 ? 'warn' : 'good') +
            metricTile('Noise Suppression', call.audio.noiseSuppression ? 'On' : 'Off', call.audio.noiseSuppression ? 'good' : 'warn') +
            metricTile('Codec', call.audio.audioCodec, '') +
            metricTile('Headset', call.audio.speakerDevice, '') +
        '</div>' + videoHtml +
        '<div class="section-title">Device Info</div><div class="metric-grid">' +
            metricTile('OS', call.device.os, '') + metricTile('Teams Version', call.device.teamsVersion, '') + metricTile('Client', call.device.clientType, '') + metricTile('Firmware', call.device.firmwareVersion, '') + metricTile('Driver', call.device.driver, '') +
        '</div>' +
        '<div class="section-title">Participants (' + call.participants.length + ')</div>' + participantsHtml;
    document.getElementById('modalTitle').innerHTML = 'Call Details<small>' + call.callId + ' · ' + formatDateTime(call.startTime) + '</small>';
    document.getElementById('modalBody').innerHTML = body;
    document.getElementById('modalOverlay').classList.add('show');
}

function renderUserAnalytics(container, filtered) {
    var byUser = {};
    filtered.forEach(function(c) { c.participants.forEach(function(p) { if (!byUser[p.email]) byUser[p.email] = { name: p.name, email: p.email, department: p.department, location: p.location, calls: 0, mosSum: 0, poorCount: 0, duration: 0 }; var u = byUser[p.email]; u.calls++; u.mosSum += c.audio.mosScore; u.duration += c.duration; if (c.qualityRating === 'poor') u.poorCount++; }); });
    var users = Object.keys(byUser).map(function(k){ var u = byUser[k]; return { name: u.name, email: u.email, department: u.department, location: u.location, calls: u.calls, avgMos: u.mosSum/u.calls, poorPct: (u.poorCount/u.calls)*100, poorCount: u.poorCount, minutes: Math.round(u.duration/60) }; });
    var byDept = {};
    users.forEach(function(u) { if (!byDept[u.department]) byDept[u.department] = { totalMos: 0, count: 0, calls: 0 }; byDept[u.department].totalMos += u.avgMos; byDept[u.department].count += 1; byDept[u.department].calls += u.calls; });
    var deptRows = Object.keys(byDept).map(function(k){ return { department: k, users: byDept[k].count, calls: byDept[k].calls, avgMos: byDept[k].totalMos/byDept[k].count }; }).sort(function(a,b){return b.avgMos - a.avgMos;});
    var worst = users.filter(function(u){return u.calls >= 3;}).sort(function(a,b){return a.avgMos - b.avgMos;}).slice(0, 15);
    container.innerHTML = '<div class="view-header"><div><div class="view-title">User Analytics</div><div class="view-subtitle">Per-user quality scores, department comparison, location analysis</div></div></div>' +
        '<div class="kpi-grid">' + kpiCard('Unique Users', users.length.toLocaleString(), '', 'neutral', 'kpiU1', '') + kpiCard('Avg Calls / User', (users.reduce(function(s,u){return s+u.calls;},0) / (users.length||1)).toFixed(1), '', 'neutral', 'kpiU2', '') + kpiCard('Users w/ Poor Quality', users.filter(function(u){return u.poorPct > 20;}).length.toLocaleString(), 'Users with 20%+ poor calls', 'down', 'kpiU3', '') + kpiCard('Avg User MOS', (users.reduce(function(s,u){return s+u.avgMos;},0) / (users.length||1)).toFixed(2), '', 'up', 'kpiU4', '') + '</div>' +
        '<div class="card-grid two-thirds"><div class="panel"><div class="panel-header"><div class="panel-title">Average MOS by Department</div></div><div class="chart-container tall"><canvas id="chartDept"></canvas></div></div><div class="panel"><div class="panel-header"><div class="panel-title">Quality by Location</div></div><div class="chart-container tall"><canvas id="chartLocation"></canvas></div></div></div>' +
        '<div class="panel"><div class="panel-header"><div><div class="panel-title">Most Affected Users</div><div class="panel-subtitle">Users with lowest average MOS (min. 3 calls). Click a row to drill into their calls.</div></div></div><div class="table-wrapper"><table class="data-table"><thead><tr><th>User</th><th>Department</th><th>Location</th><th>Calls</th><th>Minutes</th><th>Avg MOS</th><th>Poor Calls</th><th>Poor %</th></tr></thead><tbody>' +
            worst.map(function(u) { return '<tr onclick="drillUser(\'' + u.email + '\')"><td><div style="display: flex; align-items: center; gap: 8px;"><div class="avatar" style="width: 28px; height: 28px; font-size: 11px;">' + getInitials(u.name) + '</div><div><strong>' + escapeHtml(u.name) + '</strong><br><small style="color: var(--text-secondary);">' + escapeHtml(u.email) + '</small></div></div></td><td>' + escapeHtml(u.department) + '</td><td>' + escapeHtml(u.location) + '</td><td>' + u.calls + '</td><td>' + u.minutes + '</td><td>' + qualityCell(u.avgMos.toFixed(2), u.avgMos < 3.5 ? 'poor' : u.avgMos < 4 ? 'acceptable' : 'good') + '</td><td>' + u.poorCount + '</td><td>' + qualityCell(u.poorPct.toFixed(0) + '%', u.poorPct > 25 ? 'poor' : u.poorPct > 10 ? 'acceptable' : 'good') + '</td></tr>'; }).join('') +
        '</tbody></table></div></div>' +
        '<div class="card-grid cols-2"><div class="panel"><div class="panel-header"><div class="panel-title">Department Summary</div></div><table class="data-table"><thead><tr><th>Department</th><th>Users</th><th>Calls</th><th>Avg MOS</th></tr></thead><tbody>' +
            deptRows.map(function(d) { return '<tr onclick="filterByDept(\'' + d.department + '\')"><td><strong>' + escapeHtml(d.department) + '</strong></td><td>' + d.users + '</td><td>' + d.calls + '</td><td>' + qualityCell(d.avgMos.toFixed(2), d.avgMos < 3.5 ? 'poor' : d.avgMos < 4 ? 'acceptable' : 'good') + '</td></tr>'; }).join('') +
        '</tbody></table></div><div class="panel"><div class="panel-header"><div class="panel-title">Location Quality Ranking</div></div><div id="locationRanking"></div></div></div>';
    buildUserCharts(deptRows, filtered);
    buildLocationRanking(filtered);
}

function buildUserCharts(deptRows, filtered) {
    var c = chartColors(), opts = commonChartOptions();
    var dc = document.getElementById('chartDept');
    if (dc) { var d1 = JSON.parse(JSON.stringify(opts)); d1.indexAxis = 'y'; d1.plugins.legend = { display: false }; d1.plugins.tooltip = opts.plugins.tooltip; d1.scales.x.min = 1; d1.scales.x.max = 5; charts.chartDept = new Chart(dc, { type: 'bar', data: { labels: deptRows.map(function(d){return d.department;}), datasets: [{ data: deptRows.map(function(d){return d.avgMos;}), backgroundColor: deptRows.map(function(d){return d.avgMos < 3.5 ? c.poor : d.avgMos < 4 ? c.acceptable : c.good;}) }] }, options: d1 }); }
    var bl = {};
    filtered.forEach(function(cx) { cx.participants.forEach(function(p) { if (!bl[p.location]) bl[p.location] = { mosSum: 0, count: 0 }; bl[p.location].mosSum += cx.audio.mosScore; bl[p.location].count += 1; }); });
    var lr = Object.keys(bl).map(function(k){ return { location: k, avgMos: bl[k].mosSum/bl[k].count }; }).sort(function(a,b){return b.avgMos - a.avgMos;});
    var lc = document.getElementById('chartLocation');
    if (lc) { var l1 = JSON.parse(JSON.stringify(opts)); l1.indexAxis = 'y'; l1.plugins.legend = { display: false }; l1.plugins.tooltip = opts.plugins.tooltip; l1.scales.x.min = 1; l1.scales.x.max = 5; charts.chartLocation = new Chart(lc, { type: 'bar', data: { labels: lr.map(function(l){return l.location;}), datasets: [{ data: lr.map(function(l){return l.avgMos;}), backgroundColor: lr.map(function(l){return l.avgMos < 3.5 ? c.poor : l.avgMos < 4 ? c.acceptable : c.good;}) }] }, options: l1 }); }
}

function buildLocationRanking(filtered) {
    var bl = {};
    filtered.forEach(function(cx) { cx.participants.forEach(function(p) { if (!bl[p.location]) bl[p.location] = { mosSum: 0, count: 0, poor: 0 }; bl[p.location].mosSum += cx.audio.mosScore; bl[p.location].count += 1; if (cx.qualityRating === 'poor') bl[p.location].poor++; }); });
    var rows = Object.keys(bl).map(function(k){ return { location: k, avgMos: bl[k].mosSum/bl[k].count, count: bl[k].count, poorPct: bl[k].poor/bl[k].count*100 }; }).sort(function(a,b){return a.avgMos - b.avgMos;});
    var html = '<table class="data-table"><thead><tr><th>Location</th><th>Calls</th><th>Avg MOS</th><th>Poor</th></tr></thead><tbody>';
    rows.forEach(function(r) { html += '<tr onclick="filterByLocation(\'' + r.location + '\')"><td><strong>' + escapeHtml(r.location) + '</strong></td><td>' + r.count + '</td><td>' + qualityCell(r.avgMos.toFixed(2), r.avgMos < 3.5 ? 'poor' : r.avgMos < 4 ? 'acceptable' : 'good') + '</td><td>' + qualityCell(r.poorPct.toFixed(0)+'%', r.poorPct > 25 ? 'poor' : r.poorPct > 10 ? 'acceptable' : 'good') + '</td></tr>'; });
    document.getElementById('locationRanking').innerHTML = html + '</tbody></table>';
}

function renderNetworkAnalysis(container, filtered) {
    var avgJitter = filtered.reduce(function(s,c){return s+c.network.jitter;},0) / (filtered.length||1);
    var avgLoss = filtered.reduce(function(s,c){return s+c.network.packetLoss;},0) / (filtered.length||1);
    var avgRtt = filtered.reduce(function(s,c){return s+c.network.roundTripTime;},0) / (filtered.length||1);
    var avgBw = filtered.reduce(function(s,c){return s+c.network.bandwidthEstimate;},0) / (filtered.length||1);
    container.innerHTML = '<div class="view-header"><div><div class="view-title">Network Analysis</div><div class="view-subtitle">Distribution of network metrics, subnet analysis, time-based patterns</div></div></div>' +
        '<div class="kpi-grid">' + kpiCard('Avg Jitter', Math.round(avgJitter) + ' ms', '', avgJitter < 20 ? 'up' : 'down', 'kpiN1', '') + kpiCard('Avg Packet Loss', avgLoss.toFixed(2) + '%', '', avgLoss < 1 ? 'up' : 'down', 'kpiN2', '') + kpiCard('Avg RTT', Math.round(avgRtt) + ' ms', '', avgRtt < 100 ? 'up' : 'down', 'kpiN3', '') + kpiCard('Avg Bandwidth', Math.round(avgBw) + ' kbps', '', 'neutral', 'kpiN4', '') + '</div>' +
        '<div class="card-grid cols-3"><div class="panel"><div class="panel-header"><div class="panel-title">Jitter Distribution</div></div><div class="chart-container"><canvas id="chartJitter"></canvas></div></div><div class="panel"><div class="panel-header"><div class="panel-title">Packet Loss Distribution</div></div><div class="chart-container"><canvas id="chartLoss"></canvas></div></div><div class="panel"><div class="panel-header"><div class="panel-title">RTT Distribution</div></div><div class="chart-container"><canvas id="chartRtt"></canvas></div></div></div>' +
        '<div class="card-grid two-thirds"><div class="panel"><div class="panel-header"><div><div class="panel-title">Quality Heatmap · Time of Day × Day of Week</div><div class="panel-subtitle">Average MOS score. Darker = better quality.</div></div></div><div id="heatmapContainer"></div></div><div class="panel"><div class="panel-header"><div class="panel-title">Network Type Performance</div></div><div class="chart-container tall"><canvas id="chartNetPerf"></canvas></div></div></div>' +
        '<div class="panel"><div class="panel-header"><div><div class="panel-title">Subnet Deep Dive</div><div class="panel-subtitle">Full network path analysis by subnet. Click a row to filter.</div></div></div><div class="table-wrapper">' + buildSubnetTable(filtered) + '</div></div>';
    buildNetworkCharts(filtered);
    buildHeatmap(filtered);
    buildNetPerfChart(filtered);
}

function buildNetworkCharts(filtered) {
    var c = chartColors(), opts = commonChartOptions();
    var jb = [0,0,0,0,0,0];
    filtered.forEach(function(cx) { var j = cx.network.jitter; if (j < 10) jb[0]++; else if (j < 20) jb[1]++; else if (j < 30) jb[2]++; else if (j < 40) jb[3]++; else if (j < 60) jb[4]++; else jb[5]++; });
    var jc = document.getElementById('chartJitter');
    if (jc) charts.chartJitter = new Chart(jc, { type: 'bar', data: { labels: ['<10','10-20','20-30','30-40','40-60','60+'], datasets: [{ data: jb, backgroundColor: [c.good, c.good, c.acceptable, c.acceptable, c.poor, c.poor] }] }, options: Object.assign({}, opts, { plugins: Object.assign({}, opts.plugins, { legend: { display: false } }) }) });
    var lb = [0,0,0,0,0,0];
    filtered.forEach(function(cx) { var l = cx.network.packetLoss; if (l < 0.5) lb[0]++; else if (l < 1) lb[1]++; else if (l < 2) lb[2]++; else if (l < 5) lb[3]++; else if (l < 10) lb[4]++; else lb[5]++; });
    var lc = document.getElementById('chartLoss');
    if (lc) charts.chartLoss = new Chart(lc, { type: 'bar', data: { labels: ['<0.5%','0.5-1%','1-2%','2-5%','5-10%','10%+'], datasets: [{ data: lb, backgroundColor: [c.good, c.good, c.acceptable, c.acceptable, c.poor, c.poor] }] }, options: Object.assign({}, opts, { plugins: Object.assign({}, opts.plugins, { legend: { display: false } }) }) });
    var rb = [0,0,0,0,0,0];
    filtered.forEach(function(cx) { var r = cx.network.roundTripTime; if (r < 50) rb[0]++; else if (r < 100) rb[1]++; else if (r < 150) rb[2]++; else if (r < 200) rb[3]++; else if (r < 300) rb[4]++; else rb[5]++; });
    var rc = document.getElementById('chartRtt');
    if (rc) charts.chartRtt = new Chart(rc, { type: 'bar', data: { labels: ['<50ms','50-100','100-150','150-200','200-300','300+'], datasets: [{ data: rb, backgroundColor: [c.good, c.good, c.acceptable, c.acceptable, c.poor, c.poor] }] }, options: Object.assign({}, opts, { plugins: Object.assign({}, opts.plugins, { legend: { display: false } }) }) });
}

function buildHeatmap(filtered) {
    var grid = {};
    for (var d = 0; d < 7; d++) { grid[d] = {}; for (var h = 0; h < 24; h++) grid[d][h] = { sum: 0, count: 0 }; }
    filtered.forEach(function(c) { var d = c.startTime.getDay(), h = c.startTime.getHours(); grid[d][h].sum += c.audio.mosScore; grid[d][h].count++; });
    var days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    var html = '<div class="heatmap-container"><table class="heatmap-table"><thead><tr><th></th>';
    for (var h = 0; h < 24; h++) html += '<th>' + h + '</th>';
    html += '</tr></thead><tbody>';
    for (var d = 0; d < 7; d++) {
        html += '<tr><th>' + days[d] + '</th>';
        for (var h = 0; h < 24; h++) {
            var cell = grid[d][h];
            if (cell.count === 0) html += '<td class="empty" title="No calls"></td>';
            else { var mos = cell.sum / cell.count; html += '<td style="background:' + mosColor(mos) + '" title="' + days[d] + ' ' + h + ':00 · ' + cell.count + ' calls · MOS ' + mos.toFixed(2) + '" onclick="filterByHour(' + d + ',' + h + ')">' + cell.count + '</td>'; }
        }
        html += '</tr>';
    }
    html += '</tbody></table><div class="heatmap-legend">Worst<div class="heatmap-legend-scale"><div style="background:' + mosColor(1.5) + '"></div><div style="background:' + mosColor(2.5) + '"></div><div style="background:' + mosColor(3.5) + '"></div><div style="background:' + mosColor(4.2) + '"></div><div style="background:' + mosColor(4.8) + '"></div></div>Best</div></div>';
    document.getElementById('heatmapContainer').innerHTML = html;
}

function buildNetPerfChart(filtered) {
    var c = chartColors(), opts = commonChartOptions();
    var bn = {};
    NETWORK_TYPES.forEach(function(t){bn[t] = { mos: 0, jitter: 0, loss: 0, rtt: 0, count: 0 };});
    filtered.forEach(function(cx) { var n = cx.network.networkType; if (!bn[n]) return; bn[n].mos += cx.audio.mosScore; bn[n].jitter += cx.network.jitter; bn[n].loss += cx.network.packetLoss; bn[n].rtt += cx.network.roundTripTime; bn[n].count++; });
    var canvas = document.getElementById('chartNetPerf');
    if (!canvas) return;
    var colors = [c.purple, c.good, c.acceptable, c.blue];
    charts.chartNetPerf = new Chart(canvas, { type: 'radar', data: { labels: ['MOS (x20)','Low Jitter','Low Loss','Low RTT'], datasets: NETWORK_TYPES.map(function(t, i) { var b = bn[t]; if (b.count === 0) return { label: t, data: [0,0,0,0], borderColor: colors[i%4] }; return { label: t, data: [(b.mos/b.count) * 20, Math.max(0, 100 - (b.jitter/b.count)), Math.max(0, 100 - (b.loss/b.count)*10), Math.max(0, 100 - (b.rtt/b.count)/3)], borderColor: colors[i%4], backgroundColor: colors[i%4]+'33', borderWidth: 2 }; }) }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: c.text, font: { size: 11 } } }, tooltip: opts.plugins.tooltip }, scales: { r: { beginAtZero: true, max: 100, ticks: { color: c.text, backdropColor: 'transparent', font: { size: 9 } }, grid: { color: c.grid }, pointLabels: { color: c.text, font: { size: 11 } } } } } });
}

function buildSubnetTable(filtered) {
    var bs = {};
    filtered.forEach(function(c) { var s = c.network.subnet; if (!bs[s]) bs[s] = { count: 0, mos: 0, jitter: 0, loss: 0, rtt: 0, bw: 0, poor: 0, users: new Set() }; bs[s].count++; bs[s].mos += c.audio.mosScore; bs[s].jitter += c.network.jitter; bs[s].loss += c.network.packetLoss; bs[s].rtt += c.network.roundTripTime; bs[s].bw += c.network.bandwidthEstimate; if (c.qualityRating === 'poor') bs[s].poor++; c.participants.forEach(function(p){bs[s].users.add(p.email);}); });
    var rows = Object.keys(bs).map(function(k){ var b = bs[k]; return { subnet: k, count: b.count, users: b.users.size, avgMos: b.mos/b.count, avgJitter: b.jitter/b.count, avgLoss: b.loss/b.count, avgRtt: b.rtt/b.count, avgBw: b.bw/b.count, poorPct: b.poor/b.count*100 }; }).sort(function(a,b){return a.avgMos - b.avgMos;});
    var html = '<table class="data-table"><thead><tr><th>Subnet</th><th>Calls</th><th>Users</th><th>Avg MOS</th><th>Jitter</th><th>Packet Loss</th><th>RTT</th><th>Bandwidth</th><th>Poor %</th></tr></thead><tbody>';
    rows.forEach(function(r) { html += '<tr onclick="filterBySubnet(\'' + r.subnet + '\')"><td><strong>' + r.subnet + '</strong></td><td>' + r.count + '</td><td>' + r.users + '</td><td>' + qualityCell(r.avgMos.toFixed(2), r.avgMos < 3.5 ? 'poor' : r.avgMos < 4 ? 'acceptable' : 'good') + '</td><td>' + qualityCell(Math.round(r.avgJitter) + 'ms', r.avgJitter > 30 ? 'poor' : r.avgJitter > 20 ? 'acceptable' : 'good') + '</td><td>' + qualityCell(r.avgLoss.toFixed(2)+'%', r.avgLoss > 3 ? 'poor' : r.avgLoss > 1.5 ? 'acceptable' : 'good') + '</td><td>' + qualityCell(Math.round(r.avgRtt)+'ms', r.avgRtt > 200 ? 'poor' : r.avgRtt > 100 ? 'acceptable' : 'good') + '</td><td>' + Math.round(r.avgBw) + ' kbps</td><td>' + qualityCell(r.poorPct.toFixed(0)+'%', r.poorPct > 25 ? 'poor' : r.poorPct > 10 ? 'acceptable' : 'good') + '</td></tr>'; });
    return html + '</tbody></table>';
}

function renderDeviceHealth(container, filtered) {
    var bh = {};
    filtered.forEach(function(c) { var k = c.device.headset; if (!bh[k]) bh[k] = { count: 0, mos: 0, poor: 0, echo: 0 }; bh[k].count++; bh[k].mos += c.audio.mosScore; bh[k].echo += c.audio.echoPercentage; if (c.qualityRating === 'poor') bh[k].poor++; });
    var hr = Object.keys(bh).map(function(k){ var b = bh[k]; return { device: k, count: b.count, avgMos: b.mos/b.count, poor: b.poor, poorPct: b.poor/b.count*100, avgEcho: b.echo/b.count }; }).sort(function(a,b){return a.avgMos - b.avgMos;});
    var bc = {};
    filtered.filter(function(c){return c.video;}).forEach(function(c){ var k = c.video.cameraDevice || 'Unknown'; if (!bc[k]) bc[k] = { count: 0, freezes: 0, freezeCount: 0 }; bc[k].count++; bc[k].freezes += c.video.freezeCount; bc[k].freezeCount += (c.video.freezeCount > 0 ? 1 : 0); });
    var bo = {};
    filtered.forEach(function(c) { bo[c.device.os] = (bo[c.device.os]||0) + 1; });
    var bcl = {};
    CLIENT_TYPES.forEach(function(t){bcl[t] = { count: 0, mos: 0 };});
    filtered.forEach(function(c) { if (!bcl[c.device.clientType]) bcl[c.device.clientType] = { count: 0, mos: 0 }; bcl[c.device.clientType].count++; bcl[c.device.clientType].mos += c.audio.mosScore; });
    container.innerHTML = '<div class="view-header"><div><div class="view-title">Device Health</div><div class="view-subtitle">Headset, camera, OS, and client device performance rankings</div></div></div>' +
        '<div class="kpi-grid">' + kpiCard('Unique Headsets', Object.keys(bh).length, '', 'neutral', 'kpiD1', '') + kpiCard('Unique Cameras', Object.keys(bc).length, '', 'neutral', 'kpiD2', '') + kpiCard('OS Versions', Object.keys(bo).length, '', 'neutral', 'kpiD3', '') + kpiCard('Client Types', CLIENT_TYPES.length, '', 'neutral', 'kpiD4', '') + '</div>' +
        '<div class="card-grid cols-2"><div class="panel"><div class="panel-header"><div class="panel-title">Client Type Distribution</div></div><div class="chart-container"><canvas id="chartClientMix"></canvas></div></div><div class="panel"><div class="panel-header"><div class="panel-title">OS Version Breakdown</div></div><div class="chart-container"><canvas id="chartOsMix"></canvas></div></div></div>' +
        '<div class="panel"><div class="panel-header"><div><div class="panel-title">Headset Quality Ranking</div><div class="panel-subtitle">Sorted by average MOS (worst first)</div></div></div><div class="table-wrapper"><table class="data-table"><thead><tr><th>Headset</th><th>Calls</th><th>Avg MOS</th><th>Avg Echo</th><th>Poor Calls</th><th>Poor %</th></tr></thead><tbody>' +
            hr.map(function(h) { return '<tr><td><strong>' + escapeHtml(h.device) + '</strong></td><td>' + h.count + '</td><td>' + qualityCell(h.avgMos.toFixed(2), h.avgMos < 3.5 ? 'poor' : h.avgMos < 4 ? 'acceptable' : 'good') + '</td><td>' + h.avgEcho.toFixed(2) + '%</td><td>' + h.poor + '</td><td>' + qualityCell(h.poorPct.toFixed(0)+'%', h.poorPct > 25 ? 'poor' : h.poorPct > 10 ? 'acceptable' : 'good') + '</td></tr>'; }).join('') +
        '</tbody></table></div></div>' +
        '<div class="card-grid cols-2"><div class="panel"><div class="panel-header"><div class="panel-title">Camera Performance</div></div><table class="data-table"><thead><tr><th>Camera</th><th>Calls</th><th>Video Freezes</th><th>Calls w/ Freezes</th></tr></thead><tbody>' +
            Object.keys(bc).map(function(k) { var b = bc[k]; return '<tr><td>' + escapeHtml(k) + '</td><td>' + b.count + '</td><td>' + b.freezes + '</td><td>' + qualityCell((b.freezeCount/b.count*100).toFixed(0)+'%', (b.freezeCount/b.count) > 0.3 ? 'poor' : (b.freezeCount/b.count) > 0.1 ? 'acceptable' : 'good') + '</td></tr>'; }).join('') +
        '</tbody></table></div><div class="panel"><div class="panel-header"><div class="panel-title">Client Type Performance</div></div><table class="data-table"><thead><tr><th>Client</th><th>Calls</th><th>Avg MOS</th></tr></thead><tbody>' +
            CLIENT_TYPES.map(function(t) { var b = bcl[t]; if (!b.count) return ''; return '<tr onclick="filterByClient(\'' + t + '\')"><td><strong>' + t + '</strong></td><td>' + b.count + '</td><td>' + qualityCell((b.mos/b.count).toFixed(2), (b.mos/b.count) < 3.5 ? 'poor' : (b.mos/b.count) < 4 ? 'acceptable' : 'good') + '</td></tr>'; }).join('') +
        '</tbody></table></div></div>';
    buildDeviceCharts(bcl, bo);
}

function buildDeviceCharts(bcl, bo) {
    var c = chartColors(), opts = commonChartOptions();
    var cc = document.getElementById('chartClientMix');
    if (cc) charts.chartClientMix = new Chart(cc, { type: 'doughnut', data: { labels: CLIENT_TYPES, datasets: [{ data: CLIENT_TYPES.map(function(t){return bcl[t] ? bcl[t].count : 0;}), backgroundColor: [c.purple, c.purpleLight, c.blue, c.good, c.acceptable], borderColor: c.border, borderWidth: 2 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '55%', plugins: { legend: { position: 'right', labels: { color: c.text, font: { size: 11 } } }, tooltip: opts.plugins.tooltip } } });
    var oc = document.getElementById('chartOsMix');
    if (oc) { var osNames = Object.keys(bo); charts.chartOsMix = new Chart(oc, { type: 'doughnut', data: { labels: osNames, datasets: [{ data: osNames.map(function(k){return bo[k];}), backgroundColor: [c.purpleDark, c.purple, c.purpleLight, c.blue, c.good, c.acceptable, c.poor], borderColor: c.border, borderWidth: 2 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '55%', plugins: { legend: { position: 'right', labels: { color: c.text, font: { size: 11 } } }, tooltip: opts.plugins.tooltip } } }); }
}

function renderAlertsView(container, filtered) {
    var alerts = [];
    filtered.forEach(function(c) { c.alerts.forEach(function(a) { alerts.push({ call: c, alert: a }); }); });
    var critical = alerts.filter(function(a){return a.alert.severity === 'critical';}).length;
    var warning = alerts.filter(function(a){return a.alert.severity === 'warning';}).length;
    var info = alerts.filter(function(a){return a.alert.severity === 'info';}).length;
    var byType = {};
    alerts.forEach(function(a) { if (!byType[a.alert.type]) byType[a.alert.type] = { count: 0, critical: 0, warning: 0 }; byType[a.alert.type].count++; if (a.alert.severity === 'critical') byType[a.alert.type].critical++; else if (a.alert.severity === 'warning') byType[a.alert.type].warning++; });
    var typeLabels = { lowMos: 'Low MOS Score', highJitter: 'High Jitter', packetLoss: 'Packet Loss', highRtt: 'High Round-Trip Time', videoFreeze: 'Video Freezes' };
    container.innerHTML = '<div class="view-header"><div><div class="view-title">Alerts & Thresholds</div><div class="view-subtitle">Automatically generated quality alerts. Adjust thresholds in Settings.</div></div><button class="header-btn primary" onclick="navigateTo(\'settings\')">Configure Thresholds</button></div>' +
        '<div class="alert-summary"><div class="alert-summary-card critical"><div><div class="label">Critical</div><div class="count">' + critical.toLocaleString() + '</div></div><div style="font-size: 32px;">⛔</div></div><div class="alert-summary-card warning"><div><div class="label">Warnings</div><div class="count">' + warning.toLocaleString() + '</div></div><div style="font-size: 32px;">⚠</div></div><div class="alert-summary-card info"><div><div class="label">Info</div><div class="count">' + info.toLocaleString() + '</div></div><div style="font-size: 32px;">ⓘ</div></div></div>' +
        '<div class="card-grid cols-2"><div class="panel"><div class="panel-header"><div class="panel-title">Alert Breakdown by Type</div></div><div class="chart-container"><canvas id="chartAlertType"></canvas></div></div><div class="panel"><div class="panel-header"><div class="panel-title">Alert Timeline (30 days)</div></div><div class="chart-container"><canvas id="chartAlertTimeline"></canvas></div></div></div>' +
        '<div class="panel"><div class="panel-header"><div><div class="panel-title">Alert History</div><div class="panel-subtitle">' + alerts.length.toLocaleString() + ' alerts · Most recent first · Click for call details</div></div></div><div class="table-wrapper" style="max-height: calc(100vh - 460px);"><table class="data-table"><thead><tr><th>Time</th><th>Severity</th><th>Type</th><th>Message</th><th>Call ID</th><th>Call Type</th><th>Participants</th></tr></thead><tbody>' +
            alerts.slice(0, 200).map(function(a) { return '<tr onclick="showCallDetail(\'' + a.call.callId + '\')"><td>' + formatDateTime(a.call.startTime) + '</td><td><span class="severity-badge ' + a.alert.severity + '">' + a.alert.severity + '</span></td><td>' + (typeLabels[a.alert.type] || a.alert.type) + '</td><td>' + escapeHtml(a.alert.message) + '</td><td><strong style="color: var(--teams-purple)">' + a.call.callId + '</strong></td><td><span class="type-badge">' + a.call.callType + '</span></td><td>' + a.call.participants.slice(0,2).map(function(p){return escapeHtml(p.name);}).join(', ') + (a.call.participants.length > 2 ? ' +' + (a.call.participants.length-2) : '') + '</td></tr>'; }).join('') +
        '</tbody></table></div></div>';
    buildAlertCharts(byType, alerts, typeLabels);
    document.getElementById('navBadgeAlerts').textContent = critical + warning;
}

function buildAlertCharts(byType, alerts, typeLabels) {
    var c = chartColors(), opts = commonChartOptions();
    var atc = document.getElementById('chartAlertType');
    if (atc) { var types = Object.keys(byType); charts.chartAlertType = new Chart(atc, { type: 'bar', data: { labels: types.map(function(t){return typeLabels[t] || t;}), datasets: [{ label: 'Critical', data: types.map(function(t){return byType[t].critical;}), backgroundColor: c.poor, stack: 'a' }, { label: 'Warning', data: types.map(function(t){return byType[t].warning;}), backgroundColor: c.acceptable, stack: 'a' }] }, options: Object.assign({}, opts, { scales: { x: Object.assign({stacked:true}, opts.scales.x), y: Object.assign({stacked:true}, opts.scales.y) } }) }); }
    var days = 30, buckets = [], end = new Date(); end.setHours(23,59,59,999);
    for (var d = days - 1; d >= 0; d--) { var start = new Date(end.getTime() - d * 86400000); start.setHours(0,0,0,0); var stop = new Date(start.getTime() + 86400000); var day = alerts.filter(function(a){return a.call.startTime >= start && a.call.startTime < stop;}); buckets.push({ date: start, critical: day.filter(function(a){return a.alert.severity === 'critical';}).length, warning: day.filter(function(a){return a.alert.severity === 'warning';}).length }); }
    var atl = document.getElementById('chartAlertTimeline');
    if (atl) charts.chartAlertTimeline = new Chart(atl, { type: 'line', data: { labels: buckets.map(function(b){return b.date.toLocaleDateString('en-US',{month:'short',day:'numeric'});}), datasets: [{ label: 'Critical', data: buckets.map(function(b){return b.critical;}), borderColor: c.poor, backgroundColor: c.poor+'33', tension: 0.3, fill: true }, { label: 'Warning', data: buckets.map(function(b){return b.warning;}), borderColor: c.acceptable, backgroundColor: c.acceptable+'33', tension: 0.3, fill: true }] }, options: opts });
}

function renderSettings(container) {
    container.innerHTML = '<div class="view-header"><div><div class="view-title">Settings</div><div class="view-subtitle">Configure alert thresholds, theme, and data management</div></div></div>' +
        '<div class="settings-section"><h3 style="margin-bottom: 4px;">Appearance</h3><p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 12px;">Customize the dashboard look and feel.</p><div class="settings-row"><div><div class="settings-label">Dark Theme</div><div class="settings-desc">Reduce eye strain in low-light environments</div></div><div class="toggle-switch ' + (currentTheme === 'dark' ? 'on' : '') + '" onclick="toggleTheme()"></div></div></div>' +
        '<div class="settings-section"><h3 style="margin-bottom: 4px;">Alert Thresholds</h3><p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 12px;">Calls that exceed these thresholds trigger alerts.</p>' +
            settingsRow('Minimum MOS Score', 'MOS below this value triggers a warning', 'mosMin', CONFIG.thresholds.mosMin, '0.1') +
            settingsRow('Maximum Jitter (ms)', 'Jitter above this value triggers a warning', 'jitterMax', CONFIG.thresholds.jitterMax, '1') +
            settingsRow('Maximum Packet Loss (%)', 'Packet loss above this triggers a warning', 'packetLossMax', CONFIG.thresholds.packetLossMax, '0.1') +
            settingsRow('Maximum RTT (ms)', 'Round-trip time above this triggers a warning', 'rttMax', CONFIG.thresholds.rttMax, '10') +
            settingsRow('Maximum Video Freezes', 'Number of freezes to trigger a warning', 'freezeMax', CONFIG.thresholds.freezeMax, '1') +
        '</div>' +
        '<div class="settings-section"><h3 style="margin-bottom: 4px;">Data Management</h3><p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 12px;">Import your own call data or regenerate demo data.</p>' +
            '<div class="settings-row"><div><div class="settings-label">Loaded Records</div><div class="settings-desc">' + callData.length.toLocaleString() + ' call records currently in memory</div></div><button class="header-btn" onclick="openUploadDialog()">Upload CSV</button></div>' +
            '<div class="settings-row"><div><div class="settings-label">Export Data</div><div class="settings-desc">Download filtered data as CSV</div></div><button class="header-btn primary" onclick="exportFilteredCSV()">Export CSV</button></div>' +
            '<div class="settings-row"><div><div class="settings-label">Regenerate Demo Data</div><div class="settings-desc">Create a fresh randomized dataset</div></div><button class="header-btn" onclick="refreshData()">Regenerate</button></div>' +
        '</div>' +
        '<div class="settings-section"><h3 style="margin-bottom: 4px;">Azure Deployment</h3><p style="color: var(--text-secondary); font-size: 13px;">This dashboard is a fully static single-file application. See DEPLOY-AZURE.md for full instructions covering Static Web Apps, App Service, and Blob Storage hosting options. Real Teams data can be sourced via the Microsoft Graph Call Records API (CallRecords.Read.All permission required).</p></div>';
}

function settingsRow(label, desc, key, value, step) { return '<div class="settings-row"><div><div class="settings-label">' + label + '</div><div class="settings-desc">' + desc + '</div></div><input class="settings-input" type="number" step="' + step + '" value="' + value + '" onchange="updateThreshold(\'' + key + '\', this.value)" /></div>'; }
function updateThreshold(key, value) { CONFIG.thresholds[key] = parseFloat(value); recomputeAlerts(); if (currentView !== 'settings') onFiltersChanged(); }

function closeModal() { document.getElementById('modalOverlay').classList.remove('show'); }
function openUploadDialog() { document.getElementById('uploadOverlay').classList.add('show'); }
function closeUploadDialog() { document.getElementById('uploadOverlay').classList.remove('show'); }
function loadSampleData() { callData = generateDemoData(); recomputeAlerts(); closeUploadDialog(); onFiltersChanged(); }
function refreshData() { callData = generateDemoData(); recomputeAlerts(); document.getElementById('lastRefresh').textContent = 'Just now'; onFiltersChanged(); }
function toggleTheme() { currentTheme = currentTheme === 'light' ? 'dark' : 'light'; document.body.classList.toggle('dark-theme', currentTheme === 'dark'); try { localStorage.setItem('teamsCqdTheme', currentTheme); } catch(e){} renderCurrentView(); }

function exportFilteredCSV() {
    var filtered = applyFilters(callData);
    var headers = ['CallID','StartTime','EndTime','Duration','CallType','ParticipantCount','QualityRating','MOS','Jitter','PacketLoss','RTT','Bandwidth','Subnet','NetworkType','AudioCodec','Headset','Camera','VideoCodec','ClientType','OS','TeamsVersion','OrganizerEmail','OrganizerDept','OrganizerLocation'];
    var rows = filtered.map(function(c) { var org = c.participants[0] || {}; return [c.callId, c.startTime.toISOString(), c.endTime.toISOString(), c.duration, c.callType, c.participantCount, c.qualityRating, c.audio.mosScore.toFixed(2), c.network.jitter.toFixed(1), c.network.packetLoss.toFixed(2), Math.round(c.network.roundTripTime), Math.round(c.network.bandwidthEstimate), c.network.subnet, c.network.networkType, c.audio.audioCodec, c.audio.speakerDevice, c.video ? c.video.cameraDevice : '', c.video ? c.video.videoCodec : '', c.device.clientType, c.device.os, c.device.teamsVersion, org.email || '', org.department || '', org.location || ''].map(function(v){ return '"' + String(v).replace(/"/g,'""') + '"'; }).join(','); });
    var csv = headers.map(function(h){return '"'+h+'"';}).join(',') + '\n' + rows.join('\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'teams-call-quality-' + new Date().toISOString().slice(0,10) + '.csv'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function importCSV(file) {
    Papa.parse(file, { header: true, dynamicTyping: true, skipEmptyLines: true, complete: function(results) {
        try {
            var imported = results.data.map(function(row) {
                var start = new Date(row.StartTime || row.startTime);
                var duration = parseInt(row.Duration || row.duration || 60);
                return { callId: row.CallID || row.callId || 'IMPORTED-' + Math.random().toString(36).slice(2,8), startTime: start, endTime: new Date(start.getTime() + duration * 1000), duration: duration, callType: row.CallType || row.callType || 'audio', modality: ['audio'], isConference: (row.ParticipantCount || 2) >= 3, participantCount: parseInt(row.ParticipantCount) || 2, participants: [{ name: 'Imported User', email: row.OrganizerEmail || 'imported@contoso.com', department: row.OrganizerDept || 'Unknown', location: row.OrganizerLocation || 'Unknown', role: 'organizer' }], network: { jitter: parseFloat(row.Jitter) || 0, packetLoss: parseFloat(row.PacketLoss) || 0, roundTripTime: parseFloat(row.RTT) || 0, bandwidthEstimate: parseFloat(row.Bandwidth) || 1000, subnet: row.Subnet || '10.0.0.0/24', networkType: row.NetworkType || 'wifi', vpnUsed: false }, audio: { mosScore: parseFloat(row.MOS) || 4.0, echoPercentage: 0.5, noiseSuppression: true, audioCodec: row.AudioCodec || 'SILK', speakerDevice: row.Headset || 'Unknown', micDevice: row.Headset || 'Unknown' }, video: row.Camera ? { resolutionSend: '1280x720', resolutionRecv: '1280x720', frameRateSend: 25, frameRateRecv: 25, freezeCount: 0, freezeDuration: 0, cameraDevice: row.Camera, videoCodec: row.VideoCodec || 'H264' } : null, device: { os: row.OS || 'Windows 11', teamsVersion: row.TeamsVersion || 'imported', clientType: row.ClientType || 'desktop', headset: row.Headset || 'Unknown', camera: row.Camera || null, driver: 'imported', firmwareVersion: 'imported' }, qualityRating: row.QualityRating || 'good', qualityScore: 80, timelineSegments: [], alerts: [] };
            });
            callData = imported; recomputeAlerts(); closeUploadDialog(); onFiltersChanged();
            alert('Imported ' + imported.length + ' calls successfully');
        } catch(e) { alert('Error parsing CSV: ' + e.message); }
    }, error: function(err) { alert('CSV parse error: ' + err.message); } });
}

function init() {
    try { var saved = localStorage.getItem('teamsCqdTheme'); if (saved === 'dark') { currentTheme = 'dark'; document.body.classList.add('dark-theme'); } } catch(e){}
    callData = generateDemoData();
    recomputeAlerts();
    document.querySelectorAll('.nav-item').forEach(function(item) { item.addEventListener('click', function() { navigateTo(item.dataset.view); }); });
    var searchTimer;
    document.getElementById('globalSearch').addEventListener('input', function(e) { clearTimeout(searchTimer); searchTimer = setTimeout(function() { filterState.searchQuery = e.target.value; onFiltersChanged(); }, 250); });
    document.getElementById('dateFrom').addEventListener('change', function(e) { filterState.dateRange.start = e.target.value ? new Date(e.target.value) : null; onFiltersChanged(); });
    document.getElementById('dateTo').addEventListener('change', function(e) { if (e.target.value) { var d = new Date(e.target.value); d.setHours(23,59,59,999); filterState.dateRange.end = d; } else filterState.dateRange.end = null; onFiltersChanged(); });
    var drop = document.getElementById('uploadDrop'), input = document.getElementById('uploadInput');
    drop.addEventListener('click', function(){ input.click(); });
    drop.addEventListener('dragover', function(e){ e.preventDefault(); drop.classList.add('drag-over'); });
    drop.addEventListener('dragleave', function(){ drop.classList.remove('drag-over'); });
    drop.addEventListener('drop', function(e){ e.preventDefault(); drop.classList.remove('drag-over'); if (e.dataTransfer.files.length) importCSV(e.dataTransfer.files[0]); });
    input.addEventListener('change', function(){ if (input.files.length) importCSV(input.files[0]); });
    buildFilterMenus(); updateFilterBadges(); onFiltersChanged(); navigateTo('overview');
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') { closeModal(); closeUploadDialog(); } });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
