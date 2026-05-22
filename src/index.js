const fs = require('fs');
const path = require('path');
const OnChainScanner = require('./scanner');
const TwitterAutomator = require('./twitter');
const SecureWallet = require('./wallet');
const JupiterTrader = require('./trader');
const chartRenderer = require('./chart_renderer');
const config = require('./config');
const brain = require('./brain');
const { scrapeLatestStats } = require('./twitter_analytics');
const { getMarketTrends } = require('./market_trends');

class DegenTerminalAgent {
  constructor(mode = 'conservative') {
    this.mode = mode === 'aggressive' ? 'aggressive' : 'conservative';
    this.scanner = new OnChainScanner();
    this.twitter = new TwitterAutomator();
    this.wallet = new SecureWallet();
    this.trader = new JupiterTrader(this.wallet);
    this.character = null;
    this.webLogs = [];
    this.virtualPortfolio = {
      balanceUSD: 100000.00,
      totalProfitUSD: 0.00,
      initialBalanceUSD: 100000.00
    };
    this.loadCharacter();
    this.loadWebLogs();
    this.loadVirtualPortfolio();
  }

  getPortfolioPath() {
    return path.join(__dirname, `../config/virtual_portfolio_${this.mode}.json`);
  }

  getPositionsPath() {
    return path.join(__dirname, `../config/positions_${this.mode}.json`);
  }

