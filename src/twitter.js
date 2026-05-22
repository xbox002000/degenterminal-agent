const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

/**
 * ProfitEngine Twitter/X Automation Plugin
 * Uses a dedicated Google Chrome Profile (temp_chrome_profile) to post tweets autonomously.
 * Bypasses Chrome App-Bound Encryption and Port lockouts by utilizing a dedicated user-data directory.
 */
class TwitterAutomator {
  constructor() {
    // Check both standard Program Files paths in Windows
    const path64 = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const path32 = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
    
    this.chromePath = fs.existsSync(path32) ? path32 : path64;
    this.userDataDir = 'd:\\Antigravity\\coo\\temp_chrome_profile';
    console.log(`[TwitterAutomator] Chrome Path: ${this.chromePath}`);
    console.log(`[TwitterAutomator] User Data Directory: ${this.userDataDir}`);
  }

  /**
   * Post a tweet using the logged-in Chrome profile
   * @param {string} tweetText - The text content of the tweet
   */
  async postTweet(tweetText) {
    console.log(`[TwitterAutomator] Preparing to post tweet: "${tweetText.slice(0, 50)}..."`);
    
    let browser;
    try {
      // Ensure path exists
      fs.mkdirSync(this.userDataDir, { recursive: true });

      console.log('[TwitterAutomator] Launching Chrome in Headless mode with dedicated profile...');
      browser = await puppeteer.launch({
        executablePath: this.chromePath,
        headless: 'new', // Background mode
        defaultViewport: null,
        args: [
          `--user-data-dir=${this.userDataDir}`,
          '--profile-directory=Default',
          '--disable-gpu',
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ]
      });

      console.log('[TwitterAutomator] Browser launched successfully. Creating new page...');
      const pages = await browser.pages();
      const page = pages.length > 0 ? pages[0] : await browser.newPage();
      
      // Prevent navigator.webdriver detection
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });
      });

      console.log('[TwitterAutomator] Navigating to X/Twitter compose page...');
      await page.goto('https://x.com/compose/post', {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      console.log('[TwitterAutomator] Waiting for page elements to load...');
      const textboxSelector = 'div[role="textbox"][contenteditable="true"]';
      
      try {
        await page.waitForSelector(textboxSelector, { timeout: 25000 });
      } catch (err) {
        console.error(`[TwitterAutomator Error] Textbox not found. Current URL is: ${page.url()}`);
        const title = await page.title();
        console.log(`[TwitterAutomator Diagnose] Page title: "${title}"`);
        
        // Take a screenshot for diagnosing login failure
        try {
          const screenshotPath = path.join(__dirname, 'x_compose_fail.png');
          await page.screenshot({ path: screenshotPath });
          console.log(`[TwitterAutomator Diagnose] Screenshot saved to: ${screenshotPath}`);
        } catch (e) {
          console.error('[TwitterAutomator Diagnose] Failed to save screenshot:', e.message);
        }

        throw new Error('❌ 未登入您的 X.com 帳號或登入已過期！請先執行「node src/login.js」來手動登入！');
      }
      
      console.log('[TwitterAutomator] Typing tweet text...');
      await page.focus(textboxSelector);
      await page.type(textboxSelector, tweetText, { delay: 50 }); // Realistic typing delay

      console.log('[TwitterAutomator] Waiting for the Post button...');
      const postButtonSelector = 'button[data-testid="tweetButton"]';
      await page.waitForSelector(postButtonSelector, { timeout: 15000 });

      // Check if button is enabled
      const isEnabled = await page.evaluate((selector) => {
        const btn = document.querySelector(selector);
        return btn && !btn.disabled;
      }, postButtonSelector);

      if (!isEnabled) {
        throw new Error('Post button is disabled or not found');
      }

      console.log('[TwitterAutomator] Clicking the Post button...');
      await page.click(postButtonSelector);

      // Wait for post completion
      console.log('[TwitterAutomator] Waiting for post transaction to complete...');
      await new Promise(resolve => setTimeout(resolve, 8000)); // Sleep 8 seconds to ensure upload is complete

      console.log('[TwitterAutomator] SUCCESS: Tweet posted successfully via dedicated Headless Chrome session!');
      return true;
    } catch (error) {
      console.error('[TwitterAutomator Error] Failed to post tweet:', error.message);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
        console.log('[TwitterAutomator] Browser closed.');
      }
    }
  }
}

module.exports = TwitterAutomator;
