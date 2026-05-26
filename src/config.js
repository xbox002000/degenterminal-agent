require('dotenv').config();
const axios = require('axios');

const config = {
  // --- Common Settings (Backward Compatible) ---
  SCAN_INTERVAL_MIN: 30,
  MONITOR_INTERVAL_MIN: 2,
  INITIAL_BALANCE_USD: 100000,
  RPC_URL: process.env.RPC_URL || 'https://api.mainnet-beta.solana.com',
  SLIPPAGE_BPS: 100,
  GAS_BUFFER_SOL: 0.005,
  COOLDOWN_HOURS: 4,
  MAX_WEB_LOGS: 40,

  // Shared Chrome Browser Settings
  CHROME_DEBUG_PORT: 9222,
  CHROME_USER_DATA_DIR: './temp_chrome_profile',
  MAX_CONCURRENT_OPERATIONS: 1,
  BROWSER_LAUNCH_TIMEOUT: 45000,

  // Default fallback trading thresholds
  TAKE_PROFIT_PCT: 0.40,
  STOP_LOSS_PCT: -0.15,
  TIMEOUT_MINUTES: 20,
  POSITION_SIZE_USD: 1000,
  MAX_POSITIONS: 3,
  BUY_AMOUNT_SOL: 0.02,
  MIN_COMPOSITE_SCORE: 70,

  // Reply-Guy (Monetization Boost & Anti-Bot Protection)
  REPLY_GUY_ENABLED: true,
  REPLY_GUY_MIN_INTERVAL_MIN: 15,
  REPLY_GUY_MAX_INTERVAL_MIN: 28, 
  REPLY_GUY_DAILY_LIMIT: 28,      
  REPLY_GUY_DELAY_MIN_SEC: 30,    
  REPLY_GUY_DELAY_MAX_SEC: 90,

  // Binance Square Publishing (Anti-Bot Interval & Write-to-Earn Settings)
  BINANCE_PUBLISH_MIN_INTERVAL_MIN: 240, // 4 hours
  BINANCE_PUBLISH_MAX_INTERVAL_MIN: 360, // 6 hours

  // Binance Mock Trading (Testnet) Settings
  BINANCE_TRADE_ENABLED: true,
  BINANCE_TRADE_DRY_RUN: false,                     // true = evaluate only, no orders
  BINANCE_TRADE_MIN_INTERVAL_MIN: 120,              // 2 hours
  BINANCE_TRADE_MAX_INTERVAL_MIN: 180,              // 3 hours
  BINANCE_TRADE_SYMBOLS: ['BTC', 'ETH', 'SOL', 'BNB'],
  BINANCE_TRADE_WEIGHTS: { BTC: 4, ETH: 3, SOL: 2, BNB: 1 },
  BINANCE_TRADE_SPOT_USDT: 500,
  BINANCE_TRADE_FUTURES_USDT: 500,
  BINANCE_TRADE_FUTURES_LEVERAGE: 5,
  BINANCE_TRADE_MAX_DAILY_TRADES: 3,               // daily cap
  BINANCE_TRADE_MAX_WEEKLY_TRADES: 10,             // weekly cap
  BINANCE_TRADE_MAX_TOTAL_EXPOSURE_USDT: 2000,     // max open position total
  BINANCE_TRADE_RISK_PER_TRADE_PCT: 0.02,          // 2% of capital per trade
  BINANCE_TRADE_STOP_LOSS_PCT: -0.05,              // -5% stop loss
  BINANCE_TRADE_TAKE_PROFIT_PCT: 0.10,             // +10% take profit
  BINANCE_TRADE_BLACKLIST_COOLDOWN_HOURS: 24,      // cool-down after max losses
  BINANCE_TRADE_BLACKLIST_MAX_LOSSES: 3,           // consecutive losses trigger cool-down
  BINANCE_TRADE_MAX_HOLD_HOURS: 48,                // max hours before auto-close
  BINANCE_TRADE_CHECK_INTERVAL_MIN: 30,            // how often to check open positions

  binanceTestnet: {
    spotBaseUrl: 'https://testnet.binance.vision/api',
    futuresBaseUrl: 'https://demo-fapi.binance.com',
    defaultLeverage: 5,     // 預設 5 倍槓桿
    positionSizeUSDT: 500   // 預設每單 500 USDT
  },

  REPLY_GUY_TARGET_KOLS: [
    // --- Tier 1: Solana & AI Agent 核心爆點 ---
    'aeyakovenko',       // toly (Solana創辦人)
    'weremeow',          // Jupiter創辦人
    'shawmakesmagic',    // ai16z/Eliza創辦人
    'ai16zdao',          // ai16z官方
    'MustStopMurad',     // Murad (Meme超級週期)
    'inversebrah',       // 流量放大器
    'phantom',           // Phantom錢包
    'JupiterExchange',   // Jupiter官方
    
    // --- Tier 2: 數據與生態要角 ---
    'pumpdotfun',
    'dexscreener',
    'lookonchain',
    'hey_ansem',
    'HsakaTrades',
    'ZachXBT',
    
    // --- Tier 3: 宏觀與傳統巨頭 ---
    'elonmusk',
    'VitalikButerin',
    'cz_binance',
    'CryptoHayes',
    'saylor',
    'brian_armstrong'
  ],

  // --- 🟢 Conservative Sniper Mode (Green) ---
  conservative: {
    MIN_COMPOSITE_SCORE: 85,
    TAKE_PROFIT_PCT: 0.25,         // +25% profit capture ceiling
    STOP_LOSS_PCT: -0.10,          // -10.0% stop loss (broader to survive noise)
    TIMEOUT_MINUTES: 45,           // 45m longer protective hold
    POSITION_SIZE_USD: 1000,
    MAX_POSITIONS: 2,              // Focused 2 positions
    BUY_AMOUNT_SOL: 0.02,
    
    // 🔄 Adaptive Trailing Stop
    TRAILING_STOP_TRIGGER_PCT: 0.12,   // Start trailing when float profit hits +12%
    TRAILING_STOP_RETRACT_PCT: 0.035   // Sell when retracts 3.5% from max PnL
  },

  // --- 🟣 Aggressive Scalper Mode (ZMAC / WolfOfAlgos) ---
  aggressive: {
    MIN_COMPOSITE_SCORE: 65,         // Raised from 58 to trade only high-velocity breakouts
    TAKE_PROFIT_PCT: 0.05,         // Lowered to +5% to lock in scalp gains quickly
    STOP_LOSS_PCT: -0.035,         // Tightened to -3.5% for better risk-reward ratio
    TIMEOUT_MINUTES: 12,           // 12m quick protective exit
    POSITION_SIZE_USD: 1000,
    MAX_POSITIONS: 5,              // Diversified 5 positions
    BUY_AMOUNT_SOL: 0.02,
    
    // 🔄 Adaptive Trailing Stop
    TRAILING_STOP_TRIGGER_PCT: 0.03,   // Lock in profit protection when float profit hits +3%
    TRAILING_STOP_RETRACT_PCT: 0.01    // Sell when retracts 1.0% from max PnL (locks in >=2%)
  }
};

