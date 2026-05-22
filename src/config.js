require('dotenv').config();

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
    MIN_COMPOSITE_SCORE: 58,         // Increased to 58 for slightly cleaner signals
    TAKE_PROFIT_PCT: 0.08,         // +8% scalp profit ceiling
    STOP_LOSS_PCT: -0.06,          // -6.0% stop loss (broader to survive noise)
    TIMEOUT_MINUTES: 12,           // 12m quick protective exit
    POSITION_SIZE_USD: 1000,
    MAX_POSITIONS: 5,              // Diversified 5 positions
    BUY_AMOUNT_SOL: 0.02,
    
    // 🔄 Adaptive Trailing Stop
    TRAILING_STOP_TRIGGER_PCT: 0.04,   // Start trailing when float profit hits +4%
    TRAILING_STOP_RETRACT_PCT: 0.015   // Sell when retracts 1.5% from max PnL
  }
};

module.exports = config;


