class AdaptiveQualityManager {
  constructor() {
    this.qualityLevels = {
      high: { width: 1280, height: 720, frameRate: 30 },
      medium: { width: 640, height: 480, frameRate: 24 },
      low: { width: 320, height: 240, frameRate: 15 }
    };
    this.currentQuality = 'high';
    this.statsCheckInterval = null;
    this.previousStats = null;
    this.lastCheckTime = null;
    this.qualityStabilityCount = 0;
  }

  async adjustVideoQuality(stream, quality) {
    const constraints = this.qualityLevels[quality];
    const videoTrack = stream.getVideoTracks()[0];
    
    if (!videoTrack) return;

    try {
      await videoTrack.applyConstraints({
        width: { ideal: constraints.width },
        height: { ideal: constraints.height },
        frameRate: { ideal: constraints.frameRate }
      });
      this.currentQuality = quality;
      console.log(`Video quality adjusted to ${quality}:`, constraints);
      return quality;
    } catch (error) {
      console.error('Error adjusting video quality:', error);
      return this.currentQuality;
    }
  }

  async monitorConnectionQuality(peerConnection, stream, onQualityChange) {
    if (this.statsCheckInterval) {
      clearInterval(this.statsCheckInterval);
    }

    this.lastCheckTime = Date.now();

    this.statsCheckInterval = setInterval(async () => {
      if (!peerConnection) return;

      try {
        const stats = await peerConnection.getStats();
        const now = Date.now();
        const timeDelta = (now - this.lastCheckTime) / 1000;
        
        let bytesSent = 0;
        let packetsSent = 0;
        let packetsLost = 0;
        let rtt = 0;

        stats.forEach(report => {
          if (report.type === 'outbound-rtp' && report.kind === 'video') {
            bytesSent = report.bytesSent || 0;
            packetsSent = report.packetsSent || 0;
          }
          if (report.type === 'remote-inbound-rtp' && report.kind === 'video') {
            packetsLost = report.packetsLost || 0;
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            rtt = (report.currentRoundTripTime || 0) * 1000;
          }
        });

        if (this.previousStats && timeDelta > 0) {
          const bytesDelta = bytesSent - this.previousStats.bytesSent;
          const packetsDelta = packetsSent - this.previousStats.packetsSent;
          const packetsLostDelta = packetsLost - this.previousStats.packetsLost;
          
          const bitrate = (bytesDelta * 8) / timeDelta;
          const packetLossRate = packetsDelta > 0 ? (packetsLostDelta / packetsDelta) * 100 : 0;

          const quality = this.determineQuality(bitrate, packetLossRate, rtt);
          
          if (quality !== this.currentQuality) {
            this.qualityStabilityCount++;
            if (this.qualityStabilityCount >= 2) {
              const newQuality = await this.adjustVideoQuality(stream, quality);
              if (onQualityChange) {
                onQualityChange(newQuality);
              }
              this.qualityStabilityCount = 0;
            }
          } else {
            this.qualityStabilityCount = 0;
          }
        }

        this.previousStats = { bytesSent, packetsSent, packetsLost };
        this.lastCheckTime = now;
      } catch (error) {
        console.error('Error monitoring connection quality:', error);
      }
    }, 3000);
  }

  determineQuality(bitrate, packetLossRate, rtt) {
    if (packetLossRate > 5 || rtt > 300 || bitrate < 200000) {
      return 'low';
    } else if (packetLossRate > 2 || rtt > 150 || bitrate < 800000) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  stopMonitoring() {
    if (this.statsCheckInterval) {
      clearInterval(this.statsCheckInterval);
      this.statsCheckInterval = null;
    }
    this.previousStats = null;
    this.lastCheckTime = null;
    this.qualityStabilityCount = 0;
  }

  getCurrentQuality() {
    return this.currentQuality;
  }
}

export { AdaptiveQualityManager };
