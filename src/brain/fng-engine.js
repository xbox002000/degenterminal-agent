const config = require('../config');

class FngEngine {
  constructor(brain) {
    this.brain = brain;
  }

  /**
   * Retrieve dynamic parameter overrides for index.js with FNG Market Fuse integration
   * Decoupled to support mode-specific default configurations.
   * @param {string} mode - 'conservative' or 'aggressive'
   * @returns {Object} Adjusted configuration parameters
   */
  getStrategyAdjustments(mode = 'conservative') {
    const overrides = this.brain.memory.long_term.parameter_overrides || {};
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

    // --- FNG Market Fuse ---
    const trends = this.brain.memory.analytics_feedback?.market_trends;
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

    return adjusted;
  }
}

module.exports = FngEngine;
