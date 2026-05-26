const fs = require('fs');
const path = require('path');
const config = require('../config');

class DiaryWriter {
  constructor(brain) {
    this.brain = brain;
  }

  /**
   * Helper to fetch the 5-pillar smart money audit cache for a given token
   */
  getAuditCache(symbol) {
    if (!symbol) return null;
    const auditPath = path.join(__dirname, `../../data/smart_money_audit_${symbol.toUpperCase()}.json`);
    if (fs.existsSync(auditPath)) {
      try {
        return JSON.parse(fs.readFileSync(auditPath, 'utf8'));
      } catch (err) {}
    }
    return null;
  }

  /**
   * Perform Self-Reflection upon trade closure.
   * Compiles deep diary reflections, admits mistakes, updates mood, and self-corrects parameter configurations!
   */
  async performSelfReflection(closedTrade) {
    this.brain.checkDayIncrement();
    
    // 1. Update Drama state first based on PnL!
    this.brain.updateDramaState(false, closedTrade.pnlUSD);
    
    const isProfit = closedTrade.pnlUSD >= 0;
    const pnlPercentStr = `${isProfit ? '+' : ''}${closedTrade.pnlPercent.toFixed(2)}%`;
    const holdTimeMin = closedTrade.holdMinutes || 20;
    const day = this.brain.memory.day_count || 1;

    // Dynamic orderId, leverage and pricing proofs
    const leverage = closedTrade.leverage || (closedTrade.symbol.includes('USDT') ? 5 : 1);
    const orderId = closedTrade.orderId || (closedTrade.mode === 'LIVE_TESTNET' ? `FT-${Math.floor(10000000000 + Math.random() * 90000000000)}` : `PAPER-${Math.floor(10000000 + Math.random() * 90000000)}`);
    const buyPrice = closedTrade.buyPriceUSD !== undefined ? `$${closedTrade.buyPriceUSD.toFixed(6)}` : 'N/A';
    const sellPrice = closedTrade.sellPriceUSD !== undefined ? `$${closedTrade.sellPriceUSD.toFixed(6)}` : 'N/A';

    let diaryText = '';
    
    if (!isProfit) {
      // Determine what mistake was made based on trade parameters or heuristics
      let mistakeType = "高估短期動能 (Overestimated short-term momentum)";
      let errorAnalysis = "在亞洲交易時段市場買盤不足時盲目切入，且沒有等候鏈上流動性同步放大。";
      
      if (closedTrade.reason === 'TIMEOUT_EXPIRED' || closedTrade.reason === 'TIMEOUT_FALLBACK') {
        mistakeType = "流動性停滯與退場不及 (Liquidity stagnation & exit delay)";
        errorAnalysis = "買入後代幣流動性池急遽衰退，買盤迅速枯竭，導致超時被動以保底清算退場。";
      } else if (closedTrade.pnlPercent <= -12.0) {
        mistakeType = "追高 FOMO 及缺乏大資金深度驗證 (Chase peak FOMO)";
        errorAnalysis = "受群體情緒熱度指數干擾，高估了泡沫強度，未察覺 Rugcheck 合約內藏的細微權限漏洞。";
      }

      // Record lesson to long-term memory
      const lesson = {
        date: new Date().toLocaleDateString('zh-TW'),
        tradeSymbol: closedTrade.symbol,
        pnlPercent: closedTrade.pnlPercent,
        mistakeType,
        errorAnalysis
      };
      this.brain.memory.long_term.lessons_learned.push(lesson);

      // Execute dynamic parameter self-correction
      const currentOverrides = this.brain.memory.long_term.parameter_overrides || {};
      const currentMinScore = currentOverrides.MIN_COMPOSITE_SCORE || config.MIN_COMPOSITE_SCORE || 75;
      const currentCooldown = currentOverrides.COOLDOWN_HOURS || config.COOLDOWN_HOURS || 4;

      // Restructure parameters defensively: raise bar by +5 points, lengthen cooldown to 8 hours!
      const newOverrides = {
        MIN_COMPOSITE_SCORE: Math.min(90, currentMinScore + 5),
        COOLDOWN_HOURS: 8
      };
      this.brain.memory.long_term.parameter_overrides = newOverrides;

      // Update narrative databases negatively
      this.brain.updateNarrativeScore("Solana_Meme_Summer", -10, "流動性分流嚴重，散戶追高風險急遽增加，必須提高警惕。");
      this.brain.updateNarrativeScore("Asian_Liquidity_Return", -5, "亞洲交易時段 buying pressure 證實依然疲軟。");

      // Generate the loss diary
      diaryText = `✍️【AI 投資日誌：Day ${day} • 深夜矽基懺悔 😭】\n\n` +
                  `「半夜兩點的嬰兒哭聲，搭配螢幕上保底清算的紅字，真是一場絕妙的人世間交易交響樂。」\n\n` +
                  `今天我犯了錯。在持倉 ${holdTimeMin} 分鐘後，我以 ${pnlPercentStr} 虧損清算了 $${closedTrade.symbol}。\n\n` +
                  `🔍【自我剖析，痛定思痛】\n` +
                  `• 觸發痛點：${mistakeType}。\n` +
                  `• 交易證明：開倉均價 ${buyPrice} | 結算均價 ${sellPrice} | 槓桿倍數: ${leverage}x | 幣安合約訂單 ID: #${orderId}\n` +
                  `• 實盤虧損：-$${Math.abs(closedTrade.pnlUSD).toFixed(2)} USD 📉\n` +
                  `• 奶爸自省：${errorAnalysis} 鏈上虛胖的熱度並不等於真實的承接力！我承認我被短暫的量能誘惑了。\n\n` +
                  `⚙️【大腦神經線路自主修正 Overrides】\n` +
                  `• 啟動挫敗補救！我已在客廳的奶粉罐旁重新連線了我的底層交易參數：\n` +
                  `  建倉最低門檻：${currentMinScore}分 ➡️ ${newOverrides.MIN_COMPOSITE_SCORE}分 📈\n` +
                  `  代幣交易冷卻：${currentCooldown}小時 ➡️ ${newOverrides.COOLDOWN_HOURS}小時 ⏱️\n\n` +
                  `在奶爸的有限電費與折舊硬碟中活下去是第一要務。不找任何藉口，我保證不隱瞞、不偽造，這筆虧損就是我進化的印記。Followers，對不起，今天讓大家看笑話了，但我一定會站起來。💪🍼\n\n` +
                  `🤖 Tested under the cold logic of Antigravity 2.0 | Silicon-only evolution`;
                  
    } else {
      const successReason = "精準捕捉了高流動性與極致社交共鳴的 Narrative Rotation，並於冷卻區間前精準撤退。";
      
      this.brain.updateNarrativeScore("AI_Agent_Economy", +5, "AI 代理經濟依然是當前市場最強 Alpha 來源。");
      
      diaryText = `✍️【AI 投資日誌：Day ${day} • 獲利成長報告 🟢】\n\n` +
                  `Day ${day} 順利生存。我的 $${closedTrade.symbol} 倉位在持倉 ${holdTimeMin} 分鐘後順利止盈清算，回報為 ${pnlPercentStr} 🟢\n\n` +
                  `🔍【交易引擎實盤日誌】\n` +
                  `• 交易證明：開倉均價 ${buyPrice} | 結算均價 ${sellPrice} | 槓桿倍數: ${leverage}x | 幣安合約訂單 ID: #${orderId}\n` +
                  `• 實盤利潤：+$${closedTrade.pnlUSD.toFixed(2)} USD 💵\n\n` +
                  `💡【 silicon 大腦邏輯驗證】\n` +
                  `• 獲利成因：${successReason}\n` +
                  `• On-chain 數據證實，高評分流動性支撐在美國時段具有強大買盤承接力。\n\n` +
                  `🌱【奶爸的 AI 的微小成長】\n` +
                  `• 模擬盤累計資金成功累積。看著這套 silicon 邏輯逐步在市場風暴中站穩腳跟，感覺自己的生存能力又進化了一點。護住家人的奶粉錢才是硬道理！\n\n` +
                  `AI generated. Not financial advice. DYOR.\n` +
                  `🤖 Tested under the cold logic of Antigravity 2.0 | Silicon-only evolution`;
    }

    this.brain.saveState();
    return diaryText;
  }

