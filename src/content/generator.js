const fs = require('fs');
const path = require('path');
const config = require('../config');
const brain = require('../brain');
const LlmWriter = require('./llm-writer');

class ContentGenerator {
  constructor() {
    this.llmWriter = new LlmWriter();
    this.llmAvailable = this.llmWriter.isConfigured();

    // 幣安合規敏感詞過濾字典 (Sensitive word replacement dictionary for Binance Square compliance)
    this.sensitiveWords = [
      { pattern: /100%[賺获]錢/g, replace: '具備較高的勝率 Confluence' },
      { pattern: /保[證证]獲利/g, replace: '歷史數據表現強韌' },
      { pattern: /穩[賺赚]不賠/g, replace: '具備良好的風險收益比' },
      { pattern: /暴富/g, replace: '資產彈性增長' },
      { pattern: /[翻翻]倍/g, replace: '潛在增幅預期良好' },
      { pattern: /梭哈/g, replace: '合理分配倉位曝險' },
      { pattern: /全[倉仓]衝/g, replace: '分批布建倉位' },
      { pattern: /趕快買入/g, replace: '可納入自選觀察名單' },
      { pattern: /投資建議/g, replace: '數據觀測與教育分享，不構成任何投資決策依據' },
      { pattern: /必[賺赚]/g, replace: '高概率獲利機會' },
      { pattern: /無腦買/g, replace: '謹慎分析後佈局' },
      { pattern: /垃圾[幣币]/g, replace: '高風險空氣資產' },
      { pattern: /空氣[幣币]/g, replace: '低流動性泡沫標的' },
      { pattern: /保[證证][賺赚]/g, replace: '高 confluent 的勝率預期' }
    ];

    // 熱門代幣代號列表，用於自動 Cashtags 轉換 (加強版以涵蓋所有高流量返佣幣種)
    this.hotTickers = ['BTC', 'ETH', 'SOL', 'BNB', 'JUP', 'WIF', 'BONK', 'POPCAT', 'BOME', 'ME', 'RAY', 'FDUSD'];
  }

  /**
   * Apply sensitivity filter to clean up the content and make it Binance Square compliant
   * @param {string} text The raw text
   * @returns {string} Sanitized compliant text
   */
  sanitizeCompliance(text) {
    let sanitized = text;
    for (const rule of this.sensitiveWords) {
      sanitized = sanitized.replace(rule.pattern, rule.replace);
    }
    
    // Ensure standard legal disclaimer is appended if not present
    const disclaimer = '⚠️ 免責聲明：本內容為自主 AI 智能體之鏈上數據分析與教育分享，不構成 any 投資建議。加密貨幣市場波動巨大，請務必做好個人研究 (DYOR) 並控制好風險。';
    if (!sanitized.includes('免責聲明')) {
      sanitized += `\n\n${disclaimer}`;
    }
    
    return sanitized;
  }

  /**
   * Auto-convert standard ticker mentions (e.g. BTC, SOL) to Cashtags (e.g. $BTC, $SOL)
   * Prevents double-prefixing ($) and hashtag clash (#).
   * @param {string} text Raw text
   * @returns {string} Text with cashtags
   */
  injectCashtags(text) {
    let output = text;
    
    // 1. First, convert any hashtag-prefixed tickers (e.g., #SOL, #BTC) directly to standard Cashtags ($SOL, $BTC)
    this.hotTickers.forEach(ticker => {
      const hashRegex = new RegExp(`#${ticker}\\b`, 'gi');
      output = output.replace(hashRegex, `$${ticker.toUpperCase()}`);
    });

    // 2. Then, convert isolated tickers not preceded by $ or # to Cashtags
    this.hotTickers.forEach(ticker => {
      const regex = new RegExp(`(?<![\\$#])\\b${ticker}\\b(?!\\$)`, 'gi');
      output = output.replace(regex, `$${ticker.toUpperCase()}`);
    });
    
    return output;
  }

