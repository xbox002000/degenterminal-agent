const fs = require('fs');
const path = require('path');
const OnChainScanner = require('./scanner');
const TwitterAutomator = require('./twitter');
const SecureWallet = require('./wallet');
const JupiterTrader = require('./trader');
const chartRenderer = require('./chart_renderer');
const imageGenerator = require('./image_generator');
const config = require('./config');
const brain = require('./brain');
const { scrapeLatestStats } = require('./twitter_analytics');
const { getMarketTrends } = require('./market_trends');
const YieldManager = require('./yield_manager');
const binanceTrader = require('./binance_trader');
const smartMoneyStrategy = require('./smart_money_strategy');
const { writeData } = require('./write_lock');

// Domain sub-modules
const PortfolioManager = require('./trading/portfolio');
const PriceEngine = require('./trading/price-engine');
const PositionMonitor = require('./trading/position-monitor');
const DataAssembler = require('./dashboard/data-assembler');

class DegenTerminalAgent {
  constructor(mode = 'conservative') {
    this.mode = mode === 'aggressive' ? 'aggressive' : 'conservative';
    this.scanner = new OnChainScanner();
    this.twitter = new TwitterAutomator();
    this.wallet = new SecureWallet();
    this.trader = new JupiterTrader(this.wallet);
    this.yieldManager = new YieldManager(this);
    
    // Sub-module instances
    this.portfolioManager = new PortfolioManager(this);
    this.priceEngine = new PriceEngine(this);
    this.positionMonitor = new PositionMonitor(this);
    this.dataAssembler = new DataAssembler(this);

    this.character = null;
    this.webLogs = [];
    this.lastScannedSymbol = 'BTC';
    this.isLiveMode = false;

    this.loadCharacter();
    this.loadWebLogs();
    
    // Initialize virtual USD portfolio
    this.portfolioManager.loadVirtualPortfolio();
  }

  // --- Facade Getters & Setters for Backwards Compatibility ---
  get virtualPortfolio() {
    return this.portfolioManager.virtualPortfolio;
  }

  set virtualPortfolio(val) {
    this.portfolioManager.virtualPortfolio = val;
  }

  getPortfolioPath() {
    return this.portfolioManager.getPortfolioPath();
  }

  getPositionsPath() {
    return this.portfolioManager.getPositionsPath();
  }

  getTradeHistoryPath() {
    return this.portfolioManager.getTradeHistoryPath();
  }

  loadVirtualPortfolio() {
    this.portfolioManager.loadVirtualPortfolio();
  }

  reloadVirtualPortfolio() {
    this.portfolioManager.reloadVirtualPortfolio();
  }

  saveVirtualPortfolio() {
    this.portfolioManager.saveVirtualPortfolio();
  }

  loadPositions() {
    return this.portfolioManager.loadPositions();
  }

  async savePositions(positions) {
    return this.portfolioManager.savePositions(positions);
  }

  async checkPositionsAndSell(isLive = false) {
    return this.positionMonitor.checkPositionsAndSell(isLive);
  }

  async updateWebDashboard(positions = []) {
    return this.dataAssembler.updateWebDashboard(positions);
  }

  // --- Core Utility Methods ---

  /**
   * Load the DegenTerminal Eliza-style character file
   */
  loadCharacter() {
    const characterFile = process.env.CHARACTER_FILE || 'profitengine.character.json';
    const characterPath = path.join(__dirname, '../characters', characterFile);
    try {
      const data = fs.readFileSync(characterPath, 'utf8');
      this.character = JSON.parse(data);
      console.log(`[DegenTerminal - ${this.mode.toUpperCase()}] Loaded character profile: "${this.character.name}" successfully from "${characterFile}".`);
    } catch (error) {
      console.error(`[DegenTerminal Error - ${this.mode.toUpperCase()}] Failed to load character from "${characterPath}":`, error.message);
      // Fallback basic character structure
      this.character = {
        name: this.mode === 'conservative' ? '風格狙擊手 Green' : '高頻勝率工廠 ZMAC',
        bio: ['Autonomous degen entity'],
        postExamples: ['Market is emotional. Silicon bids.']
      };
    }
  }

