const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function inspectGrokDOM() {
  const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
  const userDataDir = 'd:\\Antigravity\\coo\\temp_chrome_profile';

  console.log('🔍 --- 啟動 X.com Grok DOM 結構深度探測�?---');

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

    console.log('[Inspector] 正在打開 Grok 歷史會話...');
    await page.goto('https://x.com/i/grok', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await new Promise(r => setTimeout(r, 8000)); // Wait for render

    console.log('[Inspector] 正在提取所�?img 標籤屬�?..');
    const imagesData = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.map((img, index) => {
        // Get parent elements classes to identify containers
        const parentClasses = img.parentElement ? img.parentElement.className : '';
        const grandParentClasses = img.parentElement && img.parentElement.parentElement ? img.parentElement.parentElement.className : '';
        
        return {
          index: index + 1,
          src: img.src,
          alt: img.alt,
          classes: img.className,
          parentClasses,
          grandParentClasses,
          width: img.naturalWidth,
          height: img.naturalHeight,
          outerHTML: img.outerHTML.substring(0, 200) // snippet
        };
      });
    });

    console.log(`📊 [探測結果] 共找�?${imagesData.length} 張圖像標籤：`);
    imagesData.forEach(img => {
      console.log(`\n📷 【圖�?#${img.index}】`);
      console.log(`�?Src: "${img.src}"`);
      console.log(`�?Alt: "${img.alt || '�?}"`);
      console.log(`�?尺寸: ${img.width}x${img.height}`);
      console.log(`�?HTML 片段: ${img.outerHTML}`);
      console.log(`�?父級 Class: "${img.parentClasses}"`);
      console.log(`�?祖父�?Class: "${img.grandParentClasses}"`);
    });

  } catch (err) {
    console.error('�?[Inspector Error]', err.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log('[Inspector] 會話已關閉�?);
    }
  }
}

inspectGrokDOM();
