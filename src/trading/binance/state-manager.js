const fs = require('fs');
const path = require('path');
const config = require('../../config');

const binanceTradeStatePath = path.join(__dirname, '../../../config/binance_trade_state.json');

function getDefaultBinanceTradeState() {
  return {
    stats: { totalTrades: 0, winningTrades: 0, losingTrades: 0, totalSpotPnL: 0, totalFuturesPnL: 0, dailyTradeCount: 0, lastTradeDate: '', weeklyTradeCount: 0, lastWeekStart: '' },
    openPositions: [],
    closedTrades: [],
    blacklist: { BTC: { cooldownUntil: null, consecutiveLosses: 0 }, ETH: { cooldownUntil: null, consecutiveLosses: 0 }, SOL: { cooldownUntil: null, consecutiveLosses: 0 }, BNB: { cooldownUntil: null, consecutiveLosses: 0 } },
    dryRun: false
  };
}

function loadBinanceTradeState() {
  try {
    if (fs.existsSync(binanceTradeStatePath)) {
      const raw = JSON.parse(fs.readFileSync(binanceTradeStatePath, 'utf8'));
      // Migrate legacy "positions" → "openPositions"
      if (raw.positions && !raw.openPositions) {
        raw.openPositions = raw.positions;
        delete raw.positions;
      }
      if (!raw.closedTrades) raw.closedTrades = [];
      return raw;
    }
  } catch (e) {
    console.warn('[BinanceTrade] Failed to load state file, using defaults');
  }
  return getDefaultBinanceTradeState();
}

// Atomic write: write to temp file then rename (prevents partial writes)
function saveBinanceTradeState(state) {
  try {
    const tmp = binanceTradeStatePath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
    fs.renameSync(tmp, binanceTradeStatePath);
  } catch (e) {
    console.warn('[BinanceTrade] Failed to save state:', e.message);
  }
}

function resetDailyCountIfNeeded(state) {
  const today = new Date().toISOString().slice(0, 10);
  if (state.stats.lastTradeDate !== today) {
    state.stats.dailyTradeCount = 0;
    state.stats.lastTradeDate = today;
  }
  // Weekly reset
  const now = new Date();
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString().slice(0, 10);
  if (state.stats.lastWeekStart !== weekStart) {
    state.stats.weeklyTradeCount = 0;
    state.stats.lastWeekStart = weekStart;
  }
}

function selectWeightedSymbol(state) {
  const weights = config.BINANCE_TRADE_WEIGHTS || { BTC: 4, ETH: 3, SOL: 2, BNB: 1 };
  const now = Date.now();
  const eligible = Object.keys(weights).filter(sym => {
    const entry = state.blacklist[sym];
    return !entry || !entry.cooldownUntil || now > entry.cooldownUntil;
  });
  if (eligible.length === 0) return null;
  const pool = [];
  for (const sym of eligible) {
    for (let i = 0; i < (weights[sym] || 1); i++) pool.push(sym);
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

module.exports = {
  getDefaultBinanceTradeState,
  loadBinanceTradeState,
  saveBinanceTradeState,
  resetDailyCountIfNeeded,
  selectWeightedSymbol
};
