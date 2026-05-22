const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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
   * Safety check to prevent duplicate posting of the same tweet within 15 minutes
   */
  checkAndLockTweet(tweetText) {
    const lockFilePath = path.join(__dirname, '..', 'config', 'posted_tweets_lock.json');
    let lockData = { lastTweets: [] };
    
    // Ensure config directory exists
    const configDir = path.dirname(lockFilePath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    if (fs.existsSync(lockFilePath)) {
      try {
        lockData = JSON.parse(fs.readFileSync(lockFilePath, 'utf8'));
      } catch (e) {
        // Ignore parse error and reset
      }
    }
    
    const now = Date.now();
    
    // Clean up entries older than 30 minutes
    lockData.lastTweets = (lockData.lastTweets || []).filter(item => now - item.timestamp < 30 * 60 * 1000);
    
    // Fuzzy text normalization: Remove all spaces, emojis, numbers, and common punctuation
    const normalize = (text) => {
      if (!text) return '';
      return text
        .toLowerCase()
        .replace(/[\s\r\n\t]/g, '') // remove whitespace
        .replace(/[0-9]/g, '')      // remove numbers
        .replace(/[^\w\u4e00-\u9fa5]/g, ''); // keep only words and Chinese characters
    };
    
    const normalizedNew = normalize(tweetText).slice(0, 80); // Compare first 80 simplified characters
    
    // Check for fuzzy duplicates in the last 15 minutes
    const duplicate = lockData.lastTweets.find(item => {
      if (now - item.timestamp >= 15 * 60 * 1000) return false;
      const normalizedOld = normalize(item.originalText).slice(0, 80);
      return normalizedOld === normalizedNew;
    });
    
    if (duplicate) {
      console.warn(`\n⚠️ [TwitterAutomator Safety Lock] 偵測到高度相似的推文！該推文在 ${new Date(duplicate.timestamp).toLocaleTimeString()} 已經成功發送過相似版本，本次發送已被模糊去重鎖安全攔截，防範重複發布。`);
      return true; // Return true to indicate it is already handled/posted to prevent crashing caller
    }
    
    // Add new entry with full text for subsequent fuzzy comparison
    lockData.lastTweets.push({
      timestamp: now,
      originalText: tweetText
    });
    
    // Write back
    fs.writeFileSync(lockFilePath, JSON.stringify(lockData, null, 2), 'utf8');
    return false;
  }

  /**
   * Post a tweet using the logged-in Chrome profile
   * @param {string} tweetText - The text content of the tweet
   */
  async postTweet(tweetText, imagePath = null) {
    // Safety check for duplicate posts (within 15 minutes)
    try {
      const isDuplicate = this.checkAndLockTweet(tweetText);
      if (isDuplicate) {
        return true; // Already posted, skip gracefully
      }
    } catch (lockErr) {
      console.error('[TwitterAutomator Lock Error] Failed to process safety lock:', lockErr.message);
    }

    console.log(`[TwitterAutomator] Preparing to post tweet: "${tweetText.slice(0, 50)}..."`);
    
    let browser;
    try {
      const maxRetries = 5;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Ensure path exists
          fs.mkdirSync(this.userDataDir, { recursive: true });

          // Try defensive unlock of SingletonLock
          try {
            const lockFile = path.join(this.userDataDir, 'SingletonLock');
            if (fs.existsSync(lockFile)) {
              fs.unlinkSync(lockFile);
            }
          } catch (lockErr) {
            // Ignore if file is genuinely locked
          }

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
          break; // Launch success!
        } catch (launchErr) {
          const isLocked = launchErr.message.includes('already running') || launchErr.message.includes('SingletonLock');
          if (isLocked && attempt < maxRetries) {
            console.log(`⚠️ [TwitterAutomator Lock] Chrome Profile 正在被其他任務佔用，啟動防防衝突排隊排程...（嘗試 ${attempt}/${maxRetries}，等待 8 秒後重試）`);
            await new Promise(r => setTimeout(r, 8000));
          } else {
            throw launchErr;
          }
        }
      }

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

      // Handle optional image attachment upload
      if (imagePath && fs.existsSync(imagePath)) {
        console.log(`[TwitterAutomator] Uploading image chart: ${imagePath}`);
        const fileInputSelector = 'input[data-testid="fileInput"][type="file"]';
        try {
          await page.waitForSelector(fileInputSelector, { timeout: 15000 });
          const fileInput = await page.$(fileInputSelector);
          if (fileInput) {
            await fileInput.uploadFile(imagePath);
            console.log('[TwitterAutomator] Image uploaded. Waiting 4 seconds for preview rendering...');
            await new Promise(resolve => setTimeout(resolve, 4000));
          } else {
            console.warn('[TwitterAutomator Warning] fileInput element not found on page.');
          }
        } catch (imgErr) {
          console.error('[TwitterAutomator Error] Failed to upload image:', imgErr.message);
        }
      }

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

      // Wait for post completion (wait for dialog to close or compose area to disappear, fallback to sleep)
      console.log('[TwitterAutomator] Waiting for post transaction to complete (composing editor to close)...');
      try {
        await page.waitForFunction((selector) => {
          return !document.querySelector(selector);
        }, { timeout: 15000 }, textboxSelector);
        console.log('[TwitterAutomator] Compose window closed successfully. Post sent!');
      } catch (waitErr) {
        console.log('[TwitterAutomator Warning] Timeout waiting for compose window to close, using fallback sleep of 6 seconds...');
        await new Promise(resolve => setTimeout(resolve, 6000));
      }

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