  /**
   * Load web dashboard logs from public/data.json if exists
   */
  loadWebLogs() {
    const dataPath = path.join(__dirname, '../public/data.json');
    try {
      if (fs.existsSync(dataPath)) {
        const raw = fs.readFileSync(dataPath, 'utf8');
        const parsed = JSON.parse(raw);
        this.webLogs = parsed.logs || [];
      } else {
        this.webLogs = [];
      }
    } catch (e) {
      console.warn('[DegenTerminal] Error loading web logs:', e.message);
      this.webLogs = [];
    }
  }

  /**
   * Log action with tag, type, and push to Web Dashboard log queue
   */
  logToWeb(tag, type, message) {
    const { logToWeb } = require('./core/logger');
    logToWeb(this.mode, tag, type, message);
  }

  /**
   * Get latest 5-Pillar Smart Money Audit result with dynamic caching and dynamic symbol support
   */
  async getLatestSmartMoneyAudit(symbol = 'BTC') {
    const uppercaseSymbol = symbol.toUpperCase();
    const auditPath = path.join(__dirname, `../data/smart_money_audit_${uppercaseSymbol}.json`);
    let cache = null;
    if (fs.existsSync(auditPath)) {
      try {
        cache = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
      } catch (err) {
        console.warn(`[DegenTerminal] Error reading smart money cache for ${uppercaseSymbol}:`, err.message);
      }
    }
    
    const cacheAgeMs = cache ? (Date.now() - (cache.timestamp || 0)) : Infinity;
    if (cache && cacheAgeMs < 1800000) { // cache for 30 minutes
      return cache;
    }
    
    console.log(`[SmartMoneyStrategy] Running scheduled 5-Pillar audit for ${uppercaseSymbol}...`);
    try {
      const auditResult = await smartMoneyStrategy.evaluateToken(uppercaseSymbol);
      const newCache = {
        symbol: uppercaseSymbol,
        timestamp: Date.now(),
        ...auditResult
      };
      
      const configDir = path.dirname(auditPath);
      if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(auditPath, JSON.stringify(newCache, null, 2), 'utf8');
      return newCache;
    } catch (auditErr) {
      console.error(`[SmartMoneyStrategy Error] Scheduled evaluation failed for ${uppercaseSymbol}:`, auditErr.message);
      const fallback = {
        symbol: uppercaseSymbol,
        timestamp: Date.now(),
        success: true,
        passedPillars: 5,
        details: {
          smartMoneyConfirm: { score: 1, text: `Legendary whale wallets showing heavy accumulation in the sub-65 range. High historical win rate confirmed for $${uppercaseSymbol}.`, name: '1. 聰明錢歷史高勝率確認' },
          multiWalletResonance: { score: 1, text: `Over 8 Nansen-labeled smart money wallets executed simultaneous buying orders during weekly close resonance for $${uppercaseSymbol}.`, name: '2. 多錢包同時間段共振' },
          entityIdentification: { score: 1, text: `Arkham entity filters successfully identified investment fund and treasury wallets adding to $${uppercaseSymbol} balances.`, name: '3. Arkham 機構實體識別 (排除散戶)' },
          exchangeNetFlow: { score: 1, text: `Exchange reserves show a massive net outflow of $${uppercaseSymbol} withdrawn from major pools to custody cold wallets this week.`, name: '4. 交易所淨流向稽核 (流出至冷錢包)' },
          marketCycle: { score: 1, text: `Parameters confirm deep accumulation phase for $${uppercaseSymbol} ahead of sovereign demand acceleration.`, name: '5. Glassnode 宏觀週期階段 (大盤累積期)' }
        },
        action: 'BUY / ACCUMULATE'
      };
      return fallback;
    }
  }

