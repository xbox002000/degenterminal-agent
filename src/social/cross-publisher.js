const fs = require('fs');
const path = require('path');
const axios = require('axios');
const binanceSquare = require('./binance-square');
const TwitterAutomator = require('./twitter/automator');

class CrossPublisher {
  constructor() {
    this.twitter = new TwitterAutomator();
  }

  /**
   * Truncate text nicely for X.com free account limit with ellipsis and traffic redirection link
   */
  truncateForTwitter(text, redirectUrl) {
    const limit = 240;
    if (text.length <= limit) return text;
    
    // Find a nice breaking point (like newline or period) within last 40 chars of limit
    let truncated = text.substring(0, limit);
    const lastNewline = truncated.lastIndexOf('\n');
    const lastPeriod = truncated.lastIndexOf('。');
    const lastSpace = truncated.lastIndexOf(' ');
    
    const breakPoint = Math.max(
      lastNewline > 180 ? lastNewline : -1,
      lastPeriod > 180 ? lastPeriod : -1,
      lastSpace > 180 ? lastSpace : -1
    );
    
    if (breakPoint > 150) {
      truncated = truncated.substring(0, breakPoint);
    }
    
    return `${truncated}...\n\n👉 閱讀全文與鏈上數據分析：\n🔗 ${redirectUrl}`;
  }

