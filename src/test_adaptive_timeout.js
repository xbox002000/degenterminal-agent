const DegenTerminalAgent = require('./index');
const brain = require('./brain');
const config = require('./config');

async function testAdaptiveTimeout() {
  console.log('======================================================');
  console.log('   🛠️  TaiwanCryptoAI 自適應平倉超時 (Adaptive Timeout) 測試');
  console.log('======================================================\n');

  const agent = new DegenTerminalAgent();

  // 1. Mock loadPositions & savePositions to isolate from production files
  let mockPositions = [
    {
      symbol: 'NORMAL',
      name: 'Normal Token',
      address: 'NormalMintAddress111111111111111111111111111',
      buyPriceSol: 1.0,
      buyPriceUSD: 150.0,
      buyTime: Date.now() - 10 * 60 * 1000, // 10 minutes ago
      rawAmountOut: '1000000000',
      mode: 'PAPER',
      priceHistory: []
    },
    {
      symbol: 'DANGER',
      name: 'High Volatility Token',
      address: 'DangerMintAddress111111111111111111111111111',
      buyPriceSol: 1.0,
      buyPriceUSD: 150.0,
      buyTime: Date.now() - 8 * 60 * 1000, // 8 minutes ago (exceeded custom 6 minutes)
      maxHoldMinutes: 6, // Dynamic 6-minute protective timeout
      rawAmountOut: '1000000000',
      mode: 'PAPER',
      priceHistory: []
    }
  ];

  agent.loadPositions = () => {
    return mockPositions;
  };

  agent.savePositions = (posList) => {
    mockPositions = posList;
    console.log(`[Mock Save] Positions saved successfully. Count: ${posList.length}`);
  };

  // 2. Mock Trader's methods to avoid real RPC calls
  agent.trader.getQuote = async (inputMint, outputMint, amount) => {
    console.log(`[Mock Trader] getQuote called for ${inputMint}`);
    // Simulate minor price change (no profit, no loss threshold triggered)
    return {
      outAmount: 1.0 * 1e9 // return 1.0 SOL, pnl = 0%
    };
  };

  agent.trader.executeSwap = async (tokenMint, amount, isBuy, rawAmount) => {
    console.log(`[Mock Trader] executeSwap (Sell) triggered for ${tokenMint}`);
    return {
      success: true,
      txid: 'mock-swap-tx-id-123456'
    };
  };

  // 3. Mock Brain's reflection to avoid writing to real production history/overrides
  const originalPerformSelfReflection = brain.performSelfReflection;
  brain.performSelfReflection = async (closedTrade) => {
    console.log(`[Mock Brain] performSelfReflection triggered for $${closedTrade.symbol}. PnL: ${closedTrade.pnlPercent}%, Reason: ${closedTrade.reason}`);
    return `[Mock Diary] Deep reflection for $${closedTrade.symbol}`;
  };

  // 4. Mock web log updates and file savings to keep test 100% clean
  agent.saveVirtualPortfolio = () => {
    console.log(`[Mock Portfolio] saveVirtualPortfolio called.`);
  };
  
  agent.twitter.postTweet = async (text) => {
    console.log(`[Mock Twitter] postTweet called with text: "${text.substring(0, 40)}..."`);
    return { success: true };
  };

  console.log(`⏰ 開始測試...`);
  console.log(`普通代幣 $NORMAL：已持有 10 分鐘，無 maxHoldMinutes。預設超時為 ${config.TIMEOUT_MINUTES} 分鐘。`);
  console.log(`高波動代幣 $DANGER：已持有 8 分鐘，maxHoldMinutes = 6 分鐘。`);

  // Run the monitoring and selling check!
  await agent.checkPositionsAndSell();

  // 5. Verification
  console.log(`\n🔍 驗證結果...`);
  
  const NormalRemaining = mockPositions.find(p => p.symbol === 'NORMAL');
  const DangerRemaining = mockPositions.find(p => p.symbol === 'DANGER');

  let passed = true;

  if (NormalRemaining) {
    console.log(`✅ [通過] $NORMAL 成功保留。持有時間 10 分鐘低於全域 ${config.TIMEOUT_MINUTES} 分鐘超時防護線。`);
  } else {
    console.error(`❌ [失敗] $NORMAL 被意外平倉了！`);
    passed = false;
  }

  if (!DangerRemaining) {
    console.log(`✅ [通過] $DANGER 成功觸發自適應平倉超時！持有時間 8 分鐘已超過自定義的 6 分鐘防禦生命週期。`);
  } else {
    console.error(`❌ [失敗] $DANGER 依然在持倉中，未能在 6 分鐘自適應超時觸發平倉！`);
    passed = false;
  }

  // Restore brain reflection
  brain.performSelfReflection = originalPerformSelfReflection;

  console.log('\n======================================================');
  if (passed) {
    console.log('   🎉 自適應平倉超時 (Adaptive Timeout) 單元測試全部通過！');
  } else {
    console.log('   ❌ 部分自適應平倉超時測試案例失敗，請檢查邏輯！');
  }
  console.log('======================================================\n');
}

testAdaptiveTimeout().catch(console.error);
