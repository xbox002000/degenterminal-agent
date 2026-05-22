const { scrapeLatestStats } = require('./twitter_analytics');
const fs = require('fs');
const path = require('path');

console.log('======================================================');
console.log('   TaiwanCryptoAI 🧠 X.com 流量數據與留言回饋 Scraper 測試   ');
console.log('======================================================\n');

console.log('🚀 [測試開始] 啟動 X.com Analytics 抓取任務...');
scrapeLatestStats().then(() => {
  console.log('\n✅ [測試完畢] Scraper 執行完畢！');
  
  // Load memory.json to verify the results
  const memoryPath = path.join(__dirname, '../config/memory.json');
  if (fs.existsSync(memoryPath)) {
    const memory = JSON.parse(fs.readFileSync(memoryPath, 'utf8'));
    console.log('\n📊 [寫入大腦的流量數據結果核對]');
    console.log('------------------------------------------------');
    console.log(`上期推文 Views：${memory.analytics_feedback.last_tweet_views} 次`);
    console.log(`上期推文 Likes：${memory.analytics_feedback.last_tweet_likes} 個`);
    console.log(`上期推文 Replies：${memory.analytics_feedback.last_tweet_replies} 個`);
    console.log('\n💬 [前 3 條抓取到的熱門留言]');
    memory.analytics_feedback.scraped_comments.forEach((c, idx) => {
      console.log(`  [${idx + 1}] @${c.author}: "${c.text}"`);
    });
    console.log('------------------------------------------------');
    console.log('\n🎉 大腦數據反饋與 Puppeteer Scraper 模組測試圓滿成功！');
  } else {
    console.error('❌ 錯誤: 找不到 memory.json，數據未能成功寫入！');
  }
}).catch((err) => {
  console.error('❌ 測試發生異常中斷:', err);
});
