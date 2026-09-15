/**
 * Demo data generator for first-run seeding.
 */
const DEPARTMENTS = ['Engineering','Sales','Marketing','Customer Success','Finance','HR','Product','Operations','Legal','IT'];
const LOCATIONS = ['Seattle','New York','San Francisco','Chicago','Austin','London','Dublin','Berlin','Paris','Tokyo','Sydney','Singapore','Toronto','Mumbai','Sao Paulo'];
const CALL_TYPES = ['audio','video','screenShare','pstn','conference'];
const CLIENT_TYPES = ['desktop','web','mobile-ios','mobile-android','room-device'];
const NETWORK_TYPES = ['wifi','wired','cellular','vpn'];
const OS_TYPES = ['Windows 11','Windows 10','macOS 14','macOS 13','iOS 17','Android 14','ChromeOS'];
const AUDIO_CODECS = ['SILK','G.722','G.711','SATIN','OPUS'];
const VIDEO_CODECS = ['H264','H265','VP8','VP9','AV1'];
const HEADSETS = ['Jabra Evolve2 75','Jabra Evolve2 65','Poly Voyager 5200','Bose 700','Microsoft Modern Wireless','Logitech Zone Wired','Sennheiser SC 60','Apple AirPods Pro','No Headset (Built-in)'];
const CAMERAS = ['Logitech C920','Logitech Brio','Microsoft LifeCam HD-3000','Poly Studio P15','Jabra PanaCast','Built-in Webcam'];
const SUBNETS = ['10.1.5.0/24','10.1.10.0/24','10.2.5.0/24','10.2.20.0/24','10.3.15.0/24','172.16.10.0/24','172.16.20.0/24','192.168.1.0/24','192.168.10.0/24','10.5.100.0/24','10.5.200.0/24','10.10.50.0/24'];
const FIRST_NAMES = ['Alex','Sarah','Michael','Emily','David','Jessica','Chris','Amanda','James','Nicole','Ryan','Lauren','Kevin','Rachel','Brian','Melissa','Daniel','Rebecca','Mark','Ashley','Tom','Erin','Andrew','Kayla','Jason','Michelle','Patrick','Stephanie','Eric','Jennifer','Sam','Priya','Raj','Yuki','Ken','Aiko','Liam','Sophia','Noah','Olivia','Ethan','Ava','Lucas','Isabella','Mason','Mia','Logan','Charlotte','Elijah','Amelia'];
const LAST_NAMES = ['Chen','Miller','Johnson','Williams','Brown','Davis','Wilson','Anderson','Taylor','Thomas','Moore','Jackson','Martin','Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson','Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores','Green','Adams','Nakamura','Kim','Patel','Singh','Kumar','Yamamoto','Garcia','Rodriguez','Martinez','Hernandez'];

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randChoices(arr, n) { const copy = arr.slice(), out = []; for (let i = 0; i < n && copy.length; i++) { const idx = Math.floor(Math.random() * copy.length); out.push(copy.splice(idx, 1)[0]); } return out; }
function normalRand(mean, stdDev) { let u = 0, v = 0; while (u === 0) u = Math.random(); while (v === 0) v = Math.random(); return mean + stdDev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v); }

