/**
 * Alert computation. Runs server-side so alerts are consistent across clients
 * and can be queried without recomputing on each browser session.
 */
function computeForCall(call, thresholds) {
    const alerts = [];
    if (call.audio.mosScore < thresholds.mosMin) {
        alerts.push({ type: 'lowMos', severity: call.audio.mosScore < 2.5 ? 'critical' : 'warning', message: `Low MOS: ${call.audio.mosScore.toFixed(2)}`, value: call.audio.mosScore });
    }
    if (call.network.jitter > thresholds.jitterMax) {
        alerts.push({ type: 'highJitter', severity: call.network.jitter > 60 ? 'critical' : 'warning', message: `High jitter: ${call.network.jitter.toFixed(1)}ms`, value: call.network.jitter });
    }
    if (call.network.packetLoss > thresholds.packetLossMax) {
        alerts.push({ type: 'packetLoss', severity: call.network.packetLoss > 8 ? 'critical' : 'warning', message: `Packet loss: ${call.network.packetLoss.toFixed(1)}%`, value: call.network.packetLoss });
    }
    if (call.network.roundTripTime > thresholds.rttMax) {
        alerts.push({ type: 'highRtt', severity: call.network.roundTripTime > 350 ? 'critical' : 'warning', message: `High RTT: ${Math.round(call.network.roundTripTime)}ms`, value: call.network.roundTripTime });
    }
    if (call.video && call.video.freezeCount > thresholds.freezeMax) {
        alerts.push({ type: 'videoFreeze', severity: 'warning', message: `${call.video.freezeCount} video freezes`, value: call.video.freezeCount });
    }
    return alerts;
}

function recomputeAll(calls, thresholds) {
    for (const c of calls) c.alerts = computeForCall(c, thresholds);
}

module.exports = { computeForCall, recomputeAll };
