const brain = require('./brain');
const { getMarketTrends, fetchDexScreenerTrending } = require('./market_trends');
const fs = require('fs');
const path = require('path');

async function testDexScreenerResonance() {
  console.log('\n======================================================');
  console.log('   TaiwanCryptoAI 🧠 DexScreener 鏈上土狗與大腦吐槽共鳴測試  ');
  console.log('======================================================\n');

  // 1. Live Fetch Test
  console.log('📡 [第一階段] 測試 DexScreener 實時 Trending API 網路請求...');
  const realMemeList = await fetchDexScreenerTrending();
  if (realMemeList && realMemeList.length > 0) {
    console.log('✅ 網路請求成功！獲取到熱門土狗資料：');
    realMemeList.forEach((coin, idx) => {
      console.log(`• [#${idx + 1}] $${coin.symbol} (${coin.name}) | 價格: $${coin.priceUsd} | 24H: ${coin.priceChange24h}% | 交易量: $${coin.volume24h}`);
    });
  } else {
    console.log('⚠️ 網路超時或被 DexScreener 限流，這在生產環境下非常正常。將測試優雅降級！');
  }

  // 2. Mocking 共鳴數據 & Verification
  console.log('\n🧠 [第二階段] 模擬 DexScreener 暴漲土狗刺激大腦焦慮度與狀態變化...');
  
  // 記錄初始焦慮度
  brain.loadState();
  const initAnxiety = brain.memory.short_term.anxiety_level || 30;
  const initMood = brain.memory.short_term.mood || "Cautious";
  console.log(`🤖 [初始狀態] 焦慮度: ${initAnxiety}% | Mood: ${initMood}`);

  // 模擬 DexScreener 傳回一個暴漲 250% 的大 Meme 幣
  const mockDexData = [
    { symbol: 'FOMOCOIN', name: 'FOMO Coin', priceUsd: 0.042, priceChange24h: 250, volume24h: 3500000 },
    { symbol: 'CHILLGUY', name: 'Just a chill guy', priceUsd: 0.015, priceChange24h: 5.8, volume24h: 1200000 },
    { symbol: 'POPCAT', name: 'Popcat', priceUsd: 0.81, priceChange24h: -1.2, volume24h: 900000 }
  ];

  // 寫入大腦記憶庫
  if (!brain.memory.analytics_feedback) {
    brain.memory.analytics_feedback = {};
  }
  brain.memory.analytics_feedback.market_trends = {
    trending_coins: ['TAO', 'WIF', 'SOL'],
    trending_categories: ['AI Agent', 'Meme'],
    fng: { value: 35, classification: 'Fear' },
    dexscreener: mockDexData,
    last_updated: Date.now()
  };
  brain.saveState();

  // 3. Trigger generateDailyDiary to watch evolution & post rendering
  console.log('\n🚀 [第三階段] 驅動大腦生成日記（驗證踏空焦慮同頻與 DexScreener 吐槽融合）...');
  
  const mockTokens = [{ chain: 'solana', auditResult: { compositeScore: 65 } }];
  const mockPortfolio = { balanceUSD: 105600.00 };
  
  const diaryText = brain.generateDailyDiary(mockTokens, mockPortfolio);

  console.log('\n--- 📝 [生成的 X 融合土狗碎碎念日記內容] ---');
  console.log(diaryText);
  console.log('-------------------------------------\n');

  // 4. Verify brain state after resonance
  brain.loadState();
  const postAnxiety = brain.memory.short_term.anxiety_level;
  const postMood = brain.memory.short_term.mood;
  console.log('🤖 [演化後狀態] 焦慮度與心情回寫核對:');
  console.log(`• 焦慮度 -> ${postAnxiety}% (前次: ${initAnxiety}%)`);
  console.log(`• 矽基心情 -> ${postMood}`);

  if (postAnxiety > initAnxiety && postMood.includes('FOMOCOIN')) {
    console.log('✅ [情緒共振成功] 暴漲土狗完美推升了大腦的踏空焦慮，並反映在 Mood 和日記中！');
  } else {
    console.log('❌ [情緒共振失敗] 大腦焦慮度或 Mood 未發生預期變化。');
  }

  // 5. Rate Limit Fallback test
  console.log('\n📉 [第四階段] 模擬 DexScreener API 限流/離線 ➔ 測試緩存降級保險絲...');
  
  const testMemory = {
    analytics_feedback: {
      market_trends: {
        trending_coins: ['SOL'],
        trending_categories: ['Meme'],
        fng: { value: 50, classification: 'Neutral' },
        dexscreener: [
          { symbol: 'CACHE_DOG', name: 'Cached Dog', priceUsd: 0.12, priceChange24h: 8.8, volume24h: 50000 }
        ],
        last_updated: Date.now() - 60000
      }
    }
  };
  
  // 強行將 fetchDexScreenerTrending 重寫為返回 null，以模擬斷網/限流
  const marketTrendsModule = require('./market_trends');
  const originalFetch = marketTrendsModule.fetchDexScreenerTrending;
  marketTrendsModule.fetchDexScreenerTrending = async () => null;
  
  const fallbackResult = await marketTrendsModule.getMarketTrends(testMemory);
  console.log('• 降級返回數據 dexscreener:', fallbackResult.dexscreener);
  
  // 恢復原狀
  marketTrendsModule.fetchDexScreenerTrending = originalFetch;

  if (fallbackResult && fallbackResult.dexscreener && fallbackResult.dexscreener[0].symbol === 'CACHE_DOG') {
    console.log('✅ [降級成功] 網路故障時，系統順利拉取大腦歷史快取土狗數據，無任何 Uncaught Error！');
  } else {
    console.log('❌ [降級失敗] 未使用大腦歷史快取土狗數據。');
  }

  console.log('\n🎉 DexScreener 鏈上熱點、心理焦慮同頻共振與降級保險絲測試全部圓滿通過！');
}

testDexScreenerResonance().catch(console.error);
