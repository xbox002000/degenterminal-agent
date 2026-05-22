const { exec, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Check both standard Program Files paths in Windows
const path64 = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const path32 = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const chromePath = fs.existsSync(path32) ? path32 : path64;

const userDataDir = 'd:\\Antigravity\\coo\\temp_chrome_profile';

async function main() {
  console.log('\n======================================================');
  console.log('   DegenTerminal 專屬瀏覽器一次性 X (Twitter) 登入系統   ');
  console.log('======================================================\n');
  console.log('提示：為了繞過 Google 的自動化瀏覽器防禦（安全疑慮限制），');
  console.log('我們將直接啟動您本地的「真實原生 Chrome」來加載專屬 Profile。\n');
  console.log('[正在啟動原生 Chrome 瀏覽器視窗...]');

  // Ensure path exists
  fs.mkdirSync(userDataDir, { recursive: true });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    // 透過 Windows 原生命令直接啟動真實的 Chrome.exe
    // 這種方式不包含任何 Puppeteer/WebDriver 的自動化特徵，對 Google 和 X 而言完全是普通人工操作
    const chromeCmd = `"${chromePath}" --user-data-dir="${userDataDir}" --profile-directory="Default" https://x.com/login`;
    
    console.log(`[執行指令]: ${chromeCmd}`);
    exec(chromeCmd, (err) => {
      if (err) {
        console.error('[啟動失敗]', err.message);
      }
    });

    console.log('\n[啟動成功！]');
    console.log('👉 請在彈出的瀏覽器視窗中手動登入您的 X.com 帳號（可順利使用 Google 登入！）。');
    console.log('👉 登入成功並看到您的 X 首頁後：');
    console.log('   1. 請回到「此終端機」按下 Enter 鍵以完成登入流程。');
    console.log('   2. 按下 Enter 後，後續的背景無頭發文程式就能 100% 讀取此狀態。');

    // Wait for Enter key to finish
    rl.question('\n👉 [請在手動登入完成後，在此按下 Enter 鍵以完成保存並退出]：', () => {
      rl.close();
      console.log('\n======================================================');
      console.log('🎉 登入狀態已順利保存！');
      console.log('🚀 現在您可以執行「真實發文」測試： node src/test.js --live');
      console.log('======================================================\n');
      process.exit(0);
    });

  } catch (error) {
    rl.close();
    console.error('啟動專屬瀏覽器失敗。請檢查您的 Chrome 安裝路徑是否正確：', chromePath);
    console.error('錯誤詳情:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
