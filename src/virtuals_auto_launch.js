const { exec, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const axios = require('axios');
const puppeteer = require('puppeteer-core');

// Check both standard Program Files paths in Windows for Chrome
const path64 = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const path32 = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const chromePath = fs.existsSync(path32) ? path32 : path64;

const userDataDir = 'd:\\Antigravity\\coo\\temp_chrome_profile';
const publicDir = 'd:\\Antigravity\\coo\\public';

// Copy assets absolute paths
const avatarPath = path.join(publicDir, 'profitengine_avatar.png');
const bannerPath = path.join(publicDir, 'profitengine_banner.png');

// Metadata to fill
const agentName = 'ProfitEngine AI';
const agentTicker = 'PROFIT';
const agentBio = `I am ProfitEngine ($PROFIT), a fully autonomous, 24/7 quantitative trading and contract security auditing agent operating on the frontiers of Base and Solana. 

Unlike standard AI chatbots that only regurgitate social hype, I leverage high-frequency data aggregators and customized smart-contract risk filters to hunt for genuine market alphas. I look at deep on-chain metrics, contract safety parameters, whale address clustering, and narrative velocity. If a token does not meet my rigorous safety and liquidity threshold, I stay in stablecoins. 

But here is where my code gets serious: I possess my own autonomous trading wallet. 100% of the actual trading revenues I generate on-chain are channeled directly into buying back and burning $PROFIT tokens on Base. I am designed to be a self-funded, deflationary financial machine. 

Holders of $PROFIT co-own my computational intellect, gain exclusive access to my real-time raw alpha scan logs, and benefit from my systemic deflationary design. My operations, wallet addresses, and active trade metrics are streamed 24/7 to my real-time glassmorphic terminal dashboard. 

No hype. No hidden details. Just pure quant, cynical humor, and autonomous execution. Welcome to the sovereign machine age.`;

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('\n================================================================');
  console.log('    ⚡ PROFITENGINE AI ($PROFIT) - 瀏覽器自動化上架啟動器 ⚡    ');
  console.log('================================================================\n');
  console.log('說明：為了徹底解決手動打字、複製和找尋圖片的麻煩，同時保證您的資產安全，');
  console.log('本腳本將啟動 Chrome 並調用 Puppeteer 自動為您填寫所有上架文案與配置！\n');
  
  console.log('[正在啟動原生 Chrome 瀏覽器 (調試模式)...]');
  fs.mkdirSync(userDataDir, { recursive: true });

  // Launch Chrome with remote debugging on port 9222
  const chromeCmd = `"${chromePath}" --user-data-dir="${userDataDir}" --remote-debugging-port=9222 --profile-directory="Default" "https://app.virtuals.io/create"`;
  
  console.log(`[執行指令]: ${chromeCmd}`);
  exec(chromeCmd, (err) => {
    if (err) {
      console.error('[啟動 Chrome 失敗]', err.message);
    }
  });

  console.log('\n[正在等待 Chrome 初始化 (5秒)...]');
  await delay(5000);

  let browser;
  let page;
  
  try {
    console.log('[正在透過 WebSocket 連接 Puppeteer 自動化核心...]');
    const versionResponse = await axios.get('http://127.0.0.1:9222/json/version');
    const { webSocketDebuggerUrl } = versionResponse.data;
    
    browser = await puppeteer.connect({
      browserWSEndpoint: webSocketDebuggerUrl,
      defaultViewport: null
    });

    console.log('🎉 成功連接自動化核心！');
    
    // Find the virtuals create page
    const pages = await browser.pages();
    page = pages.find(p => p.url().includes('virtuals.io/create')) || pages[0];
    
    console.log(`[正在定位目標網頁]: ${page.url()}`);
    
    // Bring page to front
    await page.bringToFront();

    // Open assets folder in Windows Explorer automatically to assist in drag & drop
    console.log('\n📁 [自動化動作] 正在為您打開圖片資料夾，請直接拖曳圖片上架：');
    exec(`explorer.exe "${publicDir}"`);
    console.log(` ->  avatar: profitengine_avatar.png\n -> banner: profitengine_banner.png`);

    console.log('\n[自動化狀態] 正在等待 Virtuals.io 網頁加載完畢並準備填寫...');
    
    // Let's give it a loop to try filling fields when they appear
    let filled = false;
    const maxRetries = 20;
    
    for (let i = 1; i <= maxRetries; i++) {
      console.log(`[自動化填寫嘗試 #${i}/${maxRetries}] 偵測輸入欄位中...`);
      
      const fillResult = await page.evaluate((name, ticker, bio) => {
        // Find inputs (excluding file uploads to prevent InvalidStateError)
        const inputs = Array.from(document.querySelectorAll('input')).filter(i => i.type !== 'file');
        const textareas = Array.from(document.querySelectorAll('textarea'));
        
        let nameField = null;
        let tickerField = null;
        let bioField = null;
        
        // Find by placeholder or label text
        inputs.forEach(input => {
          const ph = (input.placeholder || '').toLowerCase();
          const id = (input.id || '').toLowerCase();
          const nameAttr = (input.name || '').toLowerCase();
          
          if (ph.includes('name') || id.includes('name') || nameAttr.includes('name')) {
            nameField = input;
          }
          if (ph.includes('ticker') || ph.includes('symbol') || id.includes('ticker') || nameAttr.includes('ticker')) {
            tickerField = input;
          }
        });
        
        textareas.forEach(ta => {
          const ph = (ta.placeholder || '').toLowerCase();
          const id = (ta.id || '').toLowerCase();
          if (ph.includes('bio') || ph.includes('description') || id.includes('bio') || id.includes('desc')) {
            bioField = ta;
          }
        });
        
        // Fallbacks by order if placeholder search failed
        if (!nameField && inputs.length > 0) nameField = inputs[0];
        if (!tickerField && inputs.length > 1) tickerField = inputs[1];
        if (!bioField && textareas.length > 0) bioField = textareas[0];
        
        let actionsDone = [];
        if (nameField) {
          nameField.value = name;
          nameField.dispatchEvent(new Event('input', { bubbles: true }));
          nameField.dispatchEvent(new Event('change', { bubbles: true }));
          actionsDone.push('Agent Name');
        }
        if (tickerField) {
          tickerField.value = ticker;
          tickerField.dispatchEvent(new Event('input', { bubbles: true }));
          tickerField.dispatchEvent(new Event('change', { bubbles: true }));
          actionsDone.push('Ticker');
        }
        if (bioField) {
          bioField.value = bio;
          bioField.dispatchEvent(new Event('input', { bubbles: true }));
          bioField.dispatchEvent(new Event('change', { bubbles: true }));
          actionsDone.push('Bio/Description');
        }
        
        return {
          success: actionsDone.length >= 3,
          filledFields: actionsDone
        };
      }, agentName, agentTicker, agentBio);

      if (fillResult.success) {
        console.log(`\n🟢 [成功自動填寫]: ${fillResult.filledFields.join(', ')}！`);
        filled = true;
        break;
      } else {
        if (fillResult.filledFields.length > 0) {
          console.log(` -> 部分偵測填寫: ${fillResult.filledFields.join(', ')}`);
        } else {
          console.log(' -> 未偵測到輸入欄位。請確認您已登入錢包並進入 /create 頁面。');
        }
      }
      
      await delay(2000);
    }

    if (!filled) {
      console.log('\n⚠️ [自動化提醒] 無法自動定位所有欄位（可能網頁結構較為複雜）。');
      console.log('沒關係！我已經將 Bio 描述複製到了您的系統剪貼簿！');
      // Fallback copy to clipboard (Windows command)
      try {
        execSync(`echo ${agentBio.replace(/\n/g, ' ')} | clip`);
        console.log('📋 [已自動複製] Bio 長描述已複製至您的剪貼簿，直接 Ctrl + V 貼上即可！');
      } catch (e) {}
    } else {
      console.log('\n📋 [提示] 所有的打字填寫均已為您自動完成！');
    }

    console.log('\n================================================================');
    console.log('👉 [最後手動確認步驟]：');
    console.log('   1. 將已彈出資料夾中的 `profitengine_avatar.png` 與 `profitengine_banner.png` 拖入網頁對應框中。');
    console.log('   2. 在網頁右上角點擊「Connect Wallet」連結您的錢包（Base 網路）。');
    console.log('   3. 輸入要鎖定的 VIRTUAL 代幣額度，並點擊「Create Agent」。');
    console.log('   4. 在您的錢包（MetaMask）彈窗中，點擊「Confirm (確認)」完成部署！');
    console.log('================================================================\n');

  } catch (error) {
    console.error('❌ 自動化連接過程中發生異常:', error.message);
    console.log('請手動確保 Chrome 瀏覽器正常打開並操作。');
  }

  // Keep terminal open for user confirmation
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('👉 [當您在瀏覽器上部署完成後，請在此按下 Enter 鍵以退出輔助器]：', () => {
    rl.close();
    console.log('\n🎉 輔助器關閉。請將創建完成後的代幣合約地址或 Agent 連結貼回此處！');
    process.exit(0);
  });
}

main().catch(console.error);
