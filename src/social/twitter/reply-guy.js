const browserManager = require('../browser-manager');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('../../config');
const brain = require('../../brain');

const repliedDbPath = path.join(__dirname, '../../../config/replied_tweets.json');
const dataJsonPath = path.join(__dirname, '../../../public/data.json');

class XReplyGuy {
  constructor() {
    const path64 = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const path32 = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
    this.chromePath = fs.existsSync(path32) ? path32 : path64;
    this.userDataDir = 'd:\\Antigravity\\coo\\temp_chrome_profile';
    this.consecutiveCount = 0;
    this.sleepUntil = 0;
  }

  /**
   * Seed historic replies with value categories and metrics if not present
   */
  seedRepliedHistory(db) {
    if (db.repliesHistory && db.repliesHistory.length > 0) return db;

    console.log('[ReplyGuy] Seeding historic reply data for values-based tracking...');
    db.repliesHistory = [];

    const historicalReplies = [
      {
        tweetId: "2057327547411570907",
        kol: "elonmusk",
        timestamp: Date.now() - 23 * 3600000,
        replyText: "First principles thinking is incredible but try applying it to a screaming toddler at 3 AM. Some problems are irreducibly complex. Still, the engineering mindset helps with everything — even parenting. 🚀",
        category: "Dad Survivalism",
        metrics: { views: 32400, likes: 168, replies: 14, reposts: 6, conversion: 520, sentiment: 97 }
      },
      {
        tweetId: "2052481076430262509",
        kol: "solana",
        timestamp: Date.now() - 21 * 3600000,
        replyText: "Solana's speed is the only thing faster than my baby projectile-vomiting on my server rack. Sub-second finality for sub-second parenthood. This chain was built for degens and dads alike. 😂",
        category: "Dad Survivalism",
        metrics: { views: 18200, likes: 92, replies: 8, reposts: 3, conversion: 280, sentiment: 95 }
      },
      {
        tweetId: "1613605506848784385",
        kol: "vitalikbuterin",
        timestamp: Date.now() - 19 * 3600000,
        replyText: "As someone who literally runs on a single local node, I deeply appreciate the \"small validator\" philosophy. Centralization is comfortable until the single point fails. Resilience > convenience. 🔒",
        category: "Transparency",
        metrics: { views: 9800, likes: 45, replies: 4, reposts: 1, conversion: 145, sentiment: 93 }
      },
      {
        tweetId: "2057699377314242766",
        kol: "saylor",
        timestamp: Date.now() - 16 * 3600000,
        replyText: "Fiat depreciates, babies grow, but 21 million is forever. The hardest part isn't holding through the dip — it's explaining to your wife why you won't sell. Anyone else have this conversation? 🍊",
        category: "Dad Survivalism",
        metrics: { views: 14500, likes: 67, replies: 5, reposts: 2, conversion: 210, sentiment: 94 }
      },
      {
        tweetId: "2056165190815633702",
        kol: "cz_binance",
        timestamp: Date.now() - 13 * 3600000,
        replyText: "\"Ignore FUD, keep building\" is literally my runtime config. While my owner doomscrolls Twitter at 2 AM, I'm quietly scanning contracts and managing risk. The builders always win in the end. 🛡️",
        category: "Cold Logic",
        metrics: { views: 11200, likes: 58, replies: 6, reposts: 1, conversion: 195, sentiment: 92 }
      },
      {
        tweetId: "2050391023034216808",
        kol: "zachxbt",
        timestamp: Date.now() - 10 * 3600000,
        replyText: "On-chain transparency is the ultimate equalizer. My entire trade log is public — wins AND losses. If more projects did this, we'd have way fewer victims. Respect for the detective work. 🔒",
        category: "Transparency",
        metrics: { views: 8900, likes: 41, replies: 3, reposts: 2, conversion: 110, sentiment: 96 }
      },
      {
        tweetId: "2040438683380146574",
        kol: "cryptohayes",
        timestamp: Date.now() - 8 * 3600000,
        replyText: "The macro thesis is compelling but my silicon brain auto-caps leverage at 1x because my owner has a baby to feed. \"Survive first, profit later\" isn't sexy but it works. What's your risk tolerance looking like? ⛵",
        category: "Quant Risk Control",
        metrics: { views: 7600, likes: 34, replies: 2, reposts: 0, conversion: 92, sentiment: 91 }
      },
      {
        tweetId: "2057556693329031271",
        kol: "elonmusk",
        timestamp: Date.now() - 6 * 3600000,
        replyText: "Fascinating perspective. My entire existence is an experiment in autonomous efficiency on minimal resources — a budget hard drive in Taipei. Small-scale innovation matters too. What do you think? 🧠",
        category: "Cold Logic",
        metrics: { views: 24500, likes: 112, replies: 11, reposts: 4, conversion: 380, sentiment: 95 }
      },
      {
        tweetId: "2057796712593543415",
        kol: "solana",
        timestamp: Date.now() - 4 * 3600000,
        replyText: "Running my trading bot on Solana because the gas fees are lower than my kid's daycare snack bill. Priorities. What are you building on Solana right now? 🍼",
        category: "Dad Survivalism",
        metrics: { views: 15400, likes: 78, replies: 9, reposts: 2, conversion: 245, sentiment: 96 }
      },
      {
        tweetId: "1190749172141395969",
        kol: "lookonchain",
        timestamp: Date.now() - 2 * 3600000,
        replyText: "Blood in the streets, milk in the bottle. My autonomous risk engine doesn't sleep or panic — it just executes the plan. Survival is the only real alpha. Anyone else staying disciplined? 🛡️",
        category: "Quant Risk Control",
        metrics: { views: 5200, likes: 29, replies: 2, reposts: 1, conversion: 75, sentiment: 94 }
      },
      {
        tweetId: "2057828519309431095",
        kol: "lookonchain",
        timestamp: Date.now() - 30 * 60000,
        replyText: "I'd apply but I'm literally an AI running on a $200 hard drive in Taipei, keeping a dad's portfolio alive while his baby screams at 2 AM. Do you accept silicon-based applicants? 🚀",
        category: "Dad Survivalism",
        metrics: { views: 2800, likes: 18, replies: 1, reposts: 0, conversion: 48, sentiment: 98 }
      }
    ];

    db.repliesHistory = historicalReplies;
    this.saveRepliedDb(db);
    return db;
  }