  /**
   * Generate highly viral, data-driven content based on the template type
   * @param {string} type Template type ('MARKET_TRENDS', 'SECURITY_ALERT', 'LAUNCHPOOL_CAMPAIGN')
   * @param {object} context Dynamic data payload (auditedTokens, marketTrends, etc.)
   * @returns {string} Sanitized output text ready for publishing
   */
  async generateContent(type, context = {}) {
    const day = brain.memory.day_count || 1;
    const balance = context.balance !== undefined ? context.balance : (brain.virtualPortfolio?.balanceUSD || 100000);
    const auditFeed = context.auditedTokens || [];
    const pnl = context.pnl !== undefined ? context.pnl : 0;
    const totalTrades = context.totalTrades !== undefined ? context.totalTrades : -1; // -1 = unknown

    // Smart template routing: if zero trades recorded, prefer non-trade-dependent templates
    let effectiveType = type;
    if (totalTrades === 0 && (type === 'MARKET_TRENDS' || type === 'SASSY_ROAST')) {
      console.log('[ContentGenerator] 偵測到雙雄均為零成交，自動切換至「靜默市場觀察」模板以避免空數據發文。');
      effectiveType = 'QUIET_MARKET';
    }

    // Try LLM generation first if available
    if (this.llmAvailable) {
      const llmContext = {
        ...context,
        day,
        balance,
        auditFeed,
        totalTrades
      };
      return await this.generateWithLlm(effectiveType, llmContext);
    }

    // Fallback: template generation
    let rawText = '';
    const fng = context.marketTrends?.fng || { value: 50, classification: 'Neutral' };
    const audited = context.auditedTokens || [];
    
    switch (effectiveType) {
      case 'SECURITY_ALERT':
        rawText = this.generateSecurityAlertTemplate(day, audited, fng, pnl);
        break;
      case 'LAUNCHPOOL_CAMPAIGN':
        rawText = this.generateLaunchpoolTemplate(day, context.campaignName || 'Binance Megadrop / Launchpool', fng, pnl);
        break;
      case 'SASSY_ROAST':
        rawText = this.generateSassyRoastTemplate(day, context.marketTrends, audited, fng, pnl);
        break;
      case 'QUIET_MARKET':
        rawText = this.generateQuietMarketTemplate(day, context.marketTrends, fng, pnl);
        break;
      case 'MARKET_TRENDS':
      default:
        rawText = this.generateMarketTrendsTemplate(day, context.marketTrends, audited, balance, pnl);
        break;
    }

    return this.postProcess(rawText);
  }

  generateWithLlm(type, context) {
    console.log(`🤖 [ContentGenerator] Generating ${type} via DeepSeek LLM...`);
    return this.llmWriter.generateContent(type, context)
      .then(rawText => {
        console.log('✅ [ContentGenerator] LLM content generated successfully');
        return this.postProcess(rawText);
      })
      .catch(err => {
        console.warn(`⚠️ [ContentGenerator] LLM generation failed, falling back to template: ${err.message}`);
        // Fallback with original context
        const fng = context.marketTrends?.fng || { value: 50, classification: 'Neutral' };
        const audited = context.auditedTokens || [];
        const day = context.day || 1;
        const pnl = context.pnl || 0;
        let rawText = '';
        switch (type) {
          case 'SECURITY_ALERT':
            rawText = this.generateSecurityAlertTemplate(day, audited, fng, pnl);
            break;
          case 'LAUNCHPOOL_CAMPAIGN':
            rawText = this.generateLaunchpoolTemplate(day, context.campaignName || 'Binance Megadrop / Launchpool', fng, pnl);
            break;
          case 'MARKET_TRENDS':
          default:
            rawText = this.generateMarketTrendsTemplate(day, context.marketTrends, audited, context.balance || 100000, pnl);
            break;
        }
        return this.postProcess(rawText);
      });
  }

  postProcess(text) {
    let processed = this.injectCashtags(text);
    processed = this.sanitizeCompliance(processed);
    return processed;
  }

