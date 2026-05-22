require('dotenv').config();
const DegenTerminalAgent = require('./index');
const analytics = require('./analytics');
const config = require('./config');

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
      // 1. Monitor & Sell for Conservative Sniper
      const conPositions = conservativeAgent.loadPositions();
      await conservativeAgent.checkPositionsAndSell(true);
      if (conPositions.length === 0) {
        conservativeAgent.updateWebDashboard([]);
      }
      
      // 2. Monitor & Sell for Aggressive Scalper
      const aggPositions = aggressiveAgent.loadPositions();
      await aggressiveAgent.checkPositionsAndSell(true);
      if (aggPositions.length === 0) {
        aggressiveAgent.updateWebDashboard([]);
      }
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

  if (config.REPLY_GUY_ENABLED) {
    console.log(`💬 X Ads Revenue 流量衝刺功能已開啟！將每 ${config.REPLY_GUY_MIN_INTERVAL_MIN}-${config.REPLY_GUY_MAX_INTERVAL_MIN} 分鐘隨機且不規律地對 KOL 搶沙發回覆。`);
    
    setTimeout(async () => {
      if (!isShuttingDown) {
        await replyGuyLoop();
        scheduleNextReplyGuy();
      }
    }, 3 * MS_IN_MINUTE);
  }

  // Graceful shutdown
  const shutdown = (signal) => {
    console.log(`\n🛑 [Scheduler] 收到 ${signal} 信號，正在優雅退出...`);
    isShuttingDown = true;
    clearInterval(fastMonitorInterval);
    if (replyGuyTimeout) clearTimeout(replyGuyTimeout);
    
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
