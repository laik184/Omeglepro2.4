const moderationPatterns = {
  spam: [
    /(.)\1{10,}/gi,
    /https?:\/\//gi,
    /(?:buy|sell|cheap|discount|click here|limited offer)/gi,
    /\b(?:casino|gambling|poker|slots)\b/gi,
  ],
  abuse: [
    /\b(?:kill yourself|kys)\b/gi,
    /\b(?:nazi|hitler)\b/gi,
    /\b(?:terrorist|terrorism)\b/gi,
  ],
  nsfw: [
    /\b(?:sex|porn|xxx|nude|naked)\b/gi,
    /\b(?:onlyfans|snapchat premium)\b/gi,
  ],
  hateSpeech: [
    /\b(?:racial slurs pattern here)\b/gi,
  ]
};

const messageHistory = new Map();
const userViolations = new Map();
const blockedIPs = new Set();
const ipToSocketMap = new Map();

const VIOLATION_THRESHOLD = 3;
const SPAM_THRESHOLD = 5;
const MESSAGE_RATE_LIMIT = 10;
const RATE_WINDOW = 5000;

class ContentModerator {
  constructor() {
    this.blockedUsers = new Set();
    this.warnings = new Map();
  }

  registerUser(userId, ip) {
    ipToSocketMap.set(userId, ip);
  }

  unregisterUser(userId) {
    ipToSocketMap.delete(userId);
  }

  checkMessage(userId, message) {
    const userIP = ipToSocketMap.get(userId);
    if (userIP && blockedIPs.has(userIP)) {
      return {
        allowed: false,
        violations: [{ type: 'BLOCKED', reason: 'User IP is blocked', severity: 'critical' }],
        action: 'BLOCK',
        filteredMessage: message
      };
    }

    const violations = [];
    const lowerMessage = message.toLowerCase();

    if (!messageHistory.has(userId)) {
      messageHistory.set(userId, []);
    }

    const history = messageHistory.get(userId);
    const now = Date.now();
    
    history.push({ text: message, timestamp: now });
    
    const recentMessages = history.filter(msg => now - msg.timestamp < RATE_WINDOW);
    messageHistory.set(userId, recentMessages);

    if (recentMessages.length > MESSAGE_RATE_LIMIT) {
      violations.push({
        type: 'SPAM',
        reason: 'Message rate limit exceeded',
        severity: 'high',
        pattern: null
      });
    }

    const duplicateCount = recentMessages.filter(msg => msg.text === message).length;
    if (duplicateCount > 3) {
      violations.push({
        type: 'SPAM',
        reason: 'Duplicate message spam',
        severity: 'high',
        pattern: null
      });
    }

    for (const [category, patterns] of Object.entries(moderationPatterns)) {
      for (const pattern of patterns) {
        pattern.lastIndex = 0;
        if (pattern.test(message)) {
          violations.push({
            type: category.toUpperCase(),
            reason: `Detected ${category} content`,
            severity: category === 'abuse' || category === 'hateSpeech' ? 'critical' : 'medium',
            pattern: pattern
          });
          break;
        }
      }
    }

    if (message.length > 1000) {
      violations.push({
        type: 'SPAM',
        reason: 'Message too long',
        severity: 'low',
        pattern: null
      });
    }

    if (violations.length > 0) {
      this.recordViolation(userId, violations);
    }

    const action = this.determineAction(userId, violations);
    
    return {
      allowed: action === 'ALLOW' || action === 'FILTER',
      violations,
      action,
      filteredMessage: action === 'FILTER' ? this.filterMessage(message, violations) : message
    };
  }

  recordViolation(userId, violations) {
    const userIP = ipToSocketMap.get(userId);
    
    if (!userViolations.has(userId)) {
      userViolations.set(userId, []);
    }

    const userViolationList = userViolations.get(userId);
    userViolationList.push({
      violations,
      timestamp: Date.now()
    });

    const criticalViolations = violations.filter(v => v.severity === 'critical').length;
    const totalViolations = userViolationList.length;

    if (criticalViolations > 0 || totalViolations >= VIOLATION_THRESHOLD) {
      this.blockedUsers.add(userId);
      if (userIP) {
        blockedIPs.add(userIP);
        console.log(`IP ${userIP} blocked due to violations`);
      }
    }
  }

  determineAction(userId, violations) {
    if (this.blockedUsers.has(userId)) {
      return 'BLOCK';
    }

    const criticalViolations = violations.filter(v => v.severity === 'critical');
    if (criticalViolations.length > 0) {
      return 'BLOCK';
    }

    const highViolations = violations.filter(v => v.severity === 'high');
    if (highViolations.length > 0) {
      return 'BLOCK';
    }

    const mediumViolations = violations.filter(v => v.severity === 'medium');
    if (mediumViolations.length > 0) {
      return 'FILTER';
    }

    return 'ALLOW';
  }

  filterMessage(message, violations) {
    let filtered = message;
    
    for (const violation of violations) {
      if (violation.type === 'NSFW' && violation.pattern) {
        violation.pattern.lastIndex = 0;
        filtered = filtered.replace(new RegExp(violation.pattern.source, violation.pattern.flags), '[filtered]');
      }
      if (violation.type === 'ABUSE' && violation.pattern) {
        violation.pattern.lastIndex = 0;
        filtered = filtered.replace(new RegExp(violation.pattern.source, violation.pattern.flags), '[filtered]');
      }
      if (violation.type === 'SPAM') {
        if (violation.pattern) {
          violation.pattern.lastIndex = 0;
          filtered = filtered.replace(new RegExp(violation.pattern.source, violation.pattern.flags), '[filtered]');
        }
        if (filtered.length > 500) {
          filtered = filtered.substring(0, 500) + '... [message truncated]';
        }
      }
      if (violation.type === 'HATESPEECH' && violation.pattern) {
        violation.pattern.lastIndex = 0;
        filtered = filtered.replace(new RegExp(violation.pattern.source, violation.pattern.flags), '[filtered]');
      }
    }

    return filtered;
  }

  isUserBlocked(userId) {
    const userIP = ipToSocketMap.get(userId);
    return this.blockedUsers.has(userId) || (userIP && blockedIPs.has(userIP));
  }
  
  isIPBlocked(ip) {
    return blockedIPs.has(ip);
  }

  getUserViolations(userId) {
    return userViolations.get(userId) || [];
  }

  clearUserHistory(userId) {
    messageHistory.delete(userId);
  }

  getStats() {
    return {
      totalBlockedUsers: this.blockedUsers.size,
      activeMonitoring: messageHistory.size,
      totalViolations: Array.from(userViolations.values()).reduce((sum, v) => sum + v.length, 0)
    };
  }
}

async function analyzeWithAI(message, apiKey = null) {
  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        input: message
      })
    });

    const data = await response.json();
    const result = data.results[0];

    return {
      flagged: result.flagged,
      categories: result.categories,
      scores: result.category_scores
    };
  } catch (error) {
    console.error('AI moderation error:', error);
    return null;
  }
}

const moderator = new ContentModerator();

export { moderator, analyzeWithAI, ContentModerator };
