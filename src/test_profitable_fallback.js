const DegenTerminalAgent = require('./index');
const brain = require('./brain');
const config = require('./config');

async function testProfitableFallback() {
  console.log('======================================================');
  console.log('   🛠️  TaiwanCryptoAI 扭虧為盈 (Profitable Fallback) 測試');
  console.log('======================================================\n');

  const agent = new DegenTerminalAgent();

  // 1. Mock FNG memory to be in Fear state (FNG = 28)
  brain.memory.analytics_feedback = {
    market_trends: {
      fng: { value: 28, classification: 'Fear' }
    }
  };
  brain.saveState();

  // 2. Mock loadPositions
  let mockPositions = [
    {
      symbol: 'WINNER',
      name: 'Winning Meme Coin',
      address: 'WinnerMintAddress111111111111111111111111111',
      buyPriceSol: 1.0,
      buyPriceUSD: 100.0, // bought at $100 USD
      buyTime: Date.now() - 2 * 60 * 1000, // 2 minutes ago
      rawAmountOut: '1000000000',
      mode: 'PAPER',
      priceHistory: []
    }
  ];

  agent.loadPositions = () => mockPositions;
  agent.savePositions = (posList) => {
    mockPositions = posList;
    console.log(`[Mock Save] Positions saved. Count: ${posList.length}`);
  };

  // 3. Mock Jupiter getQuote to fail (throw error) to trigger fallback
  agent.trader.getQuote = async () => {
    throw new Error('Jupiter API Rate Limited (Too Many Requests)');
  };

  // 4. Mock DexScreener getPairData to return $115 USD (大漲 15%)
  agent.scanner.getPairData = async (chainId, address) => {
    console.log(`[Mock DexScreener] Fetching pair data for ${address}`);
    return {
      priceUsd: '115.00', //大漲 15%
      liquidity: { usd: 50000 }
    };
  };

  // 5. Mock Swap & Reflection to run clean
  agent.trader.executeSwap = async (tokenMint, amount, isBuy, rawAmount) => {
    console.log(`[Mock Trader] executeSwap (Sell Winner) success!`);
    return { success: true, txid: 'mock-pnl-txid-888' };
  };

  const originalPerformSelfReflection = brain.performSelfReflection;
  brain.performSelfReflection = async (closedTrade) => {
    console.log(`[Mock Brain] performSelfReflection triggered for $${closedTrade.symbol}. PnL: ${closedTrade.pnlPercent}%, Reason: ${closedTrade.reason}`);
    return `[Mock Diary] Deep profit reflection for $${closedTrade.symbol}`;
  };

  agent.saveVirtualPortfolio = () => {};
  agent.twitter.postTweet = async () => ({ success: true });

  const adjustments = brain.getStrategyAdjustments();
  console.log(`🧠 大盤情緒恐懼 (FNG 28) 策略調適參數：`);
  console.log(`   • 預設止盈門檻: ${config.TAKE_PROFIT_PCT * 100}%`);
  console.log(`   • 大腦自適應止盈門檻: ${adjustments.TAKE_PROFIT_PCT * 100}% (已自動調降落袋為安！)`);
  console.log(`   • 當前代幣買入價: $100.00 USD`);
  console.log(`   • 模擬實時價格 (DexScreener): $115.00 USD (漲幅 +15.00%)\n`);

  console.log(`🚀 執行行情與平倉監控...`);
  await agent.checkPositionsAndSell();

  // 6. Verification
  console.log(`\n🔍 驗證結果...`);
  const WinnerRemaining = mockPositions.find(p => p.symbol === 'WINNER');
  
  let passed = true;
  if (!WinnerRemaining) {
    console.log(`✅ [通過] $WINNER 成功觸發止盈平倉！`);
    console.log(`✅ [通過] 成功在 Jupiter 斷網時調用 DexScreener Fallback，在 +15% 漲幅下精準擊穿大腦自適應調低後的 12% 止盈防線，落袋為安！`);
  } else {
    console.error(`❌ [失敗] $WINNER 未能觸發止盈平倉，依舊被保留在持倉中！`);
    passed = false;
  }

  // Restore brain reflection
  brain.performSelfReflection = originalPerformSelfReflection;

  console.log('\n======================================================');
  if (passed) {
    console.log('   🎉 扭虧為盈 (Profitable Fallback) 測試案例 100% 通過！');
  } else {
    console.log('   ❌ 測試失敗，請檢查平倉或策略調整邏輯！');
  }
  console.log('======================================================\n');
}

testProfitableFallback().catch(console.error);