// --- Dynamic SOL Price Fetch (live from DexScreener, 5min cache) ---
let _solPriceCache = { price: 170, timestamp: 0 };
config.getSolPrice = async function () {
  if (Date.now() - _solPriceCache.timestamp < 300000) return _solPriceCache.price;
  try {
    const resp = await axios.get('https://api.dexscreener.com/latest/dex/pairs/solana/So11111111111111111111111111111111111111112', { timeout: 5000 });
    if (resp.data && resp.data.pair && resp.data.pair.priceUsd) {
      _solPriceCache = { price: parseFloat(resp.data.pair.priceUsd), timestamp: Date.now() };
      console.log(`[SOL Price] Updated: $${_solPriceCache.price}`);
    }
  } catch (e) {
    console.warn(`[SOL Price] Fetch failed: ${e.message}, using cached/fallback: $${_solPriceCache.price}`);
  }
  return _solPriceCache.price;
};

// --- Namespace grouping for clean modular access ---
config.trading = {
  slippage: config.SLIPPAGE_BPS,
  gasBuffer: config.GAS_BUFFER_SOL,
  cooldownHours: config.COOLDOWN_HOURS,
  takeProfitPct: config.TAKE_PROFIT_PCT,
  stopLossPct: config.STOP_LOSS_PCT,
  timeoutMinutes: config.TIMEOUT_MINUTES,
  positionSizeUsd: config.POSITION_SIZE_USD,
  maxPositions: config.MAX_POSITIONS,
  buyAmountSol: config.BUY_AMOUNT_SOL,
  minCompositeScore: config.MIN_COMPOSITE_SCORE
};

