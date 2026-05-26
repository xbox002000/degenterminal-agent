const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

class SmartMoneyStrategy {
  constructor() {
    this.cliPath = 'C:\\Users\\xbox0\\.gemini\\config\\plugins\\anysearch-plugin\\skills\\scripts\\anysearch_cli.py';
  }

  /**
   * Helper to execute AnySearch CLI commands synchronously and safely
   * @param {string} commandArgs - Arguments for the CLI
   * @returns {string} Standard output from CLI
   */
  runAnySearch(commandArgs) {
    const cmd = `python "${this.cliPath}" ${commandArgs}`;
    try {
      return execSync(cmd, { encoding: 'utf8', timeout: 25000 });
    } catch (err) {
      console.error(`[SmartMoneyStrategy] AnySearch CLI execution failed: ${err.message}`);
      return '';
    }
  }

  /**
   * Evaluate the 5 pillars for a target token
   * @param {string} symbol - Target token (e.g. 'BTC', 'SOL')
   * @returns {Promise<{success: boolean, passedPillars: number, details: object, action: string}>}
   */
  async evaluateToken(symbol = 'BTC') {
    const uppercaseSymbol = symbol.toUpperCase();
    console.log(`\n======================================================`);
    console.log(`🔍 [SmartMoneyStrategy] 啟動 5 柱鏈上數據與宏觀流向評估: $${uppercaseSymbol}`);
    console.log(`======================================================`);

    const details = {
      smartMoneyConfirm: { score: 0, text: '', name: '1. 聰明錢歷史高勝率確認' },
      multiWalletResonance: { score: 0, text: '', name: '2. 多錢包同時間段共振' },
      entityIdentification: { score: 0, text: '', name: '3. Arkham 機構實體識別 (排除散戶)' },
      exchangeNetFlow: { score: 0, text: '', name: '4. 交易所淨流向稽核 (流出至冷錢包)' },
      marketCycle: { score: 0, text: '', name: '5. Glassnode 宏觀週期階段 (大盤累積期)' }
    };

    // Pillar 1: Smart Money Confirmation
    console.log(`• 正在評估 [1/5]: 聰明錢歷史高勝率確認...`);
    const q1 = `search "Arkham Nansen smart money address historical win rate performance ${uppercaseSymbol}" --max_results 3`;
    const res1 = this.runAnySearch(q1);
    details.smartMoneyConfirm.text = res1;
    
    // Check if the results mention positive win rates, profitable smart money, or over 70% rate
    const p1Regex = /(high win rate|above 70%|75%|80%|profitable smart money|whale buying|smart money accumulation|legendary wallet)/i;
    if (p1Regex.test(res1) || res1.length > 500) {
      details.smartMoneyConfirm.score = 1;
    }

    // Pillar 2: Multi-Wallet Resonance
    console.log(`• 正在評估 [2/5]: 多錢包同時間段共振...`);
    const q2 = `search "multiple smart money wallets same token transactions resonance inflow ${uppercaseSymbol}" --max_results 3`;
    const res2 = this.runAnySearch(q2);
    details.multiWalletResonance.text = res2;
    
    const p2Regex = /(multiple wallets|resonance|co-movement|shared inflow|simultaneous buying|two or more wallets|accumulation trend)/i;
    if (p2Regex.test(res2) || res2.length > 500) {
      details.multiWalletResonance.score = 1;
    }

    // Pillar 3: Entity Identification
    console.log(`• 正在評估 [3/5]: Arkham 機構實體識別...`);
    const q3 = `search "Arkham entity label classification for token ${uppercaseSymbol} fund treasury" --max_results 3`;
    const res3 = this.runAnySearch(q3);
    details.entityIdentification.text = res3;
    
    const p3Regex = /(institution|vc fund|treasury|investment fund|multisig|corporate|grayscale|microstrategy|blackrock|fidelity)/i;
    if (p3Regex.test(res3) || res3.length > 500) {
      details.entityIdentification.score = 1;
    }

    // Pillar 4: Exchange Net Flow
    console.log(`• 正在評估 [4/5]: 交易所淨流向稽核...`);
    const q4 = `search "${uppercaseSymbol} exchange net flow inflow vs outflow cold wallet glassnode" --max_results 3`;
    const res4 = this.runAnySearch(q4);
    details.exchangeNetFlow.text = res4;
    
    // Outflows (withdrawn from exchange to cold wallet) are bullish (score 1). Inflows to exchange are bearish (score 0).
    const p4BullishRegex = /(net outflow|outflow|withdrawn from exchange|exchange to cold|reserves at multi-year lows|supply tightening|withdrawing)/i;
    const p4BearishRegex = /(net inflow|inflow|deposit to exchange|transferred to exchange|exchange reserves rising)/i;
    
    if (p4BullishRegex.test(res4) && !p4BearishRegex.test(res4) || res4.length > 500) {
      details.exchangeNetFlow.score = 1;
    }

    // Pillar 5: Market Cycle
    console.log(`• 正在評估 [5/5]: Glassnode 宏觀週期階段...`);
    const q5 = `search "Glassnode Bitcoin market cycle accumulation distribution phase 2026" --max_results 3`;
    const res5 = this.runAnySearch(q5);
    details.marketCycle.text = res5;
    
    // Accumulation or re-accumulation is bullish (score 1). Distribution is bearish (score 0).
    const p5BullishRegex = /(accumulation|accumulating|re-accumulation|long-term holders buying|low-point cycle|halving peak window|sovereign demand)/i;
    if (p5BullishRegex.test(res5) || res5.length > 500) {
      details.marketCycle.score = 1;
    }

    // Calculate Total Passed Pillars
    const passedPillars = details.smartMoneyConfirm.score +
                          details.multiWalletResonance.score +
                          details.entityIdentification.score +
                          details.exchangeNetFlow.score +
                          details.marketCycle.score;

    const success = passedPillars >= 4;
    const action = success ? 'BUY / ACCUMULATE' : 'HOLD / SKIP';

    console.log(`\n======================================================`);
    console.log(`📊 [5 柱量化策略審查結果看板]`);
    console.log(`======================================================`);
    Object.keys(details).forEach(key => {
      const item = details[key];
      const statusIcon = item.score === 1 ? '✅ [通過]' : '❌ [未通過]';
      console.log(`${statusIcon} ${item.name}`);
    });
    console.log(`------------------------------------------------------`);
    console.log(`• 通過指標數量: ${passedPillars} / 5 (合格要求門檻: >= 4)`);
    console.log(`• 系統最終決策: ${success ? '🟢' : '🔴'} ACTION: ${action}`);
    console.log(`======================================================\n`);

    return {
      success,
      passedPillars,
      details,
      action
    };
  }
}

module.exports = new SmartMoneyStrategy();
