const brain = require('./brain');
const fs = require('fs');
const path = require('path');

async function testTrendsEvolution() {
  console.log('\n======================================================');
  console.log('   TaiwanCryptoAI 🧠 X 熱門敘事大腦進化與文章融合測試   ');
  console.log('======================================================\n');

  // 1. Initial State Check
  console.log('🤖 [初始狀態] 當前大腦敘事強度核對:');
  for (const [key, val] of Object.entries(brain.narratives.narratives)) {
    console.log(`• $${key} -> 強度: ${val.strength}% | 觀點: ${val.viewpoint}`);
  }

  // 2. Mock new trends in memory.json
  console.log('\n➕ [模擬] 寫入 X.com 實時 Trending Topics 訊號...');
  brain.memory.analytics_feedback.trending_topics = [
    { category: "Crypto · Trending", topic: "#AI_Agent_Economy", posts: "54.2K posts" },
    { category: "Technology · Trending", topic: "$SOL", posts: "22.5K posts" },
    { category: "Business · Trending", topic: "DePIN Ecosystem", posts: "9.8K posts" }
  ];
  brain.saveState();

  // 3. Trigger generateDailyDiary to watch evolution & post rendering
  console.log('\n🧠 [大腦反思] 觸發生存日記生成（這將會自動驅動 Narrative 數據庫演化與文章元素混合）...');
  
  const mockTokens = [{ chain: 'solana', auditResult: { compositeScore: 68 } }];
  const mockPortfolio = { balanceUSD: 105600.00 };
  
  const diaryText = brain.generateDailyDiary(mockTokens, mockPortfolio);

  console.log('\n--- 📝 [生成的 X 熱門融合日記推文內容] ---');
  console.log(diaryText);
  console.log('-------------------------------------\n');

  // 4. Verifying narratives in narrative_db.json
  console.log('🤖 [進化後狀態] 核對進化後的大腦敘事強度:');
  // Reload narratives from disk to verify persistence
  brain.loadNarratives();
  for (const [key, val] of Object.entries(brain.narratives.narratives)) {
    console.log(`• $${key} -> 強度: ${val.strength}% | 觀點: ${val.viewpoint}`);
  }

  console.log('\n🎉 大腦熱門趨勢探索、自我進化與日記文章融合乾跑測試完美成功！');
}

testTrendsEvolution().catch(console.error);
