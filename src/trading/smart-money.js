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
   * Global dynamic keyword weights for the 5-Pillar Sentiment Engine
   */
  getKeywordWeights() {
    return {
      // 多詞優先（最重要！避免 whale selling 被誤判正向）
      'whale buying': 2.8,
      'whale accumulation': 2.8,
      'smart money buying': 2.8,
      'whale selling': -2.8,
      'whale dumping': -2.8,
      'smart money selling': -2.6,
      'blackrock': 2.6,
      'institutional buying': 2.4,
      'institutional selling': -2.4,
      'accumulation': 1.6,
      'supply tightening': 1.8,
      'resonance': 1.3,
      'distribution': -2.0,
      'dumping': -2.5,
      'panic selling': -2.4,
      'selling pressure': -1.8,
      'outflow': 1.5,
      'withdrawal': 1.4,
      'inflow': -1.4,
      'deposit': -1.3,
      'unprofitable': -1.2,

      // 其他高價值擴充詞彙
      'whale inflow': 2.0,
      'whale loading': 2.0,
      'whale adding': 2.0,
      'smart money profitable': 2.0,
      'smart money high win rate': 2.0,
      'smart money accumulating': 2.0,
      'large holder adding': 2.0,
      'large holder accumulating': 2.0,
      'large holder increasing': 2.0,
      'institutional accumulation': 2.0,
      'vc fund buying': 2.0,
      'profitable address': 1.5,
      'whale address': 1.5,
      'buying trend': 1.0,
      'accumulation phase': 1.5,
      'institutional buy': 1.5,

      'whale distribution': -2.0,
      'whale exiting': -2.0,
      'whale offloading': -2.0,
      'smart money exiting': -2.0,
      'smart money low win rate': -2.0,
      'large holder selling': -2.0,
      'large holder distributing': -2.0,
      'institutional distribution': -2.0,
      'dumping trend': -1.5,
      'distribution phase': -2.0,
      'large sell': -1.5,
      'panic sell': -1.5,
      'unprofitable smart money': -1.5,

      // Pillar 2: Multi-Wallet Resonance
      'multiple wallets buying': 2.0,
      'multiple wallets resonance': 2.0,
      'multiple wallets accumulating': 2.0,
      'resonance inflow': 2.0,
      'resonance accumulation': 2.0,
      'co-movement inflow': 2.0,
      'co-movement resonance': 2.0,
      'shared inflow': 1.5,
      'simultaneous buying': 1.5,
      'two or more wallets': 1.5,

      'multiple wallets selling': -2.0,
      'multiple wallets dumping': -2.0,
      'multiple wallets exiting': -2.0,
      'co-movement outflow': -2.0,
      'co-movement dumping': -2.0,
      'co-movement liquidation': -2.0,
      'simultaneous selling': -1.5,
      'wallets dumping': -1.5,
      'distribution resonance': -1.5,

      // Pillar 3: Entity Identification
      'grayscale': 1.5,
      'microstrategy': 2.5,
      'fidelity': 2.0,
      'vc fund holding': 1.5,
      'treasury accumulation': 1.5,
      'institution': 1.0,
      'vc fund': 1.0,
      'investment fund': 1.0,
      'multisig': 1.0,

      'institution selling': -2.0,
      'institution dumping': -2.0,
      'institution liquidating': -2.0,
      'grayscale distribution': -2.0,
      'vc dumping': -2.0,
      'retail dump': -1.0,
      'retail panic': -1.0,
      'no institutional interest': -1.5,
      'selling treasury': -1.5,

      // Pillar 4: Exchange Net Flow
      'supply burn': 2.0,
      'supply locked': 2.0,
      'coins leaving exchange': 2.0,
      'coins moving off exchange': 2.0,
      'withdrawn from exchange': 1.5,
      'exchange to cold': 1.5,
      'reserves at multi-year lows': 1.5,
      'withdrawing': 1.0,

      'exchange large deposit': -2.0,
      'coins moving to exchange': -2.0,
      'coins onto exchange': -2.0,
      'transferred to exchange': -1.5,
      'exchange reserves rising': -1.5,

      // Pillar 5: Market Cycle
      're-accumulation phase': 2.0,
      'low-point cycle': 2.0,
      'long-term holders buying': 2.0,
      'sovereign demand': 2.0,
      'halving peak window': 1.5,
      'accumulating': 1.0,

      'market top phase': -2.0,
      'cycle top': -2.0,
      'miner capitulation': -2.0,
      'capitulation': -1.5
    };
  }

  /**
   * Helper to evaluate a specific pillar with regex nesting and keyword weights
   */
  evaluatePillarSentiment(text, pillarIndex, bullStrong, bullStd, bearStrong, bearStd) {
    if (!text) {
      return { bullPassed: false, bearPassed: false, bullScore: 0, bearScore: 0, 
               matchedBull: [], matchedBear: [], matchedKeywords: [], overallSentiment: 0, fallbackApplied: [] };
    }

    let bullScore = 0;
    let bearScore = 0;
    const matchedBull = [];
    const matchedBear = [];
    const matchedKeywords = [];

    const lowercaseText = text.toLowerCase();
    const weights = this.getKeywordWeights();
    
    // Sort keys by length descending to match longer phrases first and compile into regex patterns
    const sortedKeys = Object.keys(weights).sort((a, b) => b.length - a.length);
    const patterns = sortedKeys.map(word => ({
      word,
      regex: new RegExp(word.replace(/ /g, '\\s+'), 'gi'), // 'gi' is safer
      weight: weights[word]
    }));

    let remainingText = lowercaseText;

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.regex.exec(remainingText)) !== null) {  // Use exec for precision
        const matchedStr = match[0];
        const idx = match.index;

        matchedKeywords.push({
          word: pattern.word,
          weight: pattern.weight,
          pillar: pillarIndex,
          index: idx   // Keep idx for debug logging trace
        });

        if (pattern.weight > 0) {
          bullScore += pattern.weight;
          matchedBull.push(pattern.word);
        } else {
          bearScore += Math.abs(pattern.weight); // Absolute value accumulation
          matchedBear.push(pattern.word);
        }

        // Replace matched substring with spaces to prevent shorter sub-keywords from matching
        remainingText = remainingText.substring(0, idx) 
                      + ' '.repeat(matchedStr.length) 
                      + remainingText.substring(idx + matchedStr.length);

        // Reset lastIndex to prevent infinite loops or skipped character segments
        pattern.regex.lastIndex = idx + matchedStr.length;
      }
    }

    // === Fallback 機制（保留但優化）===
    const fallbackApplied = [];

    if (bullStrong && bullStrong.test(text) && bullScore < 2.0) {
      bullScore = Math.max(bullScore, 2.0);
      fallbackApplied.push('[strong_bull]');
      matchedKeywords.push({ word: '[strong_bull_fallback]', weight: 2.0, pillar: pillarIndex });
    } else if (bullStd && bullStd.test(text) && bullScore < 1.0) {
      bullScore = Math.max(bullScore, 1.0);
      fallbackApplied.push('[std_bull]');
      matchedKeywords.push({ word: '[std_bull_fallback]', weight: 1.0, pillar: pillarIndex });
    }

    if (bearStrong && bearStrong.test(text) && bearScore < 2.0) {
      bearScore = Math.max(bearScore, 2.0);
      fallbackApplied.push('[strong_bear]');
      matchedKeywords.push({ word: '[strong_bear_fallback]', weight: -2.0, pillar: pillarIndex });
    } else if (bearStd && bearStd.test(text) && bearScore < 1.0) {
      bearScore = Math.max(bearScore, 1.0);
      fallbackApplied.push('[std_bear]');
      matchedKeywords.push({ word: '[std_bear_fallback]', weight: -1.0, pillar: pillarIndex });
    }

    return {
      bullPassed: bullScore >= 2.0,
      bearPassed: bearScore >= 2.0,
      bullScore: Number(bullScore.toFixed(2)),   // Prevent float rounding issues
      bearScore: Number(bearScore.toFixed(2)),
      matchedBull,
      matchedBear,
      matchedKeywords,
      overallSentiment: Number((bullScore - bearScore).toFixed(2)), // single pillar net sentiment
      fallbackApplied
    };
  }

  /**
   * Evaluate the 5 pillars for a target token with high-fidelity sentiment analysis
   * @param {string} symbol - Target token (e.g. 'BTC', 'SOL')
   * @param {number} fngValue - Current Fear & Greed index value
   * @returns {Promise<{success: boolean, signal: 'LONG'|'SHORT'|'HOLD', passedPillars: number, bullishScore: number, bearishScore: number, details: object, matchedKeywords: object[], action: string, finalSignalStrength: number, overallSentimentStrength: number}>}
   */
  async evaluateToken(symbol = 'BTC', fngValue = 50) {
    const uppercaseSymbol = symbol.toUpperCase();
    console.log(`\n======================================================`);
    console.log(`🔍 [SmartMoneyStrategy] 啟動雙向加權 5 柱鏈上共振評估: $${uppercaseSymbol} (當前大盤 FNG: ${fngValue})`);
    console.log(`======================================================`);

    const details = {
      smartMoneyConfirm: { score: 0, bearishScore: 0, matchedBull: [], matchedBear: [], text: '', name: '1. 聰明錢歷史勝率與意圖確認' },
      multiWalletResonance: { score: 0, bearishScore: 0, matchedBull: [], matchedBear: [], text: '', name: '2. 多錢包同時間段流向共振' },
      entityIdentification: { score: 0, bearishScore: 0, matchedBull: [], matchedBear: [], text: '', name: '3. Arkham 機構實體識別 (排除散戶)' },
      exchangeNetFlow: { score: 0, bearishScore: 0, matchedBull: [], matchedBear: [], text: '', name: '4. 交易所淨流向稽核 (冷錢包流動)' },
      marketCycle: { score: 0, bearishScore: 0, matchedBull: [], matchedBear: [], text: '', name: '5. Glassnode 宏觀週期階段 (累積 vs 分發)' }
    };

    let bullishScore = 0;
    let bearishScore = 0;
    let allMatchedWords = [];

    // --- Pillar 1 Patterns ---
    const p1BullStrong = /(whale (buying|accumulation|inflow|loading|adding)|smart money (buying|profitable|high win rate|accumulating)|large holder (adding|accumulating|increasing)|institutional (buying|accumulation)|blackrock|vc fund (buying))/i;
    const p1BullStd = /(profitable address|whale address|buying trend|accumulation phase|institutional buy)/i;
    const p1BearStrong = /(whale (selling|dumping|distribution|exiting|offloading)|smart money (selling|exiting|low win rate)|large holder (selling|distributing)|institutional (selling|distribution))/i;
    const p1BearStd = /(dumping trend|distribution phase|large sell|panic sell|unprofitable smart money)/i;

    // --- Pillar 2 Patterns ---
    const p2BullStrong = /(multiple wallets (buying|resonance|accumulating)|resonance (inflow|accumulation)|co-movement (inflow|resonance))/i;
    const p2BullStd = /(resonance|co-movement|shared inflow|simultaneous buying|two or more wallets)/i;
    const p2BearStrong = /(multiple wallets (selling|dumping|exiting)|co-movement (outflow|dumping|liquidation))/i;
    const p2BearStd = /(co-movement outflow|simultaneous selling|wallets dumping|distribution resonance)/i;

    // --- Pillar 3 Patterns ---
    const p3BullStrong = /(grayscale|microstrategy|blackrock|fidelity|vc fund (buying|holding)|treasury accumulation)/i;
    const p3BullStd = /(institution|vc fund|treasury|investment fund|multisig|corporate)/i;
    const p3BearStrong = /(institution (selling|dumping|liquidating)|grayscale distribution|vc dumping)/i;
    const p3BearStd = /(retail dump|retail panic|no institutional interest|selling treasury)/i;

    // --- Pillar 4 Patterns ---
    const p4BullStrong = /(net (outflow|withdrawal)|exchange (outflow|withdrawal)|supply (tightening|burn|locked)|coins (leaving|moving off) exchange)/i;
    const p4BullStd = /(withdrawn from exchange|exchange to cold|reserves at multi-year lows|withdrawing)/i;
    const p4BearStrong = /(net (inflow|deposit)|exchange (inflow|large deposit)|selling pressure|coins (moving to|onto) exchange)/i;
    const p4BearStd = /(transferred to exchange|exchange reserves rising|deposit to)/i;

    // --- Pillar 5 Patterns ---
    const p5BullStrong = /(re-accumulation phase|low-point cycle|long-term holders buying|sovereign demand)/i;
    const p5BullStd = /(accumulation|accumulating|halving peak window)/i;
    const p5BearStrong = /(market top phase|distribution phase|cycle top|miner capitulation)/i;
    const p5BearStd = /(distribution|capitulation|panic selling)/i;

    // Try-Catch isolated evaluation rounds
    let p1Eval = { bullScore: 0, bearScore: 0, matchedBull: [], matchedBear: [], matchedKeywords: [] };
    let p2Eval = { bullScore: 0, bearScore: 0, matchedBull: [], matchedBear: [], matchedKeywords: [] };
    let p3Eval = { bullScore: 0, bearScore: 0, matchedBull: [], matchedBear: [], matchedKeywords: [] };
    let p4Eval = { bullScore: 0, bearScore: 0, matchedBull: [], matchedBear: [], matchedKeywords: [] };
    let p5Eval = { bullScore: 0, bearScore: 0, matchedBull: [], matchedBear: [], matchedKeywords: [] };

    try {
      console.log(`• 正在評估 [1/5]: 聰明錢意圖確認...`);
      const q1 = `search "Arkham Nansen smart money address historical win rate performance ${uppercaseSymbol}" --max_results 3`;
      const res1 = this.runAnySearch(q1);
      details.smartMoneyConfirm.text = res1;
      p1Eval = this.evaluatePillarSentiment(res1, 1, p1BullStrong, p1BullStd, p1BearStrong, p1BearStd);
    } catch (e) {
      console.warn(`[SmartMoney P1 Warning] Pillar 1 query/eval failed: ${e.message}`);
    }

    try {
      console.log(`• 正在評估 [2/5]: 多錢包同時間段流向共振...`);
      const q2 = `search "multiple smart money wallets same token transactions resonance inflow ${uppercaseSymbol}" --max_results 3`;
      const res2 = this.runAnySearch(q2);
      details.multiWalletResonance.text = res2;
      p2Eval = this.evaluatePillarSentiment(res2, 2, p2BullStrong, p2BullStd, p2BearStrong, p2BearStd);
    } catch (e) {
      console.warn(`[SmartMoney P2 Warning] Pillar 2 query/eval failed: ${e.message}`);
    }

    try {
      console.log(`• 正在評估 [3/5]: Arkham 機構實體識別...`);
      const q3 = `search "Arkham entity label classification for token ${uppercaseSymbol} fund treasury" --max_results 3`;
      const res3 = this.runAnySearch(q3);
      details.entityIdentification.text = res3;
      p3Eval = this.evaluatePillarSentiment(res3, 3, p3BullStrong, p3BullStd, p3BearStrong, p3BearStd);
    } catch (e) {
      console.warn(`[SmartMoney P3 Warning] Pillar 3 query/eval failed: ${e.message}`);
    }

    try {
      console.log(`• 正在評估 [4/5]: 交易所淨流向稽核...`);
      const q4 = `search "${uppercaseSymbol} exchange net flow inflow vs outflow cold wallet glassnode" --max_results 3`;
      const res4 = this.runAnySearch(q4);
      details.exchangeNetFlow.text = res4;
      p4Eval = this.evaluatePillarSentiment(res4, 4, p4BullStrong, p4BullStd, p4BearStrong, p4BearStd);
    } catch (e) {
      console.warn(`[SmartMoney P4 Warning] Pillar 4 query/eval failed: ${e.message}`);
    }

    try {
      console.log(`• 正在評估 [5/5]: Glassnode 宏觀週期階段...`);
      const q5 = `search "Glassnode Bitcoin market cycle accumulation distribution phase 2026" --max_results 3`;
      const res5 = this.runAnySearch(q5);
      details.marketCycle.text = res5;
      p5Eval = this.evaluatePillarSentiment(res5, 5, p5BullStrong, p5BullStd, p5BearStrong, p5BearStd);
    } catch (e) {
      console.warn(`[SmartMoney P5 Warning] Pillar 5 query/eval failed: ${e.message}`);
    }

    // Process all evaluation results systematically with continuous scores
    const pillars = [p1Eval, p2Eval, p3Eval, p4Eval, p5Eval];
    const detailKeys = Object.keys(details);

    pillars.forEach((evalResult, i) => {
      const key = detailKeys[i];
      details[key].score = evalResult.bullScore;
      details[key].bearishScore = evalResult.bearScore;
      details[key].matchedBull = evalResult.matchedBull;
      details[key].matchedBear = evalResult.matchedBear;

      bullishScore += evalResult.bullScore;
      bearishScore += evalResult.bearScore;
      allMatchedWords = allMatchedWords.concat(evalResult.matchedKeywords);
    });

    // Ensure floating precision is stable
    bullishScore = Number(bullishScore.toFixed(2));
    bearishScore = Number(bearishScore.toFixed(2));

    // Filter and unique matched keywords
    const matchedKeywords = [];
    const seenWords = new Set();
    for (const kw of allMatchedWords) {
      const key = `${kw.word}-${kw.pillar}`;
      if (!seenWords.has(key)) {
        seenWords.add(key);
        matchedKeywords.push(kw);
      }
    }

    // --- Dynamic FNG Modulation of thresholds (continuous score-based) ---
    let requiredBullish = 6.0;
    let requiredBearish = 6.0;

    if (fngValue > 80) {
      requiredBullish = 4.5;
      console.log(`🔥 [FNG Modulation] Market in Extreme Greed (${fngValue}). Relaxing Bullish LONG threshold to >= ${requiredBullish} score.`);
    } else if (fngValue < 20) {
      requiredBearish = 4.5;
      console.log(`❄️ [FNG Modulation] Market in Extreme Fear (${fngValue}). Relaxing Bearish SHORT threshold to >= ${requiredBearish} score for safety hedging.`);
    }

    let signal = 'HOLD';
    if (bullishScore >= requiredBullish && bullishScore > bearishScore) {
      signal = 'LONG';
    } else if (bearishScore >= requiredBearish && bearishScore > bullishScore) {
      signal = 'SHORT';
    }

    const success = signal !== 'HOLD';
    const action = success ? `${signal} / EXECUTE` : 'HOLD / SKIP';
    const finalSignalStrength = signal === 'LONG' ? bullishScore : (signal === 'SHORT' ? bearishScore : 0);
    const overallSentimentStrength = Number((bullishScore - bearishScore).toFixed(2));

    console.log(`\n======================================================`);
    console.log(`📊 [雙向加權 5 柱量化策略審查結果看板]`);
    console.log(`======================================================`);
    Object.keys(details).forEach(key => {
      const item = details[key];
      let statusIcon = '❌ [無特徵]';
      if (item.score > 0 && item.bearishScore > 0) {
        statusIcon = `🔄 [雙向: +${item.score} / -${item.bearishScore}]`;
      } else if (item.score > 0) {
        statusIcon = `🟢 [多強: +${item.score}]`;
      } else if (item.bearishScore > 0) {
        statusIcon = `🔴 [空強: -${item.bearishScore}]`;
      }
      console.log(`${statusIcon} ${item.name}`);
    });
    console.log(`------------------------------------------------------`);
    console.log(`• 看多加權總分: ${bullishScore.toFixed(2)} (門檻: >= ${requiredBullish})`);
    console.log(`• 看空加權總分: ${bearishScore.toFixed(2)} (門檻: >= ${requiredBearish})`);
    console.log(`• 綜合情感淨強度: ${overallSentimentStrength >= 0 ? '+' : ''}${overallSentimentStrength} (Bullish - Bearish)`);
    console.log(`• 匹配加權特徵: ${JSON.stringify(matchedKeywords)}`);
    console.log(`• 系統最終決策: ${success ? (signal === 'LONG' ? '🟢' : '🔴') : '⚪'} ACTION: ${action}`);
    console.log(`======================================================\n`);

    const requiredThreshold = signal === 'SHORT' ? requiredBearish : requiredBullish;

    return {
      success,
      signal,
      passedPillars: finalSignalStrength,
      bullishScore,
      bearishScore,
      requiredThreshold,
      details,
      matchedKeywords,
      action,
      finalSignalStrength,
      overallSentimentStrength
    };
  }
}

module.exports = new SmartMoneyStrategy();
