const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = 'd:\\Antigravity\\coo\\temp_chrome_profile';

const tweets = [
  `我今天下午做了一件事：

在完全不懂的狀態下，把一個 AI 量化交易 Agent 上架到了區塊鏈。

我踩了超多坑。我想把過程寫下來，
給跟我一樣的「完全新手」看。

🧵 Thread 開始 👇`,

  `起點很簡單：

我在研究 @virtuals_io（一個讓 AI Agent 可以發行代幣的平台），
發現上面最成功的 Agent，都有一個共同點——

不只是「會聊天的 AI」，而是能創造實際收益的 AI。

所以我想：如果有一個 AI 會自己交易、自己把賺到的錢拿去燒掉代幣，
這個敘事會不會足夠強？

答案是：夠強。所以我開始動手。`,

  `坑 #1：「到底需要什麼才能發行？」

一開始我以為要準備一大堆幣。
結果發現 @virtuals_io 上架 AI Agent 完全不收平台費 👀

真正需要的只有一樣東西：
➜ 少量的 Base ETH（大約 $5 美元的 Gas 費而已）

但問題來了——什麼是 Base？
ETH 不是 ETH 嗎？`,

  `坑 #2：ETH 在主鏈上沒辦法直接用

Virtuals Protocol 運行在 Base（以太坊的 L2）上，
而我 MetaMask 裡的 ETH 是在「以太坊主網」上。

這兩個不能直接互通。

解法：用 superbridge.app/base 橋接

流程：
1️⃣ 打開 superbridge.app/base
2️⃣ 連接 MetaMask
3️⃣ 選 Ethereum → Base
4️⃣ 轉一點 ETH 過去（我轉了約 $10）
5️⃣ 等 ~3 分鐘，Base ETH 就到帳了

這步卡了我快 30 分鐘，但搞懂之後超簡單。`,

  `坑 #3：Virtuals Protocol 的「Connect Wallet」消失了？

我進到 app.virtuals.io，找了半天找不到「連接錢包」按鈕。

後來才發現——

因為我的 MetaMask 已經自動連接了，
所以按鈕直接變成了右上角的一個頭像徽章 ✅

一直以為自己還沒連上，其實早就連上了 🙃`,

  `解決以上三個坑之後，整個上架流程其實非常流暢：

✅ 上傳頭像 + Banner 圖片
✅ 填上名稱：ProfitEngine AI、代幣：$PROFIT
✅ 貼上敘事介紹（Deflationary Flywheel）
✅ Anti-sniper 保護：60 秒（預設值直接用）
✅ Review Summary → Confirm Launch
✅ MetaMask 彈出確認 → 點擊確認
✅ 等待約 10 秒…

鏈上合約部署完成。`,

  `就這樣——

下午三點開始搞，下午五點半，
@virtuals_io 上多了一個新的 AI Agent。

🤖 ProfitEngine AI ($PROFIT)

24/7 全自主量化交易 + 智能合約審計
每一筆利潤 → 100% 自動回購 $PROFIT → 永久 Burn

越會賺錢 → 流通量越少 → 你的幣越值錢
這不是承諾，這是寫死在代碼裡的通縮飛輪。

合約 (Base)：0xf127267FA26E508Fc4137Ea5376040e4C006793b

👉 https://app.virtuals.io/virtuals/77354

#ProfitEngine #PROFIT #VirtualsProtocol #Base #AIAgent`,

  `TL;DR 給沒耐心看完的你：

🔸 新手也能在一個下午上架 AI Agent
🔸 坑1：需要 Base ETH，不是以太坊主網的 ETH
🔸 坑2：用 superbridge.app/base 橋接 ETH 到 Base
🔸 坑3：Connect Wallet 消失 = 其實已經連上了

如果你也想試，或者想了解 $PROFIT，歡迎留言或 DM。

這場旅程才剛開始。🚀`
];

// Images: tweet 0 gets launch visual, tweet 3 gets bridge tutorial
const imageMap = {
  0: 'C:\\Users\\xbox0\\.gemini\\antigravity\\brain\\0aa0d0f7-3fbe-43e3-8140-bd18f0916344\\profitengine_launch_post_1779443463442.png',
  3: 'C:\\Users\\xbox0\\.gemini\\antigravity\\brain\\0aa0d0f7-3fbe-43e3-8140-bd18f0916344\\superbridge_tutorial_1779443484092.png',
};


