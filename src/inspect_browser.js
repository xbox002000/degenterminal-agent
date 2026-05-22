const puppeteer = require('puppeteer-core');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

async function main() {
  console.log('Connecting to browser remote debugging...');
  try {
    const versionResponse = await axios.get('http://127.0.0.1:9222/json/version');
    const { webSocketDebuggerUrl } = versionResponse.data;
    
    const browser = await puppeteer.connect({
      browserWSEndpoint: webSocketDebuggerUrl,
      defaultViewport: { width: 1920, height: 2000 }
    });
    
    console.log('Connected to browser!');
    const pages = await browser.pages();
    const page = pages.find(p => p.url().includes('virtuals.io/create')) || pages[0];
    
    console.log('Active page URL:', page.url());
    
    // Bring page to front
    await page.bringToFront();
    
    // Scroll down to make sure everything is rendered
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    });
    
    // Let's take a screenshot
    const screenshotPath = 'C:\\Users\\xbox0\\.gemini\\antigravity\\brain\\0aa0d0f7-3fbe-43e3-8140-bd18f0916344\\current_browser_screen_large.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Screenshot saved to:', screenshotPath);
    
    // Let's inspect ALL text inputs and their adjacent label texts
    const pageDetails = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('*'));
      const textElements = [];
      
      allElements.forEach(el => {
        if (el.shadowRoot) {
          // Check shadow root elements
        }
        
        const tagName = el.tagName;
        if (['INPUT', 'TEXTAREA', 'BUTTON', 'LABEL', 'H1', 'H2', 'H3', 'H4', 'SPAN', 'P'].includes(tagName)) {
          const text = el.textContent ? el.textContent.trim() : '';
          const placeholder = el.placeholder || '';
          const id = el.id || '';
          const name = el.name || '';
          const className = el.className || '';
          const type = el.type || '';
          
          if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
            textElements.push({
              tagName,
              type,
              id,
              name,
              placeholder,
              className,
              value: el.value,
              outerHTML: el.outerHTML.substring(0, 150)
            });
          } else if (text.length > 0 && text.length < 150) {
            textElements.push({
              tagName,
              text,
              className
            });
          }
        }
      });
      
      return textElements;
    });
    
    console.log('\n--- PAGE ELEMENTS & TEXTS ---');
    console.log(JSON.stringify(pageDetails, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