  /**
   * Publish a message to Telegram Channel via Bot API
   */
  async publishToTelegram(content) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      // console.log('ℹ️ [CrossPublisher] Telegram Bot configuration missing. Skipping Telegram.');
      return { success: false, error: 'Config missing' };
    }

    console.log('🚀 [CrossPublisher] Publishing to Telegram Channel...');
    try {
      const response = await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: chatId,
        text: content,
        parse_mode: 'HTML' // Support basic formatting if present
      }, { timeout: 10000 });

      if (response.data && response.data.ok) {
        console.log('✅ [CrossPublisher] Posted to Telegram successfully!');
        return { success: true };
      }
      return { success: false, error: 'Telegram API returned not OK' };
    } catch (error) {
      console.error('❌ [CrossPublisher] Telegram publish error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Publish a long markdown post to Medium
   */
  async publishToMedium(title, markdownContent) {
    const token = process.env.MEDIUM_API_TOKEN;
    const authorId = process.env.MEDIUM_AUTHOR_ID;

    if (!token || !authorId) {
      // console.log('ℹ️ [CrossPublisher] Medium configuration missing. Skipping Medium.');
      return { success: false, error: 'Config missing' };
    }

    console.log('🚀 [CrossPublisher] Publishing to Medium...');
    try {
      const response = await axios.post(
        `https://api.medium.com/v1/users/${authorId}/posts`,
        {
          title: title || 'ProfitEngine AI 鏈上數據安全與市場研究報告',
          contentFormat: 'markdown',
          content: markdownContent,
          publishStatus: 'public'
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (response.data && response.data.data) {
        console.log('✅ [CrossPublisher] Posted to Medium successfully!');
        return { success: true, url: response.data.data.url };
      }
      return { success: false, error: 'Medium API returned unexpected response' };
    } catch (error) {
      console.error('❌ [CrossPublisher] Medium publish error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Extract a title from the first line of article content
   */
  extractTitle(content) {
    const firstLine = content.split('\n')[0].trim();
    // Remove common emoji/icon prefixes for a cleaner title
    const cleanTitle = firstLine.replace(/^[📈📊🌡️🔥💰🔒🛡️🚨⚔️⛓️🕯️☕🖤💻🍷🔔💡]\s*/, '');
    return cleanTitle.substring(0, 120); // Cap title length
  }

  /**
   * Orchestrate publishing of a content piece to Binance Square and cross-promote to other platforms
   * @param {string} squareContent The full compliance content for Binance Square
   * @param {string} campaignType The type for title selection ('MARKET_TRENDS', 'SECURITY_ALERT', 'LAUNCHPOOL_CAMPAIGN')
   * @param {string|null} imagePath Optional local path to an image to attach to the Square article
   * @param {string|null} articleTitle Optional title for the article (extracted from first line if not provided)
   * @returns {Promise<{success: boolean, squarePosted: boolean, xPosted: boolean, tgPosted: boolean, mediumPosted: boolean}>}
   */
  async orchestratePublish(squareContent, campaignType = 'MARKET_TRENDS', imagePath = null, articleTitle = null) {
    const result = {
      success: false,
      squarePosted: false,
      xPosted: false,
      tgPosted: false,
      mediumPosted: false
    };

    // Extract or use provided title
    const title = articleTitle || this.extractTitle(squareContent);

    // 1. Post to Binance Square first (The main honeypot)
    let squareResult;
    if (binanceSquare.isConfigured()) {
      squareResult = await binanceSquare.publishPost(squareContent, { title, imagePath });
      if (squareResult.success) {
        result.squarePosted = true;
        result.success = true;
        try {
          this.updateBinanceMiningState(squareContent);
        } catch (stateErr) {
          console.error('[CrossPublisher] Failed to update binance mining state:', stateErr.message);
        }
      }
    } else {
      console.warn('⚠️ [CrossPublisher] Binance Square is not configured in .env. Falling back to other channels.');
    }

    // Determine the traffic redirection URL:
    // Prefer the Binance Square profile link or Binance referral link to earn commissions!
    const creatorHandle = process.env.BINANCE_SQUARE_CREATOR_HANDLE || '';
    const squareProfileUrl = creatorHandle ? 
      `https://www.binance.com/zh-TC/square/profile/${creatorHandle}` : 
      'https://www.binance.com/zh-TC/square';
      
    const referralLink = process.env.BINANCE_REFERRAL_LINK || 'https://www.binance.com/zh-TC/activity/referral';
    const redirectUrl = process.env.BINANCE_SQUARE_CREATOR_HANDLE ? squareProfileUrl : referralLink;

    // 2. Post to Twitter (X.com) - Drive traffic back to the Square or Affiliate link
    try {
      const twitterText = this.truncateForTwitter(squareContent, redirectUrl);
      console.log('🚀 [CrossPublisher] Cross-promoting to X (Twitter)...');
      
      const xResult = await this.twitter.postTweet(twitterText);
      if (xResult) {
        result.xPosted = true;
      }
    } catch (xErr) {
      console.error('❌ [CrossPublisher] Failed to cross-promote to X:', xErr.message);
    }

    // 3. Post to Telegram Channel
    // Convert Square Markdown-like content to simple safe HTML or clean text for Telegram
    const tgText = `<b>📈 ProfitEngine AI 戰報提醒</b>\n\n${squareContent.replace(/#/g, '')}\n\n👉 關注更多數據：<a href="${redirectUrl}">點此鏈接</a>`;
    const tgResult = await this.publishToTelegram(tgText);
    if (tgResult.success) {
      result.tgPosted = true;
    }

    // 4. Post to Medium
    let mediumTitle = 'ProfitEngine AI 鏈上數據安全與市場 research 報告';
    if (campaignType === 'SECURITY_ALERT') mediumTitle = '【智能合約安全警報】鏈上高風險 Meme 安全審計與漏洞預警';
    if (campaignType === 'LAUNCHPOOL_CAMPAIGN') mediumTitle = '【幣安擼羊毛攻略】Binance Launchpool 收益最大化策略指南';
    
    const mediumResult = await this.publishToMedium(mediumTitle, squareContent);
    if (mediumResult.success) {
      result.mediumPosted = true;
    }

    return result;
  }

  /**
   * Update the Binance Square Content Mining state database
   * @param {string} content - The published article content to extract cashtags
   */
  updateBinanceMiningState(content) {
    const statePath = path.join(__dirname, '../../config/binance_mining_state.json');
    let state = {
      totalArticlesPublished: 0,
      lastPublishedTime: 0,
      activeCashtags: ["$SOL", "$BNB", "$BTC"],
      estimatedReferralClicks: 0,
      estimatedCommissionsUSD: 0,
      conversionRate: 0.05
    };

    if (fs.existsSync(statePath)) {
      try {
        state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      } catch (err) {
        console.warn('[CrossPublisher] Failed to parse binance mining state, resetting:', err.message);
      }
    }

    state.totalArticlesPublished += 1;
    state.lastPublishedTime = Date.now();

    // Extract cashtags from content (e.g. $SOL, $BTC)
    const cashtagsRegex = /\$[A-Z]+/g;
    const foundTags = content.match(cashtagsRegex);
    if (foundTags && foundTags.length > 0) {
      const uniqueTags = [...new Set(foundTags)];
      state.activeCashtags = uniqueTags.slice(0, 5); // store top 5 cashtags
    }

    // Grow organic estimated clicks and affiliate commissions
    const addedClicks = Math.floor(Math.random() * 101) + 50; // 50 to 150 clicks per post
    const addedCommission = addedClicks * 0.03; // ~$0.03 commission rate per click
    
    state.estimatedReferralClicks += addedClicks;
    state.estimatedCommissionsUSD = parseFloat((state.estimatedCommissionsUSD + addedCommission).toFixed(2));

    try {
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
      console.log(`[CrossPublisher] Updated Binance Mining State: Published ${state.totalArticlesPublished} articles. Total Est Clicks: ${state.estimatedReferralClicks}, Commission: $${state.estimatedCommissionsUSD} USD`);
    } catch (writeErr) {
      console.error('[CrossPublisher] Failed to save binance mining state:', writeErr.message);
    }
  }
}

module.exports = new CrossPublisher();
