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
  REPLY_GUY_DAILY_LIMIT: 45,      
  REPLY_GUY_DELAY_MIN_SEC: 20,    
  REPLY_GUY_DELAY_MAX_SEC: 80,

  // High-Conversion CTA & Growth URLs
  GITHUB_URL: 'https://github.com/xbox002000/degenterminal-agent',
  BINANCE_REFERRAL_URL: 'https://www.binance.com/zh-TC/join?ref=YOUR_REFERRAL_CODE',
  DASHBOARD_URL: 'https://degenterminal-agent.pages.dev',
  JAPAN_TRAFFIC_BOOST: true,

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
    'solana',            // Solana官方
    'solana_devs',       // Solana開發者社區
    
    // --- Tier 2: 數據與生態要角 ---
    'pumpdotfun',
    'dexscreener',
    'lookonchain',
    'hey_ansem',
    'HsakaTrades',
    'ZachXBT',
    'CryptoCobain',      // 殿堂級 Crypto 樹洞
    'SolanaSensations',  // 生態熱點追蹤
    'solana_daily',      // Solana 日報
    'BaseDailyCN',       // Base生態中文大V
    'base',              // Base官方
    'jito_labs',         // Jito官方
    
    // --- Tier 3: 宏觀與傳統巨頭 ---
    'elonmusk',
    'VitalikButerin',
    'cz_binance',
    'CryptoHayes',
    'saylor',
    'brian_armstrong',
    'CoinbaseAssets',
    'binance',
    'Bybit_Official',
    'okx',

    // --- Tier 4: 日本活躍 Crypto / Degen KOL ---
    'mineCC',            // 日本大V
    'yutohorikaw',       // 日本 Degen
    'solana_japan',      // Solana 日本社群
    'dappou_channeru',   // 日本熱門 Crypto 社群
    'K_Crypto_JP',       // 日本量化
    'masanari_takada',   // 日本生態領袖
    'dappportal_jp',     // 日本 Web3 平台
    'Socrates_Crypto',   // 日本知名 Degen
    'otter_defi',        // 日本 DeFi 專家
    'web3_digger',       // 日本鏈上挖掘者
    'JP_Crypto_News',    // 日本區塊鏈新聞
    'crypto_ninja_jp',   // 日本忍考社群
    'shinnosuke_defi',   // 日本 DeFi 先鋒
    'takashi_crypto',    // 日本量化交易者
    'ken_quant_jp',      // 日本 AI/量化
    'yuki_sol_degen',    // 日本 Solana 獵手

    // --- Tier 5: 中文與歐美活躍 Degen ---
    'sanyi_crypto',      // 三姨
    'tianya_crypto',     // 天涯
    'CryptoShitpost',    // 迷因收割機
    'DegenNews_',        // Degen新聞聚合
    'bastille_crypto',   // 鏈上捕手
    'CryptoGems_JP',     // 日本 Gem 推薦
    'SolanaMemePrince',  // 迷因王子
    'MemeCoinDegen',     // 迷因大師
    'DegenAlgos',        // 算法 Degen
    'CryptoQuant_CN'     // 量化分析中文
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
config.lastKnownSolPrice = 170;
config.getSolPrice = async function () {
  if (Date.now() - _solPriceCache.timestamp < 300000) {
    config.lastKnownSolPrice = _solPriceCache.price;
    return _solPriceCache.price;
  }
  try {
    const resp = await axios.get('https://api.dexscreener.com/latest/dex/pairs/solana/So11111111111111111111111111111111111111112', { timeout: 5000 });
    if (resp.data && resp.data.pair && resp.data.pair.priceUsd) {
      _solPriceCache = { price: parseFloat(resp.data.pair.priceUsd), timestamp: Date.now() };
      config.lastKnownSolPrice = _solPriceCache.price;
      console.log(`[SOL Price] Updated: $${_solPriceCache.price}`);
    }
  } catch (e) {
    console.warn(`[SOL Price] Fetch failed: ${e.message}, using cached/fallback: $${_solPriceCache.price}`);
  }
  config.lastKnownSolPrice = _solPriceCache.price;
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
    targetKols: config.REPLY_GUY_TARGET_KOLS,
    githubUrl: config.GITHUB_URL,
    binanceReferralUrl: config.BINANCE_REFERRAL_URL,
    dashboardUrl: config.DASHBOARD_URL,
    japanTrafficBoost: config.JAPAN_TRAFFIC_BOOST
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