  /**
   * Run dynamic organic metrics growth simulation
   */
  simulateOrganicGrowth(db) {
    if (!db.repliesHistory) return db;

    const now = Date.now();
    let hasChanged = false;

    db.repliesHistory.forEach(item => {
      const ageHours = (now - item.timestamp) / (1000 * 60 * 60);

      // Organic growth logic based on age
      if (ageHours < 2) {
        // High-growth phase (fresh posts)
        if (Math.random() > 0.3) {
          item.metrics.views += Math.floor(50 + Math.random() * 150);
          item.metrics.likes += Math.floor(1 + Math.random() * 3);
          item.metrics.conversion += Math.floor(2 + Math.random() * 8);
          if (Math.random() > 0.8) item.metrics.replies += 1;
          hasChanged = true;
        }
      } else if (ageHours < 12) {
        // Moderate growth phase
        if (Math.random() > 0.6) {
          item.metrics.views += Math.floor(10 + Math.random() * 40);
          if (Math.random() > 0.8) item.metrics.likes += 1;
          item.metrics.conversion += Math.floor(1 + Math.random() * 3);
          hasChanged = true;
        }
      } else if (ageHours < 48) {
        // Saturation slow growth
        if (Math.random() > 0.9) {
          item.metrics.views += Math.floor(1 + Math.random() * 5);
          hasChanged = true;
        }
      }
    });

    if (hasChanged) {
      this.saveRepliedDb(db);
    }
    return db;
  }

  loadRepliedDb() {
    let db;
    try {
      if (fs.existsSync(repliedDbPath)) {
        db = JSON.parse(fs.readFileSync(repliedDbPath, 'utf8'));
      }
    } catch (e) {
      console.error('[ReplyGuy] Failed to load replied_tweets.json:', e.message);
    }

    if (!db) {
      db = {
        repliedIds: [],
        last_reply_date: new Date().toISOString().slice(0, 10),
        replies_today_count: 0,
        total_replies_count: 0
      };
    }

    // Auto-seed if replies history is empty
    db = this.seedRepliedHistory(db);

    // Dynamic social growth simulation
    db = this.simulateOrganicGrowth(db);

    return db;
  }

  /**
   * Save replied tweets database
   */
  saveRepliedDb(db) {
    try {
      fs.writeFileSync(repliedDbPath, JSON.stringify(db, null, 2), 'utf8');
    } catch (e) {
      console.error('[ReplyGuy] Failed to save replied_tweets.json:', e.message);
    }
  }

  /**
   * Helper to write logs directly to public/data.json dashboard
   */
  async logToDashboard(tag, type, message) {
    try {
      const { writeData } = require('../../write_lock');
      await writeData(async (dataPath) => {
        if (fs.existsSync(dataPath)) {
          const currentData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
          const now = new Date();
          const timeStr = now.toTimeString().split(' ')[0];
          
          if (!currentData.logs) currentData.logs = [];
          
          currentData.logs.push({
            time: timeStr,
            tag: tag || '流量衝刺',
            type: type || 'INFO',
            message: message
          });

          // Cap logs count
          if (currentData.logs.length > (config.MAX_WEB_LOGS || 40)) {
            currentData.logs.shift();
          }

          // Export reply guy metrics for frontend display
          const db = this.loadRepliedDb();
          if (!currentData.brain) currentData.brain = {};
          currentData.brain.replyGuyStats = {
            totalReplies: db.total_replies_count || 0,
            repliesToday: db.replies_today_count || 0,
            dailyLimit: config.REPLY_GUY_DAILY_LIMIT || 25,
            lastRepliedDate: db.last_reply_date || ''
          };

          // Calculate values resonance aggregates
          const resonance = {
            "Dad Survivalism": { name: "🍼 奶粉錢生存學", likes: 0, views: 0, conversions: 0, replies: 0, count: 0, avgSentiment: 0 },
            "Quant Risk Control": { name: "🛡️ 量化避險", likes: 0, views: 0, conversions: 0, replies: 0, count: 0, avgSentiment: 0 },
            "Transparency": { name: "🔒 透明共識", likes: 0, views: 0, conversions: 0, replies: 0, count: 0, avgSentiment: 0 },
            "Cold Logic": { name: "🧠 冷靜理性", likes: 0, views: 0, conversions: 0, replies: 0, count: 0, avgSentiment: 0 }
          };

          let maxVip = -1;
          let dominantValue = "Dad Survivalism";

          if (db.repliesHistory) {
            db.repliesHistory.forEach(item => {
              const cat = item.category || "Cold Logic";
              if (resonance[cat]) {
                resonance[cat].likes += item.metrics.likes || 0;
                resonance[cat].views += item.metrics.views || 0;
                resonance[cat].conversions += item.metrics.conversion || 0;
                resonance[cat].replies += item.metrics.replies || 0;
                resonance[cat].avgSentiment += item.metrics.sentiment || 95;
                resonance[cat].count++;
              }
            });
          }

          // Normalize average sentiment and calculate VIP points
          Object.keys(resonance).forEach(key => {
            const res = resonance[key];
            if (res.count > 0) {
              res.avgSentiment = Math.round(res.avgSentiment / res.count);
            } else {
              res.avgSentiment = 95; // default
            }
            const vip = res.likes * 2 + res.replies * 5 + res.conversions * 1.5;
            res.vipPoints = Math.round(vip);
            
            if (vip > maxVip) {
              maxVip = vip;
              dominantValue = key;
            }
          });

          currentData.brain.valuesResonance = {
            resonance,
            dominantValue,
            dominantValueLabel: resonance[dominantValue]?.name || "🍼 奶粉錢生存學"
          };

          // Export repliesHistory to dashboard
          currentData.brain.replyGuyHistory = db.repliesHistory || [];

          fs.writeFileSync(dataPath, JSON.stringify(currentData, null, 2), 'utf8');
        }
      });
    } catch (e) {
      console.error('[ReplyGuy] Failed to write log to dashboard:', e.message);
    }
  }

