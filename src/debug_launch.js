const puppeteer = require('puppeteer-core');
const path = require('path');

const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = 'C:\\Users\\xbox0\\AppData\\Local\\Google\\Chrome\\User Data';

async function testLaunch() {
  console.log('Launching Chrome directly using puppeteer.launch with native profile...');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: 'new',
      defaultViewport: null,
      args: [
        `--user-data-dir=${userDataDir}`,
        '--profile-directory=Default',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
    
    console.log('Chrome launched successfully! Creating page...');
    const page = await browser.newPage();
    
    // Mask webdriver
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    console.log('Navigating to x.com compose page...');
    await page.goto('https://x.com/compose/post', { waitUntil: 'networkidle2', timeout: 60000 });
    
    console.log('Page loaded. Checking for textbox...');
    const textboxSelector = 'div[role="textbox"][contenteditable="true"]';
    
    try {
      await page.waitForSelector(textboxSelector, { timeout: 15000 });
      console.log('SUCCESS: Logged in! Compose textbox found!');
      
      // Take success screenshot
      const successPath = path.join(__dirname, 'x_launch_success.png');
      await page.screenshot({ path: successPath });
      console.log(`Success screenshot saved to: ${successPath}`);
    } catch (err) {
      console.error('FAILURE: Textbox not found. URL:', page.url());
      const failPath = path.join(__dirname, 'x_launch_fail.png');
      await page.screenshot({ path: failPath });
      console.log(`Fail screenshot saved to: ${failPath}`);
    }
    
  } catch (error) {
    console.error('Launch failed with critical error:', error);
  } finally {
    if (browser) {
      console.log('Closing browser...');
      await browser.close();
    }
  }
}

testLaunch().catch(console.error);
