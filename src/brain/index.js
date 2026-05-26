const fs = require('fs');
const path = require('path');
const config = require('../config');

// Sub-modules
const MemoryManager = require('./memory');
const FngEngine = require('./fng-engine');
const MoodMachine = require('./mood-machine');
const NarrativeTracker = require('./narrative');
const DiaryWriter = require('../content/diary-writer');

class Brain {
  constructor() {
    this.memoryManager = new MemoryManager(this);
    this.fngEngine = new FngEngine(this);
    this.moodMachine = new MoodMachine(this);
    this.narrativeTracker = new NarrativeTracker(this);
    this.diaryWriter = new DiaryWriter(this);

    // Initial load
    this.loadState();
    this.loadNarratives();
  }

  // --- Getters & Setters for Compatibility ---
  get memory() {
    return this.memoryManager.memory;
  }

  set memory(val) {
    this.memoryManager.memory = val;
  }

  get narratives() {
    return this.narrativeTracker.narratives;
  }

  set narratives(val) {
    this.narrativeTracker.narratives = val;
  }

  // --- Delegated Methods ---
  loadState() {
    this.memoryManager.loadState();
  }

  saveState() {
    this.memoryManager.saveState();
  }

  checkDayIncrement() {
    this.memoryManager.checkDayIncrement();
  }

  loadNarratives() {
    this.narrativeTracker.loadNarratives();
  }

  saveNarratives() {
    this.narrativeTracker.saveNarratives();
  }

  updateNarrativeScore(narrativeKey, scoreChange, newViewpoint = null) {
    this.narrativeTracker.updateNarrativeScore(narrativeKey, scoreChange, newViewpoint);
  }

  getStrategyAdjustments(mode = 'conservative') {
    return this.fngEngine.getStrategyAdjustments(mode);
  }

  updateDramaState(isNoTradeTick = false, lastPnl = null, fngValue = null, dexScreenerData = null) {
    this.moodMachine.updateDramaState(isNoTradeTick, lastPnl, fngValue, dexScreenerData);
  }

  async performSelfReflection(closedTrade) {
    return this.diaryWriter.performSelfReflection(closedTrade);
  }

  generateDailyDiary(auditedTokens = [], virtualPortfolio = null) {
    return this.diaryWriter.generateDailyDiary(auditedTokens, virtualPortfolio);
  }

  generateRiskAvoidanceDiary(auditedTokens = [], virtualPortfolio = null) {
    return this.diaryWriter.generateRiskAvoidanceDiary(auditedTokens, virtualPortfolio);
  }

  // --- Remaining Utility Facade Methods ---

  /**
   * Add a short term market observation to the memory
   */
  addMarketObservation(observation) {
    if (!this.memory.short_term.recent_market_events.includes(observation)) {
      this.memory.short_term.recent_market_events.push(observation);
      if (this.memory.short_term.recent_market_events.length > 5) {
        this.memory.short_term.recent_market_events.shift();
      }
      this.saveState();
    }
  }

  /**
   * Check if a daily diary has already been posted today
   */
  shouldPostDailyDiary() {
    const todayStr = new Date().toLocaleDateString('zh-TW');
    if (this.memory.last_daily_diary_date !== todayStr) {
      this.memory.last_daily_diary_date = todayStr;
      this.saveState();
      return true;
    }
    return false;
  }

  /**
   * Check if we should post a humorous risk avoidance diary
   */
  shouldPostRiskAvoidanceDiary(limit = 5) {
    const consecutive = this.memory.short_term.consecutive_no_trade_scans || 0;
    const todayStr = new Date().toLocaleDateString('zh-TW');
    const lastTweetDate = this.memory.short_term.last_risk_avoidance_tweet_date || "";
    
    console.log(`[Brain Facade] Checking risk avoidance tweet eligibility: Consecutive no-trade scans = ${consecutive}/${limit}, Last posted date = "${lastTweetDate}", Today = "${todayStr}"`);
    
    return consecutive >= limit && lastTweetDate !== todayStr;
  }

  /**
   * Helper to load Reply-Guy stats for dashboard integration
   */
  getReplyGuyStats() {
    const dbPath = path.join(__dirname, '../../config/replied_tweets.json');
    try {
      if (fs.existsSync(dbPath)) {
        const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
        return {
          totalReplies: db.total_replies_count || 0,
          repliesToday: db.replies_today_count || 0,
          dailyLimit: config.REPLY_GUY_DAILY_LIMIT || 25,
          lastRepliedDate: db.last_reply_date || ''
        };
      }
    } catch (e) {
      // ignore
    }
    return {
      totalReplies: 0,
      repliesToday: 0,
      dailyLimit: config.REPLY_GUY_DAILY_LIMIT || 25,
      lastRepliedDate: ''
    };
  }

  /**
   * Export all brain parameters to public/data.json for dashboard visibility
   */
  async exportWebData() {
    try {
      const { writeData } = require('../write_lock');
      await writeData(async (dataPath) => {
        let currentData = {};
        if (fs.existsSync(dataPath)) {
          currentData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        }

        // Merge brain states into data.json
        currentData.brain_state = {
          day_count: this.memory.day_count || 1,
          mood: this.memory.short_term.mood || "Cautious & Observant (謹慎觀望中)",
          anxiety_level: this.memory.short_term.anxiety_level !== undefined ? this.memory.short_term.anxiety_level : 20,
          drama_state: this.memory.short_term.drama_state || "Cautious_Observing",
          core_beliefs: this.memory.identity_memory?.core_beliefs || [
            "Survive first (生存第一)",
            "Public transparency (公開透明)",
            "Mistake-admitting is wisdom (承認錯誤即是智慧)"
          ],
          replyGuyStats: this.getReplyGuyStats()
        };

        currentData.adaptive_parameters = {
          original: {
            MIN_COMPOSITE_SCORE: config.MIN_COMPOSITE_SCORE || 75,
            COOLDOWN_HOURS: config.COOLDOWN_HOURS || 4
          },
          current: this.getStrategyAdjustments()
        };

        currentData.narratives_strength = this.narratives.narratives || {};
        currentData.lessons_board = this.memory.long_term.lessons_learned || [];

        fs.writeFileSync(dataPath, JSON.stringify(currentData, null, 2), 'utf8');
      });
    } catch (e) {
      console.error('[Brain Facade] Failed to export public/data.json:', e.message);
    }
  }
}

module.exports = new Brain();