function generate(count = 650, daysOfHistory = 90) {
    const users = [];
    for (let i = 0; i < 220; i++) {
        const first = randChoice(FIRST_NAMES), last = randChoice(LAST_NAMES);
        users.push({ name: `${first} ${last}`, email: `${first[0].toLowerCase()}${last.toLowerCase()}@contoso.com`, department: randChoice(DEPARTMENTS), location: randChoice(LOCATIONS) });
    }
    const problemSubnet = '10.5.200.0/24', problemDevice = 'No Headset (Built-in)', problemLocation = 'Mumbai';
    const records = [];
    const startBase = Date.now() - daysOfHistory * 86400000;
    for (let i = 0; i < count; i++) {
        const callDate = new Date(startBase + Math.random() * daysOfHistory * 86400000);
        const hour = Math.random() < 0.75 ? randInt(9, 17) : randInt(0, 23);
        callDate.setHours(hour, randInt(0, 59), randInt(0, 59), 0);
        let duration = Math.max(30, Math.floor(normalRand(900, 800)));
        if (Math.random() < 0.15) duration = randInt(30, 180);
        if (Math.random() < 0.08) duration = randInt(3600, 7200);
        let participantCount = 2;
        const r = Math.random();
        if (r < 0.15) participantCount = randInt(3, 5);
        else if (r < 0.05) participantCount = randInt(6, 20);
        const participants = randChoices(users, participantCount).map((u, idx) => ({ ...u, role: idx === 0 ? 'organizer' : 'participant' }));
        let callType;
        if (participantCount >= 3) callType = Math.random() < 0.7 ? 'conference' : 'video';
        else { const t = Math.random(); callType = t < 0.35 ? 'audio' : t < 0.75 ? 'video' : t < 0.9 ? 'screenShare' : 'pstn'; }
        const modality = ['audio'];
        if (callType === 'video' || callType === 'conference') modality.push('video');
        if (callType === 'screenShare' || (Math.random() < 0.3 && callType !== 'pstn')) modality.push('screenShare');
        const subnet = randChoice(SUBNETS);
        const networkType = randChoice(NETWORK_TYPES);
        const hasProblem = subnet === problemSubnet || participants[0].location === problemLocation;
        const congested = (hour === 12 || hour === 13) && networkType === 'wifi';
        const jitter = Math.max(0, normalRand(hasProblem ? 40 : 12, hasProblem ? 25 : 8) + (congested ? 15 : 0));
        const packetLoss = Math.max(0, normalRand(hasProblem ? 4.0 : 0.6, hasProblem ? 3.0 : 1.0) + (congested ? 2 : 0));
        const rtt = Math.max(5, normalRand(hasProblem ? 180 : 55, hasProblem ? 60 : 25) + (congested ? 40 : 0));
        const bandwidth = Math.max(200, normalRand(networkType === 'cellular' ? 1500 : 3500, 800));
        let mos = 4.5 - (jitter / 30) - (packetLoss / 2.5) - (rtt / 300);
        mos = Math.max(1.0, Math.min(5.0, mos + normalRand(0, 0.15)));
        let headset = randChoice(HEADSETS);
        if (Math.random() < 0.15) headset = problemDevice;
        if (headset === problemDevice) mos = Math.max(1.5, mos - 0.5);
        const camera = modality.indexOf('video') >= 0 ? randChoice(CAMERAS) : null;
        const clientType = randChoice(CLIENT_TYPES);
        const os = randChoice(OS_TYPES);
        let video = null;
        if (modality.indexOf('video') >= 0) {
            const res = randChoice(['1920x1080','1280x720','640x480','960x540']);
            const frameRate = res === '1920x1080' ? randInt(25, 30) : randInt(15, 30);
            let freezeCount = Math.random() < 0.15 ? randInt(1, 6) : 0;
            if (hasProblem) freezeCount = randInt(3, 12);
            video = { resolutionSend: res, resolutionRecv: randChoice(['1920x1080','1280x720','960x540']), frameRateSend: frameRate, frameRateRecv: randInt(20, 30), freezeCount, freezeDuration: freezeCount * randInt(1, 5), cameraDevice: camera, videoCodec: randChoice(VIDEO_CODECS) };
        }
        const qualityRating = (mos >= 4.0 && packetLoss < 1.5 && jitter < 25) ? 'good' : (mos >= 3.5 && packetLoss < 4 && jitter < 40) ? 'acceptable' : 'poor';
        const segments = [];
        for (let s = 0; s < 8; s++) { const segMos = mos + normalRand(0, 0.3); segments.push({ rating: segMos >= 4.0 ? 'good' : segMos >= 3.5 ? 'acceptable' : 'poor', mos: segMos }); }
        const endTime = new Date(callDate.getTime() + duration * 1000);
        const callId = `CALL-${callDate.toISOString().slice(0,10).replace(/-/g,'')}-${String(i).padStart(5,'0')}`;
        records.push({
            callId, startTime: callDate, endTime, duration, callType, modality,
            isConference: participantCount >= 3, participants, participantCount,
            network: { jitter, packetLoss, roundTripTime: rtt, bandwidthEstimate: bandwidth, subnet, networkType, vpnUsed: networkType === 'vpn' || Math.random() < 0.1 },
            audio: { mosScore: mos, echoPercentage: Math.max(0, normalRand(0.3, 0.5)), noiseSuppression: Math.random() < 0.85, audioCodec: randChoice(AUDIO_CODECS), speakerDevice: headset, micDevice: headset },
            video,
            device: { os, teamsVersion: `24${randChoice(['033','052','074','091'])}.1309.${randInt(2000,3000)}.${randInt(4000,6000)}`, clientType, headset, camera, driver: `Driver ${randInt(1,9)}.${randInt(0,9)}`, firmwareVersion: `${randInt(1,4)}.${randInt(0,20)}.${randInt(0,50)}` },
            qualityRating, qualityScore: Math.round(((mos - 1) / 4) * 100), timelineSegments: segments, alerts: []
        });
    }
    records.sort((a, b) => b.startTime - a.startTime);
    return records;
}

module.exports = { generate };
