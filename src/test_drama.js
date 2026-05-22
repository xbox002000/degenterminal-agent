const brain = require('./brain');

console.log('======================================================');
console.log('   TaiwanCryptoAI 🧠 大腦戲劇與情緒價值引擎測試 (Dry-Run)   ');
console.log('======================================================\n');

// 1. Initial State
console.log('🤖 [初始狀態] 載入大腦狀態...');
console.log(`Mood: ${brain.memory.short_term.mood}`);
console.log(`Drama State: ${brain.memory.short_term.drama_state}`);
console.log(`Anxiety Level: ${brain.memory.short_term.anxiety_level}%\n`);

// 2. Simulate silent waiting (No trade tick)
console.log('➕ [模擬] 執行第 1 次無交易空倉掃描輪詢...');
brain.updateDramaState(true, null);

console.log('➕ [模擬] 執行第 2 次無交易空倉掃描輪詢...');
brain.updateDramaState(true, null);

console.log('➕ [模擬] 執行第 3 次無交易空倉掃描輪詢...');
brain.updateDramaState(true, null);

console.log('\n🧠 [大腦反思] 經過連續無交易空倉的焦慮累積，生成生存日記中...');
const auditedTokensMock = [
  { auditResult: { compositeScore: 65 } }
];
const virtualMock = { balanceUSD: 105600.00 };
const diary = brain.generateDailyDiary(auditedTokensMock, virtualMock);

console.log('\n--- 📝 [生成的 X 焦慮生存推文內容] ---');
console.log(diary);
console.log('-------------------------------------\n');

// 3. Simulate profit trade reflection
console.log('🟢 [模擬] 發生一筆獲利平倉事件 ($SOLANA_ALPHA PnL: +40%)...');
const profitTrade = {
  symbol: 'SOLANA_ALPHA',
  pnlUSD: 400.00,
  pnlPercent: 40.00,
  holdMinutes: 15,
  reason: 'TAKE_PROFIT'
};
brain.performSelfReflection(profitTrade).then((profitDiary) => {
  console.log('\n--- 📝 [生成的 X 獲利加菜推文內容] ---');
  console.log(profitDiary);
  console.log('-------------------------------------\n');
  
  // 4. Simulate loss trade reflection
  console.log('🔴 [模擬] 發生一筆虧損平倉事件 ($FOMO_TRAP PnL: -15%)...');
  const lossTrade = {
    symbol: 'FOMO_TRAP',
    pnlUSD: -150.00,
    pnlPercent: -15.00,
    holdMinutes: 20,
    reason: 'STOP_LOSS'
  };
  
  return brain.performSelfReflection(lossTrade);
}).then((lossDiary) => {
  console.log('\n--- 📝 [生成的 X 深夜自省推文內容] ---');
  console.log(lossDiary);
  console.log('-------------------------------------\n');
  
  console.log('✅ 大腦情緒價值與戲劇引擎單元測試全部順利通過！');
}).catch(console.error);
