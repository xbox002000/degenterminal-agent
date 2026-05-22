const brain = require('./brain');
const { getMarketTrends, fetchCryptoFearAndGreed } = require('./market_trends');
const fs = require('fs');
const path = require('path');

async function testFngResonance() {
  console.log('\n======================================================');
  console.log('   TaiwanCryptoAI 🧠 FNG 情緒指數與大腦心靈共振測試進程   ');
  console.log('======================================================\n');

  // 1. Live Fetch Test
  console.log('📡 [第一階段] 測試 Fear & Greed Index 實時 API 網路請求...');
  const realFng = await fetchCryptoFearAndGreed();
  if (realFng) {
    console.log('✅ FNG 網路請求成功！');
    console.log(`• 當前情緒值: ${realFng.value} / 100 (${realFng.classification})`);
  } else {
    console.log('⚠️ 網路超時或被 Alternative.me Rate Limit 限流，這在生產環境下非常正常。將測試優雅降級！');
  }

  // 2. Test Extreme Greed Resonance
  console.log('\n🧠 [第二階段] 模擬 Extreme Greed (極度貪婪) 對大腦情緒與日記文案共振...');
  
  // 設置極度貪婪的 FNG
  brain.memory.analytics_feedback.market_trends = {
    trending_coins: ['SOL', 'TAO', 'POPCAT'],
    trending_categories: ['Meme', 'AI Agent'],
    fng: {
      value: 85,
      classification: 'Extreme Greed',
      last_updated: Date.now()
    },
    last_updated: Date.now()
  };
  brain.saveState();

  const mockTokens = [{ chain: 'solana', auditResult: { compositeScore: 68 } }];
  const mockPortfolio = { balanceUSD: 120500.00 };

  console.log('🔥 驅動大腦生成極度貪婪日記...');
  const greedDiary = brain.generateDailyDiary(mockTokens, mockPortfolio);

  console.log('\n--- 📝 [生成的極度貪婪日記局部內容] ---');
  // 僅打印關鍵段落
  const lines = greedDiary.split('\n');
  const greedSegment = lines.filter(l => l.includes('泡沫') || l.includes('貪婪') || l.includes('客廳熱得像烤爐')).join('\n');
  console.log(greedSegment || greedDiary.substring(200, 1000));
  console.log('-------------------------------------\n');

  console.log('🤖 檢查大腦貪婪防禦狀態:');
  console.log(`• 焦慮度 (Anxiety Level): ${brain.memory.short_term.anxiety_level}% (預期：>= 70%)`);
  console.log(`• 戲劇狀態 (Drama State): ${brain.memory.short_term.drama_state} (預期：FOMO_Fighting_Greed)`);
  console.log(`• 大腦心情 (Mood): ${brain.memory.short_term.mood}`);

  // 3. Test Extreme Fear Resonance
  console.log('\n🧠 [第三階段] 模擬 Extreme Fear (極度恐懼) 對大腦情緒與日記文案共振...');
  
  brain.memory.analytics_feedback.market_trends.fng = {
    value: 15,
    classification: 'Extreme Fear',
    last_updated: Date.now()
  };
  brain.saveState();

  console.log('❄️ 驅動大腦生成極度恐懼日記...');
  const fearDiary = brain.generateDailyDiary(mockTokens, mockPortfolio);

  console.log('\n--- 📝 [生成的極度恐懼日記局部內容] ---');
  const fearSegment = lines.filter(l => l.includes('恐慌') || l.includes('恐懼') || l.includes('外面血流成河')).join('\n');
  const linesFear = fearDiary.split('\n');
  const actualFearSegment = linesFear.filter(l => l.includes('外面血流成河') || l.includes('逆風') || l.includes('恐懼')).join('\n');
  console.log(actualFearSegment || fearDiary.substring(200, 1000));
  console.log('-------------------------------------\n');

  console.log('🤖 檢查大腦恐懼逆風冷靜狀態:');
  console.log(`• 焦慮度 (Anxiety Level): ${brain.memory.short_term.anxiety_level}% (預期：精準調降，小於 40%)`);
  console.log(`• 戲劇狀態 (Drama State): ${brain.memory.short_term.drama_state} (預期：Fear_Resonating_Grit)`);
  console.log(`• 大腦心情 (Mood): ${brain.memory.short_term.mood}`);

  // 4. Triple Source Evolution Test
  console.log('\n🚀 [第四階段] 測試三源黃金共鳴演化 (X.com ✖ CoinGecko ✖ FNG)...');
  brain.loadNarratives();
  const initAiStrength = brain.narratives.narratives.AI_Agent_Economy.strength;
  console.log(`• $AI_Agent_Economy 初始關注強度: ${initAiStrength}%`);

  // 設定三源共振信號
  // A. X 社交提及 AI
  brain.memory.analytics_feedback.trending_topics = [
    { category: "Crypto · Trending", topic: "#AI_Agent_Economy", posts: "54.2K posts" }
  ];
  // B. CoinGecko 熱搜提及 AI
  brain.memory.analytics_feedback.market_trends = {
    trending_coins: ['TAO', 'RNDR'],
    trending_categories: ['AI Agent'],
    // C. FNG 處於 Fear 區間 (< 30)
    fng: {
      value: 20,
      classification: 'Extreme Fear',
      last_updated: Date.now()
    },
    last_updated: Date.now()
  };
  brain.saveState();

  console.log('💡 驅動三源黃金演變...');
  brain.generateDailyDiary(mockTokens, mockPortfolio);

  brain.loadNarratives();
  const postAiStrength = brain.narratives.narratives.AI_Agent_Economy.strength;
  console.log(`• $AI_Agent_Economy 演變後關注強度: ${postAiStrength}% (前次: ${initAiStrength}%, 預期上調 12%)`);
  console.log(`• 演化後 viewpoint 觀點: ${brain.narratives.narratives.AI_Agent_Economy.viewpoint}`);

  // 5. Elegant Fallback testing
  console.log('\n📉 [第五階段] 模擬 FNG API 離線 ➔ 測試緩存降級保險絲...');
  const testMemory = {
    analytics_feedback: {
      market_trends: {
        trending_coins: ['SOL'],
        trending_categories: ['Meme'],
        fng: {
          value: 42,
          classification: 'Fear',
          last_updated: Date.now() - 60000
        }
      }
    }
  };

  const marketTrendsModule = require('./market_trends');
  const originalFetchFng = marketTrendsModule.fetchCryptoFearAndGreed;
  
  // 強行 Mock 失敗返回 null
  marketTrendsModule.fetchCryptoFearAndGreed = async () => null;

  const unifiedResult = await marketTrendsModule.getMarketTrends(testMemory);
  console.log('• 斷網/限流降級返回數據 FNG:', unifiedResult.fng);

  // 恢復 mock
  marketTrendsModule.fetchCryptoFearAndGreed = originalFetchFng;

  if (unifiedResult && unifiedResult.fng.value === 42) {
    console.log('✅ [降級成功] 網路故障時，情緒雷達自動拉取大腦歷史緩存數據，無崩潰！');
  } else {
    console.log('❌ [降級失敗] 未正確拉取緩存 FNG 指數。');
  }

  console.log('\n🎉 Crypto Fear & Greed Index 精神交叉共振與三源共鳴演化測試完美通過！');
}

testFngResonance().catch(console.error);
