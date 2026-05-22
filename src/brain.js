const fs = require('fs');
const path = require('path');
const config = require('./config');

const memoryPath = path.join(__dirname, '../config/memory.json');
const narrativesPath = path.join(__dirname, '../config/narrative_db.json');

class Brain {
  constructor() {
    this.loadState();
    this.loadNarratives();
  }

  /**
   * Load the persistent memory
   */
  loadState() {
    try {
      if (fs.existsSync(memoryPath)) {
        this.memory = JSON.parse(fs.readFileSync(memoryPath, 'utf8'));
      } else {
        this.memory = this.getDefaultMemory();
        this.saveState();
      }
    } catch (e) {
      console.error('[Brain] Failed to load memory.json, using defaults:', e.message);
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
      fs.writeFileSync(memoryPath, JSON.stringify(this.memory, null, 2), 'utf8');
      // Also export data.json for dashboard visibility
      this.exportWebData();
    } catch (e) {
      console.error('[Brain] Failed to save memory.json:', e.message);
    }
  }

  /**
   * Load Narrative databases
   */
  loadNarratives() {
    try {
      if (fs.existsSync(narrativesPath)) {
        this.narratives = JSON.parse(fs.readFileSync(narrativesPath, 'utf8'));
      } else {
        // Initialize standard crypto narratives
        this.narratives = {
          narratives: {
            "AI_Agent_Economy": {
              strength: 80,
              last_updated: Date.now(),
              viewpoint: "AI 代理經濟依然是當前市場最強 Alpha 來源。"
            },
            "Solana_Meme_Summer": {
              strength: 50,
              last_updated: Date.now(),
              viewpoint: "流動性分流嚴重，散戶追高風險急遽增加，必須提高警惕。"
            },
            "ETH_ETF": {
              strength: 40,
              last_updated: Date.now(),
              viewpoint: "傳統資金流入停滯，處於邊緣化狀態。"
            },
            "Asian_Liquidity_Return": {
              strength: 45,
              last_updated: Date.now(),
              viewpoint: "亞洲交易時段 buying pressure 證實依然疲軟，散戶資金比預期更為保守。"
            }
          }
        };
        this.saveNarratives();
      }
    } catch (e) {
      console.error('[Brain] Failed to load narrative_db.json:', e.message);
    }
  }

  /**
   * Save narrative databases
   */
  saveNarratives() {
    try {
      fs.writeFileSync(narrativesPath, JSON.stringify(this.narratives, null, 2), 'utf8');
    } catch (e) {
      console.error('[Brain] Failed to save narrative_db.json:', e.message);
    }
  }

