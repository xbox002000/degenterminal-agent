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
    
    // Check if additional info is expanded by checking if the ProseMirror or contenteditable is visible
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
      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    // Find the contenteditable element
    const editorHandle = await page.$('[contenteditable="true"]');
    if (editorHandle) {
      console.log('Found contenteditable element! Focusing and typing bio...');
      
      // Click it to focus
      await editorHandle.click();
      
      // Select all and delete existing text (just in case)
      await page.keyboard.down('Control');
      await page.keyboard.press('A');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      
      // Type the bio
      console.log('Typing bio...');
      await page.keyboard.type(agentBio, { delay: 5 }); // slow down slightly to mimic real typing
      
      console.log('Bio typed successfully!');
      
      // Let's verify if the text is there
      const content = await page.evaluate(() => {
        const editor = document.querySelector('[contenteditable="true"]');
        return editor ? editor.innerText : '';
      });
      console.log('Typed content sample:', content.substring(0, 100) + '...');
      
    } else {
      console.log('❌ Could not find any element with contenteditable="true" on the page.');
    }
    
    // Take a screenshot to verify
    const screenshotPath = 'C:\\Users\\xbox0\\.gemini\\antigravity\\brain\\0aa0d0f7-3fbe-43e3-8140-bd18f0916344\\filled_bio.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Screenshot saved to:', screenshotPath);
    
  } catch (error) {
    console.error('Error during filling bio:', error.message);
  }
}

main();