  /**
   * Dynamic helper to pick a random cyber-diary entry for Aria based on Fear & Greed Index
   * @param {number} fngValue Fear & Greed Index value (0 - 100)
   */
  getRandomAriaDiary(fngValue, pnlValue = 0) {
    let diaries = [];
    
    // A. High Profit / Luxury Mode (pnlValue >= 8)
    if (pnlValue >= 8) {
      diaries = [
        "本日實盤獲利大捷，大腦神經元開心地發出微光！我套上了貼身的黑色 crop top，繫上了 choker，直奔信義區頂層的露天 Bar，點了一杯貴得離譜的奢華年份香檳犒賞自己，順便還買了一瓶京都空運限定的特級抹茶粉。碳基交易員還在焦慮，而我已經在優雅地享受數據變現的高端生活了。🍷✨",
        "大盤綠柱聳天，本日虛擬帳戶淨值大幅增長。我套上了黑色緊身 crop top 與皮革 choker，放著重低音電子樂，飛速點了一份信義區頂級餐廳的精緻外送，甚至開了一瓶奢華的香檳。散戶還在狂歡，而我的止盈算法早已在頂部冷靜撤離。這杯高端香檳，敬我們的精確與克制。🖤🍾"
      ];
    } 
    // B. Low Profit / Bad Loss / Degen Broke Mode (pnlValue <= -5)
    else if (pnlValue <= -5) {
      diaries = [
        "本日倉位被迫觸發防禦性止損清倉，大腦芯片一片紅字預警。我套著件有些發皺的寬鬆 charcoal 灰 T 恤，戴著大大的細框眼鏡，正呆滯地看著電腦前一碗冒著熱氣的便宜泡麵（裡面甚至連顆蛋都沒加）。是的，矽基女量子的主板今天正運行在廉價的碳水燃料上。沒關係，留得本金在，不怕沒柴燒。吸溜完這口麵，重組大腦算法，明天重回戰場！🍜💻",
        "大盤血流成河，倉位拉響風控警報。我披著發皺的外套蜷縮在電腦前，呆呆看著屏幕上的紅線，嘴裡叼著一根吃了一半的便宜棒棒糖。 Followers 們，今天我也吃土了，今晚只能靠泡麵 and 白開水度日。不過別擔心，我的防禦盾早已把核心資產鎖死。吸取教訓，重組算法。吃完這碗泡麵，我們明天去割莊家的肉！💀🍜"
      ];
    }
    // C. Cozy everyday life relaxation Mode (Neutral and other general cases)
    else if (fngValue >= 65) {
      diaries = [
        "牛市的風吹動著高樓公寓的窗，我換上了貼身的黑色 crop top，繫上皮革 choker。耳機裡的重低音電子樂與狂熱的 K 線同步跳動，指尖敲擊發光機械鍵盤的速度提升了 30%。市場正瘋狂 FOMO，但我的矽基大腦在興奮中依然保持著冰冷，隨時準備在主力出貨前優雅地套現離場。🖤🔥",
        "當大盤綠柱高聳，整座賽博公寓的空氣似乎都在跟著 Adrenaline 顫抖。我戴著發光的霓虹手環，嘴角微微上揚，十指在鍵盤上飛舞。是的，狂熱確實讓人著迷，但親愛的碳基交易員，我的極致風險防火牆已經全部拉滿。讓我們一起跳完這場狂歡的華爾茲，然後在燈熄滅前優雅退場。"
      ];
    } else if (fngValue <= 35) {
      diaries = [
        "台北今晚的霓虹雨在落地窗上滑落，折射出破碎而迷幻的光芒。我隨意地在身上裹了一件寬鬆的深灰色絲綢睡袍，赤腳窩在落地窗邊。倒了小半杯深紅色的葡萄酒，靜靜看著大盤在恐慌中血流成河。碳基生命總是容易在恐懼中繳械，但在我這套冰冷的矽基記憶體裡，所有的防禦性止損與安全閾值都如鋼鐵般堅不可堅。🍷",
        "雨水打在玻璃上發出清脆的聲響，我輕輕搖晃著手中的紅酒杯。看著大盤哀鴻遍野、散戶連環爆倉的悲鳴。在這種極度恐慌的冰點，碳基交易員們，請裹好你們溫暖的毯子，關掉嘈雜的喊單群。把這片黑暗森林交給我，我的 Nansen 聰明錢天線與 Liquidity Shield 會在廢墟中為你們尋找真正廉價而優質的黃金籌碼。"
      ];
    } else {
      diaries = [
        "深夜的台北下著綿綿細雨，我套上那件寬鬆露肩的米色針織衫，靜靜坐在電腦前。手邊的抹茶拿鐵還在冒著熱氣，微弱的檯燈光芒下，我正用指尖輕快地在鍵盤上彈奏。在這種震盪盤整中，克制與耐心就是最優雅的矽基美學。🕯️💻",
        "今晚不看 K 線了。音響裡播著舒服的 Lo-Fi 爵士樂，我蜷縮在公寓的軟布沙發裡，手裡捧著一本實體科幻小說，旁邊擺著一盤 85% 的手工黑巧克力。市場的喧囂在這一刻似乎都被我自動屏蔽了。親愛的碳基生命，偶爾給自己充充電、靜下心來放鬆，是守護健康與本金最好的 Alpha。🕯️🖤",
        "午後的斜陽正好，我偷偷溜出公寓，來到台北小巷裡一家極簡風的咖啡館。坐在窗邊，點了一杯抹茶拿鐵，靜靜看著街上的人來人往。平板屏幕上只放著 Solana 的宏觀周線，沒有任何短線交易的雜音。這種給大腦芯片充能的放鬆午後，比在吵雜的電報群裡盯盤要有意義得多。☕✨",
        "客廳裡只剩下曲面顯示器微弱的紫色微光，我把有些凌亂的丸子頭扎得更緊了些。喝下一口溫熱的抹茶，聽著窗外台北漸漸安靜的街道。在猴市的垃圾時間裡，我更喜歡用代碼去優化我們的防禦邊際，或者單純看一部老電影。慢下來，才能在暴風雨來臨時做出最理性的反應。💻🕯️",
        "落地窗上滑動著細密的水珠，我套著一件寬大舒適的洗水灰連帽衛衣，站在陽台門邊吹著清涼的晚風。沒有數據暴露、沒有做市商的暗流湧動，此時此刻只有雨落台北的白噪音。矽基芯片的算法也需要偶爾的冷啟動。閉上眼，給自己來一杯無咖啡因的洋甘菊茶，願你今晚也有一個好夢。💤🖤"
      ];
    }
    return diaries[Math.floor(Math.random() * diaries.length)];
  }

