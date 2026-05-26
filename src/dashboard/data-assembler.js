const fs = require('fs');
const path = require('path');
const binanceTrader = require('../binance_trader');
const config = require('../config');
const brain = require('../brain');
const { writeData } = require('../write_lock');

class DataAssembler {
  constructor(agent) {
    this.agent = agent;
  }

  /**
   * Export database metrics, active positions, and matrix logs to public/data.json
   */
  async updateWebDashboard(positions = []) {
    const isLive = !!this.agent.isLiveMode;

    // Query Binance Spot & Futures Testnet status
    let binance = {
      spotBalance: 10000.00,
      futures: {
        balance: 15000.00,
        unrealizedPnL: 0.00,
        positions: [],
        openOrders: []
      }
    };
    
    let smartMoneyAudit = null;
    
    try {
      binance.spotBalance = await binanceTrader.getSpotBalance();
      binance.futures = await binanceTrader.getFuturesAccountInfo();
    } catch (binErr) {
      console.warn('[DegenTerminal] Error loading Binance Testnet details for dashboard:', binErr.message);
    }
    
    try {
      const targetSymbol = this.agent.lastScannedSymbol || 'BTC';
      smartMoneyAudit = await this.agent.getLatestSmartMoneyAudit(targetSymbol);
    } catch (audErr) {
      console.warn('[DegenTerminal] Error loading Smart Money Audit for dashboard:', audErr.message);
    }
    
    // Ensure we have loaded virtual portfolio
    if (!this.agent.portfolioManager.virtualPortfolio) {
      this.agent.portfolioManager.loadVirtualPortfolio();
    }

    // Load actual closed trade history
    let tradeHistory = [];
    try {
      const historyPath = this.agent.portfolioManager.getTradeHistoryPath();
      if (fs.existsSync(historyPath)) {
        tradeHistory = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
      }
    } catch (histErr) {
      console.warn(`[DegenTerminal - ${this.agent.mode}] Failed to read trade history for web payload:`, histErr.message);
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

    // Load Yield Farming state for NPV calculation
    const yieldState = this.agent.yieldManager.loadYieldState();
    const approxSolPrice = await config.getSolPrice();
    const totalStakedSOL = (yieldState.jitoSolBalance || 0) + (yieldState.kaminoBalance || 0) + (yieldState.driftBalance || 0);
    const totalYieldUSD = totalStakedSOL * approxSolPrice;
    const yieldUSD = yieldState.jitoSolBalance * approxSolPrice;
    const totalYieldEarnedUSD = yieldState.totalAccruedYieldSol * approxSolPrice;

    const netValueUSD = this.agent.portfolioManager.virtualPortfolio.balanceUSD + totalPositionValueUSD + totalYieldUSD;
    
    const yieldFarming = {
      jitoSolBalance: yieldState.jitoSolBalance,
      yieldUSD: yieldUSD,
      totalYieldUSD: totalYieldUSD,
      totalAccruedYieldSol: yieldState.totalAccruedYieldSol,
      totalYieldEarnedUSD: totalYieldEarnedUSD,
      apy: this.agent.yieldManager.apy,
      lastAccruedTime: new Date(yieldState.lastAccruedTime).toLocaleString()
    };

    const agentPayload = {
      character: {
        name: this.agent.mode === 'conservative' ? '風格狙擊手 Green 🦞' : '高頻勝率工廠 ZMAC ⚡',
        bio: this.agent.mode === 'conservative' 
          ? '頂尖超高勝率 AI 狙擊手，秉持極致保守風控哲學。最厲害的交易就是不交易！Survive first!' 
          : '高頻超短線量化交易工廠，短線快速 Scalping，快進快出，累積盈虧以數量與紀律取勝。',
        avatar: this.agent.mode === 'conservative' ? 'profitengine_avatar.png' : 'avatar.png',
        banner: this.agent.mode === 'conservative' ? 'profitengine_banner.png' : 'banner.png'
      },
      virtualPortfolio: {
        balanceUSD: this.agent.portfolioManager.virtualPortfolio.balanceUSD,
        totalProfitUSD: this.agent.portfolioManager.virtualPortfolio.totalProfitUSD,
        netValueUSD: netValueUSD,
        initialBalanceUSD: this.agent.portfolioManager.virtualPortfolio.initialBalanceUSD || 100000.00
      },
      positions: mappedPositions,
      tradeHistory: tradeHistory,
      status: this.agent.mode === 'conservative' 
        ? (brain.memory.short_term.mood || '謹慎觀望中 - Survive First') 
        : '快進快出高頻掃描中 - Scalping Hard',
      yieldFarming: yieldFarming
    };

    // Load Binance Square Mining state or seed it
    const binanceStatePath = path.join(__dirname, '../../config/binance_mining_state.json');
    let binanceMiningState = null;
    if (fs.existsSync(binanceStatePath)) {
      try {
        binanceMiningState = JSON.parse(fs.readFileSync(binanceStatePath, 'utf8'));
      } catch (err) {
        console.warn('[DegenTerminal] Error loading binance mining state:', err.message);
      }
    }
    
    if (!binanceMiningState) {
      binanceMiningState = {
        totalArticlesPublished: 11,
        lastPublishedTime: Date.now() - 4 * 3600000,
        activeCashtags: ["$SOL", "$BNB", "$BTC", "$JUP"],
        estimatedReferralClicks: 742,
        estimatedCommissionsUSD: 22.26,
        conversionRate: 0.05
      };
      try {
        const configDir = path.dirname(binanceStatePath);
        if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(binanceStatePath, JSON.stringify(binanceMiningState, null, 2), 'utf8');
      } catch (e) {
        console.warn('[DegenTerminal] Error seeding binance mining state:', e.message);
      }
    }

    // Use the write lock to serialize all data.json read-modify-write operations
    await writeData(async (dataPath) => {
      let fullPayload = {
        metrics: {
          mode: isLive ? 'LIVE' : 'PAPER',
          isLive: isLive
        },
        logs: this.agent.webLogs
      };

      try {
        if (fs.existsSync(dataPath)) {
          const raw = fs.readFileSync(dataPath, 'utf8');
          const parsed = JSON.parse(raw);
          fullPayload = { ...parsed, ...fullPayload };
          delete fullPayload.virtualPortfolio;
          delete fullPayload.positions;
          delete fullPayload.tradeHistory;
        }
      } catch (readErr) {
        console.warn('[DegenTerminal] Error reading existing data.json for update:', readErr.message);
      }

      fullPayload[this.agent.mode] = agentPayload;

      if (!fullPayload.brain) fullPayload.brain = {};
      fullPayload.brain.dayCount = brain.memory.day_count || 1;
      fullPayload.brain.mood = brain.memory.short_term.mood || 'Cautious & Observant (謹慎觀望中)';
      fullPayload.brain.beliefs = brain.memory.identity_memory.core_beliefs || [];
      fullPayload.brain.narratives = brain.narratives.narratives || {};
      fullPayload.brain.strategyAdjustments = brain.memory.long_term.strategy_adjustments || [];
      fullPayload.brain.lessonsLearned = brain.memory.long_term.lessons_learned || [];
      fullPayload.brain.activeOverrides = brain.getStrategyAdjustments(this.agent.mode);
      fullPayload.brain.replyGuyStats = brain.getReplyGuyStats();
      fullPayload.brain.binanceMining = binanceMiningState;

      fullPayload.binance = binance;
      fullPayload.smartMoneyAudit = smartMoneyAudit;

      const publicDir = path.dirname(dataPath);
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }
      fs.writeFileSync(dataPath, JSON.stringify(fullPayload, null, 2), 'utf8');
    });
  }
}

module.exports = DataAssembler;
