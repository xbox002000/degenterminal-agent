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
    
    console.log('Clicking "Additional information" button...');
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addInfoBtn = buttons.find(b => b.textContent.includes('Additional information'));
      if (addInfoBtn) {
        addInfoBtn.click();
        return 'Clicked Additional information!';
      }
      return 'Could not find Additional information button';
    });
    console.log('Result:', clicked);
    
    // Wait for animation
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Take a screenshot
    const screenshotPath = 'C:\\Users\\xbox0\\.gemini\\antigravity\\brain\\0aa0d0f7-3fbe-43e3-8140-bd18f0916344\\expanded_additional_info.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Screenshot saved to:', screenshotPath);
    
    // Inspect all inputs now
    const inputsInfo = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const textareas = Array.from(document.querySelectorAll('textarea'));
      return {
        inputs: inputs.map(i => ({
          tagName: i.tagName,
          type: i.type,
          id: i.id,
          placeholder: i.placeholder,
          className: i.className,
          value: i.value,
          outerHTML: i.outerHTML.substring(0, 150)
        })),
        textareas: textareas.map(t => ({
          tagName: t.tagName,
          placeholder: t.placeholder,
          className: t.className,
          value: t.value,
          outerHTML: t.outerHTML.substring(0, 150)
        }))
      };
    });
    
    console.log('\n--- NEW INPUTS ---');
    console.log(JSON.stringify(inputsInfo.inputs, null, 2));
    console.log('\n--- NEW TEXTAREAS ---');
    console.log(JSON.stringify(inputsInfo.textareas, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