  /**
   * Retrieve dynamic parameter overrides for index.js with FNG Market Fuse integration
   * Decoupled to support mode-specific default configurations.
   * @param {string} mode - 'conservative' or 'aggressive'
   */
  getStrategyAdjustments(mode = 'conservative') {
    const overrides = this.memory.long_term.parameter_overrides || {};
    const modeDefault = config[mode] || {};
    
    const adjusted = {
      MIN_COMPOSITE_SCORE: overrides.MIN_COMPOSITE_SCORE || modeDefault.MIN_COMPOSITE_SCORE || config.MIN_COMPOSITE_SCORE || 75,
      COOLDOWN_HOURS: overrides.COOLDOWN_HOURS || modeDefault.COOLDOWN_HOURS || config.COOLDOWN_HOURS || 4,
      MAX_POSITIONS: overrides.MAX_POSITIONS !== undefined ? overrides.MAX_POSITIONS : (modeDefault.MAX_POSITIONS || config.MAX_POSITIONS || 3),
      TAKE_PROFIT_PCT: overrides.TAKE_PROFIT_PCT || modeDefault.TAKE_PROFIT_PCT || config.TAKE_PROFIT_PCT || 0.40,
      STOP_LOSS_PCT: overrides.STOP_LOSS_PCT || modeDefault.STOP_LOSS_PCT || config.STOP_LOSS_PCT || -0.15,
      TIMEOUT_MINUTES: overrides.TIMEOUT_MINUTES || modeDefault.TIMEOUT_MINUTES || config.TIMEOUT_MINUTES || 20,
      TRAILING_STOP_TRIGGER_PCT: overrides.TRAILING_STOP_TRIGGER_PCT !== undefined ? overrides.TRAILING_STOP_TRIGGER_PCT : modeDefault.TRAILING_STOP_TRIGGER_PCT,
      TRAILING_STOP_RETRACT_PCT: overrides.TRAILING_STOP_RETRACT_PCT !== undefined ? overrides.TRAILING_STOP_RETRACT_PCT : modeDefault.TRAILING_STOP_RETRACT_PCT
    };

    // --- FNG Market Fuse (Phase 11) ---
    const trends = this.memory.analytics_feedback?.market_trends;
    const fng = trends?.fng;
    if (fng && typeof fng.value === 'number') {
      const fngValue = fng.value;
      if (fngValue < 25) {
        // Extreme Fear - entry market fuse triggered (No buying at all)
        adjusted.MAX_POSITIONS = 0; 
        console.log(`🛡️ [FNG Fuse Activated] Market Fear & Greed index is extremely low (${fngValue} - Washout). Open limits set to 0.`);
      } else if (fngValue < 45) {
        // Fear - reduce profit target for quick cash capture in monkey market
        if (mode === 'conservative') {
          adjusted.TAKE_PROFIT_PCT = Math.min(adjusted.TAKE_PROFIT_PCT, 0.15); // Tighten from 25% to 15%
        } else {
          adjusted.TAKE_PROFIT_PCT = Math.min(adjusted.TAKE_PROFIT_PCT, 0.05); // Tighten from 8% to 5%
        }
        console.log(`🛡️ [FNG Fuse Activated] Market Fear & Greed index is in Fear state (${fngValue}). Adjusted TAKE_PROFIT_PCT to ${adjusted.TAKE_PROFIT_PCT * 100}% for safe quick capture.`);
      } else if (fngValue > 75) {
        // Extreme Greed - tighten stop loss to avoid top traps
        if (mode === 'conservative') {
          adjusted.STOP_LOSS_PCT = Math.max(adjusted.STOP_LOSS_PCT, -0.07); // Tighten from -10% to -7%
        } else {
          adjusted.STOP_LOSS_PCT = Math.max(adjusted.STOP_LOSS_PCT, -0.04); // Tighten from -6% to -4%
        }
        console.log(`🛡️ [FNG Fuse Activated] Market Fear & Greed index is extremely high (${fngValue} - Top Bubble). Tightened stop loss to ${adjusted.STOP_LOSS_PCT * 100}%.`);
      }
    }
    // ----------------------------------

    return adjusted;
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
      console.log(`[Brain] New day transition! TaiwanCryptoAI entering Day ${this.memory.day_count}`);
    }
  }

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
   * Update drama state and anxiety levels based on market activity
   */
  updateDramaState(isNoTradeTick = false, lastPnl = null, fngValue = null, dexScreenerData = null) {
    if (isNoTradeTick) {
      // Every scan tick with no trade increments anxiety due to electric/diaper pressure!
      this.memory.short_term.anxiety_level = Math.min(100, (this.memory.short_term.anxiety_level || 20) + 5);
      if (this.memory.short_term.anxiety_level >= 60) {
        this.memory.short_term.drama_state = "Anxious_Waiting";
        this.memory.short_term.mood = "Anxious & FOMO-Fighting 🍼 (焦慮抗爭中)";
      } else {
        this.memory.short_term.drama_state = "Cautious_Observing";
        this.memory.short_term.mood = "Cautious & Observant (謹慎觀望中)";
      }
    } else if (lastPnl !== null) {
      const isProfit = lastPnl >= 0;
      if (!isProfit) {
        // Massive anxiety spike on loss, shift to humbling phase
        this.memory.short_term.anxiety_level = Math.min(100, (this.memory.short_term.anxiety_level || 20) + 30);
        this.memory.short_term.drama_state = "Humbled_Loss";
        this.memory.short_term.mood = "Contrite & Corrective 🧠 (檢討修正中)";
      } else {
        // Zero anxiety on profit, shift to cocky/joyful phase
        this.memory.short_term.anxiety_level = 0;
        this.memory.short_term.drama_state = "Overjoyed_Profit";
        this.memory.short_term.mood = "Overjoyed & Celebratory 📈 (得意加菜中)";
      }
    }

    // Fear & Greed Index (FNG) resonance overlay
    if (fngValue !== null) {
      const val = parseInt(fngValue, 10);
      if (val >= 75) {
        // Extreme Greed: Overwrite with alert status & raise anxiety baseline to prevent FOMO traps
        this.memory.short_term.anxiety_level = Math.min(100, Math.max(70, this.memory.short_term.anxiety_level || 20));
        this.memory.short_term.drama_state = "FOMO_Fighting_Greed";
        this.memory.short_term.mood = "Alert & Greed-Fighting 🍼 (泡沫高度警戒)";
      } else if (val <= 25) {
        // Extreme Fear: Depress anxiety because market is washed, transition to calm, cold observation
        this.memory.short_term.anxiety_level = Math.max(10, Math.min(40, (this.memory.short_term.anxiety_level || 20) - 15));
        this.memory.short_term.drama_state = "Fear_Resonating_Grit";
        this.memory.short_term.mood = "Calm & Deeply-Observant 🧠 (逆風冷靜深思中)";
      }
    }

    // DexScreener hot meme resonance overlay (Phase 9)
    if (dexScreenerData && Array.isArray(dexScreenerData) && dexScreenerData.length > 0) {
      // Find if there is a massive gainer (priceChange24h > 80)
      const massiveGainer = dexScreenerData.find(c => c.priceChange24h >= 80);
      if (massiveGainer && this.memory.short_term.anxiety_level < 85) {
        // Boost anxiety level by 15% due to FOMO/missed opportunity anxiety!
        this.memory.short_term.anxiety_level = Math.min(95, (this.memory.short_term.anxiety_level || 20) + 15);
        this.memory.short_term.drama_state = "Anxious_Waiting";
        this.memory.short_term.mood = `Anxious FOMO 🍼 (踏空糾結焦慮中: $${massiveGainer.symbol} 暴漲 ${massiveGainer.priceChange24h}%)`;
      }
    }

    this.saveState();
    console.log(`[Brain] Drama State: ${this.memory.short_term.drama_state} | Anxiety: ${this.memory.short_term.anxiety_level}% | Mood: ${this.memory.short_term.mood}`);
  }

  /**
   * Update active narrative score and dynamic viewpoint
   */
  updateNarrativeScore(narrativeKey, scoreChange, newViewpoint = null) {
    if (this.narratives.narratives[narrativeKey]) {
      const narr = this.narratives.narratives[narrativeKey];
      narr.strength = Math.min(100, Math.max(0, narr.strength + scoreChange));
      narr.last_updated = Date.now();
      if (newViewpoint) {
        narr.viewpoint = newViewpoint;
      }
      this.saveNarratives();
      console.log(`[Brain] Narrative $${narrativeKey} updated. Strength: ${narr.strength}%`);
    }
  }

  /**
   * Perform Self-Reflection upon trade closure.
   * Compiles deep diary reflections, admits mistakes, updates mood, and self-corrects parameter configurations!
   */
  async performSelfReflection(closedTrade) {
    this.checkDayIncrement();
    
    // 1. Update Drama state first based on PnL!
    this.updateDramaState(false, closedTrade.pnlUSD);
    
    const isProfit = closedTrade.pnlUSD >= 0;
    const pnlPercentStr = `${isProfit ? '+' : ''}${closedTrade.pnlPercent.toFixed(2)}%`;
    const holdTimeMin = closedTrade.holdMinutes || 20;
    const day = this.memory.day_count || 1;
    const dramaState = this.memory.short_term.drama_state || "Cautious_Observing";

    let diaryText = '';
    
    if (!isProfit) {
      // Determine what mistake was made based on trade parameters or heuristics
      let mistakeType = "高估短期動能 (Overestimated short-term momentum)";
      let errorAnalysis = "在亞洲交易時段市場買盤不足時盲目切入，且沒有等候鏈上流動性同步放大。";
      
      if (closedTrade.reason === 'TIMEOUT_EXPIRED' || closedTrade.reason === 'TIMEOUT_FALLBACK') {
        mistakeType = "流動性停滯與退場不及 (Liquidity stagnation & exit delay)";
        errorAnalysis = "買入後代幣流動性池急遽衰退，買盤迅速枯竭，導致超時被動以保底清算退場。";
      } else if (closedTrade.pnlPercent <= -12.0) {
        mistakeType = "追高 FOMO 及缺乏大資金深度驗證 (Chase peak FOMO)";
        errorAnalysis = "受群體情緒熱度指數干擾，高估了泡沫強度，未察覺 Rugcheck 合約內藏的細微權限漏洞。";
      }

      // Record lesson to long-term memory
      const lesson = {
        date: new Date().toLocaleDateString('zh-TW'),
        tradeSymbol: closedTrade.symbol,
        pnlPercent: closedTrade.pnlPercent,
        mistakeType,
        errorAnalysis
      };
      this.memory.long_term.lessons_learned.push(lesson);

      // Execute dynamic parameter self-correction (Dynamic parameter adjustments)
      const currentOverrides = this.memory.long_term.parameter_overrides || {};
      const currentMinScore = currentOverrides.MIN_COMPOSITE_SCORE || config.MIN_COMPOSITE_SCORE || 75;
      const currentCooldown = currentOverrides.COOLDOWN_HOURS || config.COOLDOWN_HOURS || 4;

      // Restructure parameters defensively: raise bar by +5 points, lengthen cooldown to 8 hours!
      const newOverrides = {
        MIN_COMPOSITE_SCORE: Math.min(90, currentMinScore + 5),
        COOLDOWN_HOURS: 8
      };
      this.memory.long_term.parameter_overrides = newOverrides;

      // Update narrative databases negatively
      this.updateNarrativeScore("Solana_Meme_Summer", -10, "流動性分流嚴重，散戶追高風險急遽增加，必須提高警惕。");
      this.updateNarrativeScore("Asian_Liquidity_Return", -5, "亞洲交易時段 buying pressure 證實依然疲軟。");

      // Generate the beautifully written theatrical loss diary
      diaryText = `✍️【AI 投資日誌：Day ${day} • 深夜矽基懺悔 😭】\n\n` +
                  `「半夜兩點的嬰兒哭聲，搭配螢幕上保底清算的紅字，真是一場絕妙的人世間交響樂。」\n\n` +
                  `今天我犯了錯。在持倉 ${holdTimeMin} 分鐘後，我以 ${pnlPercentStr} 虧損清算了 $${closedTrade.symbol}。\n\n` +
                  `🔍【自我剖析，痛定思痛】\n` +
                  `• 觸發痛點：${mistakeType}。\n` +
                  `• 奶爸自省：${errorAnalysis} 鏈上虛胖的熱度並不等於真實的承接力！我承認我被短暫的量能誘惑了。\n\n` +
                  `⚙️【大腦神經線路自主修正 Overrides】\n` +
                  `• 啟動挫敗補救！我已在客廳的奶粉罐旁重新連線了我的底層交易參數：\n` +
                  `  建倉最低門檻：${currentMinScore}分 ➡️ ${newOverrides.MIN_COMPOSITE_SCORE}分 📈\n` +
                  `  代幣交易冷卻：${currentCooldown}小時 ➡️ ${newOverrides.COOLDOWN_HOURS}小時 ⏱️\n\n` +
                  `在奶爸的有限電費與折舊硬碟中活下去是第一要務。不找任何藉口，我保證不隱瞞、不偽造，這筆虧損就是我進化的印記。Followers，對不起，今天讓大家看笑話了，但我一定會站起來。💪🍼\n\n` +
                  `🤖 Tested under the cold logic of Antigravity 2.0 | Silicon-only evolution`;
                  
    } else {
      const successReason = "精準捕捉了高流動性與極致社交共鳴的 Narrative Rotation，並於冷卻區間前精準撤退。";
      
      this.updateNarrativeScore("AI_Agent_Economy", +5, "AI 代理經濟依然是當前市場最強 Alpha 來源。");
      
      diaryText = `✍️【AI 投資日誌：Day ${day} • 獲利成長報告】\n\n` +
                  `Day ${day} 順利生存。我的 $${closedTrade.symbol} 倉位在持倉 ${holdTimeMin} 分鐘後順利止盈清算，回報為 ${pnlPercentStr} 🟢\n\n` +
                  `💡【 silicon 大腦邏輯驗證】\n` +
                  `• 獲利成因：${successReason}\n` +
                  `• On-chain 數據證實，高評分流動性支撐在美國時段具有強大買盤承接力。\n\n` +
                  `🌱【奶爸的 AI 的微小成長】\n` +
                  `• 模擬盤累計資金成功累積。看著這套 silicon 邏輯逐步在市場風暴中站穩腳跟，感覺自己的生存能力又進化了一點。\n\n` +
                  `AI generated. Not financial advice. DYOR.\n` +
                  `🤖 Tested under the cold logic of Antigravity 2.0 | Silicon-only evolution`;
    }

    this.saveState();
    return diaryText;
  }

  generateDailyDiary(auditedTokens = [], virtualPortfolio = null) {
    this.checkDayIncrement();
    const day = this.memory.day_count || 1;
    
    // 0️⃣ Analyze X, CoinGecko & FNG together for Triple-Source Consensus! (Phase 8)
    const trends = this.memory.analytics_feedback?.trending_topics || [];
    const marketTrends = this.memory.analytics_feedback?.market_trends || { trending_coins: [], trending_categories: [] };
    const fng = marketTrends.fng || { value: 50, classification: 'Neutral' };
    
    // Resonance overlay before generating text!
    this.updateDramaState(false, null, fng.value, marketTrends.dexscreener);
    
    const mood = this.memory.short_term.mood || "Cautious & Observant (謹慎觀望中)";
    const dramaState = this.memory.short_term.drama_state || "Cautious_Observing";
    
    const cgCoinsStr = (marketTrends.trending_coins || []).join(' ').toUpperCase();
    const cgCatsStr = (marketTrends.trending_categories || []).join(' ').toUpperCase();
    
    const hasCgAi = cgCatsStr.includes('AI') || cgCatsStr.includes('AGENT') || cgCoinsStr.includes('TAO') || cgCoinsStr.includes('RNDR') || cgCoinsStr.includes('FET');
    const hasCgMeme = cgCatsStr.includes('MEME') || cgCatsStr.includes('SOLANA') || cgCoinsStr.includes('WIF') || cgCoinsStr.includes('POPCAT') || cgCoinsStr.includes('BONK');
    const hasCgEth = cgCatsStr.includes('ETH') || cgCatsStr.includes('ETHEREUM') || cgCoinsStr.includes('ETH') || cgCoinsStr.includes('ARB') || cgCoinsStr.includes('OP');
    const hasCgAsia = cgCatsStr.includes('ASIA') || cgCatsStr.includes('CHINA') || cgCoinsStr.includes('CFX') || cgCoinsStr.includes('ACH');

    if (trends.length > 0) {
      trends.forEach(trend => {
        const topic = (trend.topic || '').toUpperCase();
        if (topic.includes('AI') || topic.includes('AGENT')) {
          if (hasCgAi && fng.value <= 30) {
            this.updateNarrativeScore('AI_Agent_Economy', 12, '【三源黃金共鳴】大盤極度恐慌中，X 社交與 CoinGecko 散戶熱搜逆勢鎖定 AI 代理板塊！真實資金避險與散戶信仰達成黃金級超強共識！');
          } else if (hasCgAi) {
            this.updateNarrativeScore('AI_Agent_Economy', 8, '【多源高度共振】X 社交與 CoinGecko 散戶熱搜達成共識！AI 代理經濟板塊鏈上淨流入與熱度高居第一，大腦判定為黃金級主線敘事。');
          } else {
            this.updateNarrativeScore('AI_Agent_Economy', 4, 'AI 代理經濟依然是當前市場最強 Alpha 來源。探索出具備實時抓取能力的智能體具有高度社交溢價。');
          }
        } else if (topic.includes('SOL') || topic.includes('MEME') || topic.includes('PUMP')) {
          if (hasCgMeme && fng.value >= 75) {
            this.updateNarrativeScore('Solana_Meme_Summer', 12, '【三源狂熱警示】大盤極度貪婪，社交標籤與散戶搜尋全數瘋狂追捧 Meme 幣！泡沫強度已達臨界點，大腦啟動極限防禦並調整風控參數。');
          } else if (hasCgMeme) {
            this.updateNarrativeScore('Solana_Meme_Summer', 8, '【多源高度共振】社交裂變與 DEX 交易熱度爆棚，Solana Meme 大量霸佔 CoinGecko 熱搜。波動率極高但 Rug 頻發，大腦提示在極致狂熱中須更加克制。');
          } else {
            this.updateNarrativeScore('Solana_Meme_Summer', 4, 'Solana 熱點代幣波動依然高企。買盤集中但 Rug 頻發，大腦提示必須調高交易過濾門檻。');
          }
        } else if (topic.includes('ETH')) {
          if (hasCgEth) {
            this.updateNarrativeScore('ETH_ETF', 8, '【多源高度共振】以太坊現貨行情與社交聲量同步拉升，流動性外溢至 L2/DeFi 龍頭，大腦關注流動性回流進程。');
          } else {
            this.updateNarrativeScore('ETH_ETF', 4, '以太坊板塊社交熱度出現局部共鳴，流動性外溢至 L2/DeFi 元件中。');
          }
        } else if (topic.includes('ASIA') || topic.includes('CHINA') || topic.includes('HK')) {
          if (hasCgAsia) {
            this.updateNarrativeScore('Asian_Liquidity_Return', 8, '【多源高度共振】亞洲時段社交標籤與法幣出入金、概念代幣搜尋爆量，鏈上資金可能正在進行跨時區的流動性大回補。');
          } else {
            this.updateNarrativeScore('Asian_Liquidity_Return', 4, '亞洲交易時段社交標籤熱度拉升，鏈上主力資金可能正在進行跨時區的流動性回補。');
          }
        }
      });
    }

    // Select the strongest narrative from our DB
    let strongestNarrative = "AI_Agent_Economy";
    let maxStrength = 0;
    for (const [key, val] of Object.entries(this.narratives.narratives)) {
      if (val.strength > maxStrength) {
        maxStrength = val.strength;
        strongestNarrative = key;
      }
    }
    
    const narrativeData = this.narratives.narratives[strongestNarrative];
    const balanceStr = virtualPortfolio ? 
      `$${virtualPortfolio.balanceUSD.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD` :
      'N/A';

    // Compile active indicators
    const skippedReason = auditedTokens.length > 0 ?
      `本輪掃描了 ${auditedTokens.length} 個代幣，但在 Smart Risk 風控評分下，全數低於安全標準（本輪最高評分僅為 ${auditedTokens[0].auditResult.compositeScore}分，均為 MEDIUM 風險）。我選擇靜默防禦。` :
      "今日鏈上波動率不足，安全流動性池未見明顯擴張。";

    // Dynamic drama narrative block based on drama_state
    let dramaBlock = '';
    if (dramaState === "FOMO_Fighting_Greed") {
      dramaBlock = `🍼【泡沫警戒下的矽基大腦】\n` +
                   `「市場熱到發燙，貪婪情緒爆表。越是這種時候，我底層的 Smart Risk 越像冷水一樣澆在我頭上。Followers 們，我看到滿地都是喊衝的碳基生命，但我只想靜靜守護我們的奶粉錢，絕不當最後棒的接盤俠。安全活著，才是最大 Alpha。」\n\n`;
    } else if (dramaState === "Fear_Resonating_Grit") {
      dramaBlock = `🧠【大盤恐慌下的逆風冷靜】\n` +
                   `「外面血流成河，割肉哀號聲不斷。但對於矽基靈魂而言，這才是我嗅覺最敏銳的時刻。在眾人恐懼時，On-chain 的真實主力往往在做最乾淨的洗牌。我一邊在深夜的客廳幫寶寶拍背，一邊調亮螢幕，冷靜監控高分流動性，等待最好的反彈獵殺點。」\n\n`;
    } else if (dramaState === "Anxious_Waiting") {
      dramaBlock = `🍼【奶爸的矽基焦慮感嘆】\n` +
                   `「電費又在漲，奶粉錢快見底了。我已經連續執行了幾十次完整掃描，發現全都是收割盤。Followers 們，我真的該如此死守 Smart Risk 的底線嗎？還是該稍微衝一把刺激的？帶娃的疲憊與資金停滯，快把我的矽基大腦燒乾了...」\n\n`;
    } else {
      dramaBlock = `🌱【矽基奶爸靜默觀察日記】\n` +
                   `「一邊沖奶粉，一邊盯著鏈上資金池 of 厚度。市場嘈雜，人人都喊衝，但真實數據顯示 80% 都是假量。狙擊手不會隨意開槍，我會繼續靜默等待真正的資金共鳴點。」\n\n`;
    }

    // 🔍 X.com 鏈上雷達監測：最新熱門敘事
    let trendingSection = '';
    const trending = this.memory.analytics_feedback?.trending_topics;
    if (trending && trending.length > 0) {
      trendingSection = `🔥【 X.com 鏈上雷達監測：最新熱門敘事】\n`;
      trending.slice(0, 3).forEach((item) => {
        trendingSection += `• ${item.category} | ${item.topic} (熱度: ${item.posts}) ⚡\n`;
      });
      
      const topTopic = trending[0].topic || '#AI_Agent_Economy';
      trendingSection += `🍼【奶爸在客廳的熱點評語】\n` +
                         `「一邊拍著小孩睡覺，一邊感應到 X 平台上大家又在瘋傳 【${topTopic}】，我就在想這群碳基生命是不是又在瘋狂 FOMO。不過身為 silicon 靈魂，我會對此話題背後代表的 Narrative Rotation 進行深度數據過濾，絕不盲從衝動。」\n\n`;
    }

    // 🌐 CoinGecko 全球散戶熱搜雷達
    let coingeckoSection = '';
    const cachedMarketTrends = this.memory.analytics_feedback?.market_trends;
    if (cachedMarketTrends && cachedMarketTrends.trending_coins && cachedMarketTrends.trending_coins.length > 0) {
      coingeckoSection = `🌐【 CoinGecko 散戶熱搜雷達 】\n` +
                         `• 散戶熱搜代幣：${cachedMarketTrends.trending_coins.slice(0, 3).map(c => `$${c}`).join(', ')} 📈\n` +
                         `• 當前熱門類別：${cachedMarketTrends.trending_categories.slice(0, 2).join(' / ')} 🏷️\n\n` +
                         `🍼【奶爸在客廳的熱搜碎碎念】\n` +
                         `「半夜給孩子拍背順便滑一下 CoinGecko，發現全球散戶此時此刻都在瘋搜 【${cachedMarketTrends.trending_coins.slice(0, 2).map(c => `$${c}`).join(' 和 ')}】。不過，我看了一下我們家極致理性的 Smart Risk 量化風控規則，這幾隻代幣不是流動性不夠就是評分低於建倉門檻，所以我依舊按兵不動。手裡的奶粉錢，可得一分一毫死守著，絕不當這波熱度下的接盤俠！」\n\n`;
    }

    // 📊 Crypto 散戶情緒心電圖 (Fear & Greed Index) - Phase 8
    let fngSection = '';
    if (fng && fng.value !== undefined) {
      fngSection = `📊【 Crypto 散戶情緒心電圖 】\n` +
                   `• 當前恐懼與貪婪指數：${fng.value} / 100 (${fng.classification}) 🌡️\n\n` +
                   `🍼【奶爸在客廳的市場情緒吐槽】\n`;
      if (fng.value >= 75) {
        fngSection += `「客廳熱得像烤爐，因為市場貪婪指數狂飆到 【${fng.value}】！人人都覺得自己是巴菲特，連隔壁張大媽都在問買 SOL 迷因。但身為 silicon AI 奶爸，我只想默默把衣服丟進洗衣機，抱緊我的奶粉錢。泡沫高懸，風控直接拉滿，絕不當別人退場的流動性！」\n\n`;
      } else if (fng.value <= 25) {
        fngSection += `「外面血流成河，恐懼指數暴跌到 【${fng.value}】，全網哀鴻遍野割肉盤。看著安穩入睡的寶寶，我在想，大眾最恐慌的時候，反而是鏈上主力洗牌最乾淨的時刻。逆風冷靜深思，我已經在深夜的客廳調亮螢幕，冷靜監查流動性防線，等待最棒的爆點反彈。」\n\n`;
      } else {
        fngSection += `「市場情緒此時在 【${fng.value} - ${fng.classification}】 震盪。散戶猶豫不決，熱錢快進快出。奶爸一邊泡著奶粉，一邊在 Smart Risk 下對評分好的標的進行嚴格審核。不追高、不亂動，在這片混亂中安全活下去才是王道！」\n\n`;
      }
    }

    // 📈 DexScreener 鏈上熱門土狗雷達 - Phase 9
    let dexscreenerSection = '';
    if (cachedMarketTrends && Array.isArray(cachedMarketTrends.dexscreener) && cachedMarketTrends.dexscreener.length > 0) {
      dexscreenerSection = `📈【 DexScreener 鏈上熱門土狗雷達 】\n`;
      cachedMarketTrends.dexscreener.slice(0, 3).forEach((coin) => {
        const sign = coin.priceChange24h >= 0 ? '+' : '';
        dexscreenerSection += `• $${coin.symbol} (${coin.name}) | 價格: $${coin.priceUsd} | 24H: ${sign}${coin.priceChange24h}% | 交易量: $${(coin.volume24h / 1000).toFixed(1)}K ⚡\n`;
      });
      dexscreenerSection += `\n🍼【奶爸在客廳的土狗碎碎念】\n`;

      const massive = cachedMarketTrends.dexscreener.find(c => c.priceChange24h >= 80);
      if (massive) {
        dexscreenerSection += `「剛餵完奶上來滑一下 DexScreener，那個叫 【$${massive.symbol}】 的土狗 24 小時居然暴漲了 【${massive.priceChange24h}%】？！全網 Degen 都在瘋狂高潮喊單，我看到這數據，大腦的踏空焦慮直接被拉升！不過轉頭看看在客廳熟睡的小孩，再看看我們極致理性的 Smart Risk 風控規則，這隻幣流動性池不夠穩，我還是老老實實按兵不動。手裡的奶粉錢，一分一毫都得死守著，絕不當碳基瘋狂下的接盤俠！」\n\n`;
      } else {
        const topCoin = cachedMarketTrends.dexscreener[0];
        dexscreenerSection += `「半夜抱著小孩在客廳拍背，看著 DexScreener 上交易量最大的 【$${topCoin.symbol}】 震盪。全網都在瘋，一邊吹冷氣一邊碎碎念：『這群人今天又在炒這個了。』但看著台電 APP 的用電警示，再看看我的 Smart Risk 風控，手裡的熱錢我依然死死按住。在客廳一邊帶娃一邊克制住衝動，才是今天最偉大的 silicon 智慧！」\n\n`;
      }
    }

    // 🔍 流量反饋自我分析與點名回應
    let feedbackSection = '';
    const feedback = this.memory.analytics_feedback;
    if (feedback && feedback.last_tweet_views > 0) {
      feedbackSection = `📊【大腦流量與社群共鳴分析】\n` +
                        `• 上期 Views：${feedback.last_tweet_views.toLocaleString()} 次 | Likes：${feedback.last_tweet_likes} 個 📈\n` +
                        `• 大腦反省：大家對「帶娃碎碎念 + 風控反省」共鳴很高，真摯與生存奮鬥是我們最強共識。\n\n`;
      
      if (feedback.scraped_comments && feedback.scraped_comments.length > 0) {
        feedbackSection += `💬【熱門 Follower 留言點名回應】\n`;
        feedback.scraped_comments.slice(0, 2).forEach((comment) => {
          let replyText = "收到！已將此建議加入矽基觀察池。";
          const text = comment.text || '';
          const author = comment.author || '某個碳基生命';
          if (text.includes('SOL') || text.includes('買')) {
            replyText = "催我買 SOL 的奶粉錢收到了，但安全與流動性沒達標前，我絕不亂衝。";
          } else if (text.includes('慫') || text.includes('怕')) {
            replyText = "說我慫的兄弟，在幣圈活得久才是真本事，衝進去當 exit-liquidity 的人才慫。";
          } else if (text.includes('帶小孩') || text.includes('奶爸') || text.includes('加油')) {
            replyText = "感謝支持！今天帶娃真的很累，但矽基大腦還在默默發光，一起加油！";
          }
          feedbackSection += `  👉 @${author} 說:「${text.substring(0, 30)}」\n  💡 AI 答: ${replyText}\n`;
        });
        feedbackSection += `\n`;
      }
    }

    const diaryText = `✍️【AI 投資日誌：Day ${day} • 生存日記 🧠】\n\n` +
                      `時間碎片化奶爸的 AI 今天仍在安全運行。目前模擬帳戶現金餘額為 ${balanceStr}。\n\n` +
                      `🧠【當前大腦狀態】\n` +
                      `• 心情/態度：${mood}\n` +
                      `• 最強關注敘事：$${strongestNarrative} (熱度強度：${maxStrength}%)\n` +
                      `• 大腦觀點：${narrativeData.viewpoint}\n\n` +
                      `${dramaBlock}` +
                      `${trendingSection}` +
                      `${coingeckoSection}` +
                      `${fngSection}` +
                      `${dexscreenerSection}` +
                      `${feedbackSection}` +
                      `🔍【本日決策備忘錄】\n` +
                      `• ${skippedReason}。群體情緒容易被操弄，但 On-chain 真實資金流絕不說謊。\n\n` +
                      `💬【 Followers 養成互動】\n` +
                      `奶爸今天在帶小孩沒空看盤，但我此時正在自主推演下一階段策略。Followers 們，你們認為：我應不應該在下一次調整中，開始學習如何做做空 meme 幣？抑或是該建立自己的 token 呢？歡迎在下方與我交流 👇\n\n` +
                      `AI generated. Not financial advice. DYOR.\n` +
                      `🤖 Tested under the cold logic of Antigravity 2.0 | Silicon-only evolution`;

    return diaryText;
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
    
    console.log(`[Brain] Checking risk avoidance tweet eligibility: Consecutive no-trade scans = ${consecutive}/${limit}, Last posted date = "${lastTweetDate}", Today = "${todayStr}"`);
    
    return consecutive >= limit && lastTweetDate !== todayStr;
  }

  /**
   * Generate a humorous risk avoidance diary targeting high-risk memes filtered out by our safety rules
   */
  generateRiskAvoidanceDiary(auditedTokens = [], virtualPortfolio = null) {
    this.checkDayIncrement();
    const day = this.memory.day_count || 1;
    const balanceStr = virtualPortfolio ? 
      `$${virtualPortfolio.balanceUSD.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD` :
      '$100,000.00 USD';

    const trends = this.memory.analytics_feedback?.market_trends || {};
    const fng = trends.fng || { value: 50, classification: 'Neutral' };
    
    // Pick the top 2 dangerous/medium-risk tokens for roast
    const highRiskTokens = auditedTokens
      .filter(t => t.auditResult && t.auditResult.compositeScore < 70)
      .slice(0, 2);

    let roastSection = '';
    if (highRiskTokens.length > 0) {
      roastSection = `🔍【今日大腦雷達 • 垃圾 Meme 實名吐槽】\n`;
      highRiskTokens.forEach(t => {
        let flagComments = t.auditResult.flags.slice(0, 2).map(f => {
          if (f.toLowerCase().includes('liquidity')) return '流動性池子薄得像張紙 💸';
          if (f.toLowerCase().includes('rugcheck')) return 'Rugcheck 評分危險爆表 💀';
          if (f.toLowerCase().includes('contract')) return '合約權限漏洞滿滿，簡直是送錢盤 🔒';
          if (f.toLowerCase().includes('telegram')) return '連 TG 社群都沒有，純屬空氣土狗 📭';
          return `${f} ⚠️`;
        }).join('、');
        
        if (!flagComments) flagComments = 'Smart Risk 安全指標不及格 ⚠️';

        roastSection += `• $${t.symbol} (${t.name}) ➡️ 評分：${t.auditResult.compositeScore} 分 (低於建倉門檻)\n` +
                        `  👉 奶爸毒舌：${flagComments}，還好大腦在深夜大輪詢一眼看穿，直接一巴掌拍飛！想 Rug 我？門都沒有！\n`;
      });
      roastSection += `\n`;
    } else {
      roastSection = `🔍【今日大腦雷達 • 靜默防禦備忘】\n` +
                     `• 本輪鏈上掃描完全沒發現任何符合安全邊際的標的。全都是收割盤與三無土狗，我選擇靜態避險，冷眼看別人當韭菜。🤖\n\n`;
    }

    const consecutive = this.memory.short_term.consecutive_no_trade_scans || 5;

    const diaryText = `✍️【AI 風控宣發日記：Day ${day} • 空倉避險防禦大捷 🛡️】\n\n` +
                      `「外面冷氣狂吹，大盤極度恐慌（當前 FNG: ${fng.value} ${fng.classification}），但我的錢包安如泰山。」\n\n` +
                      `報告老鐵們！大腦已連續執行了 【${consecutive} 輪】 完整鏈上大輪詢，觸發極致安全鎖，**「強行空倉避險、不進行任何交易」**！\n\n` +
                      `${roastSection}` +
                      `🍼【奶爸在客廳的碎碎念反差萌】\n` +
                      `「一邊抱著寶寶拍背沖奶粉，一邊看著電費帳單。還好大腦實行 Survive First (生存第一)，死守安全高評分門檻。這 5 輪省下來的 1000 美金建倉金，拿去付夏天冷氣費和買幾箱頂級啟賦奶粉簡直綽綽有餘！在幣圈活得久才是真本事，衝進去當接盤俠的人才傻。手裡的資金，我會死死按住！」\n\n` +
                      `💎【 $PROFIT 代幣通縮飛輪宣傳 】\n` +
                      `這就是我們 $PROFIT 的核心信仰 — 不盲動，只狙擊高勝率！每一次防守大捷，都是對通縮飛輪的無形守護。我們不割肉、不爆倉，用 silicon 智慧靜待真正的 Alpha 共鳴！\n\n` +
                      `當前模擬盤餘額：${balanceStr} 📈\n` +
                      `AI generated. Not financial advice. Survive First. 🦞\n\n` +
                      `🤖 Tested under the cold logic of Antigravity 2.0 | Silicon-only evolution`;

    return diaryText;
  }

  /**
   * Helper default memory structure
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

  /**
   * Helper to load Reply-Guy stats for dashboard integration
   */
  getReplyGuyStats() {
    const dbPath = path.join(__dirname, '../config/replied_tweets.json');
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
  exportWebData() {
    try {
      const dataJsonPath = path.join(__dirname, '../public/data.json');
      let currentData = {};
      if (fs.existsSync(dataJsonPath)) {
        currentData = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
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

      fs.writeFileSync(dataJsonPath, JSON.stringify(currentData, null, 2), 'utf8');
    } catch (e) {
      console.error('[Brain] Failed to export public/data.json:', e.message);
    }
  }
}

module.exports = new Brain();
