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
    
    console.log('Filling contenteditable via page.evaluate...');
    const result = await page.evaluate((text) => {
      const editor = document.querySelector('[contenteditable="true"]');
      if (editor) {
        editor.focus();
        
        // Find existing p elements or content
        editor.innerHTML = '';
        
        // Split by double newline to create proper paragraphs for rich text formatting
        const paragraphs = text.split('\n\n');
        paragraphs.forEach(paraText => {
          if (paraText.trim()) {
            const p = document.createElement('p');
            p.textContent = paraText.trim();
            editor.appendChild(p);
          }
        });
        
        // Dispatch multiple events to force framework sync (TipTap/ProseMirror/React/Vue)
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        editor.dispatchEvent(new Event('change', { bubbles: true }));
        
        // If it's ProseMirror, we can try to trigger its internal transaction if available
        // TipTap/ProseMirror usually keeps the view in a property of the DOM node
        const pmView = editor.pmView || (editor.firstChild && editor.firstChild.pmView);
        if (pmView && pmView.dispatch && pmView.state) {
          const { tr } = pmView.state;
          // Create transaction to replace entire document
          const transaction = tr.insertText(text, 0, pmView.state.doc.content.size);
          pmView.dispatch(transaction);
          return 'Filled successfully using ProseMirror API!';
        }
        
        return 'Filled using innerHTML and DOM events!';
      }
      return '❌ No contenteditable editor found!';
    }, agentBio);
    
    console.log('Result:', result);
    
    // Take a screenshot
    const screenshotPath = 'C:\\Users\\xbox0\\.gemini\\antigravity\\brain\\0aa0d0f7-3fbe-43e3-8140-bd18f0916344\\filled_bio_html.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Verification screenshot saved to:', screenshotPath);
    
    await browser.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