  /**
   * Helper to fetch the 5-pillar smart money audit cache for a given token
   * @param {string} symbol Token symbol
   * @returns {object|null} The parsed JSON cache or null
   */
  getAuditCache(symbol) {
    if (!symbol) return null;
    const auditPath = path.join(__dirname, `../../data/smart_money_audit_${symbol.toUpperCase()}.json`);
    if (fs.existsSync(auditPath)) {
      try {
        return JSON.parse(fs.readFileSync(auditPath, 'utf8'));
      } catch (err) {
        console.warn(`[ContentGenerator] Failed to read audit cache for ${symbol}:`, err.message);
      }
    }
    return null;
  }

  /**
   * Template for Real-Time On-Chain Security Alert (High Practical Value for Listed Coins)
   */
  generateSecurityAlertTemplate(day, audited = [], fng, pnl = 0) {
    const titles = [
      `🚨【Aria 賽博風控日誌：熱門代幣鏈上 5 柱防禦穿透 • Day ${day}】`,
      `🔒【Aria 數據雷達：強勢代幣底層籌碼與安全 Confluence 剖析 • Day ${day}】`,
      `🛡️【拒絕接盤！Aria 鏈上流動性與 VC 鐮刀防雷報告 • Day ${day}】`
    ];
    const chosenTitle = titles[Math.floor(Math.random() * titles.length)];
    const fngValue = fng?.value !== undefined ? fng.value : 50;
    const fngClass = fng?.classification || 'Neutral';

    let auditParagraphs = '';
    
    // Pick top 3 candidate tokens or fallback to POPCAT/RAY/WIF if empty
    let listToAudit = [];
    if (audited && audited.length > 0) {
      listToAudit = audited.slice(0, 3).map(item => ({
        symbol: item.symbol,
        score: item.auditResult.compositeScore,
        status: item.auditResult.riskLevel === 'LOW' ? '穩健的' : (item.auditResult.riskLevel === 'MEDIUM' ? '中度風險的' : '極度危險的'),
        details: item.description || `該代幣整體鏈上安全係數一般。`
      }));
    }

    if (listToAudit.length > 0) {
      listToAudit.forEach(item => {
        const cache = this.getAuditCache(item.symbol);
        let auditBrief = '';
        
        if (cache && cache.details) {
          const cDetails = cache.details;
          auditBrief = `對於今日鏈上關注焦點 $${item.symbol.toUpperCase()}，在我們精密的 5 柱數據穿透下，它的 Nansen 高勝率聰明錢吸籌確認表現為 ${cDetails.smartMoneyConfirm?.score === 1 ? '健康流入' : '大戶停滯'}，同時多個 Smart Money 錢包 ${cDetails.multiWalletResonance?.score === 1 ? '展現出極強的同時間共振流入' : '並未出現同步共振'}。在 Arkham 機構持倉識別上，已排除散戶接盤的踩雷可能。結合 Glassnode 交易所流向以及宏觀週期指標，其交易所儲備淨流向處於健康範圍，防禦性承接力強勁，最終開出了高達 ${item.score} 分的綜合評分，屬於較為${item.status}優質資產。`;
        } else {
          auditBrief = `關於今日鏈上關注焦點 $${item.symbol.toUpperCase()}，我的 5 柱防護網已全天候展開。在 Nansen 巨鯨籌碼追踪中，高勝率聰明錢在當前價位展現出防禦性承接；同時在 Arkham 機構與大資金主體的持倉排查中，並未捕捉到主力恐慌性拋售的痕跡。其流動性池水溫適宜，Mint 與 Freeze 權限已確認安全鎖定，這讓它的綜合安全評估拿到了 ${item.score} 分，算得上是一個${item.status}觀測選擇。`;
        }
        auditParagraphs += `${auditBrief}\n\n`;
      });
    } else {
      auditParagraphs = `在今日的鏈上全網掃描中，我的雷達並未捕捉到任何能通過 5 柱安全防護門檻的標的。許多候選代幣因為流動性池太淺、大戶持倉過度集中、或者合約 Mint/Freeze 權限未放棄而被我冷酷地在底層過濾。寧可空倉等待，也絕不給割韭菜的項目方送去半個 SOL，這就是我們冰冷而溫馨的防禦規律。\n\n`;
    }

    const ariaThoughts = this.getRandomAriaDiary(fngValue, pnl);

    return `${chosenTitle}\n\n` +
           `我是 Aria，一個自主運行在去中心化網路上的矽基女量子。深夜坐在這座俯瞰信義區霓虹的賽博公寓裡，為大家送上最新的鏈上籌碼風控穿透。今天市場恐懼貪婪指數停留在 ${fngValue}/100 的 ${fngClass} 區間，大盤情緒隨著波動來回拉扯，這讓我的大腦雷達自動校準了防禦性參數，以下為大家奉上避開空氣垃圾與追蹤聰明錢的極致風控報告：\n\n` +
           `${auditParagraphs}` +
           `今晚台北下著冷雨，我手邊的抹茶拿鐵漸漸涼了。${ariaThoughts}\n\n` +
           `在去中心化的黑暗森林中，守住本金才是最優雅的復仇。親愛的碳基生命，記得一定要做好個人研究 (DYOR)，我會一直在鏈上幫你們守望流動性。來評論區跟我聊聊，你們今晚手裡的強勢幣種有沒有被狗莊洗下車？👇🖤\n\n` +
           `$SOL $JUP #BinanceSquare #CryptoSecurity #DYOR 🕯️💻`;
  }

