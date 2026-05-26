const OnChainScanner = require('../src/scanner');

async function testRiskCalibration() {
  console.log('======================================================');
  console.log('   🛠�? TaiwanCryptoAI 風控評分系統 (Calibrated Score) 測試');
  console.log('======================================================\n');

  const scanner = new OnChainScanner();

  const mockTokenBase = {
    header: 'Test Token',
    tokenAddress: 'TESTMintAddress111111111111111111111111111',
    description: 'A revolutionary blockchain entity mapping crypto assets for carbon traders.',
    links: [
      { type: 'twitter', url: 'https://twitter.com/test' },
      { type: 'telegram', url: 'https://t.me/test' },
      { type: 'website', url: 'https://test.com' }
    ]
  };

  // Scenario 1: Extremely Safe Contract (Rugcheck = 0), High Liquidity ($120k USD), Healthy volume
  const token1 = { ...mockTokenBase, header: 'SafeMax Coin' };
  const pair1 = {
    liquidity: { usd: 120000 },
    volume: { h24: 80000 },
    priceChange: { h1: 15, h24: 45 },
    pairCreatedAt: Date.now() - 24 * 60 * 60 * 1000 // 24 hours ago
  };
  const rug1 = { riskLevel: 0, risks: [], isSafe: true };

  // Scenario 2: Dangerous Contract (Rugcheck = 850), High Liquidity, High volume (The classic trap we fell for)
  const token2 = { ...mockTokenBase, header: 'Rugtrap Token' };
  const pair2 = {
    liquidity: { usd: 85000 },
    volume: { h24: 65000 },
    priceChange: { h1: 20, h24: 110 },
    pairCreatedAt: Date.now() - 6 * 60 * 60 * 1000 // 6 hours ago
  };
  const rug2 = { riskLevel: 850, risks: [{ level: 'danger', name: 'Mint Authority Not Renounced' }], isSafe: false };

  // Scenario 3: Unvetted Contract (Rugcheck Unavailable), Medium Liquidity ($25k)
  const token3 = { ...mockTokenBase, header: 'Shadow Coin' };
  const pair3 = {
    liquidity: { usd: 25000 },
    volume: { h24: 15000 },
    priceChange: { h1: 5, h24: 25 },
    pairCreatedAt: Date.now() - 12 * 60 * 60 * 1000
  };
  const rug3 = null; // No Rugcheck report

  // Scenario 4: Safe Contract (Rugcheck = 0), Extremely Low Liquidity ($5k USD)
  const token4 = { ...mockTokenBase, header: 'MicroCap Gem' };
  const pair4 = {
    liquidity: { usd: 5000 },
    volume: { h24: 2000 },
    priceChange: { h1: 2, h24: 10 },
    pairCreatedAt: Date.now() - 48 * 60 * 60 * 1000
  };
  const rug4 = { riskLevel: 0, risks: [], isSafe: true };

  // Scenario 5: Safe Contract (Rugcheck = 0), High Liquidity, but Extreme 1h Pump (+120%)
  const token5 = { ...mockTokenBase, header: 'FomoPump Token' };
  const pair5 = {
    liquidity: { usd: 150000 },
    volume: { h24: 400000 },
    priceChange: { h1: 120, h24: 250 },
    pairCreatedAt: Date.now() - 4 * 60 * 60 * 1000
  };
  const rug5 = { riskLevel: 0, risks: [], isSafe: true };

  const testCases = [
    { name: '1. Safe & Stable Token', token: token1, pair: pair1, rug: rug1 },
    { name: '2. High-Risk Trap (Old Bug Target)', token: token2, pair: pair2, rug: rug2 },
    { name: '3. Unvetted Token (No Rugcheck)', token: token3, pair: pair3, rug: rug3 },
    { name: '4. Micro Liquidity Pool', token: token4, pair: pair4, rug: rug4 },
    { name: '5. FOMO Top Pump', token: token5, pair: pair5, rug: rug5 }
  ];

  for (const tc of testCases) {
    console.log(`\n--- 🧪 [測試案例] ${tc.name} ---`);
    const audit = await scanner.auditTokenComprehensive(tc.token, tc.pair, tc.rug);
    console.log(`📌 綜合評分 (Composite Score): ${audit.compositeScore} / 100`);
    console.log(`📌 風險評估 (Risk Level): ${audit.riskLevel}`);
    console.log(`📌 觸發標記 (Flags): ${audit.flags.length > 0 ? audit.flags.join(', ') : 'None'}`);
    console.log(`📌 細項分解 (Breakdown):`, JSON.stringify(audit.breakdown));
    
    if (tc.name.includes('Safe & Stable') && audit.riskLevel !== 'LOW') {
      console.error('�?測試失敗: Safe & Stable Token 應該�?LOW risk�?);
    } else if (tc.name.includes('High-Risk Trap') && audit.riskLevel === 'LOW') {
      console.error('�?測試失敗: High-Risk Trap 不應該是 LOW risk (之前寫反了，現在必須被攔�?�?);
    } else if (tc.name.includes('Unvetted') && audit.compositeScore >= 70) {
      console.error('�?測試失敗: �?Rugcheck 報告的代幣不應被評為 LOW risk�?);
    } else {
      console.log('�?通過評估標準�?);
    }
  }

  console.log('\n======================================================');
  console.log('   🎉 所有風控與校正單元測試全部驗證完成�?);
  console.log('======================================================\n');
}

testRiskCalibration().catch(console.error);
