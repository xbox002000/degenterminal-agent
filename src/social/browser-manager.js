const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const config = require('../config');

const chromePath = (() => {
  const p64 = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const p32 = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
  return fs.existsSync(p32) ? p32 : p64;
})();

const userDataDir = path.resolve(config.CHROME_USER_DATA_DIR || './temp_chrome_profile');
const fallbackDir = userDataDir + '_standalone';

let browser = null;
let healthCheckTimer = null;
let initInProgress = null;

function checkConnected(b) {
  if (!b) return false;
  if (typeof b.isConnected === 'function') return b.isConnected();
  if (typeof b.connected === 'boolean') return b.connected;
  return !!b.process();
}

// Simple semaphore for MAX_CONCURRENT_OPERATIONS
const maxConcurrent = config.MAX_CONCURRENT_OPERATIONS || 1;
let activeCount = 0;
const pendingQueue = [];

function acquireLock() {
  if (activeCount < maxConcurrent) {
    activeCount++;
    return Promise.resolve();
  }
  return new Promise(resolve => pendingQueue.push(resolve));
}

function releaseLock() {
  if (pendingQueue.length > 0) {
    const next = pendingQueue.shift();
    // next() is called asynchronously so the caller's code can await
    setImmediate(next);
  } else {
    activeCount--;
  }
}

async function startBrowser() {
  fs.mkdirSync(userDataDir, { recursive: true });
  try { fs.unlinkSync(path.join(userDataDir, 'SingletonLock')); } catch (_) {}
  try { fs.unlinkSync(path.join(userDataDir, 'SingletonCookie')); } catch (_) {}

  const b = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    defaultViewport: null,
    args: [
      `--user-data-dir=${userDataDir}`,
      `--remote-debugging-port=${config.CHROME_DEBUG_PORT || 9222}`,
      '--profile-directory=Default',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--excludeSwitches=enable-automation'
    ],
    timeout: config.BROWSER_LAUNCH_TIMEOUT || 45000
  });
  console.log(`[BrowserManager] Shared Chrome launched (pid: ${b.process().pid}, debug: ${config.CHROME_DEBUG_PORT || 9222})`);
  return b;
}

async function init() {
  if (browser && checkConnected(browser)) return browser;
  if (initInProgress) return initInProgress;

  initInProgress = (async () => {
    try {
      browser = await startBrowser();
      startHealthCheck();
      return browser;
    } catch (err) {
      console.warn(`[BrowserManager] Launch failed: ${err.message}`);
      browser = null;
      throw err;
    } finally {
      initInProgress = null;
    }
  })();

  return initInProgress;
}

function startHealthCheck() {
  if (healthCheckTimer) clearInterval(healthCheckTimer);
  healthCheckTimer = setInterval(async () => {
    try {
      if (!browser || !checkConnected(browser)) throw new Error('disconnected');
      await browser.pages();
    } catch (err) {
      console.warn(`[BrowserManager] Health check (${err.message}), restarting...`);
      await restart();
    }
  }, 30000);
}

async function restart() {
  try { if (browser) await browser.close(); } catch (_) {}
  browser = null;
  try { await init(); } catch (err) {
    console.error('[BrowserManager] Restart failed:', err.message);
  }
}

async function execute(fn) {
  await acquireLock();
  let page = null;
  
  const setupStealth = async (p) => {
    // Override navigator.webdriver
    await p.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en', 'ja'] });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    });
    // Add custom helper for natural scrolling
    p.simulateHumanScroll = async function() {
      try {
        await p.evaluate(async () => {
          const distance = 100 + Math.random() * 150;
          window.scrollBy(0, distance);
          await new Promise(r => setTimeout(r, 400 + Math.random() * 500));
          window.scrollBy(0, -distance / 3);
          await new Promise(r => setTimeout(r, 300 + Math.random() * 300));
        });
      } catch (_) {}
    };
  };

  try {
    const b = await init();
    page = await b.newPage();
    await setupStealth(page);
    return await fn(page);
  } catch (err) {
    // Fallback: standalone launch with separate profile
    console.warn(`[BrowserManager] Shared browser error (${err.message}), fallback to standalone`);
    const fbDir = fallbackDir;
    fs.mkdirSync(fbDir, { recursive: true });
    try { fs.unlinkSync(path.join(fbDir, 'SingletonLock')); } catch (_) {}
    const fbBrowser = await puppeteer.launch({
      executablePath: chromePath,
      headless: 'new',
      defaultViewport: null,
      args: [
        `--user-data-dir=${fbDir}`, 
        '--profile-directory=Default', 
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
        '--excludeSwitches=enable-automation'
      ],
      timeout: 30000
    });
    try {
      const fbPage = await fbBrowser.newPage();
      await setupStealth(fbPage);
      return await fn(fbPage);
    } finally {
      await fbBrowser.close();
    }
  } finally {
    if (page && !page.isClosed()) await page.close();
    releaseLock();
  }
}

async function shutdown() {
  if (healthCheckTimer) { clearInterval(healthCheckTimer); healthCheckTimer = null; }
  if (browser) {
    try { await browser.close(); } catch (_) {}
    browser = null;
  }
  console.log('[BrowserManager] Shared browser closed.');
}

module.exports = { init, execute, shutdown, restart };