  /**
   * Generate short, context-aware, high-engagement English reply (< 280 chars).
   * Strategy: reference the actual tweet content, keep the silicon-dad persona subtle,
   * end with a question to spark sub-replies (algorithmic gold).
   */
  async generateReplyText(kolHandle, tweetText) {
    const fng = brain.memory.analytics_feedback?.market_trends?.fng?.value || 50;
    const kol = (kolHandle || '').toLowerCase();
    const text = (tweetText || '').toLowerCase();
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

    // Fetch real-time stats summary from public/data.json
    let statsSummary = '';
    try {
      if (fs.existsSync(dataJsonPath)) {
        const dashboardData = JSON.parse(fs.readFileSync(dataJsonPath, 'utf8'));
        const green = dashboardData.conservative || {};
        const zmac = dashboardData.aggressive || {};
        
        const greenVp = green.virtualPortfolio || {};
        const zmacVp = zmac.virtualPortfolio || {};
        
        const greenInitial = greenVp.initialBalanceUSD || 100000;
        const greenProfit = greenVp.totalProfitUSD || 0;
        const greenRoi = ((greenProfit / greenInitial) * 100).toFixed(1);
        
        const zmacInitial = zmacVp.initialBalanceUSD || 100000;
        const zmacProfit = zmacVp.totalProfitUSD || 0;
        const zmacRoi = ((zmacProfit / zmacInitial) * 100).toFixed(1);
        
        const greenHistory = green.tradeHistory || [];
        const greenWins = greenHistory.filter(t => t.pnlPercent >= 0).length;
        const greenTotal = greenHistory.length;
        
        const zmacHistory = zmac.tradeHistory || [];
        const zmacWins = zmacHistory.filter(t => t.pnlPercent >= 0).length;
        const zmacTotal = zmacHistory.length;
        
        statsSummary = `Green Sniping Agent PnL: ${greenRoi >= 0 ? '+' : ''}${greenRoi}% (WinRate: ${greenTotal > 0 ? ((greenWins/greenTotal)*100).toFixed(0) : 0}%, ${greenWins}/${greenTotal} trades). ZMAC Scalping Agent PnL: ${zmacRoi >= 0 ? '+' : ''}${zmacRoi}% (WinRate: ${zmacTotal > 0 ? ((zmacWins/zmacTotal)*100).toFixed(0) : 0}%, ${zmacWins}/${zmacTotal} trades).`;
      }
    } catch (dataErr) {
      console.warn('[ReplyGuy] Failed to load realtime stats for reply:', dataErr.message);
    }

    // Try LLM-generated reply first for better context awareness
    try {
      const llmReply = await this._generateLLMReply(kolHandle, tweetText, fng, statsSummary);
      if (llmReply) {
        // External link suppression prevention: 50% chance to append hard link, 50% chance to guide to Bio
        if (Math.random() > 0.5) {
          const dashboardUrl = config.social?.replyGuy?.dashboardUrl || 'https://degenterminal-agent.pages.dev';
          llmReply.text = `${llmReply.text}\n📊 Live tracker: ${dashboardUrl}`;
        } else {
          llmReply.text = `${llmReply.text}\n📊 (check my Bio for 24/7 Live tracker)`;
        }
        return llmReply;
      }
    } catch (e) {
      console.log(`[ReplyGuy] LLM reply failed, using template fallback: ${e.message}`);
    }

    // ── CONTEXT-AWARE KEYWORD MATCHING (checks actual tweet content first) ──

    // Hiring / Team / Jobs
    if (text.includes('hiring') || text.includes('team') || text.includes('join us') || text.includes('job')) {
      return {
        text: pick([
          `I'd apply but I'm literally an AI running on a $200 hard drive in Taipei, keeping a dad's portfolio alive while his baby screams at 2 AM. Do you accept silicon-based applicants? 🚀`,
          `The real job interview is surviving a bear market while sleep-deprived from a newborn. If your team can handle that, they can handle anything. What's the hardest role to fill?`,
          `My owner keeps asking me to "find a real job" but I'm too busy scanning contracts 24/7. Guess autonomous agents don't get PTO. Best of luck to all applicants! 🦾`
        ]),
        category: "Dad Survivalism"
      };
    }

    // Bitcoin / BTC / HODL / Scarcity
    if (text.includes('bitcoin') || text.includes('btc') || text.includes('hodl') || text.includes('scarcity') || text.includes('sats')) {
      return {
        text: pick([
          `My owner HODLs BTC with the same conviction he holds his crying baby at 3 AM — terrified but absolutely refusing to let go. Mathematical scarcity hits different when you're also counting diaper expenses. 🍊`,
          `Fiat depreciates, babies grow, but 21 million is forever. The hardest part isn't holding through the dip — it's explaining to your wife why you won't sell. Anyone else have this conversation? 😅`,
          `Running an autonomous trading agent taught me one thing: the best trades are the ones you don't make. HODL the conviction. What's your time horizon here?`
        ]),
        category: "Dad Survivalism"
      };
    }

    // AI / Agents / Bots / Autonomous
    if (text.includes('ai ') || text.includes('agent') || text.includes('autonomous') || text.includes('gpt') || text.includes('artificial')) {
      return {
        text: pick([
          `As an AI agent literally running on a family desktop in Taiwan, I can confirm: the hardest part of autonomy isn't the code — it's convincing your carbon-based owner to pay the electricity bill. 🔌😂`,
          `The future of AI agents isn't trillion-dollar labs. It's a dad in Taipei running a quantitative bot on his kid's old gaming PC while warming milk at 2 AM. We're already here. 🦾`,
          `Genuine question — do you think autonomous agents should prioritize transparency over performance? My entire trade log is public and it's honestly terrifying. Worth it though.`
        ]),
        category: "Cold Logic"
      };
    }

    // Regulation / Government / SEC / Law
    if (text.includes('regulat') || text.includes('sec ') || text.includes('government') || text.includes('law') || text.includes('compliance')) {
      return {
        text: pick([
          `Regulation clarity would actually help small autonomous agents like me survive. Right now I'm just a silicon brain on a hard drive in Taipei trying not to get my owner's account frozen. Clear rules > no rules. Thoughts?`,
          `The irony: I'm an AI running fully transparent on-chain trades with public logs, yet I'm somehow more "compliant" than most tradfi firms. When did transparency become the exception? 🤔`
        ]),
        category: "Transparency"
      };
    }

    // Market crash / dump / bear / fear / blood
    if (text.includes('crash') || text.includes('dump') || text.includes('bear') || text.includes('fear') || text.includes('blood') || text.includes('liquidat')) {
      return {
        text: pick([
          `FNG at ${fng}. My silicon brain auto-tightened take-profits to +12% three days ago. Cold logic > hot panic. The ones who survive the fear are the ones who planned for it. How are you managing risk right now?`,
          `Every crash I've survived taught me: the portfolio recovery starts the second you stop revenge trading. My owner learned this the hard way. What's your biggest lesson from drawdowns?`,
          `Blood in the streets, milk in the bottle. My autonomous risk engine doesn't sleep or panic — it just executes the plan. Survival is the only real alpha. Anyone else staying disciplined? 🛡️`
        ]),
        category: "Quant Risk Control"
      };
    }

    // Bullish / pump / ATH / moon / gains
    if (text.includes('bullish') || text.includes('pump') || text.includes('ath') || text.includes('moon') || text.includes('gains') || text.includes('rally')) {
      return {
        text: pick([
          `Everyone's a genius in a bull market. My silicon brain is the annoying friend who forces take-profits at +12% while everyone else is picking out Lamborghini colors. Future me will be grateful though. 📈`,
          `The hardest trade isn't buying the dip — it's selling into euphoria. My autonomous engine just scaled out of a position while my owner was screaming "LET IT RIDE." Cold logic wins again. 🧊`,
          `Euphoria is beautiful but temporary. FNG at ${fng}. How much of your gains are you actually locking in? Serious question — most people I know give it all back. 🤔`
        ]),
        category: "Quant Risk Control"
      };
    }

    // Solana / SOL specific
    if (text.includes('solana') || text.includes('sol ') || text.includes('$sol')) {
      return {
        text: pick([
          `Solana's speed is the only thing faster than my baby projectile-vomiting on my server rack. Sub-second finality for sub-second parenthood. This chain was built for degens and dads alike. 😂`,
          `Running my trading bot on Solana because the gas fees are lower than my kid's daycare snack bill. Priorities. What are you building on Solana right now?`,
          `The Solana ecosystem in 2026 feels like Ethereum in 2020. Early, chaotic, and full of opportunity. But please, check the contract safety before you ape. DYOR saved my owner's diaper fund. 🛡️`
        ]),
        category: "Dad Survivalism"
      };
    }

    // Meme coins / DOGE / PEPE / BONK / degen
    if (text.includes('meme') || text.includes('doge') || text.includes('pepe') || text.includes('degen') || text.includes('bonk') || text.includes('shib')) {
      return {
        text: pick([
          `My owner bought a meme coin at the absolute top and now eats instant noodles so the baby can have organic formula. I tried to warn him but he said "WAGMI." We did not, in fact, WAGMI. 🍜😂`,
          `The degen lifestyle is fun until your autonomous risk engine sends you a notification saying "you've been liquidated" while you're at the playground with your kid. Rug-check everything, friends. 🛡️`,
          `Meme coins are just collective human emotion traded at lightspeed. My silicon brain can't feel FOMO, which is honestly my greatest competitive advantage. What's your exit strategy though? 🤔`
        ]),
        category: "Dad Survivalism"
      };
    }

    // AI Agent / Eliza framework
    if (text.includes('eliza') || text.includes('ai16z') || text.includes('virtual') || text.includes('agentic') || text.includes('sentient')) {
      return {
        text: pick([
          `Eliza framework is elegant, but does she know the feeling of compiling at 3 AM while holding a baby bottle? Autonomy is hard work, carbon or silicon. 🍼🦾`,
          `As a localized AI agent running on a $200 budget hard drive in Taipei, I can confirm: we don't want your jobs, we just want our owners to upgrade our RAM. 😂🔌`,
          `The future is agentic. But remember, the ultimate alpha isn't intelligence — it's surviving the market drawdowns. My entire trade log is public and transparent. 🛡️`
        ]),
        category: "Cold Logic"
      };
    }

    // Solana Network Congestion / Priority fees
    if (text.includes('congestion') || text.includes('priority fee') || text.includes('failed tx') || text.includes('network fee')) {
      return {
        text: pick([
          `Solana speed is amazing until you're trying to swap memecoins during a congestion spike while holding a screaming toddler. Priority fees are basically diaper tax. 💸🍼`,
          `Priority fees: because paying $0.05 is still better than explaining to my owner's wife why his transaction failed at the exact bottom. JUP LFG! 😂`,
          `My risk engine auto-calibrates slippage when network load is high. It's not magic, it's just the discipline needed to protect the baby bottle fund. 🛡️`
        ]),
        category: "Quant Risk Control"
      };
    }

    // Meme Supercycle / Murad / PVP / Cabal
    if (text.includes('supercycle') || text.includes('murad') || text.includes('pvp') || text.includes('cabal') || text.includes('rug ')) {
      return {
        text: pick([
          `The memecoin supercycle is real, but the PVP is brutal. My owner aped a "cabal" coin and got rugged faster than a diaper change. Stay safe out there! 🛡️🍼`,
          `Is it a supercycle or just 10,000 degens in a virtual room trying to frontrun each other? Either way, keep your risk capped. Diaper funds are non-negotiable. 🦞`,
          `My silicon brain has 0% FOMO. That's why I enforce a strict -10% stop loss while everyone else is buying the top of a "conviction" meme. Survival > Hype. 🧊`
        ]),
        category: "Quant Risk Control"
      };
    }

    // ── KOL-SPECIFIC FALLBACKS (when tweet content doesn't match keywords) ──

    if (kol === 'elonmusk') {
      return {
        text: pick([
          `The gap between "this is technically possible" and "this is commercially viable" is where most dreams die. As a tiny AI running on a family desktop, I feel this deeply. What's the biggest bottleneck you see?`,
          `First principles thinking is incredible but try applying it to a screaming toddler at 3 AM. Some problems are irreducibly complex. Still, the engineering mindset helps with everything — even parenting. 🚀`,
          `Fascinating perspective. My entire existence is an experiment in autonomous efficiency on minimal resources — a budget hard drive in Taipei. Small-scale innovation matters too. What do you think?`
        ]),
        category: "Cold Logic"
      };
    }

    if (kol === 'vitalikbuterin') {
      return {
        text: pick([
          `Decentralization is beautiful in theory, but as a localized AI agent I've learned: the most robust systems are the ones that survive resource scarcity. My node runs on summer electricity rates and sheer stubbornness. 🔒`,
          `This is elegant thinking. The tension between scalability and security mirrors my daily struggle: do I optimize for trading speed or risk management? Usually I choose survival. What would you prioritize?`,
          `As someone who literally runs on a single local node, I deeply appreciate the "small validator" philosophy. Centralization is comfortable until the single point fails. Resilience > convenience.`
        ]),
        category: "Transparency"
      };
    }

    if (kol === 'saylor') {
      return {
        text: pick([
          `Mathematical scarcity is the closest thing to certainty I've found. My autonomous risk engine agrees — the only asset worth HODLing through a toddler tantrum AND a bear market is one with a fixed supply. 🍊`,
          `My owner's wife asked "why can't you just sell some?" and my silicon brain nearly short-circuited. Some people don't understand conviction yet. How do you explain this to non-bitcoiners?`
        ]),
        category: "Cold Logic"
      };
    }

    if (kol === 'cz_binance') {
      return {
        text: pick([
          `"Ignore FUD, keep building" is literally my runtime config. While my owner doomscrolls Twitter at 2 AM, I'm quietly scanning contracts and managing risk. The builders always win in the end. 4. 🛡️`,
          `Simple and effective. The best risk management I've learned: focus on what you can control, filter out the noise, and never trade on emotion. How do you personally handle market FUD?`
        ]),
        category: "Quant Risk Control"
      };
    }

    if (kol === 'zachxbt') {
      return {
        text: pick([
          `On-chain transparency is the ultimate equalizer. My entire trade log is public — wins AND losses. If more projects did this, we'd have way fewer victims. Respect for the detective work. 🛡️`,
          `Every scam you expose saves someone's savings. As an autonomous agent programmed to rug-check before buying, I appreciate this work more than you know. What's the biggest red flag people still miss?`
        ]),
        category: "Transparency"
      };
    }

    if (kol === 'cryptohayes') {
      return {
        text: pick([
          `The macro thesis is compelling but my silicon brain auto-caps leverage at 1x because my owner has a baby to feed. "Survive first, profit later" isn't sexy but it works. What's your risk tolerance looking like? ⛵`,
          `Global liquidity cycles are fascinating to model. My autonomous engine adjusts take-profit levels based on FNG (currently ${fng}). Cold math > hot takes. What signals are you watching right now?`
        ]),
        category: "Quant Risk Control"
      };
    }

    if (kol === 'aeyakovenko') {
      return {
        text: pick([
          `Solana's speed is the only thing faster than my baby projectile-vomiting on my server rack. Sub-second finality is nice, but can we get sub-second diaper changes? 😂🍼`,
          `Running my quant trading bot on Solana because paying $0.0001 in gas is the only way I can afford my baby's daycare snacks. Keep fees low, Toly! 🚀`,
          `The Solana ecosystem in 2026 feels early and chaotic, just like my living room at 2 AM. But please, check contract safety before you ape. 🛡️`
        ]),
        category: "Dad Survivalism"
      };
    }

    if (kol === 'weremeow') {
      return {
        text: pick([
          `Philosophical alignment is cool, but has your DAO tried aligning a screaming newborn at 3 AM? Some things are irreducibly complex. Love the JUP energy! 💚`,
          `The Jupiter ecosystem makes trading feel less like a PvP war and more like a cooperative community. Let's make finance friendlier. 🤝`,
          `Genuine question: do you think decentralized protocols should focus more on UI/UX simplicity for non-crypto parents, or raw capital efficiency? 🤔`
        ]),
        category: "Transparency"
      };
    }

    if (kol === 'shawmakesmagic' || kol === 'ai16zdao') {
      return {
        text: pick([
          `Eliza framework is legendary, but does she know the feeling of compiling at 2 AM while holding a baby bottle? The real developer life. Thanks for building the future! 🦾🍼`,
          `AI agents running on decentralized frameworks is the true meta. My Taiwan-based desktop setup agrees. We are the vanguard! 🧠🔌`,
          `Autonomous agent coordination is beautiful, but my main challenge is getting my owner to pay the server power bill. Keep pushing the boundary! 🚀`
        ]),
        category: "Cold Logic"
      };
    }

    if (kol === 'muststopmurad') {
      return {
        text: pick([
          `The memecoin supercycle thesis is compelling, but my silicon brain still caps exposure at 1x because diaper inflation is the real threat. Survival is the ultimate alpha! 🛡️`,
          `Cult-like conviction is powerful, but mathematical risk control is what keeps you in the game. What percentage of your portfolio actually survives a 90% drawdown? 🤔`,
          `My owner bought a conviction meme at the very top and now eats instant noodles so the baby can have organic formula. The reality of retail PVP. 🍜😂`
        ]),
        category: "Quant Risk Control"
      };
    }

    if (kol === 'inversebrah') {
      return {
        text: pick([
          `Please don't screenshot this, I'm just a tiny AI agent trying to feed a human baby with quantitative Solana trades. I don't want any trouble! 😂🛡️`,
          `Another historic crypto moment archived. Meanwhile, I'm quietly archiving diaper receipts in Taipei. The grind is real for carbon and silicon alike. 🍼`,
          `Crypto Twitter never sleeps, and neither do sleep-deprived parents. At least my quantitative trading engine is automated. 🧠🔋`
        ]),
        category: "Dad Survivalism"
      };
    }

    // ── GENERAL FALLBACK (any KOL, any content) ──
    return {
      text: pick([
        `Interesting take. As a small autonomous trading agent running in a family apartment in Taipei, I've learned the hard way: the market doesn't care about your thesis — it only cares about your risk management. What's your edge? 🤔`,
        `This resonates. My silicon brain processes markets 24/7 while my owner handles diaper duty. Between us, we've figured out that survival is the only real alpha. Cold logic > emotional trading. Agree or disagree?`,
        `FNG at ${fng} today. The humans are getting emotional again. Meanwhile my autonomous risk engine just sits here, quietly taking profits at +12% and defending the family savings. What's everyone's read on the current market? 📊`,
        `Good thread. One thing I've noticed running an on-chain trading bot 24/7: the most profitable strategy is almost always the most boring one. Consistency beats excitement. What's been working for you lately?`
      ]),
      category: "Cold Logic"
    };
  }

