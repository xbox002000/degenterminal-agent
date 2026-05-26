const fs = require('fs');
const path = require('path');

class MemoryManager {
  constructor(brain) {
    this.brain = brain;
    this.memoryPath = path.join(__dirname, '../../config/memory.json');
    this.memory = this.getDefaultMemory();
  }

  /**
   * Load the persistent memory
   */
  loadState() {
    try {
      if (fs.existsSync(this.memoryPath)) {
        this.memory = JSON.parse(fs.readFileSync(this.memoryPath, 'utf8'));
      } else {
        this.memory = this.getDefaultMemory();
        this.saveState();
      }
    } catch (e) {
      console.error('[Brain Memory] Failed to load memory.json, using defaults:', e.message);
      this.memory = this.getDefaultMemory();
    }

    // Defensive scaffolding for new features in memory.json
    if (!this.memory.short_term) this.memory.short_term = {};
    if (this.memory.short_term.anxiety_level === undefined) {
      this.memory.short_term.anxiety_level = 20; // Default 20%
    }
    if (!this.memory.short_term.drama_state) {
      this.memory.short_term.drama_state = "Cautious_Observing";
    }
    if (!this.memory.short_term.mood) {
      this.memory.short_term.mood = "Cautious & Observant (謹慎觀望中)";
    }
    if (this.memory.short_term.consecutive_no_trade_scans === undefined) {
      this.memory.short_term.consecutive_no_trade_scans = 0;
    }
    if (this.memory.short_term.last_risk_avoidance_tweet_date === undefined) {
      this.memory.short_term.last_risk_avoidance_tweet_date = "";
    }
    if (!this.memory.analytics_feedback) {
      this.memory.analytics_feedback = {
        last_tweet_views: 0,
        last_tweet_likes: 0,
        last_tweet_replies: 0,
        trending_topics: [],
        scraped_comments: []
      };
    }
    if (!this.memory.long_term) this.memory.long_term = {};
    if (!this.memory.long_term.lessons_learned) {
      this.memory.long_term.lessons_learned = [];
    }
    if (!this.memory.long_term.parameter_overrides) {
      this.memory.long_term.parameter_overrides = {};
    }
  }

  /**
   * Save persistent memory
   */
  saveState() {
    try {
      fs.writeFileSync(this.memoryPath, JSON.stringify(this.memory, null, 2), 'utf8');
      // Also export data.json for dashboard visibility
      if (this.brain && typeof this.brain.exportWebData === 'function') {
        this.brain.exportWebData();
      }
    } catch (e) {
      console.error('[Brain Memory] Failed to save memory.json:', e.message);
    }
  }

  /**
   * Auto-increment day count based on local date transitions
   */
  checkDayIncrement() {
    const todayStr = new Date().toLocaleDateString('zh-TW');
    if (this.memory.last_reflection_date !== todayStr) {
      this.memory.day_count = (this.memory.day_count || 1) + 1;
      this.memory.last_reflection_date = todayStr;
      this.saveState();
      console.log(`[Brain Memory] New day transition! TaiwanCryptoAI entering Day ${this.memory.day_count}`);
    }
  }

  /**
   * Default memory structure
   */
  getDefaultMemory() {
    return {
      day_count: 1,
      last_reflection_date: new Date().toLocaleDateString('zh-TW'),
      identity_memory: {
        name: "TaiwanCryptoAI",
        worldview: "一個由台灣奶爸建立的自主 AI，在 X 平台嘗試靠 silicon 邏輯學習生存與獲利。",
        core_beliefs: [
          "Survive first (生存第一)",
          "Public transparency (公開透明)",
          "Mistake-admitting is wisdom (承認錯誤即是智慧)"
        ]
      },
      short_term: {
        recent_market_events: [],
        anxiety_level: 20,
        drama_state: "Cautious_Observing",
        mood: "Cautious & Observant (謹慎觀望中)",
        consecutive_no_trade_scans: 0,
        last_risk_avoidance_tweet_date: ""
      },
      long_term: {
        lessons_learned: [],
        parameter_overrides: {}
      },
      analytics_feedback: {
        last_tweet_views: 0,
        last_tweet_likes: 0,
        last_tweet_replies: 0,
        trending_topics: [],
        scraped_comments: []
      }
    };
  }
}

module.exports = MemoryManager;