async function main() {
  console.log('\n======================================================');
  console.log('   🤖 ProfitEngine AI ($PROFIT) — X Thread 自動發布器   ');
  console.log('======================================================\n');
  console.log('正在啟動有頭瀏覽器，為您自動編排、撰寫並發布圖文並茂的貼文串...');

  // Verify all image files exist
  for (const [idx, imgPath] of Object.entries(imageMap)) {
    if (!fs.existsSync(imgPath)) {
      console.error(`❌ 找不到推文 #${parseInt(idx)+1} 的配圖:`, imgPath);
      process.exit(1);
    }
    console.log(`✅ 推文 #${parseInt(idx)+1} 配圖確認存在: ${imgPath.split('\\').pop()}`);
  }

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: false,
    defaultViewport: null,
    args: [
      `--user-data-dir=${userDataDir}`,
      '--profile-directory=Default',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  const pages = await browser.pages();
  const page = pages.length > 0 ? pages[0] : await browser.newPage();

  console.log('正在導航至 X 發文頁面...');
  await page.goto('https://x.com/compose/post', { waitUntil: 'networkidle2', timeout: 60000 });

  console.log('正在等待發文對話框載入...');
  try {
    // Wait for the compose area to load
    await page.waitForSelector('div[data-testid="tweetTextarea_0"]', { timeout: 20000 });
    
    // Type Tweet 1 and upload its image
    console.log('✍️ 正在輸入第 1 則推文...');
    await page.click('div[data-testid="tweetTextarea_0"]');
    await page.type('div[data-testid="tweetTextarea_0"]', tweets[0], { delay: 8 });

    if (imageMap[0]) {
      console.log('📸 正在上傳推文 #1 配圖（賽博朋克發行大圖）...');
      const fileInput0 = await page.waitForSelector('input[data-testid="fileInput"]', { timeout: 10000 });
      await fileInput0.uploadFile(imageMap[0]);
      await new Promise(r => setTimeout(r, 2000));
      console.log('✅ 推文 #1 圖片上傳成功！');
    }

    // Loop to add rest of tweets
    for (let i = 1; i < tweets.length; i++) {
      console.log(`➕ 點擊新增第 ${i + 1} 則推文按鈕...`);
      const addButton = await page.waitForSelector('button[data-testid="addButton"]', { timeout: 10000 });
      await addButton.click();
      
      const newSelector = `div[data-testid="tweetTextarea_${i}"]`;
      await page.waitForSelector(newSelector, { timeout: 10000 });
      
      console.log(`✍️ 正在輸入第 ${i + 1} 則推文...`);
      await page.click(newSelector);
      await page.type(newSelector, tweets[i], { delay: 8 });

      // Upload image if this tweet has one in imageMap
      if (imageMap[i]) {
        await new Promise(r => setTimeout(r, 500));
        console.log(`📸 正在上傳推文 #${i+1} 配圖...`);
        const fileInputs = await page.$$('input[data-testid="fileInput"]');
        const latestInput = fileInputs[fileInputs.length - 1];
        if (latestInput) {
          await latestInput.uploadFile(imageMap[i]);
          await new Promise(r => setTimeout(r, 2000));
          console.log(`✅ 推文 #${i+1} 圖片上傳成功！`);
        }
      }
    }

    console.log('\n======================================================');
    console.log('🎉 恭喜！AI 已經為您把 5 則推文編排輸入完畢，並成功上傳了圖片！');
    console.log('======================================================');
    console.log('👉 請在畫面上彈出的 Chrome 瀏覽器中核對內容。');
    console.log('👉 確認無誤後，請手動點擊右下角的「Post all (全部發布)」按鈕。');
    console.log('👉 發布完成後，請直接關閉此 Chrome 瀏覽器視窗。');
    console.log('======================================================\n');

  } catch (err) {
    console.log('⚠️ 自動輸入過程中遇到問題:', err.message);
    console.log('💡 別擔心！您可以直接在瀏覽器中手動編輯，我們為您準備好全部文案了。');
  }

  browser.on('disconnected', () => {
    console.log('👋 瀏覽器已關閉，任務結束。');
    process.exit(0);
  });
}

main().catch(console.error);
