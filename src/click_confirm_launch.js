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
    const page = pages.find(p => p.url().includes('virtuals.io/create')) || pages[0];
    await page.bringToFront();
    
    console.log('Clicking the "Confirm Launch" button to trigger wallet popups...');
    const clickResult = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const confirmBtn = buttons.find(b => b.textContent.trim() === 'Confirm Launch');
      if (confirmBtn) {
        if (confirmBtn.disabled) {
          return '❌ Button is found but disabled!';
        }
        confirmBtn.click();
        return 'Confirm Launch button clicked successfully!';
      }
      return '❌ Confirm Launch button not found!';
    });
    
    console.log('Result:', clickResult);
    
    // Wait for the popup / transaction triggers
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Take a screenshot
    const screenshotPath = 'C:\\Users\\xbox0\\.gemini\\antigravity\\brain\\0aa0d0f7-3fbe-43e3-8140-bd18f0916344\\confirm_launch_clicked.png';
    await page.screenshot({ path: screenshotPath });
    console.log('Screenshot saved to:', screenshotPath);
    
    await browser.disconnect();
  } catch (error) {
    console.error('Error during confirm launch click:', error.message);
  }
}

main();
