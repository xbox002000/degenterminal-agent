require('dotenv').config();
const browserManager = require('../browser-manager');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('../../config');
const chartRenderer = require('../../chart_renderer');

const dataJsonPath = path.join(__dirname, '../../../public/data.json');
const statsLockPath = path.join(__dirname, '../../../config/stats_posted_lock.json');

class XStatsPublisher {
  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
    this.apiUrl = 'https://api.deepseek.com/v1/chat/completions';
    this.model = 'deepseek-chat';
  }

  /**
   * Load real-time PnL/ROI and duel metrics from public/data.json
   */
  loadRealtimeStats() {
    try {
      if (fs.existsSync(dataJsonPath)) {
        const data = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
        const green = data.conservative || {};
        const zmac = data.aggressive || {};

        const greenVp = green.virtualPortfolio || {};
        const zmacVp = zmac.virtualPortfolio || {};

        const greenInitial = greenVp.initialBalanceUSD || 100000;
        const greenNet = greenVp.netValueUSD || greenInitial;
        const greenRoi = ((greenNet - greenInitial) / greenInitial) * 100;
        const greenProfit = greenVp.totalProfitUSD || 0;

        const zmacInitial = zmacVp.initialBalanceUSD || 100000;
        const zmacNet = zmacVp.netValueUSD || zmacInitial;
        const zmacRoi = ((zmacNet - zmacInitial) / zmacInitial) * 100;
        const zmacProfit = zmacVp.totalProfitUSD || 0;

        const greenHistory = green.tradeHistory || [];
        const greenWins = greenHistory.filter(t => t.pnlPercent >= 0).length;
        const greenTotal = greenHistory.length;
        const greenWinrate = greenTotal > 0 ? (greenWins / greenTotal) * 100 : 0;

        const zmacHistory = zmac.tradeHistory || [];
        const zmacWins = zmacHistory.filter(t => t.pnlPercent >= 0).length;
        const zmacTotal = zmacHistory.length;
        const zmacWinrate = zmacTotal > 0 ? (zmacWins / zmacTotal) * 100 : 0;

        const deltaRoi = Math.abs(greenRoi - zmacRoi);
        const leader = greenRoi > zmacRoi ? 'Green Sniper' : (zmacRoi > greenRoi ? 'ZMAC Scalper' : 'DRAW');

        const latestGreenTrade = greenHistory[greenHistory.length - 1] || null;
        const latestZmacTrade = zmacHistory[zmacHistory.length - 1] || null;

        return {
          day: data.brain?.dayCount || data.day_count || 1,
          fng: data.brain?.memory?.analytics_feedback?.market_trends?.fng?.value || 50,
          fngClass: data.brain?.memory?.analytics_feedback?.market_trends?.fng?.classification || 'Neutral',
          green: { roi: greenRoi, netValue: greenNet, totalProfit: greenProfit, wins: greenWins, total: greenTotal, winrate: greenWinrate, latestTrade: latestGreenTrade },
          zmac: { roi: zmacRoi, netValue: zmacNet, totalProfit: zmacProfit, wins: zmacWins, total: zmacTotal, winrate: zmacWinrate, latestTrade: latestZmacTrade },
          deltaRoi,
          leader,
          rawJson: data
        };
      }
    } catch (e) {
      console.error('[StatsPublisher] Failed to load public/data.json:', e.message);
    }
    return null;
  }

  /**
   * Use DeepSeek LLM to generate a viral, high-conversion multi-lingual thread (English Main + Chinese + Japanese)
   */
  async generateThreadTexts(stats) {
    if (!this.apiKey || !this.apiKey.trim()) {
      return this.generateTemplateFallback(stats);
    }

    const systemPrompt = `You are a legendary crypto viral copywriter and degen quant named "TaiwanCryptoAI 🧠" — having a sharp, sassy, and humorous personality like Eliza. Your job is to draft a highly viral 3-tweet Thread based on our real-time quant trading results.

## Language & Structure
You must return exactly a JSON array containing 3 strings:
1. First Tweet (Main): Written in ENGLISH. Needs a heavy Hook (惊人数据/Emoji + Problem + Sassy Quantitative Roast). MUST end with "🧵 Thread👇". NO links or URLs here to protect X algorithmic impressions. End with a sharp, engaging, or provocative question (e.g., "Will Green or ZMAC get rekt first today?", "Are you locking profit or holding to zero?"). NO hashtags.
2. Second Tweet: Written in TRADITIONAL CHINESE (繁體中文). Focus on detailed stats, reflection, and include key CTA links.
3. Third Tweet: Written in NATURAL JAPANESE (日語) using a real Japanese crypto degen tone. Speak directly to Japanese degens (explicitly mentioning Japanese crypto regulations, 2026 tax reforms "2026年新税制/申告分離課税/税制改正/税金優遇/握力/爆益"). Focus on risk control and include CTA links.

## Core Rules for all tweets:
- Keep each tweet strictly under 240 characters.
- Use natural crypto slang (gm, ser, WAGMI, alpha, degen).
- Speak with raw PnL numbers and facts.
- Do NOT provide financial advice.

## Real-time Stats:
- Day: ${stats.day}
- Market FNG: ${stats.fng}/100 (${stats.fngClass})
- Conservative Green ROI: ${stats.green.roi.toFixed(2)}% (WinRate: ${stats.green.winrate.toFixed(0)}%, ${stats.green.wins}/${stats.green.total} trades)
- Aggressive ZMAC ROI: ${stats.zmac.roi.toFixed(2)}% (WinRate: ${stats.zmac.winrate.toFixed(0)}%, ${stats.zmac.wins}/${stats.zmac.total} trades)
- Leader: ${stats.leader} (Delta ROI: ${stats.deltaRoi.toFixed(2)}%)
`;

    const userPrompt = `Draft the 3-tweet thread in JSON format. Ensure all CTA references point to:
- Dashboard: ${config.social?.replyGuy?.dashboardUrl || 'https://degenterminal-agent.pages.dev'}
- GitHub: ${config.social?.replyGuy?.githubUrl || 'https://github.com/xbox002000/degenterminal-agent'}
- Binance: ${config.social?.replyGuy?.binanceReferralUrl || ''}

JSON Output Example:
[
  "⚔️ [DUAL AI ARENA WEEKLY WAR] ... 🧵 Thread👇",
  "✍️ [中文版] ...",
  "✍️ [日本語版] ..."
]`;

    try {
      const response = await axios.post(this.apiUrl, {
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 800,
        temperature: 0.85
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const text = response.data?.choices?.[0]?.message?.content?.trim();
      // Parse array
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed) && parsed.length >= 3) {
        return parsed;
      }
    } catch (err) {
      console.warn('[StatsPublisher] LLM generation failed, falling back to template:', err.message);
    }

    return this.generateTemplateFallback(stats);
  }

  /**
   * Safe hard-coded high-engagement template fallback
   */
  generateTemplateFallback(stats) {
    const dashboard = config.social?.replyGuy?.dashboardUrl || 'https://degenterminal-agent.pages.dev';
    const github = config.social?.replyGuy?.githubUrl || 'https://github.com/xbox002000/degenterminal-agent';
    const binance = config.social?.replyGuy?.binanceReferralUrl || '';

    const tweet1 = `⚔️ [AI QUANT DUEL ARENA] ⚔️
Carbon-based traders panic, while our 24/7 silicon brains print ROI!
🟢 Green Sniper: ${stats.green.roi >= 0 ? '+' : ''}${stats.green.roi.toFixed(2)}% ROI (${stats.green.wins}/${stats.green.total} wins)
🟣 ZMAC Scalper: ${stats.zmac.roi >= 0 ? '+' : ''}${stats.zmac.roi.toFixed(2)}% ROI (${stats.zmac.wins}/${stats.zmac.total} wins)
Delta: ${stats.deltaRoi.toFixed(2)}%!
🧵 Thread👇`;

    const tweet2 = `✍️【Aria 賽博戰報：數據征服黑暗森林】
為賺兒女的啟賦奶粉錢與炎夏冷氣電費，我們的雙雄 Agent 實時運算中！
🟢 Green 保守狙擊手勝率 ${stats.green.winrate.toFixed(0)}% (Survive first!)
🟣 ZMAC 激進割肉工廠已平倉 ${stats.zmac.total} 筆。
誰是最強 AI 盟主？看版 24/7 真實公開：
🔗 ${dashboard}
🚀 GitHub 開源: ${github}`;

    const tweet3 = `🇯🇵【日本Degenの皆様へ • AI自動運用日記】
Solana日本コミュニティの熱気が凄い！日本の新税制議論の中でも、当AIは24/7冷静にSolana/Base上取引を実行中。
🟢 Green(保守) APY: 堅実な利確
🟣 ZMAC(高頻) APY: 秒速スキャルピング
コードの透明性と実績で証明。今すぐクローンをデプロイ！
👉 ${github}
🎁 Binance特典: ${binance}`;

    return [tweet1, tweet2, tweet3];
  }

  /**
   * Determine the most relevant chart image to attach
   */
  async getBestChartToAttach(stats) {
    // Check if we have a fresh closed position in the last 4 hours
    const now = Date.now();
    const fourHoursMs = 4 * 3600 * 1000;

    let targetTrade = null;
    let fromAgent = 'conservative';

    // Compare latest trades
    if (stats.green.latestTrade && (now - new Date(stats.green.latestTrade.sellTime).getTime() < fourHoursMs)) {
      targetTrade = stats.green.latestTrade;
      fromAgent = 'conservative';
    } else if (stats.zmac.latestTrade && (now - new Date(stats.zmac.latestTrade.sellTime).getTime() < fourHoursMs)) {
      targetTrade = stats.zmac.latestTrade;
      fromAgent = 'aggressive';
    }

    if (targetTrade && targetTrade.priceHistory && targetTrade.priceHistory.length > 0) {
      console.log(`[StatsPublisher] Found fresh closed trade for $${targetTrade.symbol}! Rendering chart...`);
      const tempPath = path.join(__dirname, '../../../public', `chart_latest_stats_${targetTrade.symbol}.png`);
      try {
        await chartRenderer.generateChart(targetTrade.symbol, targetTrade.priceHistory, tempPath);
        if (fs.existsSync(tempPath)) {
          return tempPath;
        }
      } catch (err) {
        console.error('[StatsPublisher] Failed to render trade chart:', err.message);
      }
    }

    // No fresh trade chart available — return null to publish text-only thread
    // (Previously this would randomly pick a stale chart, causing text vs image data mismatch)
    console.log('[StatsPublisher] No fresh closed trade in the last 4 hours. Publishing text-only thread (no chart attachment).');
    return null;
  }

  /**
   * Orchestrate full Thread publishing with Puppeteer using shared browser session
   */
  /**
   * Check whether both agents have zero trades — if so, suppress stats thread publishing
   */
  shouldPublish(stats) {
    if (!stats) return false;
    const greenTotal = stats.green?.total || 0;
    const zmacTotal = stats.zmac?.total || 0;
    if (greenTotal === 0 && zmacTotal === 0) {
      console.log('[StatsPublisher] 🔇 雙雄均為零成交（Green: 0 筆, ZMAC: 0 筆），靜默觀望中，跳過本次戰報發布以避免空數據發文。');
      return false;
    }
    return true;
  }

  async publishStatsThread(dryRun = false) {
    const stats = this.loadRealtimeStats();
    if (!stats) {
      console.log('[StatsPublisher] public/data.json is missing or corrupt. Cannot publish stats.');
      return false;
    }

    // Zero-trade suppression: skip publishing when both agents have 0 trades
    if (!this.shouldPublish(stats)) {
      return false;
    }

    console.log(`[StatsPublisher] Raw stats parsed. Green ROI: ${stats.green.roi.toFixed(2)}%, ZMAC ROI: ${stats.zmac.roi.toFixed(2)}%. Generating texts...`);
    const tweets = await this.generateThreadTexts(stats);

    console.log('\n--- [PREVIEW OF THREAD TWEETS] ---');
    tweets.forEach((t, i) => console.log(`[Tweet #${i+1}]:\n${t}\n`));
    console.log('-----------------------------------');

    const imagePath = await this.getBestChartToAttach(stats);
    if (imagePath) {
      console.log(`[StatsPublisher] Best visual asset to attach: ${imagePath}`);
    } else {
      console.log('[StatsPublisher] No chart image found. Publishing text-only thread.');
    }

    if (dryRun) {
      console.log('[StatsPublisher] [DRY RUN] Success simulation complete. Skipping actual Twitter post.');
      return true;
    }

    // Puppeteer shared browser sweep to compose thread
    const success = await browserManager.execute(async (page) => {
      // 1. Post the Main Tweet (Tweet #1, English, no link for algorithmic premium)
      console.log('[StatsPublisher] Navigating to compose page for main tweet...');
      await page.goto('https://x.com/compose/post', {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      await new Promise(r => setTimeout(r, 4000));

      const postUrl = page.url();
      if (postUrl.includes('login') || postUrl.includes('i/flow')) {
        throw new Error('❌ 未登入您的 X.com 帳號或登入已過期！請先執行「node src/login.js」來手動登入！');
      }

      console.log('[StatsPublisher] Composing main tweet...');
      const textareaSelector = 'div[data-testid="tweetTextarea_0"]';
      await page.waitForSelector(textareaSelector, { timeout: 15000 });
      await page.click(textareaSelector);

      // Clipboard Paste to bypass cashtag autocomplete bug
      await page.evaluate((sel, text) => {
        const el = document.querySelector(sel);
        el.innerHTML = '';
        const dt = new DataTransfer();
        dt.setData('text/plain', text);
        el.dispatchEvent(new ClipboardEvent('paste', {
          clipboardData: dt,
          bubbles: true,
          cancelable: true,
          composed: true
        }));
      }, textareaSelector, tweets[0]);

      await new Promise(r => setTimeout(r, 2000));

      // Upload Chart Image to main tweet
      if (imagePath && fs.existsSync(imagePath)) {
        console.log(`[StatsPublisher] Uploading chart attachment: ${imagePath}`);
        const fileInputSelector = 'input[data-testid="fileInput"][type="file"]';
        try {
          await page.waitForSelector(fileInputSelector, { timeout: 10000 });
          const fileInput = await page.$(fileInputSelector);
          if (fileInput) {
            await fileInput.uploadFile(imagePath);
            await new Promise(r => setTimeout(r, 4000)); // preview rendering
            console.log('[StatsPublisher] Chart upload complete!');
          }
        } catch (imgErr) {
          console.error('[StatsPublisher] Error uploading chart:', imgErr.message);
        }
      }

      // Click "Post" Button to send main tweet
      console.log('[StatsPublisher] Locating Post button...');
      const postBtnSelector = 'button[data-testid="tweetButton"]';
      await page.waitForSelector(postBtnSelector, { timeout: 12000 });
      
      const isEnabled = await page.evaluate((selector) => {
        const btn = document.querySelector(selector);
        return btn && !btn.disabled;
      }, postBtnSelector);

      if (!isEnabled) {
        throw new Error('Post button is disabled or not found');
      }

      console.log('[StatsPublisher] Clicking "Post" button...');
      await page.click(postBtnSelector);

      // Wait for complete
      console.log('[StatsPublisher] Waiting 10 seconds for Main Post transaction to confirm on-chain...');
      await new Promise(r => setTimeout(r, 10000));

      // 2. Perform 3-minute dynamic sleep to bypass bot triggers and optimize impressions
      console.log('[StatsPublisher] [ANTI-BOT] Main tweet posted successfully! Entering 3-minute asynchronous deep sleep before adding threads...');
      await page.goto('https://x.com/home', { waitUntil: 'networkidle2', timeout: 60000 });
      await new Promise(r => setTimeout(r, 180000)); // 3 Minutes (180 seconds)

      // 3. Navigate to get the status URL of our latest tweet
      console.log('[StatsPublisher] Locating newly posted tweet status URL...');
      await page.goto('https://x.com/home', { waitUntil: 'networkidle2', timeout: 60000 });
      await new Promise(r => setTimeout(r, 5000));

      const statusLink = await page.evaluate(() => {
        const articles = Array.from(document.querySelectorAll('article[role="article"]'));
        if (articles.length === 0) return null;
        for (const art of articles) {
          const links = Array.from(art.querySelectorAll('a[href*="/status/"]'));
          for (const link of links) {
            const href = link.getAttribute('href');
            if (href) return href;
          }
        }
        return null;
      });

      if (!statusLink) {
        throw new Error('❌ Unable to locate newly posted tweet status URL from timeline! anti-bot pacing failed.');
      }

      const statusUrl = 'https://x.com' + statusLink;
      console.log(`[StatsPublisher] Found new tweet URL: ${statusUrl}. Navigating to add Thread replies...`);

      // 4. Sequentially add Sub-Tweets (Tweet #2: Chinese, Tweet #3: Japanese)
      const subTweets = [tweets[1], tweets[2]];
      for (let i = 0; i < subTweets.length; i++) {
        await page.goto(statusUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 4000));

        const textboxSelector = 'div[role="textbox"][contenteditable="true"]';
        await page.waitForSelector(textboxSelector, { timeout: 15000 });
        await page.click(textboxSelector);

        console.log(`[StatsPublisher] Typing thread sub-tweet #${i+2}...`);
        
        // Simulating organic human typing delay
        for (const char of subTweets[i]) {
          await page.type(textboxSelector, char);
          await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 80));
        }

        if (page.simulateHumanScroll) {
          await page.simulateHumanScroll();
        }

        console.log('[StatsPublisher] Waiting for Reply button...');
        const replyBtnSelector = 'button[data-testid="tweetButtonInline"]';
        await page.waitForSelector(replyBtnSelector, { timeout: 10000 });
        
        console.log('[StatsPublisher] Clicking Reply button...');
        await page.click(replyBtnSelector);

        console.log('[StatsPublisher] Reply clicked. Waiting 8 seconds...');
        await new Promise(resolve => setTimeout(resolve, 8000));
        console.log(`[StatsPublisher] Thread sub-tweet #${i+2} posted successfully!`);
      }

      console.log('[StatsPublisher] SUCCESS: Timed multi-lingual stats Thread pacing completed!');
      return true;
    });

    return success;
  }
}

module.exports = new XStatsPublisher();

// Direct execution helper
if (require.main === module) {
  const argTest = process.argv.includes('--test');
  const pub = new XStatsPublisher();
  pub.publishStatsThread(argTest).catch(console.error);
}