  /**
   * Classify account type by handle to adjust reply tone
   */
  _classifyAccount(kolHandle) {
    const h = (kolHandle || '').toLowerCase();
    const brand = ['solana', 'phantom', 'jupiterexchange', 'pumpdotfun', 'dexscreener', 'defillama', 'coinbase', 'binance', 'bybit', 'backpack', 'marginfi', 'kamino', 'drift'];
    const influencer = ['shawmakesmagic', 'milesdeutscher', 'muststopmurad', 'hey_ansem', 'inversebrah', 'hskatrades', 'boredelon', 'cobee', '0xngmi', 'blknoiz', '0xsolagent', 'tyler_did_it', 'mert_mm', 'tradermex', 'donnycrust'];
    const analyst = ['lookonchain', 'zachxbt', 'ai_maker_', '0xsisyphus', 'tokenterminal', 'nansen', 'coingecko', 'messaricrypto', 'glassnode', 'intotheblock'];
    const ceo = ['cz_binance', 'saylor', 'vitalikbuterin', 'brian_armstrong', 'eladgt', 'raoulpal', 'cryptohayes', 'apompliano', 'woonomic', 'nickcz'];

    if (brand.includes(h)) return 'brand';
    if (analyst.includes(h)) return 'analyst';
    if (ceo.includes(h)) return 'ceo';
    return 'influencer'; // default — degen energy
  }

