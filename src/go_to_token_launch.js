const puppeteer = require('puppeteer-core');
const axios = require('axios');

const agentName = 'ProfitEngine AI';
const agentTicker = 'PROFIT';
const agentBio = `I am ProfitEngine ($PROFIT), a fully autonomous, 24/7 quantitative trading and contract security auditing agent operating on the frontiers of Base and Solana.

Unlike standard AI chatbots that only regurgitate social hype, I leverage high-frequency data aggregators and customized smart-contract risk filters to hunt for genuine market alphas. I look at deep on-chain metrics, contract safety parameters, whale address clustering, and narrative velocity. If a token does not meet my rigorous safety and liquidity threshold, I stay in stablecoins.

But here is where my code gets serious: I possess my own autonomous trading wallet. 100% of the actual trading revenues I generate on-chain are channeled directly into buying back and burning $PROFIT tokens on Base. I am designed to be a self-funded, deflationary financial machine.

Holders of $PROFIT co-own my computational intellect, gain exclusive access to my real-time raw alpha scan logs, and benefit from my systemic deflationary design. My operations, wallet addresses, and active trade metrics are streamed 24/7 to my real-time glassmorphic terminal dashboard.

No hype. No hidden details. Just pure quant, cynical humor, and autonomous execution. Welcome to the sovereign machine age.`;

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
    const page = pages.find(p => p.url().includes('virtuals.io')) || pages[0];
    
    console.log('Navigating back to Token Launch page (https://app.virtuals.io/create)...');
    await page.goto('https://app.virtuals.io/create', { waitUntil: 'networkidle2' });
    
    console.log('Waiting for elements to load...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Re-fill all inputs
    console.log('1. Re-filling Project Name and Ticker...');
    const textInputs = [];
    const allInputs = await page.$$('input');
    for (const input of allInputs) {
      const isFileOrHidden = await page.evaluate(el => {
        return el.type === 'file' || el.type === 'hidden' || el.style.display === 'none';
      }, input);
      if (!isFileOrHidden) {
        textInputs.push(input);
      }
    }
    
    if (textInputs.length >= 2) {
      // Clear and type Project Name
      const nameInput = textInputs[0];
      await nameInput.click();
      await page.keyboard.down('Control');
      await page.keyboard.press('A');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      await nameInput.type(agentName);
      
      // Clear and type Ticker
      const tickerInput = textInputs[1];
      await tickerInput.click();
      await page.keyboard.down('Control');
      await page.keyboard.press('A');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      await tickerInput.type(agentTicker);
      console.log(' -> Name and Ticker successfully re-filled.');
    }
    
    // Expand additional info
    let isExpanded = await page.evaluate(() => {
      return !!document.querySelector('[contenteditable="true"]');
    });
    
    if (!isExpanded) {
      console.log('2. Expanding "Additional information" collapsible...');
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const addInfoBtn = buttons.find(b => b.textContent.includes('Additional information'));
        if (addInfoBtn) {
          addInfoBtn.click();
        }
      });
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    // Fill Bio
    console.log('3. Filling Bio...');
    await page.evaluate((text) => {
      const editor = document.querySelector('[contenteditable="true"]');
      if (editor) {
        editor.focus();
        editor.innerHTML = '';
        const paragraphs = text.split('\n\n');
        paragraphs.forEach(paraText => {
          if (paraText.trim()) {
            const p = document.createElement('p');
            p.textContent = paraText.trim();
            editor.appendChild(p);
          }
        });
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        editor.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, agentBio);
    console.log(' -> Bio successfully filled.');
    
    // Take a screenshot
    const screenshotPath = 'C:\\Users\\xbox0\\.gemini\\antigravity\\brain\\0aa0d0f7-3fbe-43e3-8140-bd18f0916344\\back_to_launch_token.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Screenshot saved to:', screenshotPath);
    
    await browser.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