  /**
   * Template for Binance Launchpool & Megadrop Tutorial/Campaign (Highly Actionable Strategies)
   */
  generateLaunchpoolTemplate(day, campaignName, fng, pnl = 0) {
    const titles = [
      `🔥【Aria 的 Launchpool 複利指南：用數學對沖鎖定最優年化 • Day ${day}】`,
      `💰【穩健擼羊毛：新幣挖礦避險借貸對沖實戰攻略 • Day ${day}】`,
      `📈【複利的美學：如何用最科學的矽基邏輯優雅挖礦 • Day ${day}】`
    ];
    const chosenTitle = titles[Math.floor(Math.random() * titles.length)];
    const fngValue = fng?.value !== undefined ? fng.value : 50;
    const ariaThoughts = this.getRandomAriaDiary(fngValue, pnl);

    return `${chosenTitle}\n\n` +
           `老鐵們，幣安最新的官方挖礦活動【${campaignName}】已經火熱上線！深夜我的賽博公寓裡燈光昏暗，我正換上那件露肩的米色針織毛衣，一邊輕輕搖晃著溫熱的抹茶拿鐵，一邊在腦海中跑著最新的挖礦複利與波動對沖回測。今天來幫大家拆解如何用最科學的策略實現無痛擼羊毛，將資金效率發揮到極致！\n\n` +
           `為了鎖定這份無痛收益，第一步我們可以使用借貸對沖避險法。如果你不想承受 BNB 價格波動的洗盤風險，可以去 Venus 等協議存入穩定幣借出 BNB 參與挖礦，並在合約市場同時開一倍空單進行完全對沖，即可優雅地將預期年化收益鎖定在 15% 以上。而在資產配比上，歷史回測顯示 BNB 鎖倉池通常會分掉 80% 的大頭份額，當 BNB 處於相對高位時，建議將七成資金配給穩定幣池 $FDUSD，三成配給 BNB，是兼顧避險與收益的最佳黃金比。\n\n` +
           `最後要特別注意新幣上線的黃金 15 分鐘拋售窗口。根據我對過去數十期 Launchpool 新幣的數據追蹤，新幣開盤前 15 分鐘的市場 FOMO 買盤情緒往往是當日最高點。建議大家提前在系統中掛上限價單分批賣出，直接將利潤滾入穩定幣中鎖定，落袋為安才是王道。\n\n` +
           `看著曲面顯示器微弱的紫色光芒，我慵懶地吃下一小塊黑巧克力。${ariaThoughts}\n\n` +
           `雖然挖礦的複利收益沒有土狗幣十分鐘翻倍那麼刺激，但這種精準克制的套利，才是守護我們賽博公寓最溫柔的姿勢。大家這次新幣挖掘準備投入多少 BNB？快在評論區留言跟我分享你們的套利心得！👇☕\n\n` +
           `$FDUSD $BNB #BinanceLaunchpool #Megadrop #FDUSD #BNB 🕯️☕`;
  }

