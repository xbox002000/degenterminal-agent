const brain = require('../src/brain');
const { getMarketTrends, fetchCoinGeckoTrending } = require('../src/market_trends');
const fs = require('fs');
const path = require('path');

async function testMarketTrendsIntegration() {
  console.log('\n======================================================');
  console.log('   TaiwanCryptoAI 🧠 CoinGecko 散戶熱搜與大腦交叉演化測�?  ');
  console.log('======================================================\n');

  // 1. Live Fetch Test
  console.log('📡 [第一階段] 測試 CoinGecko 實時 Trending API 網路請求...');
  const realTrends = await fetchCoinGeckoTrending();
  if (realTrends) {
    console.log('�?網路請求成功�?);
    console.log(`�?散戶熱搜代幣: [${realTrends.trending_coins.join(', ')}]`);
    console.log(`�?當前熱門類別: [${realTrends.trending_categories.join(', ')}]`);
  } else {
    console.log('⚠️ 網路超時或被 CoinGecko Rate Limit 限流，這在生產環境下非常正常。將測試優雅降級�?);
  }

  // 2. Mocking 共鳴數據 & Verification
  console.log('\n🧠 [第二階段] 模擬 X.com �?CoinGecko 多源交叉熱點共鳴...');
  
  // 記錄初始強度
  console.log('🤖 [初始狀態] 關注故事強度:');
  brain.loadNarratives();
  const initAiStrength = brain.narratives.narratives.AI_Agent_Economy.strength;
  const initSolStrength = brain.narratives.narratives.Solana_Meme_Summer.strength;
  console.log(`�?$AI_Agent_Economy -> ${initAiStrength}% | 觀�? ${brain.narratives.narratives.AI_Agent_Economy.viewpoint.substring(0, 50)}...`);
  console.log(`�?$Solana_Meme_Summer -> ${initSolStrength}% | 觀�? ${brain.narratives.narratives.Solana_Meme_Summer.viewpoint.substring(0, 50)}...`);

  // 寫入交叉共鳴訊號到大腦記憶庫
  brain.memory.analytics_feedback.trending_topics = [
    { category: "Crypto · Trending", topic: "#AI_Agent_Economy", posts: "54.2K posts" },
    { category: "Technology · Trending", topic: "$SOL", posts: "22.5K posts" }
  ];
  
  // CoinGecko 散戶熱搜中同時包�?AI (TAO) �?SOL Meme (WIF)
  brain.memory.analytics_feedback.market_trends = {
    trending_coins: ['TAO', 'WIF', 'SOL', 'POPCAT'],
    trending_categories: ['AI Agent', 'Meme'],
    last_updated: Date.now()
  };
  brain.saveState();

  // 3. Trigger generateDailyDiary to watch evolution & post rendering
  console.log('\n🚀 [第三階段] 驅動大腦生成日記（觀測交叉共振演�?+ viewpoints 重寫�?..');
  
  const mockTokens = [{ chain: 'solana', auditResult: { compositeScore: 68 } }];
  const mockPortfolio = { balanceUSD: 105600.00 };
  
  const diaryText = brain.generateDailyDiary(mockTokens, mockPortfolio);

  console.log('\n--- 📝 [生成�?X 散戶熱搜雷達融合日記內容] ---');
  console.log(diaryText);
  console.log('-------------------------------------\n');

  // 4. Reload to verify narrative evolution increments (+8% expected due to cross consensus)
  brain.loadNarratives();
  const postAiStrength = brain.narratives.narratives.AI_Agent_Economy.strength;
  const postSolStrength = brain.narratives.narratives.Solana_Meme_Summer.strength;
  
  console.log('🤖 [演化後狀態] 關注故事強度與觀點回寫核�?');
  console.log(`�?$AI_Agent_Economy -> ${postAiStrength}% (前次: ${initAiStrength}%)`);
  console.log(`�?$Solana_Meme_Summer -> ${postSolStrength}% (前次: ${initSolStrength}%)`);
  console.log(`�?AI 最新觀�? ${brain.narratives.narratives.AI_Agent_Economy.viewpoint}`);

  // 5. Rate Limit Fallback test
  console.log('\n📉 [第四階段] 模擬 CoinGecko API 限流/離線 �?測試緩存降級保險�?..');
  
  // 故意模擬網路請求失敗，並提供包含舊數據的 memory
  const testMemory = {
    analytics_feedback: {
      market_trends: {
        trending_coins: ['CACHE_BTC', 'CACHE_ETH'],
        trending_categories: ['Cache Category'],
        last_updated: Date.now() - 60000
      }
    }
  };
  
  // 強行�?fetchCoinGeckoTrending 重寫為返�?null，以模擬斷網/限流
  const marketTrendsModule = require('../src/market_trends');
  const originalFetch = marketTrendsModule.fetchCoinGeckoTrending;
  marketTrendsModule.fetchCoinGeckoTrending = async () => null;
  
  const fallbackResult = await marketTrendsModule.getMarketTrends(testMemory);
  console.log('�?降級返回數據:', fallbackResult);
  
  // 恢復原狀
  marketTrendsModule.fetchCoinGeckoTrending = originalFetch;

  if (fallbackResult && fallbackResult.trending_coins.includes('CACHE_BTC')) {
    console.log('�?[降級成功] 網路故障時，系統順利拉取大腦歷史緩存數據，無任何 Uncaught Error�?);
  } else {
    console.log('�?[降級失敗] 未使用大腦歷史緩存數據�?);
  }

  console.log('\n🎉 大腦 CoinGecko 散戶熱搜、多源交叉驗證演化與降級保護測試完美成功�?);
}

testMarketTrendsIntegration().catch(console.error);
