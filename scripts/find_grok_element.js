const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function findGrokElement() {
  const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
  const userDataDir = 'd:\\Antigravity\\coo\\temp_chrome_profile';
  const screenshotDir = 'd:\\Antigravity\\coo\\public';

  console.log('🔍 --- 啟動 Grok 圖像元素全向探測�?(DOM + Regex 深度掃描) ---');

  try {
    const lockFile = path.join(userDataDir, 'SingletonLock');
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
    }
  } catch (e) {}

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: 'new',
      defaultViewport: { width: 1280, height: 800 },
      args: [
        `--user-data-dir=${userDataDir}`,
        '--profile-directory=Default',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    const pages = await browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();

    // Navigate and submit a quick test prompt to generate a new image
    console.log('[Scanner] 正在打開 Grok...');
    await page.goto('https://x.com/i/grok', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(r => setTimeout(r, 6000));

    // Submit a short draw prompt
    const prompt = "draw a simple neon blue cyber-globe";
    console.log(`[Scanner] 送出快速生圖指�? "${prompt}"...`);
    
    // Type and press Enter
    await page.keyboard.press('Tab');
    await new Promise(r => setTimeout(r, 200));
    await page.keyboard.type(prompt, { delay: 30 });
    await new Promise(r => setTimeout(r, 500));
    await page.keyboard.press('Enter');

    console.log('[Scanner] 等待 35 秒讓生圖程序結束並完全渲�?..');
    await new Promise(r => setTimeout(r, 35000));

    // Take screenshot for visual validation
    const inspectSnapPath = path.join(screenshotDir, 'grok_inspect_view.png');
    await page.screenshot({ path: inspectSnapPath });
    console.log(`📸 已儲存當前渲染截�? ${inspectSnapPath}`);

    // --- SCAN METHOD 1: Regex scan of raw outerHTML ---
    console.log('\n🔍 [掃描方法 1] 全域 HTML 原始�?Regex 正則匹配 (篩選 twimg.com/media �?blob)...');
    const htmlSource = await page.content();
    
    // Search for media URLs
    const mediaRegex = /https:\/\/pbs\.twimg\.com\/media\/[a-zA-Z0-9?=_&%-]+/gi;
    const blobRegex = /blob:https:\/\/x\.com\/[a-zA-Z0-9-]+/gi;
    
    const mediaMatches = htmlSource.match(mediaRegex) || [];
    const blobMatches = htmlSource.match(blobRegex) || [];
    
    const uniqueMedia = [...new Set(mediaMatches)];
    const uniqueBlob = [...new Set(blobMatches)];

    console.log(`�?找到 ${uniqueMedia.length} 個獨立的 pbs.twimg.com/media 網址:`);
    uniqueMedia.forEach((url, i) => console.log(`  [Media #${i+1}] ${url}`));
    
    console.log(`�?找到 ${uniqueBlob.length} 個獨立的 blob: 網址:`);
    uniqueBlob.forEach((url, i) => console.log(`  [Blob #${i+1}] ${url}`));

    // --- SCAN METHOD 2: Div background-image scan ---
    console.log('\n🔍 [掃描方法 2] 掃描所有具�?background-image 屬性的 Div 元素...');
    const bgDivs = await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div'));
      return divs
        .map(div => {
          const style = window.getComputedStyle(div);
          return {
            bg: style.backgroundImage,
            className: div.className,
            outerHTML: div.outerHTML.substring(0, 150)
          };
        })
        .filter(item => item.bg && item.bg !== 'none' && (item.bg.includes('pbs.twimg.com') || item.bg.includes('blob:')));
    });

    console.log(`�?找到 ${bgDivs.length} 個帶有目標背景圖�?Div:`);
    bgDivs.forEach((div, i) => {
      console.log(`  [BgDiv #${i+1}] background-image: ${div.bg} | class: "${div.className}"`);
    });

    // --- SCAN METHOD 3: Canvas / Shadow DOM / Iframe scan ---
    console.log('\n🔍 [掃描方法 3] 掃描特殊標籤 (Canvas, Iframe)...');
    const specialTags = await page.evaluate(() => {
      return {
        canvases: document.querySelectorAll('canvas').length,
        iframes: document.querySelectorAll('iframe').length,
        svgs: document.querySelectorAll('svg').length
      };
    });
    console.log(`�?頁面特殊標籤數量: Canvases = ${specialTags.canvases} | Iframes = ${specialTags.iframes} | SVGs = ${specialTags.svgs}`);

  } catch (err) {
    console.error('�?[Scanner Error]', err.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log('[Scanner] 瀏覽器關閉�?);
    }
  }
}

findGrokElement();