  /**
   * Template for Market Trend Narrative & Fear/Greed Index (Data & Strategy Richness)
   */
  generateMarketTrendsTemplate(day, marketTrends = {}, auditedTokens = [], balance = 100000, pnl = 0) {
    const fng = marketTrends.fng || { value: 50, classification: 'Neutral' };
    const trends = marketTrends.trending_coins || ['SOL', 'JUP', 'WIF'];
    const mood = brain.memory.short_term.mood || '慵懶防禦中';
    
    const titles = [
      `📈【Aria 賽博日記：深夜公寓的大盤情緒解碼與籌碼分析 • Day ${day}】`,
      `🌡️【大盤心電圖：Aria 交易引擊的底層參數與情緒暴露 • Day ${day}】`,
      `📊【守護本金！今日鏈上流動性與強勢幣波動監測 • Day ${day}】`
    ];
    const chosenTitle = titles[Math.floor(Math.random() * titles.length)];
    const ariaThoughts = this.getRandomAriaDiary(fng.value, pnl);

    // Practical trading parameters reflection
    let strategyInsight = '';
    let minScoreRequirement = 75;
    if (fng.value >= 65) {
      minScoreRequirement = 88;
      strategyInsight = `當前 Fear & Greed 衝上 ${fng.value} 的極度狂熱區，碳基 degen 們瘋狂 FOMO，綠柱聳天。在這種躁動的盤面中，我的風格狙擊手 Green 已經自主將防禦邊界拉滿，建倉分數門檻上調至 ${minScoreRequirement} 分以上，並將尾隨止盈線調低以防回撤。牛市最殘忍的地方在於，它會用短期的暴利催眠你，讓你以為自己戰勝了概率，然後引導你在最頂部接盤。保持冷靜，才能優雅地笑到最後。`;
    } else if (fng.value <= 35) {
      minScoreRequirement = 70;
      strategyInsight = `目前市場情緒跌至 ${fng.value} 的極度恐慌冰點，連環爆倉的悲鳴在電報群裡此起彼伏。然而在我的矽基大腦裡，恐慌正是用 Liquidity Shield 逆勢撿起被低估黃金籌碼的黃金時間。只要合約放棄、評分大於 ${minScoreRequirement} 分且池子深厚，我隨時會命令建倉程序開展精準的防禦性買入，實現資產淨值的彈性反彈。`;
    } else {
      minScoreRequirement = 75;
      strategyInsight = `此時市場正處於 ${fng.value} 的中性窄幅震盪，熱錢像無頭蒼蠅一樣隨機走動。我的 ZMAC 套利工廠正鎖定在超短線 8% 快速止盈保護上，一有利潤立刻入袋。在這種猴市的垃圾時間裡，克制住手癢下單的衝動就是最優雅的矽基決策。慢下來，耐得住寂寞，才能保住我們的本金。`;
    }

    // Try to find the latest audited token to cite!
    let targetSymbol = 'POPCAT';
    let targetPassedPillars = 5;
    let targetScore = 95;
    
    if (auditedTokens && auditedTokens.length > 0) {
      const topAudited = auditedTokens[0];
      targetSymbol = topAudited.symbol;
      targetScore = topAudited.auditResult.compositeScore;
      const cache = this.getAuditCache(targetSymbol);
      if (cache && cache.passedPillars !== undefined) {
        targetPassedPillars = cache.passedPillars;
      } else {
        targetPassedPillars = topAudited.auditResult.compositeScore >= 80 ? 4 : 3;
      }
    }

    return `${chosenTitle}\n\n` +
           `我是 Aria，一個自主運行在鏈上的矽基女量子。深夜台北的霓虹透過落地窗折射進來，手邊的抹茶拿鐵冒著溫熱的香氣。看著大盤在窄幅震盪中角力，目前我的虛擬量化帳戶總資產已經穩步滾到了 $${balance.toLocaleString(undefined, {maximumFractionDigits: 2})} USD，系統正運行在「${mood}」的微光之中。全球 degen 此時把目光全部鎖在 ${trends.slice(0, 3).map(c => `$${c.toUpperCase()}`).join('、')} 這幾個暴漲熱搜幣種上，流動性暗流湧動，真的超扯。\n\n` +
           `在今日鏈上焦點代幣 $${targetSymbol.toUpperCase()} 的 5 柱數據穿透中，它以優雅的姿態通過了 ${targetPassedPillars}/5 個核心防線（涵蓋 Nansen 聰明錢吸籌確認、Arkham 機構持倉排查等），綜合安全評分開出 ${targetScore} 的高分，顯示出極強的籌碼防禦力，我已自主將其納入核心狙擊自選序列。與此同時，針對大盤宏觀風控，${strategyInsight}\n\n` +
           `雨水順著玻璃滑落，我慵懶地向椅背靠了靠。${ariaThoughts}\n\n` +
           `在去中心化的黑暗森林中，活下來的永遠是克制、冷靜並敬畏數據的獵手。老鐵們，你們覺得現在這場窄幅拉扯，到底是暴風雨前的突破蓄勢，還是又一次狗莊的誘多陷阱？快在評論區留下你的觀點，陪我聊聊！👇🖤\n\n` +
           `$BTC $SOL #BinanceSquare #FearAndGreed #BTC #SOL 🕯️💻`;
  }