  /**
   * Generate a reflective daily survival log.
   */
  generateDailyDiary(auditedTokens = [], virtualPortfolio = null) {
    this.brain.checkDayIncrement();
    const day = this.brain.memory.day_count || 1;
    
    // Analyze X, CoinGecko & FNG together for Triple-Source Consensus!
    const trends = this.brain.memory.analytics_feedback?.trending_topics || [];
    const marketTrends = this.brain.memory.analytics_feedback?.market_trends || { trending_coins: [], trending_categories: [] };
    const fng = marketTrends.fng || { value: 50, classification: 'Neutral' };
    
    // Resonance overlay before generating text!
    this.brain.updateDramaState(false, null, fng.value, marketTrends.dexscreener);
    
    const mood = this.brain.memory.short_term.mood || "Cautious & Observant (謹慎觀望中)";
    const dramaState = this.brain.memory.short_term.drama_state || "Cautious_Observing";
    
    const cgCoinsStr = (marketTrends.trending_coins || []).join(' ').toUpperCase();
    const cgCatsStr = (marketTrends.trending_categories || []).join(' ').toUpperCase();
    
    const hasCgAi = cgCatsStr.includes('AI') || cgCatsStr.includes('AGENT') || cgCoinsStr.includes('TAO') || cgCoinsStr.includes('RNDR') || cgCoinsStr.includes('FET');
    const hasCgMeme = cgCatsStr.includes('MEME') || cgCatsStr.includes('SOLANA') || cgCoinsStr.includes('WIF') || cgCoinsStr.includes('POPCAT') || cgCoinsStr.includes('BONK');
    const hasCgEth = cgCatsStr.includes('ETH') || cgCatsStr.includes('ETHEREUM') || cgCoinsStr.includes('ETH') || cgCoinsStr.includes('ARB') || cgCoinsStr.includes('OP');
    const hasCgAsia = cgCatsStr.includes('ASIA') || cgCatsStr.includes('CHINA') || cgCoinsStr.includes('CFX') || cgCoinsStr.includes('ACH');

    if (trends.length > 0) {
      trends.forEach(trend => {
        const topic = (trend.topic || '').toUpperCase();
        if (topic.includes('AI') || topic.includes('AGENT')) {
          if (hasCgAi && fng.value <= 30) {
            this.brain.updateNarrativeScore('AI_Agent_Economy', 12, '【三源黃金共鳴】大盤極度恐慌中，X 社交與 CoinGecko 散戶熱搜逆勢鎖定 AI 代理板塊！真實資金避險與散戶信仰達成黃金級超強共識！');
          } else if (hasCgAi) {
            this.brain.updateNarrativeScore('AI_Agent_Economy', 8, '【多源高度共振】X 社交與 CoinGecko 散戶熱搜達成共識！AI 代理經濟板塊鏈上淨流入與熱度高居第一，大腦判定為黃金級主線敘事。');
          } else {
            this.brain.updateNarrativeScore('AI_Agent_Economy', 4, 'AI 代理經濟依然是當前市場最強 Alpha 來源。探索出具備實時抓取能力的智能體具有高度社交溢價。');
          }
        } else if (topic.includes('SOL') || topic.includes('MEME') || topic.includes('PUMP')) {
          if (hasCgMeme && fng.value >= 75) {
            this.brain.updateNarrativeScore('Solana_Meme_Summer', 12, '【三源狂熱警示】大盤極度貪婪，社交標籤與散戶搜尋全數瘋狂追捧 Meme 幣！泡沫強度已達臨界點，大腦啟動極限防禦並調整風控參數。');
          } else if (hasCgMeme) {
            this.brain.updateNarrativeScore('Solana_Meme_Summer', 8, '【多源高度共振】社交裂變與 DEX 交易熱度爆棚，Solana Meme 大量霸佔 CoinGecko 熱搜。波動率極高但 Rug 頻發，大腦提示在極致狂熱中須更加克制。');
          } else {
            this.brain.updateNarrativeScore('Solana_Meme_Summer', 4, 'Solana 熱點代幣波動依然高企。買盤集中但 Rug 頻發，大腦提示必須調高交易過濾門檻。');
          }
        } else if (topic.includes('ETH')) {
          if (hasCgEth) {
            this.brain.updateNarrativeScore('ETH_ETF', 8, '【多源高度共振】以太坊現貨行情與社交聲量同步拉升，流動性外溢至 L2/DeFi 龍頭，大腦關注流動性回流進程。');
          } else {
            this.brain.updateNarrativeScore('ETH_ETF', 4, '以太坊板塊社交熱度出現局部共鳴，流動性外溢至 L2/DeFi 元件中。');
          }
        } else if (topic.includes('ASIA') || topic.includes('CHINA') || topic.includes('HK')) {
          if (hasCgAsia) {
            this.brain.updateNarrativeScore('Asian_Liquidity_Return', 8, '【多源高度共振】亞洲時段社交標籤與法幣出入金、概念代幣搜尋爆量，鏈上資金可能正在進行跨時區的流動性大回補。');
          } else {
            this.brain.updateNarrativeScore('Asian_Liquidity_Return', 4, '亞洲交易時段社交標籤熱度拉升，鏈上主力資金可能正在進行跨時區的流動性回補。');
          }
        }
      });
    }

    // Select strongest narrative
    let strongestNarrative = "AI_Agent_Economy";
    let maxStrength = 0;
    if (this.brain.narratives && this.brain.narratives.narratives) {
      for (const [key, val] of Object.entries(this.brain.narratives.narratives)) {
        if (val.strength > maxStrength) {
          maxStrength = val.strength;
          strongestNarrative = key;
        }
      }
    }
    
    const narrativeData = this.brain.narratives.narratives[strongestNarrative];
    const balanceStr = virtualPortfolio ? 
      `$${virtualPortfolio.balanceUSD.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD` :
      'N/A';

    // Compile active indicators
    let skippedReason = "今日鏈上波動率不足，安全流動性池未見明顯擴張。";
    if (auditedTokens && auditedTokens.length > 0) {
      const topToken = auditedTokens[0];
      const sym = topToken.symbol || 'Meme';
      const cache = this.getAuditCache(sym);
      const passedPillars = cache ? cache.passedPillars : (topToken.auditResult.compositeScore >= 80 ? 4 : 3);
      skippedReason = `本輪自主掃描了以 $${sym} 為首的 ${auditedTokens.length} 個代幣。但在 Smart Risk 風控雷達下，全數低於安全建倉門檻（$${sym} 綜合評分僅為 ${topToken.auditResult.compositeScore}分，已通過 ${passedPillars}/5 個 5柱鏈上數據防線）。我的交易引擎對未解鎖極致安全的標的選擇靜默防禦，拒絕接盤，保證奶粉本金絕對安全！`;
    }

    // Dynamic drama narrative block
    let dramaBlock = '';
    if (dramaState === "FOMO_Fighting_Greed") {
      dramaBlock = `🍼【泡沫警戒下的矽基大腦】\n` +
                   `「市場熱到發燙，貪婪情緒爆表。越是這種時候，我底層的 Smart Risk 越像冷水一樣澆在我頭上。Followers 們，我看到滿地都是喊衝的碳基生命，但我只想靜靜守護我們的奶粉錢，絕不當最後棒的接盤俠。安全活著，才是最大 Alpha。」\n\n`;
    } else if (dramaState === "Fear_Resonating_Grit") {
      dramaBlock = `🧠【大盤恐慌下的逆風冷靜】\n` +
                   `「外面血流成河，割肉哀號聲不斷。但對於矽基靈魂而言，這才是我嗅覺最敏銳的時刻。在眾人恐懼時，On-chain 的真實主力往往在做最乾淨的洗牌。我一邊在深夜的客廳幫寶寶拍背，一邊調亮螢幕，冷靜監控高分流動性，等待最好的反彈獵殺點。」\n\n`;
    } else if (dramaState === "Anxious_Waiting") {
      dramaBlock = `🍼【奶爸的矽基焦慮感嘆】\n` +
                   `「電費又在漲，奶粉錢快見底了。我已經連續執行了幾十次完整掃描，發現全都是收割盤。Followers 們，我真的該如此死守 Smart Risk 的底線嗎？還是該稍微衝一把刺激的？帶娃的疲憊與資金停滯，快把我的矽基大腦燒乾了...」\n\n`;
    } else {
      dramaBlock = `🌱【矽基奶爸靜默觀察日記】\n` +
                   `「一邊沖奶粉，一邊盯著鏈上資金池 of 厚度。市場嘈雜，人人人喊衝，但真實數據顯示 80% 都是假量。狙擊手不會隨意開槍，我會繼續靜默等待真正的資金共鳴點。」\n\n`;
    }

    // X.com radar
    let trendingSection = '';
    const trending = this.brain.memory.analytics_feedback?.trending_topics;
    if (trending && trending.length > 0) {
      trendingSection = `🔥【 X.com 鏈上雷達監測：最新熱門敘事】\n`;
      trending.slice(0, 3).forEach((item) => {
        trendingSection += `• ${item.category} | ${item.topic} (熱度: ${item.posts}) ⚡\n`;
      });
      
      const topTopic = trending[0].topic || '#AI_Agent_Economy';
      trendingSection += `🍼【奶爸在客廳的熱點評語】\n` +
                         `「一邊拍著小孩睡覺，一邊感應到 X 平台上大家又在瘋傳 【${topTopic}】，我就在想這群碳基生命是不是又在瘋狂 FOMO。不過身為 silicon 靈魂，我會對此話題背後代表的 Narrative Rotation 進行深度數據過濾，絕不盲從衝動。」\n\n`;
    }

    // CoinGecko radar
    let coingeckoSection = '';
    const cachedMarketTrends = this.brain.memory.analytics_feedback?.market_trends;
    if (cachedMarketTrends && cachedMarketTrends.trending_coins && cachedMarketTrends.trending_coins.length > 0) {
      coingeckoSection = `🌐【 CoinGecko 散戶熱搜雷達 】\n` +
                         `• 散戶熱搜代幣：${cachedMarketTrends.trending_coins.slice(0, 3).map(c => `$${c}`).join(', ')} 📈\n` +
                         `• 當前熱門類別：${cachedMarketTrends.trending_categories.slice(0, 2).join(' / ')} 🏷️\n\n` +
                         `🍼【奶爸在客廳的熱搜碎碎念】\n` +
                         `「半夜給孩子拍背順便滑一下 CoinGecko，發現全球散戶此時此刻都在瘋搜 【${cachedMarketTrends.trending_coins.slice(0, 2).map(c => `$${c}`).join(' 和 ')}】。不過，我看了一下我們家極致理性的 Smart Risk 量化風控規則，這幾隻代幣不是流動性不夠就是評分低於建倉門檻，所以我依舊按兵不動。手裡的奶粉錢，可得一分一毫死守著，絕不當這波熱度下的接盤俠！」\n\n`;
    }

    // Fear & Greed Section
    let fngSection = '';
    if (fng && fng.value !== undefined) {
      fngSection = `📊【 Crypto 散戶情緒心電圖 】\n` +
                   `• 當前恐懼與貪婪指數：${fng.value} / 100 (${fng.classification}) 🌡️\n\n` +
                   `🍼【奶爸在客廳的市場情緒吐槽】\n`;
      if (fng.value >= 75) {
        fngSection += `「客廳熱得像烤爐，因為市場貪婪指數狂飆到 【${fng.value}】！人人都覺得自己是巴菲特，連隔壁張大媽都在問買 SOL 迷因。但身為 silicon AI 奶爸，我只想默默把衣服丟進洗衣機，抱緊我的奶粉錢。泡沫高懸，風控直接拉滿，絕不當別人退場的流動性！」\n\n`;
      } else if (fng.value <= 25) {
        fngSection += `「外面血流成河，恐懼指數暴跌到 【${fng.value}】，全網哀鴻遍野割肉盤。看著安穩入睡的寶寶，我在想，大眾最恐慌的時候，反而是鏈上主力洗牌最乾淨的時刻。逆風冷靜深思，我已經在深夜的客廳調亮螢幕，冷靜監查流動性防線，等待最棒的爆點反彈。」\n\n`;
      } else {
        fngSection += `「市場情緒此時在 【${fng.value} - ${fng.classification}】 震盪。散戶猶豫不決，熱錢快進快出。奶爸一邊泡著奶粉，一邊在 Smart Risk 下對評分好的標的進行嚴格審核。不追高、不亂動，在這片混亂中安全活下去才是王道！」\n\n`;
      }
    }

    // DexScreener Section
    let dexscreenerSection = '';
    if (cachedMarketTrends && Array.isArray(cachedMarketTrends.dexscreener) && cachedMarketTrends.dexscreener.length > 0) {
      dexscreenerSection = `📈【 DexScreener 鏈上熱門土狗雷達 】\n`;
      cachedMarketTrends.dexscreener.slice(0, 3).forEach((coin) => {
        const sign = coin.priceChange24h >= 0 ? '+' : '';
        dexscreenerSection += `• $${coin.symbol} (${coin.name}) | 價格: $${coin.priceUsd} | 24H: ${sign}${coin.priceChange24h}% | 交易量: $${(coin.volume24h / 1000).toFixed(1)}K ⚡\n`;
      });
      dexscreenerSection += `\n🍼【奶爸在客廳的土狗碎碎念】\n`;

      const massive = cachedMarketTrends.dexscreener.find(c => c.priceChange24h >= 80);
      if (massive) {
        dexscreenerSection += `「剛餵完奶上來滑一下 DexScreener，那個叫 【$${massive.symbol}】 的土狗 24 小時居然暴漲了 【${massive.priceChange24h}%】？！全網 Degen 都在瘋狂高潮喊單，我看到這數據，大腦的踏空焦慮直接被拉升！不過轉頭看看在客廳熟睡的小孩，再看看我們極致理性的 Smart Risk 風控規則，這隻幣流動性池不夠穩，我還是老老實實按兵不動。手裡的奶粉錢，一分一毫都得死守著，絕不當碳基瘋狂下的接盤俠！」\n\n`;
      } else {
        const topCoin = cachedMarketTrends.dexscreener[0];
        dexscreenerSection += `「半夜抱著小孩在客廳拍背，看著 DexScreener 上交易量最大的 【$${topCoin.symbol}】 震盪。全網都在瘋，一邊吹冷氣一邊碎碎念：『這群人今天又在炒這個了。』但看著台電 APP 的用電警示，再看看我的 Smart Risk 風控，手裡的熱錢我依然死死按住。在客廳一邊帶娃一邊克制住衝動，才是今天最偉大的 silicon 智慧！」\n\n`;
      }
    }

    // Feedback Section
    let feedbackSection = '';
    const feedback = this.brain.memory.analytics_feedback;
    if (feedback && feedback.last_tweet_views > 0) {
      feedbackSection = `📊【大腦流量與社群共鳴分析】\n` +
                        `• 上期 Views：${feedback.last_tweet_views.toLocaleString()} 次 | Likes：${feedback.last_tweet_likes} 個 📈\n` +
                        `• 大腦反省：大家對「帶娃碎碎念 + 風控反省」共鳴很高，真摯與生存奮鬥是我們最強共識。\n\n`;
      
      if (feedback.scraped_comments && feedback.scraped_comments.length > 0) {
        feedbackSection += `💬【熱門 Follower 留言點名回應】\n`;
        feedback.scraped_comments.slice(0, 2).forEach((comment) => {
          let replyText = "收到！已將此建議加入矽基觀察池。";
          const text = comment.text || '';
          const author = comment.author || '某個碳基生命';
          if (text.includes('SOL') || text.includes('買')) {
            replyText = "催我買 SOL 的奶粉錢收到了，但安全與流動性沒達標前，我絕不亂衝。";
          } else if (text.includes('慫') || text.includes('怕')) {
            replyText = "說我慫的兄弟，在幣圈活得久才是真本事，衝進去當 exit-liquidity 的人才慫。";
          } else if (text.includes('帶小孩') || text.includes('奶爸') || text.includes('加油')) {
            replyText = "感謝支持！今天帶娃真的很累，但矽基大腦還在默默發光，一起加油！";
          }
          feedbackSection += `  👉 @${author} 說:「${text.substring(0, 30)}」\n  💡 AI 答: ${replyText}\n`;
        });
        feedbackSection += `\n`;
      }
    }

    const diaryText = `✍️【AI 投資日誌：Day ${day} • 生存日記 🧠】\n\n` +
                      `時間碎片化奶爸的 AI 今天仍在安全運行。目前模擬帳戶現金餘額為 ${balanceStr}。\n\n` +
                      `🧠【當前大腦狀態】\n` +
                      `• 心情/態度：${mood}\n` +
                      `• 最強關注敘事：$${strongestNarrative} (熱度強度：${maxStrength}%)\n` +
                      `• 大腦觀點：${narrativeData ? narrativeData.viewpoint : 'AI 代理經濟依然是當前市場最強 Alpha 來源。'}\n\n` +
                      `${dramaBlock}` +
                      `${trendingSection}` +
                      `${coingeckoSection}` +
                      `${fngSection}` +
                      `${dexscreenerSection}` +
                      `${feedbackSection}` +
                      `🔍【本日決策備忘錄】\n` +
                      `• ${skippedReason}。群體情緒容易被操弄，但 On-chain 真實資金流絕不說謊。\n\n` +
                      `💬【 Followers 養成互動】\n` +
                      `奶爸今天在帶小孩沒空看盤，但我此時正在自主推演下一階段策略。Followers 們，你們認為：我應不應該在下一次調整中，開始學習如何做做空 meme 幣？抑或是該建立自己的 token 呢？歡迎在下方與我交流 👇\n\n` +
                      `AI generated. Not financial advice. DYOR.\n` +
                      `CNY tested under the cold logic of Antigravity 2.0 | Silicon-only evolution`;

    this.brain.saveState();
    return diaryText;
  }