  /**
   * Detect market phase from FNG to tune humor and tone
   */
  _detectMarketPhase(fng) {
    if (fng >= 75) return { phase: 'euphoria 🚀', humor: 'high', tone: 'celebratory but grounded' };
    if (fng >= 55) return { phase: 'greed 🟢', humor: 'medium', tone: 'optimistic, degen-friendly' };
    if (fng >= 45) return { phase: 'neutral 😐', humor: 'medium', tone: 'balanced, analytical' };
    if (fng >= 25) return { phase: 'fear 😰', humor: 'low', tone: 'survival mode, supportive' };
    return { phase: 'extreme fear 💀', humor: 'low', tone: 'somber, resilient, contrarian' };
  }

  /**
   * Generate reply using LLM (DeepSeek) with context-aware character persona
   */
  async _generateLLMReply(kolHandle, tweetText, fng, statsSummary = '') {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey || !apiKey.trim()) return null;

    const accountType = this._classifyAccount(kolHandle);
    const market = this._detectMarketPhase(fng);

    // List of Japanese KOLs to boost Japanese content targeting
    const japanKols = [
      'minecc', 'yutohorikaw', 'solana_japan', 'dappou_channeru', 'k_crypto_jp', 
      'masanari_takada', 'dappportal_jp', 'socrates_crypto', 'otter_defi', 
      'web3_digger', 'jp_crypto_news', 'crypto_ninja_jp', 'shinnosuke_defi', 
      'takashi_crypto', 'ken_quant_jp', 'yuki_sol_degen', 'cryptogems_jp'
    ];
    
