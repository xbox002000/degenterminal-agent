const fs = require('fs');
const path = require('path');

class NarrativeTracker {
  constructor(brain) {
    this.brain = brain;
    this.narrativesPath = path.join(__dirname, '../../config/narrative_db.json');
    this.narratives = {};
  }

  /**
   * Load Narrative databases
   */
  loadNarratives() {
    try {
      if (fs.existsSync(this.narrativesPath)) {
        this.narratives = JSON.parse(fs.readFileSync(this.narrativesPath, 'utf8'));
      } else {
        // Initialize standard crypto narratives
        this.narratives = {
          narratives: {
            "AI_Agent_Economy": {
              strength: 80,
              last_updated: Date.now(),
              viewpoint: "AI 代理經濟依然是當前市場最強 Alpha 來源。"
            },
            "Solana_Meme_Summer": {
              strength: 50,
              last_updated: Date.now(),
              viewpoint: "流動性分流嚴重，散戶追高風險急遽增加，必須提高警惕。"
            },
            "ETH_ETF": {
              strength: 40,
              last_updated: Date.now(),
              viewpoint: "傳統資金流入停滯，處於邊緣化狀態。"
            },
            "Asian_Liquidity_Return": {
              strength: 45,
              last_updated: Date.now(),
              viewpoint: "亞洲交易時段 buying pressure 證實依然疲軟，散戶資金比預期更為保守。"
            }
          }
        };
        this.saveNarratives();
      }
    } catch (e) {
      console.error('[Brain Narrative] Failed to load narrative_db.json:', e.message);
    }
  }

  /**
   * Save narrative databases
   */
  saveNarratives() {
    try {
      fs.writeFileSync(this.narrativesPath, JSON.stringify(this.narratives, null, 2), 'utf8');
    } catch (e) {
      console.error('[Brain Narrative] Failed to save narrative_db.json:', e.message);
    }
  }

  /**
   * Update active narrative score and dynamic viewpoint
   */
  updateNarrativeScore(narrativeKey, scoreChange, newViewpoint = null) {
    if (this.narratives.narratives && this.narratives.narratives[narrativeKey]) {
      const narr = this.narratives.narratives[narrativeKey];
      narr.strength = Math.min(100, Math.max(0, narr.strength + scoreChange));
      narr.last_updated = Date.now();
      if (newViewpoint) {
        narr.viewpoint = newViewpoint;
      }
      this.saveNarratives();
      console.log(`[Brain Narrative] Narrative $${narrativeKey} updated. Strength: ${narr.strength}%`);
    }
  }
}

module.exports = NarrativeTracker;
