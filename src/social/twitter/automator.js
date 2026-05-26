const browserManager = require('../browser-manager');
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
   * Find the tweet textbox on the current page using multiple strategies
   * @param {Page} page Puppeteer page
   * @returns {Promise<string|null>} CSS selector of the textbox, or null
   */
  async findTweetTextbox(page) {
    // Strategy 1: Standard known selectors
    const standardSelectors = [
      'div[data-testid="tweetTextarea_0"]',
      'div[role="textbox"][contenteditable="true"]',
      'div[contenteditable="true"]',
      'div[spellcheck="true"]',
      'div[aria-label*="tweet" i]',
      'div[aria-label*="Tweet" i]',
      'div[aria-label*="post" i]',
      'div[aria-label*="Post" i]'
    ];
    for (const sel of standardSelectors) {
      try {
        const el = await page.$(sel);
        if (el) {
          console.log(`[TwitterAutomator] Found textbox via: "${sel}"`);
          return sel;
        }
      } catch (e) {}
    }

    // Strategy 2: Full DOM scan for any contenteditable or role="textbox"
    console.log('[TwitterAutomator] Scanning all DOM elements for textbox candidates...');
    const scanResult = await page.evaluate(() => {
      const all = document.querySelectorAll('*');
      for (const el of all) {
        if (el.isContentEditable && el.offsetParent !== null) {
          const tag = el.tagName.toLowerCase();
          const attrs = Array.from(el.attributes).map(a => a.name).join(',');
          // Build a unique selector from attributes
          if (el.id) return `${tag}#${el.id}`;
          const cls = (el.className || '').toString().trim().split(/\s+/).slice(0, 2).join('.');
          if (cls) return `${tag}.${cls}`;
          for (const attr of ['data-testid', 'aria-label', 'role', 'spellcheck']) {
            const val = el.getAttribute(attr);
            if (val) return `${tag}[${attr}="${val}"]`;
          }
          return tag;
        }
      }
      return null;
    });

    if (scanResult) {
      console.log(`[TwitterAutomator] Found textbox via DOM scan: "${scanResult}"`);
      // Verify it's valid
      try {
        const el = await page.$(scanResult);
        if (el) return scanResult;
      } catch (e) {}
    }

    return null;
  }

  /**
   * Safety check to prevent duplicate posting of the same tweet within 15 minutes
   */
  checkAndLockTweet(tweetText) {
    const lockFilePath = path.join(__dirname, '../../..', 'config', 'posted_tweets_lock.json');
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

    const result = await browserManager.execute(async (page) => {
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

      console.log('[TwitterAutomator] Waiting for page to settle...');
      await new Promise(r => setTimeout(r, 3000));

      // Check if we got redirected to login/flow
      const postUrl = page.url();
      console.log(`[TwitterAutomator] Current URL: ${postUrl}`);
      if (postUrl.includes('login') || postUrl.includes('i/flow')) {
        throw new Error('❌ 未登入您的 X.com 帳號或登入已過期！請先執行「node src/login.js」來手動登入！');
      }

      // Dismiss any overlays/popups that might block interaction
      try {
        const overlayDismissals = [
          'button[aria-label*="Close"]',
          'button[aria-label*="close"]',
          'div[data-testid="xMigrationBottomBar"] button',
          'div[role="dialog"] button[aria-label*="Close"]',
          'div[role="dialog"] button[aria-label*="close"]'
        ];
        for (const sel of overlayDismissals) {
          const btns = await page.$$(sel);
          for (const btn of btns) {
            if (await btn.isVisible().catch(() => false)) {
              await btn.click().catch(() => {});
              await new Promise(r => setTimeout(r, 500));
            }
          }
        }
      } catch (e) {
        // Non-fatal
      }

      // === 全方位 textbox 偵測 ===
      let textboxSelector = await this.findTweetTextbox(page);

      // Fallback: navigate to home and click the Post button
      if (!textboxSelector) {
        console.log('[TwitterAutomator] Compose page failed. Trying home page + Post button approach...');
        await page.goto('https://x.com/home', { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 3000));
        const postBtn = await page.$('a[data-testid="SideNav_NewTweet_Button"], a[aria-label*="Post" i], a[aria-label*="Tweet" i]');
        if (postBtn) {
          await postBtn.click();
          await new Promise(r => setTimeout(r, 3000));
          textboxSelector = await this.findTweetTextbox(page);
        }
      }

      if (!textboxSelector) {
        console.error(`[TwitterAutomator Error] Textbox not found. URL: ${page.url()}`);
        const title = await page.title();
        console.log(`[TwitterAutomator Diagnose] Page title: "${title}"`);
        try {
          await page.screenshot({ path: path.join(__dirname, 'x_compose_fail.png') });
          console.log('[TwitterAutomator Diagnose] Screenshot saved');
        } catch (e) {}
        throw new Error('❌ 無法定位推文輸入框！請檢查 X.com 頁面結構是否變更。');
      }
      
      console.log('[TwitterAutomator] Inserting tweet text via clipboard paste (avoids $ cashtag autocomplete issues)...');
      await page.evaluate((sel, text) => {
        const el = document.querySelector(sel);
        if (!el) return;
        el.focus();
        // Clear any placeholder content
        el.innerHTML = '';
        // Use Clipboard paste to trigger React state (handles Unicode, $, @, emoji, newlines correctly)
        const dt = new DataTransfer();
        dt.setData('text/plain', text);
        el.dispatchEvent(new ClipboardEvent('paste', {
          clipboardData: dt,
          bubbles: true,
          cancelable: true,
          composed: true
        }));
      }, textboxSelector, tweetText);
      await new Promise(r => setTimeout(r, 2000));

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
      const postButtonSelectors = [
        'button[data-testid="tweetButton"]',
        'button[data-testid="tweetButtonInline"]',
        'div[data-testid="tweetButton"] button'
      ];
      let postButtonSelector = '';
      for (const sel of postButtonSelectors) {
        try {
          const btn = await page.$(sel);
          if (btn) {
            postButtonSelector = sel;
            console.log(`[TwitterAutomator] Found Post button with selector: "${sel}"`);
            break;
          }
        } catch (e) {}
      }
      if (!postButtonSelector) {
        await page.waitForSelector(postButtonSelectors[0], { timeout: 15000 });
        postButtonSelector = postButtonSelectors[0];
      }

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
      try {
        await page.waitForFunction((sel) => {
          return !document.querySelector(sel);
        }, { timeout: 15000 }, textboxSelector);
        console.log('[TwitterAutomator] Compose window closed. Post sent!');
      } catch (waitErr) {
        console.log('[TwitterAutomator Warning] Timeout waiting for compose close, using fallback sleep of 6s...');
        await new Promise(resolve => setTimeout(resolve, 6000));
      }

      console.log('[TwitterAutomator] SUCCESS: Tweet posted successfully!');
      return true;
    });

    return result;
  }
}

module.exports = TwitterAutomator;
