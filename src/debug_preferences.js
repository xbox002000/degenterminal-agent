const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');
const axios = require('axios');

const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const srcUserDataDir = 'C:\\Users\\xbox0\\AppData\\Local\\Google\\Chrome\\User Data';
const destUserDataDir = 'd:\\Antigravity\\coo\\temp_chrome_profile';

async function testWithPreferences() {
  console.log('--- Setting up Isolated Chrome Session with Preferences ---');
  
  // Create directories
  const destDefaultNetworkDir = path.join(destUserDataDir, 'Default', 'Network');
  fs.mkdirSync(destDefaultNetworkDir, { recursive: true });
  fs.mkdirSync(path.join(destUserDataDir, 'Default'), { recursive: true });
  
  // Copy Local State
  const srcLocalState = path.join(srcUserDataDir, 'Local State');
  const destLocalState = path.join(destUserDataDir, 'Local State');
  if (fs.existsSync(srcLocalState)) {
    console.log(`Copying Local State...`);
    fs.copyFileSync(srcLocalState, destLocalState);
  }
  
  // Copy Cookies
  const srcCookies = path.join(srcUserDataDir, 'Default', 'Network', 'Cookies');
  const destCookies = path.join(destDefaultNetworkDir, 'Cookies');
  if (fs.existsSync(srcCookies)) {
    console.log(`Copying Cookies...`);
    fs.copyFileSync(srcCookies, destCookies);
  }

  // Copy Preferences
  const srcPreferences = path.join(srcUserDataDir, 'Default', 'Preferences');
  const destPreferences = path.join(destUserDataDir, 'Default', 'Preferences');
  if (fs.existsSync(srcPreferences)) {
    console.log(`Copying Preferences...`);
    fs.copyFileSync(srcPreferences, destPreferences);
  } else {
    console.log('Preferences not found at source!');
  }

  console.log('Spawning Chrome...');
  const args = [
    '--remote-debugging-port=9222',
    '--headless=new',
    '--disable-gpu',
    '--remote-allow-origins=*',
    `--user-data-dir=${destUserDataDir}`,
    '--profile-directory=Default'
  ];

  const chromeProcess = spawn(chromePath, args);
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const response = await axios.get('http://127.0.0.1:9222/json/version');
  const wsUrl = response.data.webSocketDebuggerUrl;
  
  const browser = await puppeteer.connect({
    browserWSEndpoint: wsUrl,
    defaultViewport: null
  });
  
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  console.log('Navigating to x.com compose page...');
  await page.goto('https://x.com/compose/post', { waitUntil: 'networkidle2', timeout: 60000 });
  
  console.log('Checking for textbox...');
  const textboxSelector = 'div[role="textbox"][contenteditable="true"]';
  
  try {
    await page.waitForSelector(textboxSelector, { timeout: 15000 });
    console.log('SUCCESS: Logged in! Compose textbox found!');
    
    // Save screenshot
    await page.screenshot({ path: path.join(__dirname, 'x_compose_success.png') });
    console.log('Success screenshot saved.');
  } catch (err) {
    console.error('FAILURE: Textbox not found. URL:', page.url());
    await page.screenshot({ path: path.join(__dirname, 'x_compose_pref_fail.png') });
    console.log('Fail screenshot saved.');
  }
  
  await browser.disconnect();
  chromeProcess.kill();
}

testWithPreferences().catch(console.error);
