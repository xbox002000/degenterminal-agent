const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

class ChartRenderer {
  constructor() {
    // Check both standard Program Files paths in Windows (same as in twitter.js)
    const path64 = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const path32 = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
    this.chromePath = fs.existsSync(path32) ? path32 : path64;
    console.log(`[ChartRenderer] Chrome Path for rendering: ${this.chromePath}`);
  }

  /**
   * Generates a high-fidelity visual PnL chart using Headless Chrome & Canvas 2D
   * @param {string} symbol - Token symbol (e.g. "G9Y1KG")
   * @param {Array<{time: string, price: number}>} priceHistory - List of time and price points
   * @param {string} imagePath - Absolute path where the image should be saved
   */
  async generateChart(symbol, priceHistory, imagePath) {
    if (!priceHistory || priceHistory.length === 0) {
      throw new Error('[ChartRenderer] priceHistory is empty or invalid.');
    }

    // Calculate final PnL ratio & percent
    const startPrice = priceHistory[0].price;
    const endPrice = priceHistory[priceHistory.length - 1].price;
    const pnlRatio = (endPrice - startPrice) / startPrice;
    const pnlPercent = (pnlRatio * 100).toFixed(2);

    console.log(`[ChartRenderer] Starting chart render for $${symbol}. PnL: ${pnlPercent}% | Points: ${priceHistory.length}`);

    let browser;
    try {
      // Launch browser
      browser = await puppeteer.launch({
        executablePath: this.chromePath,
        headless: 'new',
        defaultViewport: { width: 800, height: 400 },
        args: [
          '--disable-gpu',
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ]
      });

      const page = await browser.newPage();

      // HTML/CSS template and Canvas JS
      const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          body {
            margin: 0;
            padding: 0;
            background: #020408;
            font-family: 'Outfit', 'Inter', 'Segoe UI', sans-serif;
            width: 800px;
            height: 400px;
            overflow: hidden;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          #container {
            width: 800px;
            height: 400px;
            position: relative;
            background: linear-gradient(135deg, #0b0f19 0%, #020408 100%);
            box-sizing: border-box;
          }
          canvas {
            display: block;
            width: 800px;
            height: 400px;
          }
        </style>
      </head>
      <body>
        <div id="container">
          <canvas id="chart" width="1600" height="800"></canvas>
        </div>
        <script>
          window.drawChart = (symbol, history, pnlPercent) => {
            const canvas = document.getElementById('chart');
            const ctx = canvas.getContext('2d');
            
            // Clear / background
            ctx.clearRect(0, 0, 1600, 800);
            
            // Cyber dark gradient background
            const bgGrad = ctx.createRadialGradient(800, 400, 100, 800, 400, 800);
            bgGrad.addColorStop(0, '#0d1933');
            bgGrad.addColorStop(1, '#030712');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, 1600, 800);

            // Draw cyber grid lines
            ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
            ctx.lineWidth = 2;
            
            // Vertical grids
            for (let x = 100; x < 1600; x += 150) {
              ctx.beginPath();
              ctx.moveTo(x, 0);
              ctx.lineTo(x, 800);
              ctx.stroke();
            }
            
            // Horizontal grids
            for (let y = 100; y < 800; y += 100) {
              ctx.beginPath();
              ctx.moveTo(0, y);
              ctx.lineTo(1600, y);
              ctx.stroke();
            }
            
            const paddingLeft = 180;
            const paddingRight = 180;
            const paddingTop = 200;
            const paddingBottom = 180;
            
            const width = 1600 - paddingLeft - paddingRight;
            const height = 800 - paddingTop - paddingBottom;
            
            const prices = history.map(h => h.price);
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            
            // Add a small safety buffer so prices don't touch absolute edge
            let priceRange = maxPrice - minPrice;
            let displayMin = minPrice - (priceRange * 0.1);
            let displayMax = maxPrice + (priceRange * 0.1);
            
            if (priceRange === 0) {
              displayMin = minPrice * 0.9;
              displayMax = maxPrice * 1.1;
              priceRange = displayMax - displayMin;
            } else {
              priceRange = displayMax - displayMin;
            }
            
            const getX = (index) => {
              if (history.length <= 1) return paddingLeft + width / 2;
              return paddingLeft + (index / (history.length - 1)) * width;
            };
            
            const getY = (price) => {
              return 800 - paddingBottom - ((price - displayMin) / priceRange) * height;
            };
            
            const isProfit = parseFloat(pnlPercent) >= 0;
            const mainColor = isProfit ? '#00ffcc' : '#ff3366';
            const shadowColor = isProfit ? 'rgba(0, 255, 204, 0.15)' : 'rgba(255, 51, 102, 0.15)';
            
            // Fill gradient under the curve
            ctx.beginPath();
            ctx.moveTo(getX(0), 800 - paddingBottom);
            for (let i = 0; i < history.length; i++) {
              ctx.lineTo(getX(i), getY(history[i].price));
            }
            ctx.lineTo(getX(history.length - 1), 800 - paddingBottom);
            ctx.closePath();
            
            const fillGrad = ctx.createLinearGradient(0, paddingTop, 0, 800 - paddingBottom);
            fillGrad.addColorStop(0, shadowColor);
            fillGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = fillGrad;
            ctx.fill();
            
            // Draw the main line
            ctx.beginPath();
            for (let i = 0; i < history.length; i++) {
              const x = getX(i);
              const y = getY(history[i].price);
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            
            ctx.strokeStyle = mainColor;
            ctx.lineWidth = 6;
            ctx.shadowColor = mainColor;
            ctx.shadowBlur = 20;
            ctx.stroke();
            ctx.shadowBlur = 0; // reset
            
            // Draw price history points (excluding first and last to prevent overlap with big circles)
            for (let i = 1; i < history.length - 1; i++) {
              const x = getX(i);
              const y = getY(history[i].price);
              ctx.beginPath();
              ctx.arc(x, y, 6, 0, Math.PI * 2);
              ctx.fillStyle = mainColor;
              ctx.fill();
            }
            
            // Highlight Buy Point (First)
            const buyX = getX(0);
            const buyY = getY(history[0].price);
            ctx.beginPath();
            ctx.arc(buyX, buyY, 15, 0, Math.PI * 2);
            ctx.fillStyle = '#00ff66';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#00ff66';
            ctx.shadowBlur = 15;
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;
            
            // Highlight Sell Point (Last)
            const sellX = getX(history.length - 1);
            const sellY = getY(history[history.length - 1].price);
            ctx.beginPath();
            ctx.arc(sellX, sellY, 15, 0, Math.PI * 2);
            ctx.fillStyle = '#ff3333';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#ff3333';
            ctx.shadowBlur = 15;
            ctx.fill();
            ctx.stroke();
            ctx.shadowBlur = 0;
            
            // BUY Text Tag (Above the buy point)
            ctx.font = 'bold 24px "Outfit", "Inter", sans-serif';
            ctx.fillStyle = '#00ff66';
            ctx.textAlign = 'center';
            ctx.fillText('🟢 BUY', buyX, buyY - 50);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px "Outfit", "Inter", sans-serif';
            ctx.fillText('$' + history[0].price.toFixed(2) + ' USD', buyX, buyY - 24);
            
            // SELL Text Tag (Above the sell point)
            ctx.font = 'bold 24px "Outfit", "Inter", sans-serif';
            ctx.fillStyle = '#ff3333';
            ctx.textAlign = 'center';
            ctx.fillText('🔴 SELL', sellX, sellY - 50);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px "Outfit", "Inter", sans-serif';
            ctx.fillText('$' + history[history.length - 1].price.toFixed(2) + ' USD', sellX, sellY - 24);
            
            // Draw Token Logo / Name Watermark at Top Left
            ctx.textAlign = 'left';
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 56px "Outfit", "Inter", sans-serif';
            ctx.fillText(symbol.toUpperCase(), 80, 100);
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.font = '24px "Outfit", "Inter", sans-serif';
            ctx.fillText('DEGEN QUANTITATIVE PORTFOLIO', 80, 140);
            
            // Draw ROI percentage at top right
            ctx.textAlign = 'right';
            ctx.font = 'bold 56px "Outfit", "Inter", sans-serif';
            ctx.fillStyle = isProfit ? '#00ffcc' : '#ff3366';
            ctx.fillText((isProfit ? '+' : '') + pnlPercent + '%', 1520, 100);
            
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.font = '24px "Outfit", "Inter", sans-serif';
            ctx.fillText('REALIZED PNL ROI', 1520, 140);
            
            // Bottom Watermark
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(0, 240, 255, 0.5)';
            ctx.font = 'bold 24px "Outfit", "Inter", sans-serif';
            ctx.fillText('🤖 Tested under the cold logic of Antigravity 2.0 | Silicon-only execution', 800, 745);
            
            // Buy time and Sell time exactly under the points
            ctx.font = 'bold 18px "Outfit", "Inter", sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.fillText(history[0].time, buyX, buyY + 45);
            ctx.fillText(history[history.length - 1].time, sellX, sellY + 45);
            
            // Small time markings along the line (only if we have enough points)
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.font = '16px "Outfit", "Inter", sans-serif';
            const timeStep = Math.max(1, Math.floor(history.length / 5));
            for (let i = 0; i < history.length; i += timeStep) {
              if (i === 0 || i === history.length - 1) continue;
              const x = getX(i);
              const y = getY(history[i].price);
              ctx.fillText(history[i].time, x, y + 35);
            }
          };
        </script>
      </body>
      </html>
      `;

      await page.setContent(htmlContent);

      // Wait a moment for fonts to potentially resolve
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Trigger the render inside the page context
      await page.evaluate((symbol, history, pnlPercent) => {
        window.drawChart(symbol, history, pnlPercent);
      }, symbol, priceHistory, pnlPercent);

      // Take a screenshot of the container
      const container = await page.$('#container');
      await container.screenshot({ path: imagePath });

      console.log(`[ChartRenderer] Chart generated and saved successfully to: ${imagePath}`);
      return imagePath;
    } catch (error) {
      console.error('[ChartRenderer Error] Failed to render chart:', error.message);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

module.exports = new ChartRenderer();
