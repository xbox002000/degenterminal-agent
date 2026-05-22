const puppeteer = require('puppeteer-core');
const axios = require('axios');

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
    
    // Check if the inputs are still filled, if not, let's re-fill them!
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
    
    console.log(`Checking text inputs. Found ${textInputs.length} text inputs.`);
    
    const nameVal = textInputs.length >= 1 ? await page.evaluate(el => el.value, textInputs[0]) : '';
    const tickerVal = textInputs.length >= 2 ? await page.evaluate(el => el.value, textInputs[1]) : '';
    
    console.log('Current Name in browser:', nameVal);
    console.log('Current Ticker in browser:', tickerVal);
    
    // Re-fill if empty
    if (!nameVal || !tickerVal) {
      console.log('Fields seem to have been cleared. Re-filling now...');
      if (textInputs.length >= 2) {
        await textInputs[0].click();
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        await textInputs[0].type('ProfitEngine AI');
        
        await textInputs[1].click();
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        await textInputs[1].type('PROFIT');
        
        console.log('Re-filled successfully!');
      }
    }
    
    // Let's inspect the "Review Summary" button
    const buttonDetails = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const reviewBtn = buttons.find(b => b.textContent.includes('Review Summary') || b.textContent.includes('Create Agent'));
      
      if (reviewBtn) {
        return {
          found: true,
          text: reviewBtn.textContent,
          disabled: reviewBtn.disabled,
          className: reviewBtn.className,
          outerHTML: reviewBtn.outerHTML.substring(0, 300)
        };
      }
      return { found: false };
    });
    
    console.log('Review Summary Button details:', buttonDetails);
    
    // If found and not disabled, let's click it!
    if (buttonDetails.found && !buttonDetails.disabled) {
      console.log('Clicking "Review Summary" button...');
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const reviewBtn = buttons.find(b => b.textContent.includes('Review Summary') || b.textContent.includes('Create Agent'));
        if (reviewBtn) {
          reviewBtn.click();
        }
      });
      console.log('Clicked "Review Summary"!');
      
      // Wait for navigation or state update
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else {
      console.log('⚠️ Review Summary button is disabled or not found. Checking if there is another error on the page.');
      
      // Let's dump all red/error texts on the page to diagnose
      const errors = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll('*'));
        return els
          .filter(el => {
            const style = window.getComputedStyle(el);
            const color = style.color;
            // look for red/orange colors or text containing error
            return (color.includes('239, 68, 68') || color.includes('red') || (el.textContent && el.textContent.toLowerCase().includes('error'))) && el.textContent.trim().length > 0 && el.textContent.trim().length < 100;
          })
          .map(el => el.textContent.trim());
      });
      console.log('Possible errors on page:', errors);
    }
    
    // Take a screenshot
    const screenshotPath = 'C:\\Users\\xbox0\\.gemini\\antigravity\\brain\\0aa0d0f7-3fbe-43e3-8140-bd18f0916344\\after_click_review.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Screenshot saved to:', screenshotPath);
    
    await browser.disconnect();
  } catch (error) {
    console.error('Error during click review:', error.message);
  }
}

main();
