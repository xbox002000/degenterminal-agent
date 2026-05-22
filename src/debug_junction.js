const { spawn } = require('child_process');
const path = require('path');
const puppeteer = require('puppeteer-core');
const axios = require('axios');

const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = 'C:\\Users\\xbox0\\AppData\\Local\\Google\\Chrome\\FakeUserData';

async function testJunction() {
  console.log('Spawning Chrome with FakeUserData Junction...');
  
  const args = [
    '--remote-debugging-port=9222',
    '--headless=new',
    '--disable-gpu',
    '--remote-allow-origins=*',
    `--user-data-dir=${userDataDir}`,
    '--profile-directory=Default'
  ];

  const chromeProcess = spawn(chromePath, args);
  
  chromeProcess.stdout.on('data', (data) => {
    console.log(`[Chrome STDOUT]: ${data}`);
  });

  chromeProcess.stderr.on('data', (data) => {
    console.log(`[Chrome STDERR]: ${data}`);
  });

  await new Promise(resolve => setTimeout(resolve, 3000));
  
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
    await page.waitForSelector(textboxSelector, { timeout: 15000 });
    console.log('SUCCESS: Logged in X via Junction! Compose textbox found!');
    
    // Screenshot
    const successPath = path.join(__dirname, 'x_junction_success.png');
    await page.screenshot({ path: successPath });
    console.log(`Screenshot saved to: ${successPath}`);
  } catch (err) {
    console.error('FAILURE: Textbox not found. URL:', page.url());
    const failPath = path.join(__dirname, 'x_junction_fail.png');
    await page.screenshot({ path: failPath });
    console.log(`Screenshot saved to: ${failPath}`);
  }
  
  await browser.disconnect();
  chromeProcess.kill();
  console.log('Process completed.');
}

testJunction().catch(console.error);