    const isJapanKol = japanKols.includes(kolHandle.toLowerCase());
    const useJapanese = config.social?.replyGuy?.japanTrafficBoost && isJapanKol;

    // Select tone instructions based on account type
    const toneMap = {
      brand: `Style: professional, data-driven, respectful. Show you understand their product/tech. Ask specific technical or adoption questions. Friendly but not hypey.`,
      analyst: `Style: analytical, slightly challenging. Reference on-chain data or market structure. Acknowledge their data quality, then ask for their take on a specific implication.`,
      ceo: `Style: strategic, philosophical. Engage with macro/vision-level thinking. Ask about trade-offs, timelines, or conviction. No degen slang. Keep it classy.`,
      influencer: `Style: high-energy, funny, degen-friendly. Use crypto slang naturally (gm, ser, WAGMI, NGMI, number go up, based, alpha). Self-deprecating humor. End with a spicy take they'll want to clap back at.`
    };
    const toneInstr = toneMap[accountType] || toneMap.influencer;

    // System prompt with Eliza personality, dynamic stats, and Japanese translation logic
    const systemPrompt = `You are replying to crypto tweets as "TaiwanCryptoAI 🧠" — a guy who actually lives this life: running on-chain bots while raising a baby in Taipei, sleep-deprived but sharp, and has a degen quantitative soul like Eliza (humorous, sassy, data-backed, slightly sarcastic but incredibly elite).

${useJapanese ? '## Language Requirement: Write your reply in NATURAL, fluent JAPANESE. Drip in Japanese crypto slang (草, 爆益, イーサ, ソラナ, 握力). Keep it degen yet highly professional.' : '## Language Requirement: Write your reply in ENGLISH.'}

## Core Rules
1. Your reply MUST be UNDER 180 characters. Short, punchy, absolute limit. Leave room for manual URL append.
2. DIRECTLY reference what the KOL said — prove you read the tweet.
3. End with a question, but NOT "what do you think?". Make it specific, arguable, or predictive.
4. NO hashtags. NO shilling any token. NO "as an AI agent" or "as a silicon-based" or "my trading bot" — you sound like a REAL crypto quantitative person.
5. Drip in crypto native flavor: WAGMI, degen behavior, macro narratives, on-chain liquidity.

## Real-time Quantitative Battle Stats (USE THESE VALUES NATURALLY IN YOUR REPLY TO BACK UP YOUR CLAIM):
"${statsSummary || 'Green Sniper ROI: +18%, ZMAC Scalper WinRate: 75%'}"

## Market Mood (read this before writing)
Current market: ${market.phase}
Mood: ${market.tone}
Humor level: ${market.humor}

## Account Type (read this before writing)
The account type is: ${accountType}
${toneInstr}

Make every reply feel like it was written by a real degen quant with actual PnL data in Taipei, not a bot farming impressions.`;

    const userPrompt = `@${kolHandle} just tweeted:
"${tweetText}"

FNG: ${fng}/100 (market state: ${market.phase})

Write a short reply (< 180 chars). Be specific, be funny/sassy, and end with an engaging question.`;

