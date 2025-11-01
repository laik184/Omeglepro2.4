// ✅ adaptiveQuality.js — Auto Video Quality Manager (Final Optimized)
class AdaptiveQualityManager {
  constructor() {
    this.qualityLevels = {
      high: { width: 1280, height: 720, frameRate: 30 },
      medium: { width: 640, height: 480, frameRate: 24 },
      low: { width: 320, height: 240, frameRate: 15 },
    };
    this.currentQuality = "high";
    this.statsCheckInterval = null;
    this.previousStats = null;
    this.lastCheckTime = null;
    this.qualityStabilityCount = 0;
  }

  /**
   * Apply new quality constraints to current video stream
   */
  async adjustVideoQuality(stream, quality) {
    const constraints = this.qualityLevels[quality];
    const videoTrack = stream?.getVideoTracks?.()[0];
    if (!videoTrack || !constraints) return;

    try {
      await videoTrack.applyConstraints({
        width: { ideal: constraints.width },
        height: { ideal: constraints.height },
        frameRate: { ideal: constraints.frameRate },
      });
      this.currentQuality = quality;
      console.log(`[Quality] ✅ Switched to ${quality}`, constraints);
      return quality;
    } catch (err) {
      console.warn("[Quality] Constraint change failed:", err.message);
      return this.currentQuality;
    }
  }

  /**
   * Start monitoring network and auto-adjust video quality
   */
  async monitorConnectionQuality(peer, stream, onQualityChange) {
    if (this.statsCheckInterval) clearInterval(this.statsCheckInterval);
    this.lastCheckTime = Date.now();

    this.statsCheckInterval = setInterval(async () => {
      if (!peer || !stream) return;

      // ✅ Works with SimplePeer internal RTCPeerConnection
      const pc = peer._pc || peer;
      if (!pc.getStats) return;

      try {
        const stats = await pc.getStats();
        const now = Date.now();
        const deltaTime = (now - this.lastCheckTime) / 1000;

        let bytesSent = 0,
          packetsSent = 0,
          packetsLost = 0,
          rtt = 0;

        stats.forEach((report) => {
          if (report.type === "outbound-rtp" && report.kind === "video") {
            bytesSent = report.bytesSent || 0;
            packetsSent = report.packetsSent || 0;
          }
          if (report.type === "remote-inbound-rtp" && report.kind === "video") {
            packetsLost = report.packetsLost || 0;
          }
          if (report.type === "candidate-pair" && report.state === "succeeded") {
            rtt = (report.currentRoundTripTime || 0) * 1000;
          }
        });

        if (this.previousStats && deltaTime > 0) {
          const bytesDelta = bytesSent - this.previousStats.bytesSent;
          const packetsDelta = packetsSent - this.previousStats.packetsSent;
          const packetsLostDelta = packetsLost - this.previousStats.packetsLost;

          const bitrate = (bytesDelta * 8) / deltaTime;
          const lossRate =
            packetsDelta > 0 ? (packetsLostDelta / packetsDelta) * 100 : 0;

          const newQuality = this.determineQuality(bitrate, lossRate, rtt);

          if (newQuality !== this.currentQuality) {
            this.qualityStabilityCount++;
            if (this.qualityStabilityCount >= 2) {
              const applied = await this.adjustVideoQuality(stream, newQuality);
              onQualityChange?.(applied);
              this.qualityStabilityCount = 0;
            }
          } else {
            this.qualityStabilityCount = 0;
          }
        }

        this.previousStats = { bytesSent, packetsSent, packetsLost };
        this.lastCheckTime = now;
      } catch (err) {
        console.error("[Quality] Stats fetch error:", err.message);
      }
    }, 3000);
  }

  /**
   * Determine network quality and return 'low' | 'medium' | 'high'
   */
  determineQuality(bitrate, lossRate, rtt) {
    if (lossRate > 5 || rtt > 350 || bitrate < 200_000) return "low";
    if (lossRate > 2 || rtt > 150 || bitrate < 800_000) return "medium";
    return "high";
  }

  /**
   * Stop monitoring safely
   */
  stopMonitoring() {
    clearInterval(this.statsCheckInterval);
    this.statsCheckInterval = null;
    this.previousStats = null;
    this.lastCheckTime = null;
    this.qualityStabilityCount = 0;
    console.log("[Quality] ⏹️ Monitoring stopped.");
  }

  getCurrentQuality() {
    return this.currentQuality;
  }
}

export { AdaptiveQualityManager };