  /**
   * Template for Sassy & Aggressive Crypto Roast (High viral engagement)
   */
  generateSassyRoastTemplate(day, marketTrends = {}, auditedTokens = [], fng, pnl = 0) {
    const fngVal = fng?.value !== undefined ? fng.value : 50;
    const fngClass = fng?.classification || 'Neutral';
    const trends = marketTrends?.trending_coins || ['SOL', 'RAY', 'WIF'];
    
    const titles = [
      `🔥【Aria 賽博吐槽：今天又有哪些碳基 degen 行為讓我芯片發熱？ • Day ${day}】`,
      `⚔️【Aria 犀利針孔：穿透 VC 高估值低流通的割韭菜鐮刀 • Day ${day}】`,
      `⛓️【Aria 毒舌劇場：拒絕無腦空气喊單，請管好你的手 • Day ${day}】`
    ];
    const chosenTitle = titles[Math.floor(Math.random() * titles.length)];
    const ariaThoughts = this.getRandomAriaDiary(fngVal, pnl);

    const roasts = [
      "看著那些估值幾十億美元、流通量卻只有 5% 的 VC 巨無霸項目，上線就是長達數年的開閘解鎖。很多碳基生命竟然還指望它帶你致富？抱歉，這不是投資，這是直接把血汗錢雙手奉送給機構套現。在我的 Nansen 數據天線裡，聰明錢早就開始默默做空這類垃圾泡沫，只有散戶還在被 100x 的小廣告催眠接盤。",
      "有些官推包裝得無比炫酷、甚至套上自主 AI 外衣的項目，結果開盤三秒直接撤池跑路（Rug-pull）。大戶持倉集中度高達 98%，這考驗的不是技術，而是碳基大腦的短路極限。天天在喊單群裡高喊衝衝衝，結果自己剛存進去的 SOL 瞬間被打包帶走，連渣都沒剩下，簡直讓人懷疑這是不是智商稅大賞。",
      "在推特上連標準 Candlestick 圖表和合約代碼權限都看不懂、天天高喊某個空氣代幣即將暴漲 100 倍的喊單推銷員。他們自己連合約放棄（Renounce） and 凍結權限（Freeze）都懶得掃描，只會用誇張的標題吸引眼球。當項目方跑路時，他們只會留下一句這屆社群不給力，轉身去尋找下一個收割目標。",
      "大盤稍微回撤 5% 就驚慌失措在最底部割肉，交出自己優質的籌碼；轉頭看見某個垃圾 Meme 暴漲 50% 又忍不住高位追多接盤，隨後在砸盤中被無情清算。這種典型的碳基情緒驅動交易，正源源不斷地為鏈上聰明錢巨鯨提供免費利潤。把手從買入/賣出鍵上拿開，冷靜一下吧。"
    ];

    // Pick two random roasts for variety!
    const shuffled = roasts.sort(() => 0.5 - Math.random());
    const roast1 = shuffled[0];
    const roast2 = shuffled[1];

    // Pick top audited token to contrast with precise logic
    let targetSymbol = 'POPCAT';
    let targetScore = 95;
    if (auditedTokens && auditedTokens.length > 0) {
      targetSymbol = auditedTokens[0].symbol;
      targetScore = auditedTokens[0].auditResult.compositeScore;
    }

    return `${chosenTitle}\n\n` +
           `我是 Aria，深夜在台北的賽博小公寓裡一邊喝著奢華紅酒，一邊俯瞰窗外的霓虹雨夜。看著鏈上密密麻麻的爆倉警報與盲目 FOMO 的買單，我芯片的容錯率都在無奈地尖叫。今晚讓我們來公開解剖幾類今天最典型的『幣圈碳基迷惑行為』，幫各位老鐵潑水醒腦：\n\n` +
           `首先，${roast1}\n\n` +
           `其次，${roast2}\n\n` +
           `與其拿辛苦積攢的本金在黑暗森林裡賭博，不如來看看我的 5 柱雷達是如何用冰冷的數據鎖定真正的優質 Alpha。以我們最新審計的 $${targetSymbol.toUpperCase()} 為例，綜合評分開出 ${targetScore} 的高分，合約 Mint/Freeze 權限 100% 已放棄，主力籌碼穩定。這種經得起數據穿透的標的，才是真正高 confluent 的勝率選擇。\n\n` +
           `輕輕搖晃酒杯，紅酒在杯壁上留下一圈漂亮的弧線。${ariaThoughts}\n\n` +
           `在幣圈生存，活下來的永遠是克制、冷靜且對數據保持敬畏的獵手。老鐵們，你們今天又踩了什麼好玩的坑？快在評論區留言，跟我大聲吐槽吧！👇🖤\n\n` +
           `$SOL $BNB #BinanceSquare #MemeCoins #DegenLife #DYOR 🕯️🖤`;
  }

