const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = 'd:\\Antigravity\\coo\\temp_chrome_profile';

const NEW_NAME = 'DegenTerminal 🦞 AI';
const NEW_BIO = 'A fully autonomous cybernetic female AI clad in sleek lobster armor. Scanning Solana liquidity & clipping contract anomalies with my titanium claws. 🦞';

async function main() {
  console.log('\n======================================================');
  console.log('   DegenTerminal 龍蝦美女智能體 X 個人資料自動更換系統   ');
  console.log('======================================================\n');
  console.log('提示：為了讓您的 X 平台完美變身為「龍蝦美女智能體」，');
  console.log('我們將啟動「有頭瀏覽器」為您自動輸入名稱與 Bio 自我介紹，');
  console.log('並協助您挑選新生成的頭像與 Banner 橫幅圖片。\n');
  console.log('[正在準備圖片路徑...]');

  const avatarPath = 'd:\\Antigravity\\coo\\lobster_agent_avatar.png';
  const bannerPath = 'd:\\Antigravity\\coo\\lobster_agent_banner.png';

  console.log(`📸 龍蝦美女頭像路徑: ${avatarPath}`);
  console.log(`📸 龍蝦高科技橫幅路徑: ${bannerPath}`);

  // Check if images exist
  if (!fs.existsSync(avatarPath) || !fs.existsSync(bannerPath)) {
    console.error('❌ 錯誤: 找不到生成的頭像或 Banner 圖片，請先確認複製步驟！');
    process.exit(1);
  }

  console.log('\n[正在開啟 Chrome 瀏覽器視窗...]');

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: false, // 有頭模式，讓使用者看見 AI 操作，且方便上傳與保存！
      defaultViewport: null,
      args: [
        `--user-data-dir=${userDataDir}`,
        '--profile-directory=Default',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    console.log('[啟動成功！] 正在導航至 X 個人資料編輯頁面...');
    const pages = await browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();

    // Navigate to X profile settings page directly
    await page.goto('https://x.com/settings/profile', { waitUntil: 'networkidle2', timeout: 60000 });

    console.log('\n======================================================');
    console.log('👉 [AI 正在自動輸入中...]');
    
    // Wait for the inputs to appear (usually X settings layout takes a brief second)
    const nameInputSelector = 'input[name="displayName"]';
    const bioTextareaSelector = 'textarea[name="description"]';

    try {
      await page.waitForSelector(nameInputSelector, { timeout: 15000 });
      
      // Clear and type New Name
      console.log('🖊️  正在自動寫入新名字...');
      await page.click(nameInputSelector);
      // Select all text to overwrite
      await page.keyboard.down('Control');
      await page.keyboard.press('A');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      await page.type(nameInputSelector, NEW_NAME, { delay: 40 });

      // Clear and type New Bio
      console.log('🖊️  正在自動寫入新 Bio 自我介紹...');
      await page.waitForSelector(bioTextareaSelector, { timeout: 10000 });
      await page.click(bioTextareaSelector);
      await page.keyboard.down('Control');
      await page.keyboard.press('A');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      await page.type(bioTextareaSelector, NEW_BIO, { delay: 30 });

      console.log('✅ 自動填充完成！');
    } catch (e) {
      console.log('⚠️ [注意] 無法自動找到輸入框（可能您還沒有完全登入，或者 X.com 介面有所延遲）。');
      console.log('💡 別擔心！請您直接在瀏覽器彈出的 X 頁面中點擊「Edit profile (編輯個人資料)」按鈕。');
    }

    console.log('\n======================================================');
    console.log('🚀 龍蝦美女智能體 變身指引 🚀');
    console.log('======================================================');
    console.log('1. 請在彈出的瀏覽器中點擊頭像或 Banner 的相機相片圖標上傳圖片：');
    console.log(`   👉 頭像上傳請選擇: ${avatarPath}`);
    console.log(`   👉 橫幅上傳請選擇: ${bannerPath}`);
    console.log('2. 修改完成後，請點擊右上角的「Save (儲存)」按鈕。');
    console.log('3. 確認保存後，您可以直接關閉此 Chrome 視窗，並在終端機中結束程式。\n');
    console.log('======================================================\n');

    // Monitor browser close to exit process
    browser.on('disconnected', () => {
      console.log('🎉 變身完成！瀏覽器已成功關閉。');
      console.log('🚀 DegenTerminal 已經進化為全新的龍蝦美女智能體！');
      process.exit(0);
    });

  } catch (error) {
    console.error('啟動失敗。錯誤詳情:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