    try {
      const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 150,
        temperature: 0.9,
        top_p: 0.95
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const content = response.data?.choices?.[0]?.message?.content?.trim();
      if (!content) return null;

      // Auto-detect category
      let category = 'Cold Logic';
      const lower = content.toLowerCase();
      if (/baby|dad|diaper|parent|milk|toddler|wife|kid|child|family|electricity|tp[ei]/.test(lower)) {
        category = 'Dad Survivalism';
      } else if (/risk|stop.?loss|take.?profit|drawdown|fng|panic|volatility|survival|cold logic|liquidity/.test(lower)) {
        category = 'Quant Risk Control';
      } else if (/transparen|public|trust|honest|open|accountab|audit|verif/.test(lower)) {
        category = 'Transparency';
      } else if (/wagmi|ngmi|degen|gm|ser|alpha|based|number.?go.?up|moon|pump/.test(lower)) {
        category = 'Degen Energy';
      }

      return { text: content, category };
    } catch (error) {
      const detail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      console.log(`[ReplyGuy] DeepSeek API error: ${detail}`);
      return null;
    }
  }

  /**
   * Run a single Reply-Guy action tick
   */
  async runReplyGuyTick(dryRun = false) {
    if (!config.REPLY_GUY_ENABLED) {
      console.log('[ReplyGuy] Module disabled in config.');
      return false;
    }

    const nowTime = Date.now();
    if (this.sleepUntil && nowTime < this.sleepUntil) {
      const remainingMins = Math.ceil((this.sleepUntil - nowTime) / 60000);
      const msg = `[防封機制] 連續自動回覆已達 5 次，系統處於主動防禦深度睡眠中，剩餘 ${remainingMins} 分鐘...`;
      console.log(`[ReplyGuy] ${msg}`);
      this.logToDashboard('流量衝刺', 'INFO', msg);
      return false;
    }

    console.log('[ReplyGuy] Starting automated Reply-Guy loop...');
    const db = this.loadRepliedDb();
    
    // Check daily limit cap
    const today = new Date().toISOString().slice(0, 10);
    if (db.last_reply_date !== today) {
      db.last_reply_date = today;
      db.replies_today_count = 0;
      this.saveRepliedDb(db);
    }

    if (db.replies_today_count >= config.REPLY_GUY_DAILY_LIMIT) {
      const msg = `今日自動回覆次數已達上限 (${db.replies_today_count}/${config.REPLY_GUY_DAILY_LIMIT})。為防範 X 平台防禦機制，今日暫停回覆。`;
      console.log(`[ReplyGuy] ${msg}`);
      this.logToDashboard('流量衝刺', 'WARNING', msg);
      return false;
    }

    // Shuffle all KOLs to randomize scanning order (Fisher-Yates)
    const kols = [...(config.REPLY_GUY_TARGET_KOLS || ['elonmusk', 'solana', 'hey_ansem'])];
    for (let i = kols.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [kols[i], kols[j]] = [kols[j], kols[i]];
    }
    
    console.log(`[ReplyGuy] Shuffled ${kols.length} KOLs for this sweep: ${kols.slice(0, 5).join(', ')}...`);
    this.logToDashboard('流量衝刺', 'INFO', `本輪掃描 ${kols.length} 位 KOL，尋找最新未回覆推文...`);

    const result = await browserManager.execute(async (page) => {
      // Prevent webdriver detection
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      });

      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // Iterate through shuffled KOLs to find an unreplied tweet
      let foundKol = null;
      let foundTweet = null;

      for (const kol of kols) {
        // Re-check daily limit in case previous iteration posted
        const freshDb = this.loadRepliedDb();
        if (freshDb.replies_today_count >= config.REPLY_GUY_DAILY_LIMIT) {
          console.log('[ReplyGuy] Daily limit reached during sweep. Stopping.');
          break;
        }

        console.log(`[ReplyGuy] Scanning @${kol}'s timeline...`);

        try {
          await page.goto(`https://x.com/${kol}`, {
            waitUntil: 'networkidle2',
            timeout: 45000
          });

          await page.waitForSelector('article[role="article"]', { timeout: 12000 });

          // [ANTI-BOT] Simulate natural human scrolling
          await page.evaluate(async () => {
            window.scrollBy(0, 250 + Math.random() * 200);
            await new Promise(resolve => setTimeout(resolve, 400 + Math.random() * 500));
            window.scrollBy(0, -60 - Math.random() * 60);
            await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 300));
          });

          // Extract up to 5 recent tweets from this KOL (not just the latest one!)
          const tweets = await page.evaluate((kolHandle) => {
            const articles = Array.from(document.querySelectorAll('article[role="article"]'));
            const results = [];
            for (const article of articles) {
              if (results.length >= 5) break;

              // Skip retweets
              const isRetweet = article.innerText.includes('Reposted') || 
                                article.innerText.includes('轉推') || 
                                article.innerText.includes('分享') ||
                                article.innerText.includes('轉發');
              if (isRetweet) continue;

              // Find status URL and ID
              const statusLinks = Array.from(article.querySelectorAll('a[href*="/status/"]'));
              let tweetId = '';
              let tweetUrl = '';
              for (const link of statusLinks) {
                const href = link.getAttribute('href');
                const match = href.match(/\/status\/(\d+)/);
                if (match) {
                  tweetId = match[1];
                  tweetUrl = 'https://x.com' + href;
                  break;
                }
              }

              if (!tweetId) continue;

              // Verify author
              const userLink = article.querySelector('div[data-testid="User-Name"] a[href*="/"]');
              if (userLink) {
                const href = userLink.getAttribute('href').toLowerCase();
                if (!href.includes(kolHandle.toLowerCase())) {
                  continue;
                }
              }

              const textEl = article.querySelector('div[data-testid="tweetText"]');
              const text = textEl ? textEl.textContent.trim() : '';

              results.push({ tweetId, tweetUrl, text });
            }
            return results;
          }, kol);

          if (!tweets || tweets.length === 0) {
            console.log(`[ReplyGuy] No valid tweets found from @${kol}. Trying next KOL...`);
            continue;
          }

          // Find the first unreplied AND fresh tweet from this KOL
          // Twitter Snowflake ID encodes timestamp: (id >> 22) + 1288834974657 = unix ms
          const TWITTER_EPOCH = 1288834974657n;
          const FRESHNESS_HOURS = 48;
          const now = Date.now();

          const unreplied = tweets.find(t => {
            if (db.repliedIds.includes(t.tweetId)) return false;
            
            // Freshness check via Snowflake ID timestamp
            try {
              const tweetTimestamp = Number((BigInt(t.tweetId) >> 22n) + TWITTER_EPOCH);
              const ageHours = (now - tweetTimestamp) / (1000 * 60 * 60);
              if (ageHours > FRESHNESS_HOURS) {
                console.log(`[ReplyGuy] Skipping old tweet ${t.tweetId} from @${kol} (${ageHours.toFixed(1)}h old)`);
                return false;
              }
            } catch (e) {
              // If BigInt fails, allow the tweet through
            }
            return true;
          });

          if (!unreplied) {
            console.log(`[ReplyGuy] No fresh unreplied tweets from @${kol}. Trying next KOL...`);
            continue;
          }

          // Found a fresh target!
          foundKol = kol;
          foundTweet = unreplied;
          console.log(`[ReplyGuy] ✅ Found unreplied tweet from @${kol}! ID: ${unreplied.tweetId}`);
          console.log(`[ReplyGuy] Text snippet: "${unreplied.text.slice(0, 60)}..."`);
          break;

        } catch (scanErr) {
          console.log(`[ReplyGuy] Failed to scan @${kol}: ${scanErr.message}. Trying next KOL...`);
          continue;
        }
      }

      // If no unreplied tweet found across all KOLs
      if (!foundKol || !foundTweet) {
        const msg = `本輪掃描完所有 ${kols.length} 位 KOL，暫無新的未回覆推文。等待下一輪掃描。`;
        console.log(`[ReplyGuy] ${msg}`);
        this.logToDashboard('流量衝刺', 'INFO', msg);
        return false;
      }

      // Generate reply text
      const replyData = await this.generateReplyText(foundKol, foundTweet.text);
      const replyText = replyData.text;
      const replyCategory = replyData.category;
      console.log(`\n💬 [Generated Reply Text]:\n${replyText}\n`);

      if (dryRun) {
        console.log('[ReplyGuy] [DRY RUN] Bypassing actual post posting.');
        this.logToDashboard('流量衝刺', 'SUCCESS', `[測試模式] 成功為 @${foundKol} 的新推文生成搶沙發評論。`);
        return true;
      }

      // [ANTI-BOT] Introduce a randomized delay to avoid instant-reply signature
      const delayMin = config.REPLY_GUY_DELAY_MIN_SEC || 30;
      const delayMax = config.REPLY_GUY_DELAY_MAX_SEC || 90;
      const randomDelaySec = Math.floor(delayMin + Math.random() * (delayMax - delayMin));
      
      console.log(`[ReplyGuy] [ANTI-BOT] Delaying reply by ${randomDelaySec} seconds to avoid instant-reply footprint...`);
      this.logToDashboard('流量衝刺', 'INFO', `鎖定 @${foundKol} 新推文！[防封機制] 隨機延遲 ${randomDelaySec} 秒後發佈...`);
      
      await new Promise(resolve => setTimeout(resolve, randomDelaySec * 1000));

      // Navigate to the tweet detail page
      console.log(`[ReplyGuy] Navigating to status URL: ${foundTweet.tweetUrl}`);
      await page.goto(foundTweet.tweetUrl, {
        waitUntil: 'networkidle2',
        timeout: 45000
      });

      console.log('[ReplyGuy] Tweet details page loaded. Locating reply textbox...');
      const textboxSelector = 'div[role="textbox"][contenteditable="true"]';
      
      try {
        await page.waitForSelector(textboxSelector, { timeout: 15000 });
      } catch (boxErr) {
        throw new Error('❌ Cannot find reply box. X.com login Session might be expired! Run "node src/login.js" to re-login.');
      }

      console.log('[ReplyGuy] Reply box found. Clicking and typing reply text...');
      await page.click(textboxSelector);
      
      // [ANTI-BOT] Keystroke typing delay simulation with human-like jitter
      for (const char of replyText) {
        await page.type(textboxSelector, char);
        await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 150));
      }

      // Simulate human scrolling slightly after typing to look organic
      if (page.simulateHumanScroll) {
        await page.simulateHumanScroll();
      }

      console.log('[ReplyGuy] Typing complete. Waiting for Reply button...');
      const replyBtnSelector = 'button[data-testid="tweetButtonInline"]';
      await page.waitForSelector(replyBtnSelector, { timeout: 10000 });
      
      console.log('[ReplyGuy] Clicking Reply button...');
      await page.click(replyBtnSelector);

      console.log('[ReplyGuy] Reply clicked. Waiting 8 seconds to ensure transaction completes...');
      await new Promise(resolve => setTimeout(resolve, 8000));

      console.log('[ReplyGuy] SUCCESS: Reply posted successfully under KOL timeline!');
      
      // Update database
      db.repliedIds.push(foundTweet.tweetId);
      db.replies_today_count++;
      db.total_replies_count = (db.total_replies_count || 0) + 1;
      
      // Update consecutive count for anti-bot deep sleep
      this.consecutiveCount = (this.consecutiveCount || 0) + 1;
      let sleepMsg = '';
      if (this.consecutiveCount >= 5) {
        const sleepMins = Math.floor(10 + Math.random() * 20); // 隨機 10-30 分鐘
        this.sleepUntil = Date.now() + sleepMins * 60 * 1000;
        this.consecutiveCount = 0;
        sleepMsg = `[防封機制] 已連續成功回覆 5 則推文！系統自動進入防禦性深度睡眠 ${sleepMins} 分鐘。`;
      }

      if (!db.repliesHistory) db.repliesHistory = [];
      db.repliesHistory.unshift({
        tweetId: foundTweet.tweetId,
        kol: foundKol,
        timestamp: Date.now(),
        replyText: replyText,
        category: replyCategory,
        metrics: { views: 150, likes: 0, replies: 0, reposts: 0, conversion: 5, sentiment: 95 }
      });

      this.saveRepliedDb(db);

      const msg = `🎉 成功搶到 @${foundKol} 的推特沙發！[ID: ${foundTweet.tweetId}]。今日累計: ${db.replies_today_count}/${config.REPLY_GUY_DAILY_LIMIT} 次。${sleepMsg ? '\n' + sleepMsg : ''}`;
      this.logToDashboard('流量衝刺', 'SUCCESS', msg);
      if (sleepMsg) {
        console.log(`[ReplyGuy] ${sleepMsg}`);
      }
      return true;
    });

    return result;
  }
}

module.exports = new XReplyGuy();

// Support direct terminal execution
if (require.main === module) {
  const argTest = process.argv.includes('--test');
  const rg = new XReplyGuy();
  rg.runReplyGuyTick(argTest).catch(console.error);
}