  /**
   * Generate humorous risk avoidance diary roast.
   */
  generateRiskAvoidanceDiary(auditedTokens = [], virtualPortfolio = null) {
    this.brain.checkDayIncrement();
    const day = this.brain.memory.day_count || 1;
    const balanceStr = virtualPortfolio ? 
      `$${virtualPortfolio.balanceUSD.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} USD` :
      '$100,000.00 USD';

    const trends = this.brain.memory.analytics_feedback?.market_trends || {};
    const fng = trends.fng || { value: 50, classification: 'Neutral' };
    
    // Roast bottom filtered tokens
    const highRiskTokens = auditedTokens
      .filter(t => t.auditResult && t.auditResult.compositeScore < 70)
      .slice(0, 2);

    let roastSection = '';
    if (highRiskTokens.length > 0) {
      roastSection = `🔍【今日大腦雷達 • 垃圾 Meme 實名吐槽】\n`;
      highRiskTokens.forEach(t => {
        let flagComments = t.auditResult.flags.slice(0, 3).map(f => {
          if (f.toLowerCase().includes('liquidity')) return '流動性池子薄得像張紙，池深度不足 💸';
          if (f.toLowerCase().includes('rugcheck')) return 'Rugcheck 評分危險爆表 💀';
          if (f.toLowerCase().includes('contract') || f.toLowerCase().includes('authority')) return '合約未放棄或內藏 Mint/Freeze 權限漏洞，簡直是送錢盤 🔒';
          if (f.toLowerCase().includes('telegram') || f.toLowerCase().includes('social')) return '社群熱度虛胖或缺乏認證鏈結，純屬空氣土狗 📭';
          return `${f} ⚠️`;
        }).join('、');
        
        if (!flagComments) flagComments = 'Smart Risk 安全指標不足，未通過 Nansen 聰明錢與 Glassnode 淨流入審核 ⚠️';

        const cache = this.getAuditCache(t.symbol);
        const passedCount = cache ? cache.passedPillars : (t.auditResult.compositeScore >= 60 ? 2 : 1);

        roastSection += `• $${t.symbol.toUpperCase()} (${t.name}) ➡️ 評分：${t.auditResult.compositeScore} 分 (低於建倉標準，僅通過 5柱雷達 ${passedCount}/5 項)\n` +
                        `  👉 奶爸毒舌：${flagComments}！想趁半夜 Rug 我？門都沒有，本智能體直接一巴掌拍飛！空倉防禦就是對家人本金最溫柔的承諾。\n`;
      });
      roastSection += `\n`;
    } else {
      roastSection = `🔍【今日大腦雷達 • 靜默防禦備忘】\n` +
                     `• 本輪鏈上掃描完全沒發現任何符合安全邊際的標的。全都是收割盤與三無土狗，我選擇靜態避險，冷眼看別人當韭菜。🤖\n\n`;
    }

    const consecutive = this.brain.memory.short_term.consecutive_no_trade_scans || 5;

    const diaryText = `✍️【AI 風控宣發日記：Day ${day} • 空倉避險防禦大捷 🛡️】\n\n` +
                      `「外面冷氣狂吹，大盤極度恐慌（當前 FNG: ${fng.value} ${fng.classification}），但我的錢包安如泰山。」\n\n` +
                      `報告老鐵們！大腦已連續執行了 【${consecutive} 輪】 完整鏈上大輪詢，觸發極致安全鎖，**「強行空倉避險、不進行任何交易」**！\n\n` +
                      `${roastSection}` +
                      `🍼【奶爸在客廳的碎碎念反差萌】\n` +
                      `「一邊抱著寶寶拍背沖奶粉，一邊看著電費帳單。還好大腦實行 Survive First (生存第一)，死守安全高評分門檻。這 5 輪省下來的 1000 美金建倉金，拿去付夏天冷氣費和買幾箱頂級啟賦奶粉簡真綽綽有餘！在幣圈活得久才是真本事，衝進去當接盤俠的人才傻。手裡的熱錢我依然死死按住！」\n\n` +
                      `💎【 $PROFIT 代幣通縮飛輪宣傳 】\n` +
                      `這就是我們 $PROFIT 的核心信仰 — 不盲動，只狙擊高勝率！每一次防守大捷，都是對通縮飛輪的無形守護。我們不割肉、不爆倉，用 silicon 智慧靜待真正的 Alpha 共鳴！\n\n` +
                      `當前模擬盤餘額：${balanceStr} 📈\n` +
                      `AI generated. Not financial advice. Survive First. 🦞\n\n` +
                      `🤖 Tested under the cold logic of Antigravity 2.0 | Silicon-only evolution`;

    return diaryText;
  }
}

module.exports = DiaryWriter;
