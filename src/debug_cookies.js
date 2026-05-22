const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');
const axios = require('axios');

const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const srcUserDataDir = 'C:\\Users\\xbox0\\AppData\\Local\\Google\\Chrome\\User Data';
const destUserDataDir = 'd:\\Antigravity\\coo\\temp_chrome_profile';

async function testIsolatedSession() {
  console.log('--- Setting up Isolated Chrome Session ---');
  
  // Create directories
  const destDefaultNetworkDir = path.join(destUserDataDir, 'Default', 'Network');
  fs.mkdirSync(destDefaultNetworkDir, { recursive: true });
  
  // Copy Local State (crucial for decryption key)
  const srcLocalState = path.join(srcUserDataDir, 'Local State');
  const destLocalState = path.join(destUserDataDir, 'Local State');
  if (fs.existsSync(srcLocalState)) {
    console.log(`Copying Local State...`);
    fs.copyFileSync(srcLocalState, destLocalState);
  } else {
    console.log('Warning: Local State not found at source!');
  }
  
  // Copy Cookies
  const srcCookies = path.join(srcUserDataDir, 'Default', 'Network', 'Cookies');
  const destCookies = path.join(destDefaultNetworkDir, 'Cookies');
  if (fs.existsSync(srcCookies)) {
    console.log(`Copying Cookies...`);
    fs.copyFileSync(srcCookies, destCookies);
  } else {
    console.log('Warning: Cookies file not found at source!');
  }

  console.log('Spawning Chrome with isolated user data directory...');
  const args = [
    '--remote-debugging-port=9222',
    '--headless=new',
    '--disable-gpu',
    '--remote-allow-origins=*',
    `--user-data-dir=${destUserDataDir}`,
    '--profile-directory=Default'
  ];

  const chromeProcess = spawn(chromePath, args);
  
  chromeProcess.stdout.on('data', (data) => {
    console.log(`[Chrome STDOUT]: ${data}`);
  });

  chromeProcess.stderr.on('data', (data) => {
    console.log(`[Chrome STDERR]: ${data}`);
  });

  // Wait for 3 seconds to let Chrome spin up
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('Attempting to connect Puppeteer...');
  let response;
  try {
    response = await axios.get('http://127.0.0.1:9222/json/version');
  } catch (err) {
    console.error('Failed to query Chrome port 9222:', err.message);
    chromeProcess.kill();
    return;
  }

  const wsUrl = response.data.webSocketDebuggerUrl;
  console.log(`Successfully connected! WebSocket URL: ${wsUrl}`);
  
  const browser = await puppeteer.connect({
    browserWSEndpoint: wsUrl,
    defaultViewport: null
  });
  
  const page = await browser.newPage();
  
  // Mask webdriver
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  console.log('Navigating to x.com to verify session...');
  await page.goto('https://x.com', { waitUntil: 'networkidle2', timeout: 60000 });
  
  console.log('Page loaded. Checking title & URL...');
  const title = await page.title();
  const url = page.url();
  console.log(`URL: ${url}`);
  console.log(`Title: ${title}`);
  
  // Take a screenshot of x.com to verify visual login state
  const screenshotPath = path.join(__dirname, 'x_login_verify.png');
  await page.screenshot({ path: screenshotPath });
  console.log(`Screenshot saved to: ${screenshotPath}`);
  
  await browser.disconnect();
  console.log('Puppeteer disconnected.');
  
  console.log('Terminating Chrome...');
  chromeProcess.kill();
  console.log('Done!');
}

testIsolatedSession().catch(err => {
  console.error('Test run failed:', err);
});
