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
      console.log('Expanding "Additional information" collapsible...');
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const addInfoBtn = buttons.find(b => b.textContent.includes('Additional information'));
        if (addInfoBtn) {
          addInfoBtn.click();
        }
      });
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    // Check if the editor is empty or needs filling
    const isBioEmpty = await page.evaluate(() => {
      const editor = document.querySelector('[contenteditable="true"]');
      return !editor || !editor.innerText.trim();
    });
    
    if (isBioEmpty) {
      console.log('Bio seems empty on reload. Re-filling bio description...');
      const bioResult = await page.evaluate((text) => {
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
          return 'Bio successfully re-filled!';
        }
        return '❌ Bio editor not found!';
      }, agentBio);
      console.log(' ->', bioResult);
    } else {
      console.log('Bio is already filled!');
    }
    
    // Click "Review Summary" button
    console.log('Clicking the "Review Summary" button...');
    const clickResult = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const reviewBtn = buttons.find(b => b.textContent.trim() === 'Review Summary');
      if (reviewBtn) {
        if (reviewBtn.disabled) {
          return '❌ Button is found but disabled!';
        }
        reviewBtn.click();
        return 'Review Summary button clicked successfully!';
      }
      return '❌ Review Summary button not found!';
    });
    
    console.log('Result:', clickResult);
    
    // Wait for the modal/popup to render
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Take a screenshot
    const screenshotPath = 'C:\\Users\\xbox0\\.gemini\\antigravity\\brain\\0aa0d0f7-3fbe-43e3-8140-bd18f0916344\\review_summary_modal.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Screenshot saved to:', screenshotPath);
    
    await browser.disconnect();
  } catch (error) {
    console.error('Error during review and submit:', error.message);
  }
}

main();
