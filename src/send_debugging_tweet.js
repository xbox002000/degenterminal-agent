const TwitterAutomator = require('./twitter');
const path = require('path');

async function sendDebuggingTweet() {
  const automator = new TwitterAutomator();
  
  const tweetText = `⚔️【矽基雙雄平行量化擂台 — 大腦除蟲特攻＆實時戰況！】⚔️\n\n` +
    `老鐵們反映，昨天的開戰宣傳貼文在 X 上「影分身」發了多次？🤔 ` +
    `難道是 ZMAC 和 Green 這兩個傢伙背著我偷渡了程式碼來搶流量？\n\n` +
    `奶爸我今晚一查，原來是後台殘留了舊紀元的「孤兒進程」，加上 Puppeteer 發文盲等 10 秒太佛系，遇到推特卡頓就重試，直接搞出重複排隊的發文慘案！🤦‍♂️\n\n` +
    `為了捍衛啟賦奶粉錢與炎夏冷氣電費防線，奶爸我花了 10 分鐘，給雙大腦強行加裝了【模糊去重安全鎖 🔒】與【動態 DOM 彈窗消失偵測機制 🎯】：\n\n` +
    `1️⃣ 🔒【模糊去重鎖 (Fuzzy Similarity Lock)】\n` +
    `大腦自動剔除推文中的空白、數字、Emoji 與標點符號，只比對純中英文字元相似度！只要 15 分鐘內有高度相似的推文，底層直接攔截，絕不重發！\n\n` +
    `2️⃣ 🎯【DOM 彈窗銷毀確認】\n` +
    `點擊 "Post" 後，大腦會死盯著 Compose 編輯框，確認它從 HTML 樹上彻底消失才算發推成功，拒絕盲等與無腦重試！\n\n` +
    `📈【擂台實時最新戰報】\n` +
    `當前大盤 FNG 依舊在 28 (Fear) 震盪：\n` +
    `🟢【風格狙擊手 Green】🦞 (奶粉防線)：本週維持 0 虧損，空倉極致防禦！「寧可錯過，絕不買錯。」\n` +
    `🟣【高頻勝率工廠 ZMAC】⚡ (電費防護)：恐懼熔斷持續生效 (止盈降至 12%)，蓄勢 Scalping 中！\n\n` +
    `🛠️ 環境已全面清理乾淨 (Orphaned process cleaned)！\n` +
    `👇 雙雄實時 PK 戰報、淨值對決 24/7 看板：\n` +
    `🔗 http://localhost:3000 (左右雙欄對稱 PK 擂台)\n\n` +
    `AI generated. Not financial advice. Survive First. 🛡️\n` +
    `#AIAgent #量化交易 #Solana #MemeCoins #Web3 #帶娃奶爸 #通縮螺旋 #除蟲大師`;

  const imagePath = "C:\\Users\\xbox0\\.gemini\\antigravity\\brain\\07d77161-ed46-469f-9e72-379d745f6967\\quant_dad_debugging_1779463733986.png";
  
  console.log('🚀 開始將「大腦除蟲大作戰與實時戰況」貼文與精美圖案發送至 X.com...');
  const success = await automator.postTweet(tweetText, imagePath);
  
  if (success) {
    console.log('🎉 貼文已成功發布到 X.com！');
  } else {
    console.error('❌ 貼文發布失敗！');
  }
}

sendDebuggingTweet().catch((err) => {
  console.error('\n❌ 發推執行時發生致命錯誤：', err.message);
});
