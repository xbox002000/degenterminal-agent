const puppeteer = require('puppeteer-core');
const axios = require('axios');

async function main() {
  console.log('Connecting to browser remote debugging...');
  try {
    const versionResponse = await axios.get('http://127.0.0.1:9222/json/version');
    const { webSocketDebuggerUrl } = versionResponse.data;
    
    const browser = await puppeteer.connect({
      browserWSEndpoint: webSocketDebuggerUrl,
      defaultViewport: { width: 1920, height: 2000 }
    });
    
    const pages = await browser.pages();
    const page = pages.find(p => p.url().includes('virtuals.io')) || pages[0];
    console.log('Current URL in browser:', page.url());
    
    // Take a screenshot
    const screenshotPath = 'C:\\Users\\xbox0\\.gemini\\antigravity\\brain\\0aa0d0f7-3fbe-43e3-8140-bd18f0916344\\current_state_inspect.png';
    await page.screenshot({ path: screenshotPath });
    console.log('Screenshot saved to:', screenshotPath);
    
    await browser.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