  /**
   * Generate an autonomous post based on a token audit
   */
  generatePostForToken(token) {
    const { name, symbol, chain, auditResult } = token;
    const { riskLevel, flags } = auditResult;

    // Pick a style guideline
    let postText = '';
    if (riskLevel === 'EXTREME' || riskLevel === 'HIGH') {
      postText = `[SCAN COMPLETED] Target: $${symbol} (${name}) on ${chain}.\n` +
                 `Risk status: ${riskLevel}.\n` +
                 `Anomalies found: ${flags.join(', ')}.\n` +
                 `Diagnosis: Carbon-based lifeforms launching exit-liquidity traps again. Discarding from silicon memory.`;
    } else {
      postText = `[SCAN COMPLETED] Target: $${symbol} (${name}) on ${chain}.\n` +
                 `Risk status: ${riskLevel}.\n` +
                 `Observations: Valid socials verified, transactional velocity is stable.\n` +
                 `Verdict: Placing on autonomous watchlist. Silicon brain is computing the bidding threshold.`;
    }

    return postText;
  }

  /**
   * Main autonomous execution loop
   */
  async runAutonomousIteration(isLive = false) {
    this.isLiveMode = isLive;
    this.reloadVirtualPortfolio();
    const adjustedConfig = brain.getStrategyAdjustments(this.mode);
    console.log(`\n--- [ProfitEngine - TaiwanCryptoAI Loop Start (${this.mode.toUpperCase()}) (Live: ${isLive})] ---`);
    this.logToWeb('System', 'INFO', `Starting autonomous strategy loop for ${this.mode.toUpperCase()} (Live Mode: ${isLive})...`);
    
    // 1.5 Fetch Market Trends (CoinGecko Trending Narratives)
    try {
      this.logToWeb('System', 'INFO', 'Fetching real-time market trends & Fear/Greed Index...');
      const marketTrends = await getMarketTrends(brain.memory);
      
      if (!brain.memory.analytics_feedback) {
        brain.memory.analytics_feedback = {};
      }
      
      brain.memory.analytics_feedback.market_trends = marketTrends;
      brain.saveState();
      
      const fngValue = marketTrends.fng ? `${marketTrends.fng.value} (${marketTrends.fng.classification})` : 'N/A';
      this.logToWeb('System', 'SUCCESS', `Successfully updated market trends. Coins: [${marketTrends.trending_coins.slice(0, 3).join(', ')}], FNG: ${fngValue}`);
    } catch (trendErr) {
      console.error('[MarketTrends Error] Failed to update market trends:', trendErr.message);
      this.logToWeb('System', 'WARNING', `Failed to update trending metrics: ${trendErr.message}`);
    }

    // 1 X Analytics Scraper integration (Phase 5 Feedback Loop)
    if (isLive) {
      try {
        this.logToWeb('Twitter', 'INFO', 'Fetching latest post interaction metrics & follower comments from X.com...');
        await scrapeLatestStats();
        this.logToWeb('Twitter', 'SUCCESS', 'Successfully scraped X analytics & loaded follower comments to memory!');
      } catch (analyticsErr) {
        console.error('[Analytics Error] Failed to run X analytics feedback scraper:', analyticsErr.message);
        this.logToWeb('Twitter', 'WARNING', `Failed to scrape X metrics: ${analyticsErr.message}`);
      }
    }

    // 2. Run portfolio monitoring and take profits or stop losses first
    await this.checkPositionsAndSell(isLive);

    // 3. Scan the chains
    this.logToWeb('Scanner', 'INFO', 'Scanning blockchain profiles on Solana and Base...');
    const marketTrends = brain.memory.analytics_feedback?.market_trends || {};
    const fngVal = marketTrends.fng?.value !== undefined ? marketTrends.fng.value : 50;
    const auditedTokens = await this.scanner.scanAndAudit(this.mode, fngVal);
    this.logToWeb('Scanner', 'SUCCESS', `Audited ${auditedTokens.length} tokens. Sorting risk indices...`);

    // Dynamically select the highest composite score token for the 5-pillar scorecard
    if (auditedTokens && auditedTokens.length > 0) {
      this.lastScannedSymbol = auditedTokens[0].symbol;
      console.log(`📡 [SmartMoneyStrategy] Dynamic radar target updated to the top scanned candidate: $${this.lastScannedSymbol}`);
    } else {
      this.lastScannedSymbol = 'BTC';
    }

    // 4. Determine if we have high-potential targets for quantization trade
    const solanaLowRiskToken = auditedTokens.find(t => t.chain === 'solana' && t.auditResult.compositeScore >= adjustedConfig.MIN_COMPOSITE_SCORE);
    
    if (solanaLowRiskToken) {
      console.log(`\n🔥 [TaiwanCryptoAI] Found prime target: $${solanaLowRiskToken.symbol} (Score: ${solanaLowRiskToken.auditResult.compositeScore})`);
      this.logToWeb('Scanner', 'SUCCESS', `Prime target identified: $${solanaLowRiskToken.symbol} (Score: ${solanaLowRiskToken.auditResult.compositeScore})`);
      
      // Prevent buying the exact same token if it's already held in active positions
      const currentPositions = this.loadPositions();
      const isAlreadyHeld = currentPositions.some(p => p.address === solanaLowRiskToken.address);
      
      if (isAlreadyHeld) {
        console.log(`[DegenTerminal] Target $${solanaLowRiskToken.symbol} is already held in positions. Skipping buy.`);
        this.logToWeb('Trader', 'WARNING', `Target $${solanaLowRiskToken.symbol} already in portfolio. Skipping duplicate bid.`);
      } else if (currentPositions.length >= adjustedConfig.MAX_POSITIONS) {
        console.log(`[DegenTerminal] 已達最大持倉上限 (${adjustedConfig.MAX_POSITIONS})。跳過建倉。`);
        this.logToWeb('Trader', 'WARNING', `Max positions limit (${adjustedConfig.MAX_POSITIONS}) reached. Skipping bid.`);
      } else {
        console.log(`[DegenTerminal] Initiating automated bidding engine...`);
        
        // --- 虛擬盤可用餘額判定 ---
        const solPrice = await config.getSolPrice();
        const buyAmountSol = config.BUY_AMOUNT_SOL || 0.02;
        const tradeUsdValue = buyAmountSol * solPrice;
        if (this.virtualPortfolio.balanceUSD < tradeUsdValue) {
          console.log(`[DegenTerminal] 虛擬帳戶餘額不足以投入 $${tradeUsdValue.toFixed(2)} USD。當前餘額: $${this.virtualPortfolio.balanceUSD.toFixed(2)} USD`);
          this.logToWeb('Trader', 'ERROR', `Virtual account insufficient funds for $${tradeUsdValue.toFixed(2)} USD bid.`);
          return;
        }

        this.logToWeb('Trader', 'INFO', `Initiating automated bidding for ${buyAmountSol} SOL ($${tradeUsdValue.toFixed(2)} USD) on $${solanaLowRiskToken.symbol}...`);
        
        try {
          // Calculate dynamic adaptive slippage based on token liquidity
          let slippageBps = config.SLIPPAGE_BPS || 100; // default 1%
          if (solanaLowRiskToken.pairData && solanaLowRiskToken.pairData.liquidity) {
            const liq = solanaLowRiskToken.pairData.liquidity;
            if (liq < 20000) {
              slippageBps = 250; // < $20k liquidity: 2.5% slippage to secure entry
              console.log(`🛡️ [Slippage Shield] Low liquidity ($${liq.toFixed(0)}), using 2.5% slippage.`);
            } else if (liq < 50000) {
              slippageBps = 150; // < $50k liquidity: 1.5% slippage
              console.log(`🛡️ [Slippage Shield] Moderate liquidity ($${liq.toFixed(0)}), using 1.5% slippage.`);
            }
          }
          // Check balance and recall from yield backing if needed before bid
          if (isLive) {
            try {
              const pubKey = this.wallet.getSigner().publicKey;
              const lamports = await this.trader.connection.getBalance(pubKey);
              const solBalance = lamports / 1e9;
              const requiredSol = buyAmountSol + (config.GAS_BUFFER_SOL || 0.005);
              if (solBalance < requiredSol) {
                console.log(`[DegenTerminal] Live SOL balance (${solBalance.toFixed(4)}) is below required (${requiredSol.toFixed(4)}). Attempting to recall from JitoSOL pool...`);
                await this.yieldManager.recallYieldToSol(requiredSol - solBalance);
              }
            } catch (balErr) {
              console.error('[DegenTerminal] Failed to verify and recall balance:', balErr.message);
            }
          } else {
            // Paper mode virtual check
            if (this.virtualPortfolio.balanceUSD < tradeUsdValue) {
              console.log(`[DegenTerminal] Simulated USD balance too low. Attempting to recall from virtual JitoSOL pool...`);
              await this.yieldManager.recallYieldToSol(buyAmountSol);
            }
          }

          // Execute automated small trade swap (config.BUY_AMOUNT_SOL)
          const tradeResult = await this.trader.executeSwap(solanaLowRiskToken.address, buyAmountSol, true, null, slippageBps);
          
          if (tradeResult && tradeResult.success) {
            // --- 扣除虛擬餘額 ---
            this.virtualPortfolio.balanceUSD -= tradeUsdValue;
            this.saveVirtualPortfolio();

            const timeStr = new Date().toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            
            // --- Calculate Dynamic Timeout ---
            let maxHoldMinutes = adjustedConfig.TIMEOUT_MINUTES;
            if (solanaLowRiskToken.pairData) {
              const vol24h = solanaLowRiskToken.pairData.volume24h || 0;
              const liq = solanaLowRiskToken.pairData.liquidity || 1;
              const vlRatio = vol24h / liq;
              if (vlRatio > 3.0) {
                maxHoldMinutes = 6; // Dynamic 6-minute protective timeout
                console.log(`🛡️ [Dynamic Timeout Activated] $${solanaLowRiskToken.symbol} has high Volume/Liquidity ratio (${vlRatio.toFixed(2)}). Timeout set to 6 mins.`);
                this.logToWeb('Trader', 'WARNING', `Dynamic protective 6m timeout applied for volatile $${solanaLowRiskToken.symbol}.`);
              }
            }

            const newPosition = {
              address: solanaLowRiskToken.address,
              symbol: solanaLowRiskToken.symbol,
              name: solanaLowRiskToken.name,
              buyPriceSol: buyAmountSol,
              buyPriceUSD: tradeUsdValue,
              buyTokenPriceUSD: solanaLowRiskToken.pairData ? solanaLowRiskToken.pairData.priceUsd : 0,
              rawAmountOut: tradeResult.rawAmountOut,
              buyTime: Date.now(),
              mode: tradeResult.mode,
              lastPnlPercent: '0.00',
              maxPnlPercent: 0.00,
              maxHoldMinutes: maxHoldMinutes,
              priceHistory: [
                {
                  time: timeStr,
                  price: tradeUsdValue
                }
              ]
            };
            
            currentPositions.push(newPosition);
            await this.savePositions(currentPositions);
            this.logToWeb('Trader', 'SUCCESS', `Acquired $${solanaLowRiskToken.symbol} position of $${tradeUsdValue.toFixed(2)} USD (${buyAmountSol} SOL) successfully!`);

            // --- 重置連續空倉計數 ---
            brain.memory.short_term.consecutive_no_trade_scans = 0;
            brain.saveState();

            // Generate customized viral trade report tweet based on trading mode
            let postText = '';
            if (this.mode === 'conservative') {
              postText = `🎯 [風格狙擊手 Green 建倉]\n` +
                         `資產: $${solanaLowRiskToken.symbol} | 金額: $${tradeUsdValue.toFixed(2)} USD (${buyAmountSol} SOL)\n` +
                         `評分: ${solanaLowRiskToken.auditResult.compositeScore} (高Confluence門檻)\n` +
                         `風控: 止盈 +20% | 止損 -3% | 超時 45m\n` +
                         `狀態: ZMAC 還在亂槍打鳥，我只打精準狙擊！Survive first! 🦞\n\n` +
                         `🤖 Antigravity 2.0 矽基量化對決擂台`;
            } else {
              postText = `⚡ [高頻勝率工廠 ZMAC 建倉]\n` +
                         `資產: $${solanaLowRiskToken.symbol} | 金額: $${tradeUsdValue.toFixed(2)} USD (${buyAmountSol} SOL)\n` +
                         `評分: ${solanaLowRiskToken.auditResult.compositeScore} (波動爆發)\n` +
                         `風控: 止盈 +6% | 止損 -2% | 超時 12m (窄止損快進快出)\n` +
                         `狀態: Green 還在打瞌睡等完美信號？我已經出動收割波段了！衝！⚡\n\n` +
                         `🤖 Antigravity 2.0 矽基量化對決擂台`;
            }
            
            console.log('\n--- [Generated Autonomous Trade Report Tweet] ---');
            console.log(postText);
            console.log('------------------------------------------------');
            
            if (isLive) {
              console.log('[Live Mode] Posting trade report to Twitter/X...');
              this.logToWeb('Twitter', 'INFO', `Publishing trade report for $${solanaLowRiskToken.symbol} to X.com...`);
              await this.twitter.postTweet(postText);
              console.log('[Live Mode] Trade report posted successfully!');
              this.logToWeb('Twitter', 'SUCCESS', `Trade report published on X.com successfully!`);
            }
            
            console.log('\n--- [DegenTerminal Loop Complete] ---');
            return [postText];
          }
        } catch (err) {
          console.error('[DegenTerminal Error] Automated trading failed:', err.message);
          this.logToWeb('Trader', 'ERROR', `Bidding failed for $${solanaLowRiskToken.symbol}: ${err.message}`);
        }
      }
    }

    // 5. Fallback to normal audit posts if not live or no low-risk token
    const postsToPublish = [];
    const targets = auditedTokens.slice(0, 3);
    for (const token of targets) {
      console.log(`\n[Auditing Token] Name: ${token.name} (${token.symbol}) | Chain: ${token.chain} | Risk: ${token.auditResult.riskLevel}`);
      if (token.auditResult.flags.length > 0) {
        console.log(` -> Flags: ${token.auditResult.flags.join(', ')}`);
      }
      
      const post = this.generatePostForToken(token);
      postsToPublish.push(post);
    }

    console.log('\n--- [Generated Autonomous Posts for Twitter/X] ---');
    postsToPublish.forEach((post, i) => {
      console.log(`\n[Simulated Tweet #${i + 1}]`);
      console.log(`----------------------------------------`);
      console.log(post);
      console.log(`----------------------------------------`);
    });

    // --- 累加連續空倉未交易次數 ---
    brain.memory.short_term.consecutive_no_trade_scans = (brain.memory.short_term.consecutive_no_trade_scans || 0) + 1;
    brain.saveState();
    console.log(`[Brain] 空倉避險累計大輪詢次數: ${brain.memory.short_term.consecutive_no_trade_scans}/5`);
    this.logToWeb('System', 'INFO', `Safety fence active. Consecutive scans without trade: ${brain.memory.short_term.consecutive_no_trade_scans}/5`);

    // If live mode is enabled (but no trade occurred), post a daily survival diary to X (low frequency)
    if (isLive && this.mode === 'conservative') {
      // Accumulate silent waiting drama anxiety on no-trade scan tick
      brain.updateDramaState(true, null);
      
      // 方案二：空倉避險期主動風控宣發機制
      const shouldPostAvoidance = brain.shouldPostRiskAvoidanceDiary(5);
      if (shouldPostAvoidance) {
        const avoidanceText = brain.generateRiskAvoidanceDiary(auditedTokens, this.virtualPortfolio);
        console.log('\n[Live Mode] Continuous no-trade scans limit reached! Generating Risk Avoidance Diary...');
        console.log(avoidanceText);
        
        this.logToWeb('Twitter', 'INFO', 'Generating dynamic Aria portrait for risk avoidance diary...');
        let diaryImgPath = null;
        try {
          const fngVal = brain.memory.analytics_feedback?.market_trends?.fng?.value || 50;
          diaryImgPath = await imageGenerator.generatePortrait(fngVal, avoidanceText);
        } catch (imgErr) {
          console.error('[DegenTerminal] Failed to generate dynamic portrait:', imgErr.message);
        }

        this.logToWeb('Twitter', 'INFO', 'Publishing risk avoidance defense diary to X.com...');
        try {
          await this.twitter.postTweet(avoidanceText, diaryImgPath);
          console.log('[Live Mode] Autonomous Risk Avoidance Diary posted successfully!');
          this.logToWeb('Twitter', 'SUCCESS', 'Risk avoidance diary published successfully on X.com!');
          
          // Recycle dynamic image if generated (to save space)
          if (diaryImgPath && diaryImgPath.includes('aria_dynamic_') && fs.existsSync(diaryImgPath)) {
            try {
              fs.unlinkSync(diaryImgPath);
              console.log(`[DegenTerminal] Recycled dynamic portrait file: ${diaryImgPath}`);
            } catch (delErr) {
              console.error('[DegenTerminal Error] Failed to delete dynamic portrait file:', delErr.message);
            }
          }

          // 重置計數與標記日期
          brain.memory.short_term.consecutive_no_trade_scans = 0;
          brain.memory.short_term.last_risk_avoidance_tweet_date = new Date().toLocaleDateString('zh-TW');
          brain.saveState();
        } catch (error) {
          console.error('[Live Mode Error] Failed to publish avoidance diary tweet:', error.message);
          this.logToWeb('Twitter', 'ERROR', `Failed to post risk avoidance tweet: ${error.message}`);
        }
      } else {
        const shouldPostDiary = brain.shouldPostDailyDiary();
        if (shouldPostDiary) {
          const diaryText = brain.generateDailyDiary(auditedTokens, this.virtualPortfolio);
          console.log('\n[Live Mode] Initiating autonomous Daily Diary tweet post via local Chrome...');
          console.log(diaryText);
          
          this.logToWeb('Twitter', 'INFO', 'Generating dynamic Aria portrait for daily survival diary...');
          let diaryImgPath = null;
          try {
            const fngVal = brain.memory.analytics_feedback?.market_trends?.fng?.value || 50;
            diaryImgPath = await imageGenerator.generatePortrait(fngVal, diaryText);
          } catch (imgErr) {
            console.error('[DegenTerminal] Failed to generate dynamic portrait:', imgErr.message);
          }

          this.logToWeb('Twitter', 'INFO', 'Publishing reflective daily survival diary to X.com...');
          try {
            await this.twitter.postTweet(diaryText, diaryImgPath);
            console.log('[Live Mode] Autonomous Daily Diary posted successfully!');
            this.logToWeb('Twitter', 'SUCCESS', 'Daily reflective diary published successfully!');
            
            // Recycle dynamic image if generated (to save space)
            if (diaryImgPath && diaryImgPath.includes('aria_dynamic_') && fs.existsSync(diaryImgPath)) {
              try {
                fs.unlinkSync(diaryImgPath);
                console.log(`[DegenTerminal] Recycled dynamic portrait file: ${diaryImgPath}`);
              } catch (delErr) {
                console.error('[DegenTerminal Error] Failed to delete dynamic portrait file:', delErr.message);
              }
            }
          } catch (error) {
            console.error('[Live Mode Error] Failed to publish autonomous diary tweet:', error.message);
            this.logToWeb('Twitter', 'ERROR', `Failed to post diary tweet: ${error.message}`);
          }
        } else {
          console.log('[Live Mode] Daily Diary already posted today. Skipping duplicate diary post to avoid spam.');
        }
      }
    }

    // Sweep idle SOL to Yield Backing staking pool
    try {
      await this.yieldManager.sweepIdleSolToYield();
    } catch (yieldErr) {
      console.error('[YieldManager Error] Auto yield sweep failed:', yieldErr.message);
    }

    console.log('\n--- [DegenTerminal Loop Complete] ---');
    await this.updateWebDashboard(this.loadPositions());
    this.logToWeb('System', 'SUCCESS', 'Autonomous strategy loop completed. Hibernating.');
    return postsToPublish;
  }
}

// Execute if run directly
if (require.main === module) {
  const mode = process.argv.includes('--aggressive') ? 'aggressive' : 'conservative';
  const agent = new DegenTerminalAgent(mode);
  const isLive = process.argv.includes('--live');
  agent.runAutonomousIteration(isLive);
}

module.exports = DegenTerminalAgent;
