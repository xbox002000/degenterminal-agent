const puppeteer = require('puppeteer-core');
const axios = require('axios');

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
    const page = pages.find(p => p.url().includes('virtuals.io/create')) || pages[0];
    await page.bringToFront();
    
    // Check if additional info is expanded
    let isExpanded = await page.evaluate(() => {
      return !!document.querySelector('[contenteditable="true"]');
    });
    
    if (!isExpanded) {
      console.log('Collapsible additional info is not expanded. Clicking it now...');
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const addInfoBtn = buttons.find(b => b.textContent.includes('Additional information'));
        if (addInfoBtn) {
          addInfoBtn.click();
        }
      });
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    console.log('Locating contenteditable...');
    const editorExists = await page.evaluate(() => {
      const editor = document.querySelector('[contenteditable="true"]');
      if (!editor) return false;
      
      // Let's set the text programmatically as well
      editor.focus();
      
      // Try to find the paragraph inside the editor or create one if empty
      let p = editor.querySelector('p');
      if (!p) {
        p = document.createElement('p');
        editor.appendChild(p);
      }
      
      // We will also try typing as a backup, but let's set this first to be safe
      return true;
    });
    
    if (editorExists) {
      console.log('Editor found! Focusing it...');
      const editorHandle = await page.$('[contenteditable="true"]');
      await editorHandle.click();
      
      // Clear
      console.log('Clearing existing content...');
      await page.keyboard.down('Control');
      await page.keyboard.press('A');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      
      // Fast typing (no delay)
      console.log('Typing bio fast...');
      await page.keyboard.type(agentBio);
      
      console.log('Typing finished!');
      
      // Verify
      const content = await page.evaluate(() => {
        const editor = document.querySelector('[contenteditable="true"]');
        return editor ? editor.innerText : '';
      });
      console.log('Resulting text in editor:', content.substring(0, 100) + '...');
      
    } else {
      console.log('❌ Could not find editor with contenteditable="true"');
    }
    
    // Take a screenshot
    const screenshotPath = 'C:\\Users\\xbox0\\.gemini\\antigravity\\brain\\0aa0d0f7-3fbe-43e3-8140-bd18f0916344\\filled_bio_fast.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Screenshot saved to:', screenshotPath);
    
    await browser.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
