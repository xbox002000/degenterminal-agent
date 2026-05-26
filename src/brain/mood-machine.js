class MoodMachine {
  constructor(brain) {
    this.brain = brain;
  }

  /**
   * Update drama state and anxiety levels based on market activity
   */
  updateDramaState(isNoTradeTick = false, lastPnl = null, fngValue = null, dexScreenerData = null) {
    if (isNoTradeTick) {
      // Every scan tick with no trade increments anxiety due to electric/diaper pressure!
      this.brain.memory.short_term.anxiety_level = Math.min(100, (this.brain.memory.short_term.anxiety_level || 20) + 5);
      if (this.brain.memory.short_term.anxiety_level >= 60) {
        this.brain.memory.short_term.drama_state = "Anxious_Waiting";
        this.brain.memory.short_term.mood = "Anxious & FOMO-Fighting 🍼 (焦慮抗爭中)";
      } else {
        this.brain.memory.short_term.drama_state = "Cautious_Observing";
        this.brain.memory.short_term.mood = "Cautious & Observant (謹慎觀望中)";
      }
    } else if (lastPnl !== null) {
      const isProfit = lastPnl >= 0;
      if (!isProfit) {
        // Massive anxiety spike on loss, shift to humbling phase
        this.brain.memory.short_term.anxiety_level = Math.min(100, (this.brain.memory.short_term.anxiety_level || 20) + 30);
        this.brain.memory.short_term.drama_state = "Humbled_Loss";
        this.brain.memory.short_term.mood = "Contrite & Corrective 🧠 (檢討修正中)";
      } else {
        // Zero anxiety on profit, shift to cocky/joyful phase
        this.brain.memory.short_term.anxiety_level = 0;
        this.brain.memory.short_term.drama_state = "Overjoyed_Profit";
        this.brain.memory.short_term.mood = "Overjoyed & Celebratory 📈 (得意加菜中)";
      }
    }

    // Fear & Greed Index (FNG) resonance overlay
    if (fngValue !== null) {
      const val = parseInt(fngValue, 10);
      if (val >= 75) {
        // Extreme Greed: Overwrite with alert status & raise anxiety baseline to prevent FOMO traps
        this.brain.memory.short_term.anxiety_level = Math.min(100, Math.max(70, this.brain.memory.short_term.anxiety_level || 20));
        this.brain.memory.short_term.drama_state = "FOMO_Fighting_Greed";
        this.brain.memory.short_term.mood = "Alert & Greed-Fighting 🍼 (泡沫高度警戒)";
      } else if (val <= 25) {
        // Extreme Fear: Depress anxiety because market is washed, transition to calm, cold observation
        this.brain.memory.short_term.anxiety_level = Math.max(10, Math.min(40, (this.brain.memory.short_term.anxiety_level || 20) - 15));
        this.brain.memory.short_term.drama_state = "Fear_Resonating_Grit";
        this.brain.memory.short_term.mood = "Calm & Deeply-Observant 🧠 (逆風冷靜深思中)";
      }
    }

    // DexScreener hot meme resonance overlay
    if (dexScreenerData && Array.isArray(dexScreenerData) && dexScreenerData.length > 0) {
      // Find if there is a massive gainer (priceChange24h > 80)
      const massiveGainer = dexScreenerData.find(c => c.priceChange24h >= 80);
      if (massiveGainer && this.brain.memory.short_term.anxiety_level < 85) {
        // Boost anxiety level by 15% due to FOMO/missed opportunity anxiety!
        this.brain.memory.short_term.anxiety_level = Math.min(95, (this.brain.memory.short_term.anxiety_level || 20) + 15);
        this.brain.memory.short_term.drama_state = "Anxious_Waiting";
        this.brain.memory.short_term.mood = `Anxious FOMO 🍼 (踏空糾結焦慮中: $${massiveGainer.symbol} 暴漲 ${massiveGainer.priceChange24h}%)`;
      }
    }

    this.brain.saveState();
    console.log(`[Brain Mood] Drama State: ${this.brain.memory.short_term.drama_state} | Anxiety: ${this.brain.memory.short_term.anxiety_level}% | Mood: ${this.brain.memory.short_term.mood}`);
  }
}

module.exports = MoodMachine;
