const puppeteer = require('puppeteer-core');
const path = require('path');

const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = 'C:\\Users\\xbox0\\AppData\\Local\\Google\\Chrome\\User Data';

async function testPipe() {
  console.log('Launching Chrome directly using puppeteer.launch with PIPE and native profile...');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: 'new', // Using headless to run silently, or false for headed
      pipe: true,      // CRITICAL: Use pipe communication instead of TCP port!
      defaultViewport: null,
      args: [
        `--user-data-dir=${userDataDir}`,
        '--profile-directory=Default',
        '--disable-gpu',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
    
    console.log('Chrome launched successfully via PIPE! Creating page...');
    const page = await browser.newPage();
    
    // Mask webdriver
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    console.log('Navigating to x.com compose page...');
    await page.goto('https://x.com/compose/post', { waitUntil: 'networkidle2', timeout: 60000 });
    
    console.log('Checking for textbox...');
    const textboxSelector = 'div[role="textbox"][contenteditable="true"]';
    
    try {
      await page.waitForSelector(textboxSelector, { timeout: 20000 });
      console.log('SUCCESS: Logged in X via PIPE! Compose textbox found!');
      
      const successPath = path.join(__dirname, 'x_pipe_success.png');
      await page.screenshot({ path: successPath });
      console.log(`Success screenshot saved to: ${successPath}`);
    } catch (err) {
      console.error('FAILURE: Textbox not found. URL:', page.url());
      const failPath = path.join(__dirname, 'x_pipe_fail.png');
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

testPipe().catch(console.error);
