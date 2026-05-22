const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');
const axios = require('axios');

const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const srcUserDataDir = 'C:\\Users\\xbox0\\AppData\\Local\\Google\\Chrome\\User Data';
const destUserDataDir = 'd:\\Antigravity\\coo\\temp_chrome_profile';

// Helper to recursively copy directories
function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      try {
        fs.copyFileSync(srcPath, destPath);
      } catch (err) {
        // Skip locked files if any
      }
    }
  }
}

async function testUltimate() {
  console.log('--- Setting up ULTIMATE Isolated Chrome Session ---');
  
  // Clean target directory safely
  if (fs.existsSync(destUserDataDir)) {
    console.log('Cleaning old temp profile...');
    try {
      fs.rmSync(destUserDataDir, { recursive: true, force: true });
    } catch (e) {
      console.log('Clean warning:', e.message);
    }
  }
  
  fs.mkdirSync(destUserDataDir, { recursive: true });
  
  // 1. Copy Local State (Root level)
  const srcLocalState = path.join(srcUserDataDir, 'Local State');
  const destLocalState = path.join(destUserDataDir, 'Local State');
  if (fs.existsSync(srcLocalState)) {
    console.log('Copying Local State...');
    fs.copyFileSync(srcLocalState, destLocalState);
  }
  
  // Create Default directory
  const srcDefaultDir = path.join(srcUserDataDir, 'Default');
  const destDefaultDir = path.join(destUserDataDir, 'Default');
  fs.mkdirSync(destDefaultDir, { recursive: true });
  
  // 2. Copy Preferences
  const srcPreferences = path.join(srcDefaultDir, 'Preferences');
  const destPreferences = path.join(destDefaultDir, 'Preferences');
  if (fs.existsSync(srcPreferences)) {
    console.log('Copying Preferences...');
    fs.copyFileSync(srcPreferences, destPreferences);
  }
  
  // 3. Copy Network folder (for Cookies)
  console.log('Copying Network (Cookies)...');
  copyDirSync(path.join(srcDefaultDir, 'Network'), path.join(destDefaultDir, 'Network'));
  
  // 4. Copy Local Storage
  console.log('Copying Local Storage...');
  copyDirSync(path.join(srcDefaultDir, 'Local Storage'), path.join(destDefaultDir, 'Local Storage'));
  
  // 5. Copy Session Storage
  console.log('Copying Session Storage...');
  copyDirSync(path.join(srcDefaultDir, 'Session Storage'), path.join(destDefaultDir, 'Session Storage'));
  
  // 6. Copy Sessions (Tab and Session status)
  console.log('Copying Sessions...');
  copyDirSync(path.join(srcDefaultDir, 'Sessions'), path.join(destDefaultDir, 'Sessions'));
  
  // 7. Copy IndexedDB
  console.log('Copying IndexedDB...');
  copyDirSync(path.join(srcDefaultDir, 'IndexedDB'), path.join(destDefaultDir, 'IndexedDB'));

  console.log('Spawning Chrome with ultimate temp profile...');
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

  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log('Connecting Puppeteer...');
  const response = await axios.get('http://127.0.0.1:9222/json/version');
  const wsUrl = response.data.webSocketDebuggerUrl;
  console.log(`Connected! WS URL: ${wsUrl}`);
  
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
    await page.waitForSelector(textboxSelector, { timeout: 20000 });
    console.log('SUCCESS: Logged in X via ULTIMATE copy! Compose textbox found!');
    
    // Screenshot
    const successPath = path.join(__dirname, 'x_ultimate_success.png');
    await page.screenshot({ path: successPath });
    console.log(`Screenshot saved to: ${successPath}`);
  } catch (err) {
    console.error('FAILURE: Textbox not found. URL:', page.url());
    const failPath = path.join(__dirname, 'x_ultimate_fail.png');
    await page.screenshot({ path: failPath });
    console.log(`Screenshot saved to: ${failPath}`);
  }
  
  await browser.disconnect();
  chromeProcess.kill();
  console.log('Ultimate test completed.');
}

testUltimate().catch(console.error);
