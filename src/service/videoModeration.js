class VideoModerator {
  constructor(apiKey = null) {
    this.apiKey = apiKey;
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.violationCount = 0;
    this.maxViolations = 3;
  }

  captureFrame(videoElement) {
    if (!videoElement || videoElement.readyState !== 4) {
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    
    return canvas.toDataURL('image/jpeg', 0.8);
  }

  async analyzeFrameWithOpenAI(frameDataUrl) {
    if (!this.apiKey) {
      console.warn('OpenAI API key not configured for video moderation');
      return { safe: true, reason: 'API key not configured' };
    }

    try {
      const base64Image = frameDataUrl.split(',')[1];
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Analyze this image for inappropriate content including NSFW, violence, or other harmful content. Respond with "SAFE" if the content is appropriate, or "UNSAFE: [reason]" if not.'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: frameDataUrl
                  }
                }
              ]
            }
          ],
          max_tokens: 100
        })
      });

      const data = await response.json();
      const result = data.choices[0].message.content;
      
      if (result.includes('UNSAFE')) {
        return { 
          safe: false, 
          reason: result.replace('UNSAFE:', '').trim() 
        };
      }
      
      return { safe: true, reason: 'Content is appropriate' };
    } catch (error) {
      console.error('Error analyzing frame:', error);
      return { safe: true, reason: 'Analysis failed' };
    }
  }

  async analyzeFrameBasic(frameDataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        let skinPixels = 0;
        let totalPixels = data.length / 4;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          if (r > 95 && g > 40 && b > 20 &&
              r > g && r > b &&
              Math.abs(r - g) > 15) {
            skinPixels++;
          }
        }
        
        const skinPercentage = (skinPixels / totalPixels) * 100;
        
        if (skinPercentage > 40) {
          resolve({ 
            safe: false, 
            reason: 'High skin tone percentage detected',
            confidence: skinPercentage 
          });
        } else {
          resolve({ 
            safe: true, 
            reason: 'Content appears appropriate',
            confidence: 100 - skinPercentage 
          });
        }
      };
      img.src = frameDataUrl;
    });
  }

  async startMonitoring(videoElement, onViolation, useAI = false) {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.violationCount = 0;

    this.monitoringInterval = setInterval(async () => {
      const frame = this.captureFrame(videoElement);
      
      if (!frame) return;

      const result = useAI && this.apiKey
        ? await this.analyzeFrameWithOpenAI(frame)
        : await this.analyzeFrameBasic(frame);

      if (!result.safe) {
        this.violationCount++;
        console.warn(`Video moderation violation detected: ${result.reason}`);
        
        if (onViolation) {
          onViolation({
            reason: result.reason,
            violationCount: this.violationCount,
            shouldBlock: this.violationCount >= this.maxViolations
          });
        }
      }
    }, 3000);
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    this.violationCount = 0;
  }

  resetViolations() {
    this.violationCount = 0;
  }
}

export { VideoModerator };
