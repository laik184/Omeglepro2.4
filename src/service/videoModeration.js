// ✅ videoModeration.js — AI + Basic NSFW Detection (Final Optimized)
class VideoModerator {
  constructor(apiKey = null) {
    this.apiKey = apiKey;
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.violationCount = 0;
    this.maxViolations = 3;
  }

  /**
   * Capture one frame from a <video> element as JPEG
   */
  captureFrame(videoElement) {
    if (!videoElement || videoElement.readyState !== 4) return null;

    const canvas = document.createElement("canvas");
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/jpeg", 0.8);
  }

  /**
   * 🔍 Analyze frame with OpenAI (if API key provided)
   */
  async analyzeFrameWithOpenAI(frameDataUrl) {
    if (!this.apiKey) {
      console.warn("[Moderator] No OpenAI key → using basic filter only");
      return { safe: true, reason: "API key not configured" };
    }

    try {
      const base64Image = frameDataUrl.split(",")[1];
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Check this image for NSFW, nudity, violence or explicit content. Reply SAFE or UNSAFE: [reason]",
                },
                { type: "image_url", image_url: { url: frameDataUrl } },
              ],
            },
          ],
          max_tokens: 50,
        }),
      });

      const data = await response.json();
      const result = data?.choices?.[0]?.message?.content || "SAFE";
      if (result.includes("UNSAFE")) {
        return { safe: false, reason: result.replace("UNSAFE:", "").trim() };
      }
      return { safe: true, reason: "Content appropriate" };
    } catch (err) {
      console.error("[Moderator] API error:", err);
      return { safe: true, reason: "API check failed" };
    }
  }

  /**
   * 🧠 Basic pixel-based skin-tone detector (offline)
   */
  async analyzeFrameBasic(frameDataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let skinPixels = 0;
        const totalPixels = data.length / 4;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i],
            g = data[i + 1],
            b = data[i + 2];
          if (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15) {
            skinPixels++;
          }
        }

        const skinRatio = (skinPixels / totalPixels) * 100;
        if (skinRatio > 40) {
          resolve({
            safe: false,
            reason: "High skin-tone area detected",
            confidence: skinRatio,
          });
        } else {
          resolve({
            safe: true,
            reason: "Content appears appropriate",
            confidence: 100 - skinRatio,
          });
        }
      };
      img.onerror = () => resolve({ safe: true, reason: "Frame load failed" });
      img.src = frameDataUrl;
    });
  }

  /**
   * 🎥 Start periodic video moderation
   */
  async startMonitoring(videoElement, onViolation, useAI = false) {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    this.violationCount = 0;

    this.monitoringInterval = setInterval(async () => {
      const frame = this.captureFrame(videoElement);
      if (!frame) return;

      const result =
        useAI && this.apiKey
          ? await this.analyzeFrameWithOpenAI(frame)
          : await this.analyzeFrameBasic(frame);

      if (!result.safe) {
        this.violationCount++;
        console.warn(`[Moderator] ⚠️ Violation: ${result.reason}`);

        onViolation?.({
          reason: result.reason,
          violationCount: this.violationCount,
          shouldBlock: this.violationCount >= this.maxViolations,
        });
      }
    }, 4000); // check every 4s
  }

  /**
   * 🧹 Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) clearInterval(this.monitoringInterval);
    this.monitoringInterval = null;
    this.isMonitoring = false;
    this.violationCount = 0;
    console.log("[Moderator] Monitoring stopped.");
  }

  resetViolations() {
    this.violationCount = 0;
  }
}

export { VideoModerator };
