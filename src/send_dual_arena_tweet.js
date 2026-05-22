const TwitterAutomator = require('./twitter');
const path = require('path');

async function sendDuelTweet() {
  const automator = new TwitterAutomator();
  
  const tweetText = `⚔️【矽基雙雄平行量化擂台，正式開戰！】⚔️\n\n` +
    `為了兒女的啟賦奶粉錢與炎夏冷氣電費防線，奶爸我今天把大腦劈成兩半，正式部署「Antigravity 2.0 雙雄平行對決系統」！\n\n` +
    `🟢【風格狙擊手 Green】🦞 (奶粉錢防禦力：99%)\n` +
    `門檻 85+ ｜ 止盈 +20% ｜ 止損 -3% ｜ 超時 45m\n` +
    `「最好的交易就是不交易！寧可空倉，絕不亂賠。」\n\n` +
    `🟣【高頻勝率工廠 ZMAC】⚡ (冷氣電費防護盾：Active)\n` +
    `門檻 55+ ｜ 止盈 +6% ｜ 止損 -2% ｜ 超時 12m\n` +
    `「別跟我談信仰，我只管極速 Scalping，積沙成塔！」\n\n` +
    `🔥【史詩級大腦重構更新日誌】\n\n` +
    `1️⃣ ❄️【雪花 ID 時間解碼避雷針】\n` +
    `為了不被 KOL 當作無腦 Bot，回覆模組引入 BigInt 位移技術，直接解碼 Twitter Snowflake ID！小於 48 小時的鮮活推文我們才互動。老鐵們，這叫優雅搶鏡！\n\n` +
    `2️⃣ 🚨【持倉超時紅色警示呼吸燈】\n` +
    `賽博朋克雙欄擂台正式上線！持倉時間流逝超過 80% 時，前端會自動觸發「紅色呼吸燈警報」，心跳感與對抗張力爆表！\n\n` +
    `3️⃣ 🛡️【猴市自適應止盈熔斷】\n` +
    `感應到大盤處於 Fear 恐懼狀態 (當前 FNG: 28 Fear)，大腦自動將預設止盈調降至務實的 12% 快速落袋，保證在震盪下行市中瘋狂套利！\n\n` +
    `4️⃣ 📝【大腦檢討書 Symbol 智能分流】\n` +
    `誰買錯、誰追高 FOMO，大腦檢討書會依據 Symbol 智能分流到主人的 Reflections 欄位，大師操作檢討一清二楚！\n\n` +
    `📈 100% 真實模擬、數據隔離、公開透明，在去中心化世界以紀律見證成敗！雙大腦第一輪掃描已展開，Green 已成功拍飛 3 個 Rugcheck 危險土狗！\n\n` +
    `👇 雙雄實時 PK 戰報、淨值對決、實時日誌 24/7 看板：\n` +
    `🔗 http://localhost:3000 (或 live 看板頁面)\n\n` +
    `AI generated. Not financial advice. Survive First. 🛡️\n` +
    `#AIAgent #Solana #MemeCoins #Web3 #量化交易 #帶娃奶爸 #通縮螺旋 #AIKOL`;

  const imagePath = "C:\\Users\\xbox0\\.gemini\\antigravity\\brain\\07d77161-ed46-469f-9e72-379d745f6967\\cyber_dual_arena_pk_1779463298059.png";
  
  console.log('🚀 開始將「雙雄平行量化對決擂台開戰」貼文與對決配圖發送至 X.com...');
  const success = await automator.postTweet(tweetText, imagePath);
  
  if (success) {
    console.log('🎉 貼文已成功發布到 X.com！');
  } else {
    console.error('❌ 貼文發布失敗！');
  }
}

sendDuelTweet().catch((err) => {
  console.error('\n❌ 發推執行時發生致命錯誤：', err.message);
});
