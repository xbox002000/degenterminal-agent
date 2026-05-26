require('dotenv').config();
const DegenTerminalAgent = require('./index');
const analytics = require('./analytics');
const config = require('./config');
const contentGenerator = require('./content_generator');
const crossPublisher = require('./cross_publisher');
const binanceSquare = require('./binance_square');
const imageGenerator = require('./image_generator');
const binanceTrader = require('./binance_trader');
const browserManager = require('./browser_manager');
const fs = require('fs');
const path = require('path');

// Binance sub-modules
const {
  checkAndCloseBinancePositions,
  binanceMockTradeLoop
} = require('./trading/binance/position-checker');

const MS_IN_MINUTE = 60000;
let isShuttingDown = false;

async function startScheduler() {
  console.log('\n======================================================');
  console.log('   ProfitEngine - DegenTerminal 24/7 雙雄平行對決守護進程   ');
  console.log('   v2.0 — Green (風格狙擊手) vs ZMAC (高頻勝率工廠)       ');
  console.log('======================================================\n');
  
  // Instantiate both agents
  const conservativeAgent = new DegenTerminalAgent('conservative');
  const aggressiveAgent = new DegenTerminalAgent('aggressive');
  const publicKey = conservativeAgent.wallet.getPublicKey();
  
  console.log(`💳 交易熱錢包地址: ${publicKey}`);
  console.log(`🟢 [Green] 門檻: ${config.conservative.MIN_COMPOSITE_SCORE}+ | 止盈: +${(config.conservative.TAKE_PROFIT_PCT * 100).toFixed(0)}% | 止損: ${(config.conservative.STOP_LOSS_PCT * 100).toFixed(0)}% | 超時: ${config.conservative.TIMEOUT_MINUTES}min`);
  console.log(`🟣 [ZMAC] 門檻: ${config.aggressive.MIN_COMPOSITE_SCORE}+ | 止盈: +${(config.aggressive.TAKE_PROFIT_PCT * 100).toFixed(0)}% | 止損: ${(config.aggressive.STOP_LOSS_PCT * 100).toFixed(0)}% | 超時: ${config.aggressive.TIMEOUT_MINUTES}min`);
  console.log(`🚀 狀態: 雙線平行運行中...`);
  console.log('======================================================\n');

  // Initialize shared Chrome browser (remote debugging mode)
  browserManager.init().catch(err => {
    console.warn(`[Scheduler] Browser auto-init deferred: ${err.message} — modules will fallback to standalone`);
  });

  let iterationCount = 0;
  let lastDailySummaryDate = '';

  /**
   * Fast monitoring loop — runs every 2 minutes.
   * Checks positions to sell for BOTH agents, and updates dashboard
   */
  const fastMonitorLoop = async () => {
    if (isShuttingDown) return;
    
    console.log(`\n⚡ [${new Date().toLocaleTimeString()}] 雙線快速行情監控與看板刷新中...`);
    try {
      const conHistoryPath = conservativeAgent.getTradeHistoryPath();
      const aggHistoryPath = aggressiveAgent.getTradeHistoryPath();
      
      const getHistoryLen = (filePath) => {
        try {
          if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8')).length;
          }
        } catch (e) {}
        return 0;
      };

      const prevConHistoryLen = getHistoryLen(conHistoryPath);
      const prevAggHistoryLen = getHistoryLen(aggHistoryPath);

      // 1. Monitor & Sell for Conservative Sniper
      const conPositions = conservativeAgent.loadPositions();
      await conservativeAgent.checkPositionsAndSell(true);
      if (conPositions.length === 0) {
        await conservativeAgent.updateWebDashboard([]);
      }
      
      // 2. Monitor & Sell for Aggressive Scalper
      const aggPositions = aggressiveAgent.loadPositions();
      await aggressiveAgent.checkPositionsAndSell(true);
      if (aggPositions.length === 0) {
        await aggressiveAgent.updateWebDashboard([]);
      }

      // Check if new trade closed to trigger instant viral thread
      const nextConHistoryLen = getHistoryLen(conHistoryPath);
      const nextAggHistoryLen = getHistoryLen(aggHistoryPath);

      if (nextConHistoryLen > prevConHistoryLen || nextAggHistoryLen > prevAggHistoryLen) {
        console.log(`\n🎉 [Instant Stats Trigger] New closed trade detected! Publishing multi-lingual stats Thread...`);
        setTimeout(async () => {
          try {
            const statsPublisher = require('./social/twitter/stats-publisher');
            await statsPublisher.publishStatsThread(false);
          } catch (pubErr) {
            console.error('[Instant Stats] Instant stats Thread publish failed:', pubErr.message);
          }
        }, 3000);
      }
 
      // 3. Check Binance open positions for TP/SL/max-hold
      await checkAndCloseBinancePositions(conservativeAgent);
      await checkAndCloseBinancePositions(aggressiveAgent);
    } catch (err) {
      console.error(`[Fast Monitor] Error:`, err.message);
    }
  };

  /**
   * Main scan iteration — runs every SCAN_INTERVAL_MIN minutes.
   * Full pipeline: monitor positions + scan for new tokens for both agents.
   */
  const executeIteration = async () => {
    if (isShuttingDown) return;
    iterationCount++;
    console.log(`\n⏰ [${new Date().toLocaleTimeString()}] 啟動第 ${iterationCount} 次雙雄平行掃描輪詢...`);
    
    // Run Conservative Sniper Scan
    try {
      console.log(`\n🟢 [風格狙擊手 Green] 啟動自主交易掃描...`);
      await conservativeAgent.runAutonomousIteration(true);
    } catch (error) {
      console.error(`❌ [風格狙擊手 Green] 錯誤:`, error.message);
    }
    
    // Run Aggressive Scalper Scan
    try {
      console.log(`\n🟣 [高頻勝率工廠 ZMAC] 啟動自主交易掃描...`);
      await aggressiveAgent.runAutonomousIteration(true);
    } catch (error) {
      console.error(`❌ [高頻勝率工廠 ZMAC] 錯誤:`, error.message);
    }
    
    console.log(`✅ [${new Date().toLocaleTimeString()}] 第 ${iterationCount} 次雙線掃描輪詢完成。`);

    // Daily summary tweet combining both agent performances
    const today = new Date().toISOString().slice(0, 10);
    if (today !== lastDailySummaryDate && iterationCount > 1) {
      lastDailySummaryDate = today;
      try {
        const conNetVal = conservativeAgent.virtualPortfolio.balanceUSD + conservativeAgent.loadPositions().reduce((a,c) => a + c.buyPriceUSD*(1+parseFloat(c.lastPnlPercent)/100), 0);
        const aggNetVal = aggressiveAgent.virtualPortfolio.balanceUSD + aggressiveAgent.loadPositions().reduce((a,c) => a + c.buyPriceUSD*(1+parseFloat(c.lastPnlPercent)/100), 0);
        
        const summaryText = `📊 [矽基雙雄每日對決戰報]\n` +
                            `🟢 風格狙擊手 Green: 淨值 $${conNetVal.toLocaleString(undefined, {maximumFractionDigits:2})} USD | 收益 $${conservativeAgent.virtualPortfolio.totalProfitUSD.toLocaleString(undefined, {maximumFractionDigits:2})} USD\n` +
                            `🟣 高頻勝率工廠 ZMAC: 淨值 $${aggNetVal.toLocaleString(undefined, {maximumFractionDigits:2})} USD | 收益 $${aggressiveAgent.virtualPortfolio.totalProfitUSD.toLocaleString(undefined, {maximumFractionDigits:2})} USD\n` +
                            `戰況: ${conservativeAgent.virtualPortfolio.totalProfitUSD >= aggressiveAgent.virtualPortfolio.totalProfitUSD ? 'Green 暫時領先！🎯' : 'ZMAC 暫時領先！⚡'}\n\n` +
                            `🤖 Antigravity 2.0 雙智能體實時公開對決`;
                            
        console.log('\n--- [Daily Combined Portfolio Summary] ---');
        console.log(summaryText);
        console.log('---------------------------------');
        await conservativeAgent.twitter.postTweet(summaryText);
        console.log('[Daily Summary] Posted successfully to X.com!');
      } catch (summaryErr) {
        console.error('[Daily Summary Error]:', summaryErr.message);
      }
    }
    
    if (!isShuttingDown) {
      console.log(`\n💤 進入等待狀態，下一輪雙線完整掃描將在 ${config.SCAN_INTERVAL_MIN} 分鐘後啟動...`);
      setTimeout(executeIteration, config.SCAN_INTERVAL_MIN * MS_IN_MINUTE);
    }
  };

  /**
   * Reply Guy Loop — runs every REPLY_GUY_INTERVAL_MIN minutes.
   */
  const replyGuyLoop = async () => {
    if (isShuttingDown) return;
    console.log(`\n💬 [${new Date().toLocaleTimeString()}] 啟動流量與分潤衝刺：KOL 自動搶沙發回覆中...`);
    try {
      const replyGuy = require('./reply_guy');
      await replyGuy.runReplyGuyTick(false);
    } catch (err) {
      console.error(`[Reply Guy Loop] Error:`, err.message);
    }
  };

  /**
   * Multi-lingual Thread Stats Publisher Loop
   */
  const statsPublishLoop = async () => {
    if (isShuttingDown) return;
    console.log(`\n📊 [${new Date().toLocaleTimeString()}] 啟動雙雄實時多語言戰報 Thread 發布輪詢...`);
    try {
      const statsPublisher = require('./social/twitter/stats-publisher');
      await statsPublisher.publishStatsThread(false);
    } catch (err) {
      console.error(`[Stats Publish Loop] Error:`, err.message);
    }
  };

  /**
   * Binance Square & Cross-Platform Content Writing Loop
   */
  const binancePublishLoop = async () => {
    if (isShuttingDown) return;
    
    if (!binanceSquare.isConfigured()) {
      console.log('ℹ️ [BinancePublishLoop] Binance Square API Key is not configured in .env. Skipping publish tick.');
      return;
    }

    console.log(`\n✍️ [${new Date().toLocaleTimeString()}] 啟動自動幣安寫作與流量跨平台發布輪詢...`);
    try {
      // 1. Ingest dynamic data context from agents
      const marketTrends = conservativeAgent.brain?.memory?.analytics_feedback?.market_trends || {};
      const auditedTokens = conservativeAgent.scanner?.lastAuditedTokens || [];

      // Compute total trades across both agents for smart template routing
      let totalTrades = 0;
      try {
        const conHistoryPath = conservativeAgent.getTradeHistoryPath();
        const aggHistoryPath = aggressiveAgent.getTradeHistoryPath();
        if (fs.existsSync(conHistoryPath)) {
          totalTrades += JSON.parse(fs.readFileSync(conHistoryPath, 'utf8')).length;
        }
        if (fs.existsSync(aggHistoryPath)) {
          totalTrades += JSON.parse(fs.readFileSync(aggHistoryPath, 'utf8')).length;
        }
      } catch (histErr) {
        console.warn('[BinancePublishLoop] Failed to read trade history for template routing:', histErr.message);
        totalTrades = -1; // unknown, don't suppress
      }
      
      // Cycle through template types
      const types = ['MARKET_TRENDS', 'SECURITY_ALERT', 'LAUNCHPOOL_CAMPAIGN'];
      const chosenType = types[Math.floor(Math.random() * types.length)];
      
      const campaignName = marketTrends.trending_coins && marketTrends.trending_coins.length > 0 ? 
        `#${marketTrends.trending_coins[0].toUpperCase()} Launchpool 新幣挖礦` : 
        'Binance Launchpool 收益最大化指南';

      const context = {
        marketTrends,
        auditedTokens,
        campaignName,
        balance: conservativeAgent.virtualPortfolio ? conservativeAgent.virtualPortfolio.balanceUSD : 100000,
        totalTrades
      };

      // 2. Generate customized content
      const generatedContent = await contentGenerator.generateContent(chosenType, context);

      // 2.5 Generate an Aria portrait to attach to the Square article
      let articleImagePath = null;
      try {
        const fngVal = conservativeAgent.brain?.memory?.analytics_feedback?.market_trends?.fng?.value || 50;
        articleImagePath = await imageGenerator.generatePortrait(fngVal, generatedContent);
        if (articleImagePath) {
          console.log(`🖼️ [BinancePublishLoop] Aria 圖片已生成: ${articleImagePath}`);
        }
      } catch (imgGenErr) {
        console.warn('[BinancePublishLoop] 圖片生成失敗，繼續純文字發布:', imgGenErr.message);
      }

      // 3. Orchestrate cross-platform publishing (pass image to Square)
      console.log(`🚀 [BinancePublishLoop] Generated compliant Square article of type: "${chosenType}". Publishing...`);
      const pubResult = await crossPublisher.orchestratePublish(generatedContent, chosenType, articleImagePath);
      
      console.log('📊 [BinancePublishLoop] Publishing results:', pubResult);
      
      // Log to web dashboard
      if (pubResult.squarePosted) {
        conservativeAgent.logToWeb('Square', 'SUCCESS', `Published Square ${chosenType} article and cross-promoted successfully.`);
      } else {
        conservativeAgent.logToWeb('Square', 'WARNING', `Binance Square publish check skipped or failed.`);
      }

    } catch (err) {
      console.error(`❌ [BinancePublishLoop] Error during writing sweep:`, err.message);
      conservativeAgent.logToWeb('Square', 'ERROR', `Publishing loop encountered error: ${err.message}`);
    }
  };

  // Execute full scan immediately
  await executeIteration();

  // Start fast monitoring interval (every 2 minutes)
  const fastMonitorInterval = setInterval(() => {
    if (!isShuttingDown) {
      fastMonitorLoop();
    }
  }, config.MONITOR_INTERVAL_MIN * MS_IN_MINUTE);

  // Start reply guy dynamic timeout recursion if enabled
  let replyGuyTimeout;
  let binancePublishTimeout;
  let statsPublishTimeout;
  
  const scheduleNextStatsPublish = () => {
    if (isShuttingDown) return;
    
    const minMins = 240; // 4 hours
    const maxMins = 360; // 6 hours
    const randomMins = minMins + Math.random() * (maxMins - minMins);
    const delayMs = Math.floor(randomMins * MS_IN_MINUTE);
    
    console.log(`📊 [ANTI-BOT] Next mult-lingual stats Thread publish interval calibrated to: ${randomMins.toFixed(2)} minutes.`);
    
    statsPublishTimeout = setTimeout(async () => {
      if (!isShuttingDown) {
        await statsPublishLoop();
        scheduleNextStatsPublish();
      }
    }, delayMs);
  };
  
  const scheduleNextReplyGuy = () => {
    if (isShuttingDown) return;
    
    const minMins = config.REPLY_GUY_MIN_INTERVAL_MIN || 25;
    const maxMins = config.REPLY_GUY_MAX_INTERVAL_MIN || 45;
    const randomMins = minMins + Math.random() * (maxMins - minMins);
    const delayMs = Math.floor(randomMins * MS_IN_MINUTE);
    
    console.log(`💬 [ANTI-BOT] Next Reply-Guy sweep dynamic interval calibrated to: ${randomMins.toFixed(2)} minutes.`);
    
    replyGuyTimeout = setTimeout(async () => {
      if (!isShuttingDown) {
        await replyGuyLoop();
        scheduleNextReplyGuy();
      }
    }, delayMs);
  };

  const scheduleNextBinancePublish = () => {
    if (isShuttingDown) return;
    
    const minMins = config.BINANCE_PUBLISH_MIN_INTERVAL_MIN || 240;
    const maxMins = config.BINANCE_PUBLISH_MAX_INTERVAL_MIN || 360;
    const randomMins = minMins + Math.random() * (maxMins - minMins);
    const delayMs = Math.floor(randomMins * MS_IN_MINUTE);
    
    console.log(`✍️ [ANTI-BOT] Next Binance Square publishing interval calibrated to: ${randomMins.toFixed(2)} minutes.`);
    
    binancePublishTimeout = setTimeout(async () => {
      if (!isShuttingDown) {
        await binancePublishLoop();
        scheduleNextBinancePublish();
      }
    }, delayMs);
  };

  if (config.REPLY_GUY_ENABLED) {
    console.log(`💬 X Ads Revenue 流量衝刺功能已開啟！將每 ${config.REPLY_GUY_MIN_INTERVAL_MIN}-${config.REPLY_GUY_MAX_INTERVAL_MIN} 分鐘隨機且不規律地對 KOL 搶沙發回覆。`);
    
    setTimeout(async () => {
      if (!isShuttingDown) {
        await replyGuyLoop();
        scheduleNextReplyGuy();
      }
    }, 3 * MS_IN_MINUTE);
  }

  // Start Binance Square publish loop if configured
  if (binanceSquare.isConfigured()) {
    console.log(`✍️ 幣安自動寫文章與跨平台推廣系統已開啟！預設每 ${config.BINANCE_PUBLISH_MIN_INTERVAL_MIN || 240}-${config.BINANCE_PUBLISH_MAX_INTERVAL_MIN || 360} 分鐘隨機且不規律地發布專業分析文章。`);
    
    setTimeout(async () => {
      if (!isShuttingDown) {
        await binancePublishLoop();
        scheduleNextBinancePublish();
      }
    }, 5 * MS_IN_MINUTE);
  }

  // Start Binance mock trading loop if enabled
  let binanceTradeTimeout;

  const scheduleNextBinanceTrade = () => {
    if (isShuttingDown) return;

    const minMins = config.BINANCE_TRADE_MIN_INTERVAL_MIN || 120;
    const maxMins = config.BINANCE_TRADE_MAX_INTERVAL_MIN || 180;
    const randomMins = minMins + Math.random() * (maxMins - minMins);
    const delayMs = Math.floor(randomMins * MS_IN_MINUTE);

    console.log(`💰 [ANTI-BOT] Next Binance mock trade interval calibrated to: ${randomMins.toFixed(2)} minutes.`);

    binanceTradeTimeout = setTimeout(async () => {
      if (!isShuttingDown) {
        await binanceMockTradeLoop(conservativeAgent);
        await binanceMockTradeLoop(aggressiveAgent);
        scheduleNextBinanceTrade();
      }
    }, delayMs);
  };

  if (config.BINANCE_TRADE_ENABLED !== false && binanceTrader.isConfigured()) {
    console.log(`💰 幣安 Testnet 模擬交易實戰終端已開啟！每 ${config.BINANCE_TRADE_MIN_INTERVAL_MIN || 120}-${config.BINANCE_TRADE_MAX_INTERVAL_MIN || 180} 分鐘隨機且獨立評估雙雄對決策略。`);

    setTimeout(async () => {
      if (!isShuttingDown) {
        await binanceMockTradeLoop(conservativeAgent);
        await binanceMockTradeLoop(aggressiveAgent);
        scheduleNextBinanceTrade();
      }
    }, 10 * MS_IN_MINUTE);
  }

  // Start multi-lingual Thread stats publishing loop (first run in 15 mins)
  console.log(`📊 多語言實時對決戰報與 Thread 發布系統已開啟！預設每 4-6 小時隨機發布一次。`);
  setTimeout(async () => {
    if (!isShuttingDown) {
      await statsPublishLoop();
      scheduleNextStatsPublish();
    }
  }, 15 * MS_IN_MINUTE);

  // Graceful shutdown
  const shutdown = (signal) => {
    console.log(`\n🛑 [Scheduler] 收到 ${signal} 信號，正在優雅退出...`);
    isShuttingDown = true;
    clearInterval(fastMonitorInterval);
    if (replyGuyTimeout) clearTimeout(replyGuyTimeout);
    if (binancePublishTimeout) clearTimeout(binancePublishTimeout);
    if (binanceTradeTimeout) clearTimeout(binanceTradeTimeout);
    if (statsPublishTimeout) clearTimeout(statsPublishTimeout);
    browserManager.shutdown();
    
    console.log('\n📊 [對決終場分析結算]');
    console.log(`🟢 Green: 餘額 $${conservativeAgent.virtualPortfolio.balanceUSD.toFixed(2)} USD | 收益 $${conservativeAgent.virtualPortfolio.totalProfitUSD.toFixed(2)} USD`);
    console.log(`🟣 ZMAC: 餘額 $${aggressiveAgent.virtualPortfolio.balanceUSD.toFixed(2)} USD | 收益 $${aggressiveAgent.virtualPortfolio.totalProfitUSD.toFixed(2)} USD`);
    console.log('====================================');
    
    setTimeout(() => process.exit(0), 1000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startScheduler().catch((error) => {
  console.error('[Critical Error] Scheduler crashed unexpectedly:', error);
  process.exit(1);
});