config.social = {
  replyGuy: {
    enabled: config.REPLY_GUY_ENABLED,
    minInterval: config.REPLY_GUY_MIN_INTERVAL_MIN,
    maxInterval: config.REPLY_GUY_MAX_INTERVAL_MIN,
    dailyLimit: config.REPLY_GUY_DAILY_LIMIT,
    delayMinSec: config.REPLY_GUY_DELAY_MIN_SEC,
    delayMaxSec: config.REPLY_GUY_DELAY_MAX_SEC,
    targetKols: config.REPLY_GUY_TARGET_KOLS
  },
  binanceSquare: {
    minInterval: config.BINANCE_PUBLISH_MIN_INTERVAL_MIN,
    maxInterval: config.BINANCE_PUBLISH_MAX_INTERVAL_MIN
  }
};

config.binance = {
  enabled: config.BINANCE_TRADE_ENABLED,
  dryRun: config.BINANCE_TRADE_DRY_RUN,
  minInterval: config.BINANCE_TRADE_MIN_INTERVAL_MIN,
  maxInterval: config.BINANCE_TRADE_MAX_INTERVAL_MIN,
  symbols: config.BINANCE_TRADE_SYMBOLS,
  weights: config.BINANCE_TRADE_WEIGHTS,
  spotUsdt: config.BINANCE_TRADE_SPOT_USDT,
  futuresUsdt: config.BINANCE_TRADE_FUTURES_USDT,
  futuresLeverage: config.BINANCE_TRADE_FUTURES_LEVERAGE,
  maxDailyTrades: config.BINANCE_TRADE_MAX_DAILY_TRADES,
  maxWeeklyTrades: config.BINANCE_TRADE_MAX_WEEKLY_TRADES,
  maxTotalExposureUsdt: config.BINANCE_TRADE_MAX_TOTAL_EXPOSURE_USDT,
  riskPerTradePct: config.BINANCE_TRADE_RISK_PER_TRADE_PCT,
  stopLossPct: config.BINANCE_TRADE_STOP_LOSS_PCT,
  takeProfitPct: config.BINANCE_TRADE_TAKE_PROFIT_PCT,
  blacklistCooldownHours: config.BINANCE_TRADE_BLACKLIST_COOLDOWN_HOURS,
  blacklistMaxLosses: config.BINANCE_TRADE_BLACKLIST_MAX_LOSSES,
  maxHoldHours: config.BINANCE_TRADE_MAX_HOLD_HOURS,
  checkIntervalMin: config.BINANCE_TRADE_CHECK_INTERVAL_MIN,
  testnet: config.binanceTestnet
};

config.browser = {
  debugPort: config.CHROME_DEBUG_PORT,
  userDataDir: config.CHROME_USER_DATA_DIR,
  maxConcurrentOperations: config.MAX_CONCURRENT_OPERATIONS,
  launchTimeout: config.BROWSER_LAUNCH_TIMEOUT
};

config.system = {
  scanInterval: config.SCAN_INTERVAL_MIN,
  monitorInterval: config.MONITOR_INTERVAL_MIN,
  maxWebLogs: config.MAX_WEB_LOGS
};

module.exports = config;
