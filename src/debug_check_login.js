const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');
const axios = require('axios');

const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const userDataDir = 'd:\\Antigravity\\coo\\temp_chrome_profile';

async function checkLogin() {
  console.log('Spawning Chrome...');
  const args = [
    '--remote-debugging-port=9222',
    '--headless=new',
    '--disable-gpu',
    '--remote-allow-origins=*',
    `--user-data-dir=${userDataDir}`,
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
  
  console.log('Page loaded. Checking for textbox...');
  const textboxSelector = 'div[role="textbox"][contenteditable="true"]';
  
  try {
    await page.waitForSelector(textboxSelector, { timeout: 10000 });
    console.log('SUCCESS: Logged in! Compose textbox found!');
  } catch (err) {
    console.error('FAILURE: Textbox not found. User might not be logged in X. Current URL:', page.url());
    const title = await page.title();
    console.log(`Page title: ${title}`);
    
    // Take a screenshot of the failure
    await page.screenshot({ path: path.join(__dirname, 'x_compose_fail.png') });
    console.log('Screenshot of fail state saved.');
  }
  
  await browser.disconnect();
  chromeProcess.kill();
}

checkLogin().catch(console.error);