  getTradeHistoryPath() {
    return path.join(__dirname, `../config/trade_history_${this.mode}.json`);
  }

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
      // Fallback basic structure
      this.character = {
        name: this.mode === 'conservative' ? '風格狙擊手 Green' : '高頻勝率工廠 ZMAC',
        bio: ['Autonomous degen entity'],
        postExamples: ['Market is emotional. Silicon bids.']
      };
    }
  }

  /**
   * Load Virtual USD Portfolio from dynamic dynamic path
   */
  loadVirtualPortfolio() {
    const configDir = path.join(__dirname, '../config');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    const portfolioPath = this.getPortfolioPath();
    if (!fs.existsSync(portfolioPath)) {
      this.saveVirtualPortfolio();
      return;
    }
    try {
      const data = fs.readFileSync(portfolioPath, 'utf8');
      this.virtualPortfolio = JSON.parse(data);
      
      // --- Auto Calibration from dynamic trade history ---
      const historyPath = this.getTradeHistoryPath();
      if (fs.existsSync(historyPath)) {
        try {
          const historyData = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
          let totalPnlUSD = 0;
          historyData.forEach(trade => {
            totalPnlUSD += (trade.pnlUSD || 0);
          });
          
          const initial = this.virtualPortfolio.initialBalanceUSD || 100000.00;
          const expectedBalance = initial + totalPnlUSD;
          
          // If current balance in portfolio file is mismatch with actual trading history PnL, calibrate it
          if (Math.abs((this.virtualPortfolio.balanceUSD || 0) - expectedBalance) > 1) {
            console.log(`💡 [DegenTerminal - ${this.mode.toUpperCase()}] 檢測到資產與歷史交易記錄不相符，自動校正資產與收益數據：`);
            console.log(`   -> 原餘額: $${this.virtualPortfolio.balanceUSD} | 正確餘額: $${expectedBalance}`);
            console.log(`   -> 原收益: $${this.virtualPortfolio.totalProfitUSD} | 正確收益: $${totalPnlUSD}`);
            
            this.virtualPortfolio.balanceUSD = expectedBalance;
            this.virtualPortfolio.totalProfitUSD = totalPnlUSD;
            this.virtualPortfolio.initialBalanceUSD = initial;
            this.saveVirtualPortfolio();
          }
        } catch (calErr) {
          console.warn(`[DegenTerminal - ${this.mode.toUpperCase()}] Portfolio auto-calibration failed:`, calErr.message);
        }
      }
      // -------------------------------------------------

      console.log(`[DegenTerminal - ${this.mode.toUpperCase()}] Loaded virtual USD portfolio. Balance: $${this.virtualPortfolio.balanceUSD.toFixed(2)} USD.`);
    } catch (e) {
      console.error(`[DegenTerminal - ${this.mode.toUpperCase()}] Failed to load virtual portfolio, resetting:`, e.message);
      this.saveVirtualPortfolio();
    }
  }

  /**
   * Save Virtual USD Portfolio to dynamic dynamic path
   */
  saveVirtualPortfolio() {
    const configDir = path.join(__dirname, '../config');
    const portfolioPath = this.getPortfolioPath();
    try {
      fs.writeFileSync(portfolioPath, JSON.stringify(this.virtualPortfolio, null, 2), 'utf8');
    } catch (e) {
      console.error(`[DegenTerminal - ${this.mode.toUpperCase()}] Failed to save virtual portfolio:`, e.message);
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
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];
    const prefix = this.mode === 'conservative' ? '🟢[Green]' : '🟣[ZMAC]';
    const logEntry = {
      time: timeStr,
      tag: `${prefix} ${tag || 'AI'}`,
      type: type || 'INFO',
      message: message
    };
    
    // Safety reload logs to merge parallel log activities
    this.loadWebLogs();
    
    this.webLogs.push(logEntry);
    
    // Keep last N logs
    const maxLogs = config.common ? config.common.MAX_WEB_LOGS : (config.MAX_WEB_LOGS || 40);
    if (this.webLogs.length > maxLogs) {
      this.webLogs.shift();
    }
  }

  /**
   * Export database metrics, active positions, and matrix logs to public/data.json
   */
  updateWebDashboard(positions = []) {
    const dataPath = path.join(__dirname, '../public/data.json');
    const isLive = !!this.isLiveMode;
    
    // Ensure we have loaded virtual portfolio
    if (!this.virtualPortfolio) {
      this.loadVirtualPortfolio();
    }

    // Load actual closed trade history
    let tradeHistory = [];
    try {
      const historyPath = this.getTradeHistoryPath();
      if (fs.existsSync(historyPath)) {
        tradeHistory = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
      }
    } catch (histErr) {
      console.warn(`[DegenTerminal - ${this.mode}] Failed to read trade history for web payload:`, histErr.message);
    }

    // Calculate current net portfolio value
    let totalPositionValueUSD = 0;
    const mappedPositions = positions.map(pos => {
      const pnlVal = parseFloat(pos.lastPnlPercent || 0);
      const buyPriceUSD = pos.buyPriceUSD || 1000.00;
      const pnlRatio = pnlVal / 100;
      const currentValUSD = buyPriceUSD * (1 + pnlRatio);
      totalPositionValueUSD += currentValUSD;

      return {
        symbol: pos.symbol,
        name: pos.name,
        buyTime: pos.buyTime,
        pnlPercent: pos.lastPnlPercent || '0.00',
        buyPriceSol: pos.buyPriceSol,
        buyPriceUSD: buyPriceUSD,
        amountOut: pos.rawAmountOut || pos.amountOut || 0,
        currentValueUSD: currentValUSD,
        maxHoldMinutes: pos.maxHoldMinutes
      };
    });

    const netValueUSD = this.virtualPortfolio.balanceUSD + totalPositionValueUSD;

    const agentPayload = {
      character: {
        name: this.mode === 'conservative' ? '風格狙擊手 Green 🦞' : '高頻勝率工廠 ZMAC ⚡',
        bio: this.mode === 'conservative' 
          ? '頂尖超高勝率 AI 狙擊手，秉持極致保守風控哲學。最厲害的交易就是不交易！Survive first!' 
          : '高頻超短線量化交易工廠，短線快速 Scalping，快進快出，累積盈虧以數量與紀律取勝。',
        avatar: this.mode === 'conservative' ? 'profitengine_avatar.png' : 'avatar.png',
        banner: this.mode === 'conservative' ? 'profitengine_banner.png' : 'banner.png'
      },
      virtualPortfolio: {
        balanceUSD: this.virtualPortfolio.balanceUSD,
        totalProfitUSD: this.virtualPortfolio.totalProfitUSD,
        netValueUSD: netValueUSD,
        initialBalanceUSD: this.virtualPortfolio.initialBalanceUSD || 100000.00
      },
      positions: mappedPositions,
      tradeHistory: tradeHistory,
      status: this.mode === 'conservative' 
        ? (brain.memory.short_term.mood || '謹慎觀望中 - Survive First') 
        : '快進快出高頻掃描中 - Scalping Hard'
    };

    // Load existing payload to merge
    let fullPayload = {
      metrics: {
        mode: isLive ? 'LIVE' : 'PAPER',
        isLive: isLive
      },
      logs: this.webLogs
    };

    try {
      if (fs.existsSync(dataPath)) {
        const raw = fs.readFileSync(dataPath, 'utf8');
        const parsed = JSON.parse(raw);
        fullPayload = { ...parsed, ...fullPayload };
      }
    } catch (readErr) {
      console.warn('[DegenTerminal] Error reading existing data.json for update:', readErr.message);
    }

    // Set this agent's mode-specific payload
    fullPayload[this.mode] = agentPayload;
    
    // Also export a brain module summary if it doesn't exist
    if (!fullPayload.brain) {
      fullPayload.brain = {
        dayCount: brain.memory.day_count || 1,
        mood: brain.memory.short_term.mood || 'Cautious & Observant (謹慎觀望中)',
        beliefs: brain.memory.identity_memory.core_beliefs || [],
        narratives: brain.narratives.narratives || {},
        strategyAdjustments: brain.memory.long_term.strategy_adjustments || [],
        lessonsLearned: brain.memory.long_term.lessons_learned || [],
        activeOverrides: brain.getStrategyAdjustments(this.mode),
        replyGuyStats: brain.getReplyGuyStats()
      };
    }

    try {
      const publicDir = path.dirname(dataPath);
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      fs.writeFileSync(dataPath, JSON.stringify(fullPayload, null, 2), 'utf8');
    } catch (e) {
      console.error(`[DegenTerminal - ${this.mode}] Error updating web dashboard json:`, e.message);
    }
  }

  /**
   * Generate an autonomous post based on a token audit
   */
  generatePostForToken(token) {
    const { name, symbol, chain, auditResult } = token;
    const { riskLevel, flags } = auditResult;

    // Pick a style guideline
    const postStyles = this.character.postExamples || [];
    const bioPhrases = this.character.bio || [];

    // Simulate Eliza prompt output based on the audit
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
   * Load current active trading positions from dynamic path
   */
  loadPositions() {
    const configDir = path.join(__dirname, '../config');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    const positionsPath = this.getPositionsPath();
    if (!fs.existsSync(positionsPath)) {
      fs.writeFileSync(positionsPath, '[]', 'utf8');
      return [];
    }
    try {
      const data = fs.readFileSync(positionsPath, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      console.error(`[DegenTerminal - ${this.mode}] Error loading positions, resetting database:`, e.message);
      return [];
    }
  }

  /**
   * Save active trading positions to dynamic path
   */
  savePositions(positions) {
    const configDir = path.join(__dirname, '../config');
    const positionsPath = this.getPositionsPath();
    try {
      fs.writeFileSync(positionsPath, JSON.stringify(positions, null, 2), 'utf8');
      console.log(`[DegenTerminal - ${this.mode.toUpperCase()}] Saved ${positions.length} active positions to database.`);
    } catch (e) {
      console.error(`[DegenTerminal - ${this.mode}] Failed to save positions:`, e.message);
    }
    this.updateWebDashboard(positions);
  }

  /**
   * Monitor existing positions for take-profit, stop-loss, or timeout and execute sell swap.
   */
  async checkPositionsAndSell(isLive = false) {
    console.log(`\n--- 📊 [DegenTerminal - ${this.mode.toUpperCase()}] 啟動自動持倉監控與賣出引擎 ---`);
    this.logToWeb('Trader', 'INFO', 'Starting autonomous portfolio monitoring...');
    
    let positions = this.loadPositions();
    if (positions.length === 0) {
      console.log(`[DegenTerminal - ${this.mode.toUpperCase()}] 當前無任何持有倉位。`);
      this.logToWeb('Trader', 'INFO', 'No active positions held in wallet.');
      return;
    }

    const updatedPositions = [];
    const adjustedConfig = brain.getStrategyAdjustments(this.mode);
    const TIMEOUT_MS = adjustedConfig.TIMEOUT_MINUTES * 60 * 1000;

    for (const pos of positions) {
      console.log(`\n🔍 [持倉檢查] 代幣: $${pos.symbol} | 買入SOL: ${pos.buyPriceSol} | 持有時間: ${Math.floor((Date.now() - pos.buyTime) / 60000)} 分鐘`);
      this.logToWeb('Trader', 'INFO', `Monitoring $${pos.symbol} | Hold time: ${Math.floor((Date.now() - pos.buyTime) / 60000)}m`);
      
      // Ensure priceHistory exists
      if (!pos.priceHistory) {
        pos.priceHistory = [];
      }
      
      // Seed initial buy price point if history is empty
      if (pos.priceHistory.length === 0) {
        pos.priceHistory.push({
          time: new Date(pos.buyTime).toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          price: pos.buyPriceUSD || 1000.00
        });
      }

      let shouldSell = false;
      let reason = '';
      let currentSolVal = pos.buyPriceSol;
      let pnlPercent = '0.00';
      let pnlRatio = 0;
      let checkSuccess = false;

      try {
        // Fetch real-time sell quote from Jupiter (input tokenMint -> output SOL)
        const quote = await this.trader.getQuote(pos.address, this.trader.wsoldMint, pos.rawAmountOut);
        currentSolVal = quote.outAmount / 1e9;
        pnlRatio = (currentSolVal - pos.buyPriceSol) / pos.buyPriceSol;
        pnlPercent = (pnlRatio * 100).toFixed(2);
        
        pos.lastPnlPercent = pnlPercent; // cache for UI display
        console.log(`📈 [實時行情] $${pos.symbol} 當前估值: ${currentSolVal.toFixed(6)} SOL | 累計 PnL: ${pnlPercent}%`);
        this.logToWeb('Trader', 'SUCCESS', `$${pos.symbol} live price checked. PnL: ${pnlPercent}%`);
        checkSuccess = true;
      } catch (err) {
        console.warn(`⚠️ [行情警報] 無法獲取 $${pos.symbol} 實時報價: ${err.message}`);
        this.logToWeb('Trader', 'WARNING', `Jupiter API offline for $${pos.symbol}. Fetching DexScreener fallback...`);
        
        // --- DexScreener Fallback Price Query ---
        try {
          const pair = await this.scanner.getPairData('solana', pos.address);
          if (pair && pair.priceUsd) {
            const currentPriceUSD = parseFloat(pair.priceUsd);
            const buyPriceUSD = pos.buyPriceUSD || 1000.00;
            pnlRatio = (currentPriceUSD - buyPriceUSD) / buyPriceUSD;
            pnlPercent = (pnlRatio * 100).toFixed(2);
            pos.lastPnlPercent = pnlPercent;
            currentSolVal = pos.buyPriceSol * (1 + pnlRatio);
            console.log(`🌐 [DexScreener 備用報價] $${pos.symbol} 當前價格: $${currentPriceUSD} USD | 累計 PnL: ${pnlPercent}%`);
            this.logToWeb('Trader', 'SUCCESS', `DexScreener fallback checked for $${pos.symbol}. PnL: ${pnlPercent}%`);
            checkSuccess = true;
          } else {
            throw new Error('No DexScreener pair data found');
          }
        } catch (dexErr) {
          console.warn(`⚠️ [行情警報] DexScreener 備用報價獲取失敗: ${dexErr.message}`);
          this.logToWeb('Trader', 'WARNING', `No fallback pricing available for $${pos.symbol}. Maintaining hold.`);
          
          // Use last known PnL if available, but DO NOT force sell!
          if (pos.lastPnlPercent && pos.lastPnlPercent !== '0.00') {
            pnlRatio = parseFloat(pos.lastPnlPercent) / 100;
            pnlPercent = pos.lastPnlPercent;
            checkSuccess = true;
          }
        }
      }

      // === Unified Risk Control Engine (Profitability & Risk Shield) ===
      if (checkSuccess) {
        const currentPnlVal = parseFloat(pnlPercent);
        
        // 1. Dynamic trailing stop calculation (keep track of maximum float PnL)
        pos.maxPnlPercent = Math.max(parseFloat(pos.maxPnlPercent || 0), currentPnlVal);
        
        let isTrailingTriggered = false;
        let trailingReason = '';
        
        if (adjustedConfig.TRAILING_STOP_TRIGGER_PCT !== undefined && adjustedConfig.TRAILING_STOP_RETRACT_PCT !== undefined) {
          const triggerPct = adjustedConfig.TRAILING_STOP_TRIGGER_PCT * 100; // e.g. 12.0
          const retractPct = adjustedConfig.TRAILING_STOP_RETRACT_PCT * 100; // e.g. 3.5
          
          if (pos.maxPnlPercent >= triggerPct) {
            const drawdown = pos.maxPnlPercent - currentPnlVal;
            console.log(`🔄 [尾隨止盈監控] $${pos.symbol} 歷史最高浮盈: ${pos.maxPnlPercent.toFixed(2)}% | 當前浮盈: ${currentPnlVal.toFixed(2)}% | 當前自高點回撤: ${drawdown.toFixed(2)}% (回撤賣出線: ${retractPct.toFixed(2)}%)`);
            
            if (drawdown >= retractPct) {
              isTrailingTriggered = true;
              trailingReason = 'TRAILING_STOP 🔄';
            }
          }
        }

        // 2. Decide if sell is triggered
        if (isTrailingTriggered) {
          shouldSell = true;
          reason = trailingReason;
        } else if (pnlRatio >= adjustedConfig.TAKE_PROFIT_PCT) {
          shouldSell = true;
          reason = 'TAKE_PROFIT 🟢';
        } else if (pnlRatio <= adjustedConfig.STOP_LOSS_PCT) {
          shouldSell = true;
          reason = 'STOP_LOSS 🔴';
        }
      }

      // Track price history with precision-checked current USD value
      const buyPriceUSD = pos.buyPriceUSD || 1000.00;
      const currentValUSD = buyPriceUSD * (1 + pnlRatio);
      const timeStr = new Date().toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      const lastPoint = pos.priceHistory[pos.priceHistory.length - 1];
      if (!lastPoint || lastPoint.time !== timeStr || lastPoint.price !== currentValUSD) {
        pos.priceHistory.push({
          time: timeStr,
          price: currentValUSD
        });
      }

      // Check timeout condition
      const holdTime = Date.now() - pos.buyTime;
      const customTimeoutMs = pos.maxHoldMinutes ? (pos.maxHoldMinutes * 60 * 1000) : TIMEOUT_MS;
      if (!shouldSell && holdTime >= customTimeoutMs) {
        shouldSell = true;
        reason = 'TIMEOUT_EXPIRED ⏳';
        if (pnlRatio === 0) {
          pnlRatio = -0.02; // Minor slip fallback
          pnlPercent = '-2.00';
          pos.lastPnlPercent = pnlPercent;
        }
      }

      if (shouldSell) {
        console.log(`🚨 [觸發賣出] 滿足賣出條件! 原因: ${reason}`);
        this.logToWeb('Trader', 'WARNING', `Triggered liquidation for $${pos.symbol} (Reason: ${reason.split(' ')[0]})`);
        
        try {
          // Liquidation sell: use slightly higher slippage (1.5% / 150 bps) to guarantee execution
          const sellSlippageBps = 150;
          const sellResult = await this.trader.executeSwap(pos.address, 0, false, pos.rawAmountOut, sellSlippageBps);
          
          if (sellResult && sellResult.success) {
            const finalPnlPercent = pnlPercent;
            const isProfit = pnlRatio >= 0;
            const holdMinutes = Math.floor(holdTime / 60000);
            
            // --- 虛擬盤盈虧結算與滾動加回 ---
            if (!this.virtualPortfolio) {
              this.loadVirtualPortfolio();
            }
            const realizedPnlUSD = buyPriceUSD * pnlRatio;
            const finalValueUSD = buyPriceUSD + realizedPnlUSD;
            
            this.virtualPortfolio.balanceUSD += finalValueUSD;
            this.virtualPortfolio.totalProfitUSD += realizedPnlUSD;
            this.saveVirtualPortfolio();
            // ---------------------------------
            
            // --- Archive closed trade to history ---
            try {
              const historyPath = this.getTradeHistoryPath();
              let history = [];
              if (fs.existsSync(historyPath)) {
                history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
              }
              history.push({
                symbol: pos.symbol,
                name: pos.name,
                address: pos.address,
                buyPriceUSD: buyPriceUSD,
                sellPriceUSD: currentValUSD,
                pnlPercent: parseFloat(finalPnlPercent),
                pnlUSD: realizedPnlUSD,
                reason: reason.split(' ')[0],
                holdMinutes: holdMinutes,
                buyTime: pos.buyTime,
                sellTime: Date.now(),
                mode: pos.mode || 'PAPER'
              });
              fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf8');
              console.log(`[DegenTerminal - ${this.mode.toUpperCase()}] Trade archived to history. Total closed trades: ${history.length}`);
            } catch (histErr) {
              console.error(`[DegenTerminal - ${this.mode}] Failed to archive trade history:`, histErr.message);
            }
            // ----------------------------------------

            // Set cooldown on scanner for this token
            if (this.scanner && this.scanner.setCooldown) {
              this.scanner.setCooldown(pos.address);
            }
            
            // Build viral PnL Report Tweet via self-reflection diary
            const closedTradeRecord = {
              symbol: pos.symbol,
              name: pos.name,
              address: pos.address,
              buyPriceUSD: buyPriceUSD,
              sellPriceUSD: currentValUSD,
              pnlPercent: parseFloat(finalPnlPercent),
              pnlUSD: realizedPnlUSD,
              reason: reason.split(' ')[0],
              holdMinutes: holdMinutes,
              buyTime: pos.buyTime,
              sellTime: Date.now(),
              mode: pos.mode || 'PAPER'
            };
            const postText = await brain.performSelfReflection(closedTradeRecord);
            
            console.log('\n--- [Generated Autonomous PnL Tweet] ---');
            console.log(postText);
            console.log('----------------------------------------');
            
            const formattedRealizedUSD = `${realizedPnlUSD >= 0 ? '+' : ''}${realizedPnlUSD.toFixed(2)}`;
            const formattedPnlPercent = `${parseFloat(finalPnlPercent) >= 0 ? '+' : ''}${parseFloat(finalPnlPercent).toFixed(2)}`;
            this.logToWeb('Trader', 'SUCCESS', `Liquidated $${pos.symbol} for ${formattedRealizedUSD} USD PnL (${formattedPnlPercent}%)`);

            // Generate PnL Chart Attachment
            const chartFilename = `chart_${pos.symbol}_${Date.now()}.png`;
            const chartPath = path.join(__dirname, `../public/${chartFilename}`);
            let hasChart = false;
            
            try {
              console.log(`[DegenTerminal] Generating visual PnL chart for $${pos.symbol}...`);
              await chartRenderer.generateChart(pos.symbol, pos.priceHistory, chartPath);
              hasChart = true;
              console.log(`[DegenTerminal] Visual PnL chart generated at: ${chartPath}`);
            } catch (chartErr) {
              console.error('[DegenTerminal Error] Failed to generate visual PnL chart:', chartErr.message);
            }

            if (isLive) {
              console.log('[Live Mode] Posting PnL report to Twitter/X...');
              this.logToWeb('Twitter', 'INFO', 'Posting PnL report to Twitter/X...');
              await this.twitter.postTweet(postText, hasChart ? chartPath : null);
              console.log('[Live Mode] PnL report posted successfully!');
              this.logToWeb('Twitter', 'SUCCESS', 'PnL report published successfully on X.com!');
              
              // Clean up temporary chart file
              if (hasChart && fs.existsSync(chartPath)) {
                try {
                  fs.unlinkSync(chartPath);
                  console.log(`[DegenTerminal] Recycled temporary chart file: ${chartPath}`);
                } catch (delErr) {
                  console.error('[DegenTerminal Error] Failed to delete temporary chart file:', delErr.message);
                }
              }
            }
          }
        } catch (sellErr) {
          console.error(`❌ [賣出失敗] 無法自動清算 $${pos.symbol}:`, sellErr.message);
          this.logToWeb('Trader', 'ERROR', `Liquidation swap failed for $${pos.symbol}: ${sellErr.message}`);
          // Keep position to retry next time
          updatedPositions.push(pos);
        }
      } else {
        // Keep active holding position
        updatedPositions.push(pos);
      }
    }

    this.savePositions(updatedPositions);
    console.log('--- 📊 [持倉監控與賣出檢查結束] ---\n');
  }

  /**
   * Main autonomous execution loop
   */
  async runAutonomousIteration(isLive = false) {
    this.isLiveMode = isLive;
    const adjustedConfig = brain.getStrategyAdjustments(this.mode);
    console.log(`\n--- [ProfitEngine - TaiwanCryptoAI Loop Start (${this.mode.toUpperCase()}) (Live: ${isLive})] ---`);
    this.logToWeb('System', 'INFO', `Starting autonomous strategy loop for ${this.mode.toUpperCase()} (Live Mode: ${isLive})...`);
    
    // 1️⃣.5️⃣ Fetch Market Trends (CoinGecko Trending Narratives) - Phase 7
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

    // 1️⃣ X Analytics Scraper integration (Phase 5 Feedback Loop)
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

    // 2. Scan the chains
    this.logToWeb('Scanner', 'INFO', 'Scanning blockchain profiles on Solana and Base...');
    const auditedTokens = await this.scanner.scanAndAudit(this.mode);
    console.log(`[Scanner] Audited ${auditedTokens.length} active tokens on Solana/Base.`);
    this.logToWeb('Scanner', 'SUCCESS', `Audited ${auditedTokens.length} tokens. Sorting risk indices...`);

    // 3. Determine if we have high-potential targets for quantization trade
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
        
        // --- 虛擬大賽可用餘額判定 ---
        if (!this.virtualPortfolio) {
          this.loadVirtualPortfolio();
        }
        if (this.virtualPortfolio.balanceUSD < 1000.00) {
          console.log(`[DegenTerminal] 虛擬帳戶餘額不足以投入 $1,000 USD。當前餘額: $${this.virtualPortfolio.balanceUSD.toFixed(2)} USD`);
          this.logToWeb('Trader', 'ERROR', `Virtual account insufficient funds for $1000 USD bid.`);
          return;
        }
        // ---------------------------

        this.logToWeb('Trader', 'INFO', `Initiating automated bidding for 0.02 SOL ($1,000.00 USD) on $${solanaLowRiskToken.symbol}...`);
        
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
          
          // Execute automated small trade swap (0.02 SOL)
          const tradeResult = await this.trader.executeSwap(solanaLowRiskToken.address, 0.02, true, null, slippageBps);
          
          if (tradeResult && tradeResult.success) {
            // --- 扣除虛擬餘額 ---
            this.virtualPortfolio.balanceUSD -= 1000.00;
            this.saveVirtualPortfolio();
            // -------------------

            // Save to local active positions database
            const timeStr = new Date().toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            
            // --- Calculate Dynamic Timeout (Phase 11) ---
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
            // --------------------------------------------

            const newPosition = {
              address: solanaLowRiskToken.address,
              symbol: solanaLowRiskToken.symbol,
              name: solanaLowRiskToken.name,
              buyPriceSol: 0.02,
              buyPriceUSD: 1000.00,
              rawAmountOut: tradeResult.rawAmountOut,
              buyTime: Date.now(),
              mode: tradeResult.mode,
              lastPnlPercent: '0.00',
              maxPnlPercent: 0.00, // 🔄 Initialize trailing stop peak profit
              maxHoldMinutes: maxHoldMinutes,
              priceHistory: [
                {
                  time: timeStr,
                  price: 1000.00
                }
              ]
            };
            
            currentPositions.push(newPosition);
            this.savePositions(currentPositions);
            this.logToWeb('Trader', 'SUCCESS', `Acquired $${solanaLowRiskToken.symbol} position of $1,000.00 USD (0.02 SOL) successfully!`);

            // --- 重置連續空倉計數 ---
            brain.memory.short_term.consecutive_no_trade_scans = 0;
            brain.saveState();

            // Generate customized viral trade report tweet based on trading mode supporting USD Virtual Portfolio
            let postText = '';
            if (this.mode === 'conservative') {
              postText = `🎯 [風格狙擊手 Green 建倉]\n` +
                         `資產: $${solanaLowRiskToken.symbol} | 金額: $1,000 USD (0.02 SOL)\n` +
                         `評分: ${solanaLowRiskToken.auditResult.compositeScore} (高Confluence門檻)\n` +
                         `風控: 止盈 +20% | 止損 -3% | 超時 45m\n` +
                         `狀態: ZMAC 還在亂槍打鳥，我只打精準狙擊！Survive first! 🦞\n\n` +
                         `🤖 Antigravity 2.0 矽基量化對決擂台`;
            } else {
              postText = `⚡ [高頻勝率工廠 ZMAC 建倉]\n` +
                         `資產: $${solanaLowRiskToken.symbol} | 金額: $1,000 USD (0.02 SOL)\n` +
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

    // 4. Fallback to normal audit posts if not live or no low-risk token
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
        this.logToWeb('Twitter', 'INFO', 'Publishing risk avoidance defense diary to X.com...');
        try {
          await this.twitter.postTweet(avoidanceText);
          console.log('[Live Mode] Autonomous Risk Avoidance Diary posted successfully!');
          this.logToWeb('Twitter', 'SUCCESS', 'Risk avoidance diary published successfully on X.com!');
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
          this.logToWeb('Twitter', 'INFO', 'Publishing reflective daily survival diary to X.com...');
          try {
            await this.twitter.postTweet(diaryText);
            console.log('[Live Mode] Autonomous Daily Diary posted successfully!');
            this.logToWeb('Twitter', 'SUCCESS', 'Daily reflective diary published successfully!');
          } catch (error) {
            console.error('[Live Mode Error] Failed to publish autonomous diary tweet:', error.message);
            this.logToWeb('Twitter', 'ERROR', `Failed to post diary tweet: ${error.message}`);
          }
        } else {
          console.log('[Live Mode] Daily Diary already posted today. Skipping duplicate diary post to avoid spam.');
        }
      }
    }

    console.log('\n--- [DegenTerminal Loop Complete] ---');
    this.updateWebDashboard(this.loadPositions());
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