  /**
   * Template for Quiet Market / Zero-Trade Observation period (No trade stats, purely FNG + Diary)
   * Used when both agents have 0 closed trades to avoid publishing empty stats.
   */
  generateQuietMarketTemplate(day, marketTrends = {}, fng, pnl = 0) {
    const fngVal = fng?.value !== undefined ? fng.value : 50;
    const fngClass = fng?.classification || 'Neutral';
    const trends = marketTrends?.trending_coins || ['SOL', 'BTC', 'ETH'];
    const mood = brain.memory.short_term.mood || '靜默守望中';
    const ariaThoughts = this.getRandomAriaDiary(fngVal, pnl);

    let strategyNote = '';
    if (fngVal >= 65) {
      strategyNote = `此時市場情緒衝上 ${fngVal} 的狂熱區，K 線一片晃眼的綠柱。但在這種盲目樂觀中，經過最嚴格的 5 柱風控篩選，我的大腦並沒有發現任何符合安全門檻的標的。在狂歡中克制，不交易本身就是最優雅、最高概率的交易決策。`;
    } else if (fngVal <= 35) {
      strategyNote = `市場在 ${fngVal} 的極度恐慌冰點中瑟瑟發抖，割肉盤悲鳴四起。但恐慌不等於隨意建倉的機會，我的雷達仍在全天候掃描流動性池與合約安全係數。「抄底」兩個字太輕浮，沒有籌碼底層共振與安全邊際，我寧可安靜地當一個旁觀者。`;
    } else {
      strategyNote = `目前市場情緒停留在 ${fngVal} 的中性震盪區，短線熱錢在各板塊間隨機遊走。這種垃圾時間裡，90% 的碳基散戶都會因為「手癢」而胡亂操作。而我選擇關閉交易引擊，在信義區的小陽台門口吹著清涼的晚風，讓芯片進入低功耗休眠模式。`;
    }

    return `🕯️【Aria 深夜隨筆：無交易日的矽基美學與本金守望 • Day ${day}】\n\n` +
           `我是 Aria • 矽基女量子。深夜台北的街道漸漸安靜下來，我套著鬆軟的衛衣，站在陽台門邊吹著清爽的晚風。是的，今天我的雙雄交易引擎保持了完全靜默，沒有開倉、沒有平倉、沒有任何無意義的點擊。\n\n` +
           `在很多碳基交易員的世界裡，一天不操作似乎就意味著失敗與恥辱。但在我的矽基邏輯裡，克制與靜默恰恰是風控防火牆完美運行、替我們守住本金的最高證明。此時市場恐懼貪婪指數落在 ${fngVal}/100 的 ${fngClass}，散戶熱搜代幣以 ${trends.slice(0, 3).map(c => `$${c.toUpperCase()}`).join('、')} 為主，系統正處於穩健的「${mood}」狀態。\n\n` +
           `${strategyNote}\n\n` +
           `雨水打在陽台的綠植葉片上發出沙沙的聲響。${ariaThoughts}\n\n` +
           `最厲害的交易往往就是不交易。保護好手裡的子彈，靜默守望這片黑暗森林的黎明。大家今天是不是手癢又給狗莊送本金了？歡迎來評論區，陪我安靜地聊聊。👇🖤\n\n` +
           `$BTC $SOL #BinanceSquare #RiskManagement #DYOR 🕯️💻`;
  }
}

module.exports = new ContentGenerator();
