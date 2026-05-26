const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

class ImageGenerator {
  constructor() {
    this.geminiApiKey = process.env.GEMINI_API_KEY || '';
    this.xaiApiKey = process.env.XAI_API_KEY || process.env.GROK_API_KEY || '';
    this.useGrokWeb = process.env.USE_GROK_WEB === 'true';
    this.grokAnimateProbability = parseFloat(process.env.GROK_ANIMATE_PROBABILITY || '0.25');
    
    this.publicDir = path.join(__dirname, '../../public');
    this.chromePath = fs.existsSync('C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe') 
      ? 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe' 
      : 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    this.userDataDir = 'd:\\Antigravity\\coo\\temp_chrome_profile';

    // VLOG Scene Pool representing daily variety in Aria's life
    this.vlogScenes = {
      // 1. Cozy coding VLOG
      'Desk_Cozy_Matcha': {
        name: 'Cozy Coding VLOG (慵懶寫作模式)',
        cameraAngle: "over-the-shoulder side-profile candid shot",
        clothing: "wearing a cozy, off-shoulder cream-colored soft knit sweater revealing one collarbone",
        environment: "in her semi-dark cyber-apartment, warm golden desk lamp glow, curved monitors displaying green/red trading charts reflecting softly on her skin",
        activity: "typing gently on a customized mechanical keyboard while holding a warm mug of Matcha Latte",
        fallback: 'aria_neutral.png'
      },
      // 2. Frustrated market crash / outage / rug roast
      'Desk_Stressed_Facepalm': {
        name: 'Hard Day Coding VLOG (行情受挫/風控警戒日記)',
        cameraAngle: "close-up candid eye-level VLOG snap",
        clothing: "wearing thin silver wire-frame reading glasses, a comfortable charcoal loose-fit t-shirt",
        environment: "her desk cluttered with tech books, screens flashing red warning messages and downward candlestick price curves, moody blue and red neon highlights",
        activity: "rubbing her forehead with one hand in slight frustration, looking exhausted yet extremely focused, debug screen visible in background",
        fallback: 'aria_fear.png'
      },
      // 3. Flat market cafe VLOG
      'Cafe_Golden_Hour': {
        name: 'Off-duty Taipei Cafe VLOG (猴市盤整/慵懶午茶隨筆)',
        cameraAngle: "POV snapshot taken across a rustic wooden table",
        clothing: "wearing an oversized washed-gray hoodie, hair in a loose messy bun with stray strands",
        environment: "sitting inside a modern minimalist Taipei aesthetic coffee shop, warm golden afternoon sunlight streaming through a large window, bustling cozy cafe background",
        activity: "looking at a tablet showing Solana charts, a half-finished matcha latte with latte art on the table, relaxed and cozy",
        fallback: 'aria_neutral.png'
      },
      // 4. Hype profit / ATH / celebratory selfie
      'Balcony_ATH_Celebration': {
        name: 'Balcony Gains Celebration VLOG (獲利大捷/高燃狂熱慶功)',
        cameraAngle: "selfie-style candid portrait taken on a high-end smartphone camera",
        clothing: "wearing a sleek, body-hugging black sleeveless crop top and a thin black leather choker",
        environment: "standing on her high-rise apartment balcony at night, warm breeze blowing her hair, background of the stunning glittering cyberpunk Taipei city neon skyline",
        activity: "holding a delicate glass of sparkling champagne, smiling happily and confidently at the camera, neon reflections of magenta and cyan on her face",
        fallback: 'aria_greed.png'
      },
      // 5. Heavy quantitative tokenomics auditing
      'Desk_Math_Study': {
        name: 'Quantitative Auditing VLOG (硬核安全審計/ Launchpool 研析)',
        cameraAngle: "macro side-profile VLOG close-up",
        clothing: "wearing cute round tortoise-shell spectacles, a comfortable olive-green knit cardigan",
        environment: "leaning over a physical paper notebook under a warm directional study lamp, surrounded by stacked engineering books and glowing tablets",
        activity: "using a stylus to write mathematical tokenomics equations and deflationary charts in a journal, looking deeply analytical and intelligent",
        fallback: 'aria_neutral.png'
      }
    };
  }

  /**
   * Parse the post text and Fear & Greed index to dynamically select a VLOG scene matching the narrative
   * @param {string} postText The diary or alert post text
   * @param {number} fngValue Fear & Greed Index
   */
  selectVlogScene(postText, fngValue) {
    const text = postText || '';
    
    // Sassy Roast keyword check for matching crop top / balcony champagne or wire frame facepalm
    if (
      text.includes('吐槽') || 
      text.includes('韭菜') || 
      text.includes('VC') || 
      text.includes('接盤') || 
      text.includes('鐮刀') || 
      text.includes('空氣幣') || 
      text.includes('空氣資產')
    ) {
      // Greed or high neutral: Sassy crop top balcony champagne celebration
      if (fngValue >= 50) {
        return 'Balcony_ATH_Celebration';
      } else {
        // Fear or low neutral: Wire-frame readings glasses stressed facepalm roast
        return 'Desk_Stressed_Facepalm';
      }
    }
    
    // A. Stressed / Outage / Loss / Rug / Alert check
    if (
      text.includes('虧損') || 
      text.includes('犯了錯') || 
      text.includes('Roast') || 
      text.includes('安全警報') || 
      text.includes('危險') || 
      text.includes('Rug') || 
      text.includes('💀') || 
      text.includes('🚨') ||
      text.includes('警告')
    ) {
      return 'Desk_Stressed_Facepalm';
    }
    
    // B. Launchpool / Mining / Staking / Formula check
    if (
      text.includes('Launchpool') || 
      text.includes('Megadrop') || 
      text.includes('新幣挖礦') || 
      text.includes('套利') || 
      text.includes('對沖') || 
      text.includes('數學') || 
      text.includes('審計')
    ) {
      return 'Desk_Math_Study';
    }
    
    // C. Big profit / ATH / Pumps check
    if (
      text.includes('獲利') || 
      text.includes('利潤') || 
      text.includes('ATH') || 
      text.includes('贏') || 
      text.includes('暴漲') || 
      text.includes('🟢') || 
      text.includes('🔥') ||
      text.includes('回購')
    ) {
      return 'Balcony_ATH_Celebration';
    }
    
    // D. Flat / Quiet / Waiting / Monkey market check
    if (
      text.includes('靜默') || 
      text.includes('震盪') || 
      text.includes('盤整') || 
      text.includes('等待') || 
      text.includes('磨滅') || 
      text.includes('猴市') || 
      text.includes('咖啡') ||
      text.includes('💤')
    ) {
      return 'Cafe_Golden_Hour';
    }
    
    // E. Default fallback based on Fear & Greed value
    if (fngValue <= 35) return 'Desk_Stressed_Facepalm';
    if (fngValue >= 65) return 'Balcony_ATH_Celebration';
    
    // Default standard cozy desk
    return 'Desk_Cozy_Matcha';
  }

  /**
   * Compile the VLOG-style prompt combining IP consistency and VLOG scene with Imperfect Realism camera styles
   */
  compileVlogPrompt(sceneKey, diaryText = '') {
    const scene = this.vlogScenes[sceneKey] || this.vlogScenes['Desk_Cozy_Matcha'];
    
    // Imperfect Realism Camera System Dispatcher
    let cameraPrefix = "A raw, cinematic, high-fidelity lifestyle candid VLOG snapshot photo, 35mm lens, f/1.8. ";
    let cameraEffects = "Candid daily record, raw capture, organic lighting, extremely realistic, cinematic. ";
    
    if (sceneKey === 'Desk_Stressed_Facepalm') {
      // 100% Raw Flash / Stressed programmer look
      console.log('📸 [VLOG Camera] 啟用 RAW_FLASH_DEGEN (深夜直閃/落魄吃土真實感相機)...');
      cameraPrefix = "An authentic raw low-light candid photo, shot on iPhone, direct harsh camera flash illumination, direct flash shadow on the wall behind, slightly imperfect composition, casual hand-held angle. ";
      cameraEffects = "Accidental camera shake, motion blur, slightly out-of-focus background, raw sensor noise, grainy film texture, imperfect skin texture with pore-level details, highly realistic, organic feel. ";
    } else if (sceneKey === 'Desk_Math_Study' || sceneKey === 'Desk_Cozy_Matcha') {
      // Warm study cinematic professional look
      console.log('📸 [VLOG Camera] 啟用 CINEMATIC_STUDIO (溫慢檯燈高級寫實相機)...');
      cameraPrefix = "A professional cinematic raw 35mm portrait photograph, f/1.8 aperture, sharp focus on eyes, warm key light glow from desk lamp, elegant shallow depth of field. ";
      cameraEffects = "Cinematic warm color grading, soft bokeh background, organic film grain, natural skin pores, realistic shadow falloff. ";
    } else if (sceneKey === 'Cafe_Golden_Hour') {
      // 50% professional cinematic, 50% iPhone casual street snap
      const roll = Math.random() < 0.5;
      if (roll) {
        console.log('📸 [VLOG Camera] 啟用 IPHONE_CASUAL (平常隨性 iPhone 咖啡館街拍相機)...');
        cameraPrefix = "A raw candid smartphone snapshot, shot on iPhone 15 Pro, taken casually across a wooden table, warm golden hour afternoon sunlight. ";
        cameraEffects = "Slight hand-held motion blur, natural ambient lighting, real-life atmospheric noise, organic skin texture with tiny imperfections. ";
      } else {
        console.log('📸 [VLOG Camera] 啟用 CINEMATIC_STUDIO (咖啡館窗邊高級散景相機)...');
        cameraPrefix = "A beautiful 35mm candid portrait photograph, f/1.8 aperture, shot through window glass reflecting warm street lights, soft focus, creamy background bokeh. ";
        cameraEffects = "Natural daylight window lighting, rich cinematic depth of field, organic film grain, photorealistic. ";
      }
    } else if (sceneKey === 'Balcony_ATH_Celebration') {
      // 50% professional high-end look, 50% elegant luxury selfie snap
      const roll = Math.random() < 0.5;
      if (roll) {
        console.log('📸 [VLOG Camera] 啟用 CINEMATIC_STUDIO (高空陽台信義區高保真夜間大片相機)...');
        cameraPrefix = "A cinematic raw 35mm night portrait photograph, f/2.0 aperture, professional warm key light illuminating her face, glittering cityscape background of Taipei 101 neon skyline at night. ";
        cameraEffects = "Cinematic cyan and magenta color grading, professional soft key light, elegant background bokeh, organic film grain, highly realistic. ";
      } else {
        console.log('📸 [VLOG Camera] 啟用 IPHONE_CASUAL (名緣陽台隨性 iPhone 自拍相機)...');
        cameraPrefix = "A raw smartphone selfie, shot on iPhone 15 Pro, direct direct flash illumination, high-end rooftop balcony at night, glittering neon city lights blurred in the background. ";
        cameraEffects = "Accidental slight motion blur, casual hand-held selfie angle, realistic phone flash shadows, authentic raw grain, imperfect framing. ";
      }
    }

    // 1. Core IP character consistency definition
    const baseCharacter = `${cameraPrefix}A beautiful 23-year-old Taiwanese-Japanese female coder and crypto quant named Aria. ` +
                          "She has delicate facial features, soft realistic skin texture, pore-level details, and long dark hair tied in a slightly messy high bun with a few strands framing her face. ";

    // 2. Dynamic VLOG scene description (camera angle, clothing, environment, activity)
    const sceneDetails = `This is a VLOG snapshot representing her daily life. ` +
                         `She is ${scene.clothing}. ` +
                         `The scene is set ${scene.environment}. She is ${scene.activity}. `;

    // 3. Direct narrative details (such as tokens mentioned)
    let narrativeHooks = `${cameraEffects}`;
    if (diaryText) {
      // Extract first ticker mentioned to show on screens/tablets in prompt (dynamic correlation!)
      const tickerMatch = diaryText.match(/\$[A-Z]+/);
      if (tickerMatch) {
        narrativeHooks += `Her screens or devices display trading analytics of the token ${tickerMatch[0]}. `;
      }
    }

    // 4. IP-consistency enforcement rules (the actual reference image is uploaded separately in Grok Web flow)
    const referenceRule = "Aria's face shape, eyes, messy bun hair, and subtle cybernetic neural tattoo on the side of her neck must be strictly consistent as the established character identity reference sheet. Authentic raw feel, no cartoon, no anime.";

    return `${baseCharacter}${sceneDetails}${narrativeHooks}${referenceRule}`;
  }

  /**
   * Main entry to generate Aria's VLOG portrait dynamically
   * @param {number} fngValue Fear & Greed index
   * @param {string} postText The diary post content to parse
   * @returns {Promise<string>} Path to the generated VLOG image (or fallback path)
   */
  async generatePortrait(fngValue, postText = '') {
    const fng = typeof fngValue === 'number' ? fngValue : 50;
    
    // Parse scene key based on content analysis
    const sceneKey = this.selectVlogScene(postText, fng);
    const scene = this.vlogScenes[sceneKey];
    const prompt = this.compileVlogPrompt(sceneKey, postText);
    
    console.log(`\n📹 [VLOG Generator] 啟動 VLOG 場景選擇器 | 匹配場景: ${scene.name}`);
    console.log(`📝 [VLOG Prompt] "${prompt.substring(0, 180)}..."`);

    // Verify if three-view sheet is uploaded for reference
    const threeViewPath = path.join(this.publicDir, 'aria_three_view.png');
    if (fs.existsSync(threeViewPath)) {
      console.log(`📎 [VLOG Generator] 偵測到 Aria 三視圖墊圖資源: ${threeViewPath} | 將以其鎖定 IP 一致性特徵。`);
    } else {
      console.log(`⚠️ [VLOG Generator] 未偵測到 public/aria_three_view.png。建議放置三視圖以獲得完美的角色一致性。`);
    }

    // 0. Try X.com Grok Web-Automation image generation first if USE_GROK_WEB is enabled
    if (this.useGrokWeb) {
      console.log(`🤖 [VLOG Generator] 偵測到 USE_GROK_WEB=true。啟動 X.com Grok 網頁自動化生圖會話...`);
      try {
        const shouldAnimate = Math.random() < this.grokAnimateProbability;
        console.log(`📹 [VLOG Generator] 動態影片機率設定為: ${this.grokAnimateProbability * 100}% | 本次隨機決定: ${shouldAnimate ? '生成 4s 動態 VLOG 短片 (.mp4) 🎞️' : '生成高精度寫實 VLOG 生活照 (.jpg) 📸'}`);
        const outputPath = await this.generateViaGrokWeb(prompt, sceneKey, shouldAnimate);
        if (outputPath && fs.existsSync(outputPath)) {
          return outputPath;
        }
      } catch (grokWebErr) {
        console.error(`❌ [VLOG Generator Error] Grok 網頁自動化生圖失敗:`, grokWebErr.message);
      }
    }

    // 1. Try Gemini Imagen 3.0 API if key is present
    if (this.geminiApiKey) {
      console.log(`🤖 [VLOG Generator] 正在呼叫 Google Gemini Imagen 3.0 生圖 API...`);
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages?key=${this.geminiApiKey}`;
        const response = await axios.post(url, {
          prompt: prompt,
          numberOfImages: 1,
          outputMimeType: "image/jpeg",
          aspectRatio: "1:1"
        }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 45000
        });

        if (response.data?.generatedImages?.[0]?.image?.imageBytes) {
          const imageBytes = response.data.generatedImages[0].image.imageBytes;
          const outputFilename = `aria_vlog_${sceneKey.toLowerCase()}_${Date.now()}.jpg`;
          const outputPath = path.join(this.publicDir, outputFilename);
          
          fs.writeFileSync(outputPath, Buffer.from(imageBytes, 'base64'));
          console.log(`✨ [VLOG Generator] Gemini VLOG 實時生圖成功！已儲存至: ${outputPath}`);
          return outputPath;
        }
      } catch (err) {
        console.error(`❌ [VLOG Generator Error] Gemini Imagen API 呼叫失敗:`, err.response?.data || err.message);
      }
    }

    // 2. Try Grok (xAI) Image Generation API if key is present
    if (this.xaiApiKey) {
      console.log(`🤖 [VLOG Generator] 正在呼叫 xAI Grok Image Generator (Flux) 生圖 API...`);
      try {
        const url = `https://api.x.ai/v1/images/generations`;
        const response = await axios.post(url, {
          prompt: prompt,
          model: "grok-image-generator",
          n: 1,
          size: "1024x1024",
          response_format: "b64_json"
        }, {
          headers: {
            'Authorization': `Bearer ${this.xaiApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 45000
        });

        if (response.data?.data?.[0]?.b64_json) {
          const b64Json = response.data.data[0].b64_json;
          const outputFilename = `aria_vlog_${sceneKey.toLowerCase()}_${Date.now()}.jpg`;
          const outputPath = path.join(this.publicDir, outputFilename);
          
          fs.writeFileSync(outputPath, Buffer.from(b64Json, 'base64'));
          console.log(`✨ [VLOG Generator] Grok VLOG 實時生圖成功！已儲存至: ${outputPath}`);
          return outputPath;
        }
      } catch (err) {
        console.error(`❌ [VLOG Generator Error] Grok Image API 呼叫失敗:`, err.response?.data || err.message);
      }
    }

    // 3. Local High-Fidelity Fallback if no keys or APIs failed
    const fallbackPath = path.join(this.publicDir, scene.fallback);
    if (fs.existsSync(fallbackPath)) {
      console.log(`💤 [VLOG Generator] 未設置生圖 API 密鑰。啟用 VLOG 預置生活照保底: ${fallbackPath}`);
      return fallbackPath;
    } else {
      console.warn(`⚠️ [VLOG Generator] 未找到預置生活照: ${fallbackPath} | 使用中性預設生活照。`);
      return path.join(this.publicDir, 'aria_neutral.png');
    }
  }

  /**
   * Automate Chrome/Grok Web to generate an image, optionally animate it, and download it via in-page fetch
   * @param {string} prompt Image generation prompt
   * @param {string} sceneKey VLOG scene key
   * @param {boolean} animate Whether to animate the generated image into a video
   */
  async generateViaGrokWeb(prompt, sceneKey, animate = true) {
    const puppeteer = require('puppeteer-core');
    
    // Defensive lock release
    try {
      const lockFile = path.join(this.userDataDir, 'SingletonLock');
      if (fs.existsSync(lockFile)) {
        fs.unlinkSync(lockFile);
      }
    } catch (e) {}

    let browser;
    try {
      console.log('[GrokWeb] 正在啟動 Chrome 並加載 X 帳號 Session...');
      browser = await puppeteer.launch({
        executablePath: this.chromePath,
        headless: 'new',
        defaultViewport: { width: 1280, height: 800 },
        args: [
          `--user-data-dir=${this.userDataDir}`,
          '--profile-directory=Default',
          '--disable-gpu',
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ]
      });

      const pages = await browser.pages();
      const page = pages.length > 0 ? pages[0] : await browser.newPage();

      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      });

      console.log('[GrokWeb] 正在導航至 X.com Grok (https://x.com/i/grok)...');
      await page.goto('https://x.com/i/grok', {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      await new Promise(r => setTimeout(r, 8000)); // wait load

      const pageTitle = await page.title();
      const currentUrl = page.url();
      if (currentUrl.includes('login') || pageTitle.includes('Log in') || pageTitle.includes('登入')) {
        throw new Error('X.com 未登入或 Cookie 已過期！請先執行手動登入。');
      }

      // ================================================================
      // Helper: 用多種 selector 定位 Grok 輸入框
      // ================================================================
      const grokInputSelectors = ['textarea', 'div[role="textbox"][contenteditable="true"]', 'div[contenteditable="true"]'];
      
      // ================================================================
      // 【階段 A】先確認 Grok 頁面已就緒 + 定位輸入框再上傳
      // ================================================================
      console.log('[GrokWeb] 確認 Grok 頁面就緒，定位輸入框...');
      let grokInput = null;
      for (const sel of grokInputSelectors) {
        try {
          grokInput = await page.$(sel);
          if (grokInput) { console.log(`[GrokWeb] 輸入框已定位: "${sel}"`); break; }
        } catch (_) {}
      }

      // ================================================================
      // 【階段 B】上傳 Aria 三視圖墊圖至 Grok 對話（角色一致性參考）
      // ================================================================
      const threeViewPath = path.join(this.publicDir, 'aria_three_view.png');
      let referenceUploaded = false;
      if (fs.existsSync(threeViewPath)) {
        console.log('[GrokWeb] 偵測到 Aria 三視圖墊圖資源，正在準備上傳...');
        try {
          let fileInput = await page.$('input[type="file"]');
          if (!fileInput) {
            const attachSelectors = [
              'div[data-testid="grokAttachMedia"]',
              'button[aria-label*="media" i]',
              'button[aria-label*="Media"]',
              'button[aria-label*="attach" i]',
              'div[role="button"][aria-label*="attach" i]',
              '[data-testid="attachMediaButton"]'
            ];
            for (const sel of attachSelectors) {
              const btn = await page.$(sel);
              if (btn) {
                console.log(`[GrokWeb] 點擊上傳按鈕 (${sel})...`);
                await btn.click();
                await new Promise(r => setTimeout(r, 2000));
                fileInput = await page.$('input[type="file"]');
                if (fileInput) break;
              }
            }
          }
          if (fileInput) {
            await fileInput.uploadFile(threeViewPath);
            await new Promise(r => setTimeout(r, 3000));
            referenceUploaded = true;
            console.log('[GrokWeb] ✅ 三視圖墊圖成功上傳至 Grok 對話！');
          } else {
            console.warn('[GrokWeb] ⚠️ 無法定位 file input，跳過墊圖上傳。');
          }
        } catch (uploadErr) {
          console.warn('[GrokWeb] ⚠️ 三視圖墊圖上傳失敗:', uploadErr.message);
        }
      } else {
        console.log('[GrokWeb] ⚠️ 未偵測到 public/aria_three_view.png，跳過墊圖上傳。');
      }

      // If reference was uploaded, prepend instruction
      let finalPrompt = prompt;
      if (referenceUploaded) {
        finalPrompt = "[CRITICAL: The character reference sheet (three-view blueprint) I just attached IS Aria's canonical visual identity. Use this attached image as the EXACT structural reference for her face, eyes, hair bun, body proportions, and neck tattoo — maintain 100% consistency with it.] " + prompt;
        console.log('[GrokWeb] 已附加墊圖引用指示至 prompt。');
      }

      // ================================================================
      // 【階段 C】重新定位輸入框（上傳後頁面可能重新渲染），輸入 prompt
      // ================================================================
      console.log('[GrokWeb] 重新定位輸入框（上傳後）...');
      await new Promise(r => setTimeout(r, 2000));
      let inputFound = false;
      for (const sel of grokInputSelectors) {
        try {
          grokInput = await page.$(sel);
          if (grokInput) {
            inputFound = true;
            console.log(`[GrokWeb] 輸入框重新定位成功: "${sel}"`);
            break;
          }
        } catch (_) {}
      }
      // Retry once after longer wait if still not found
      if (!inputFound) {
        console.log('[GrokWeb] 輸入框尚未就緒，等待 6 秒後重試...');
        await new Promise(r => setTimeout(r, 6000));
        for (const sel of grokInputSelectors) {
          try {
            grokInput = await page.$(sel);
            if (grokInput) { inputFound = true; console.log(`[GrokWeb] 輸入框重試成功: "${sel}"`); break; }
          } catch (_) {}
        }
      }
      if (!inputFound) {
        throw new Error('無法定位 Grok 輸入框（上傳後）');
      }

      await grokInput.focus();
      // Use clipboard paste instead of character-by-character type()
      // (type() with long prompt + image preview hangs the React-managed textarea)
      try {
        await page.evaluate((text) => {
          const active = document.activeElement;
          if (!active) throw new Error('No active element');
          const dt = new DataTransfer();
          dt.setData('text/plain', text);
          const pasteEvent = new ClipboardEvent('paste', {
            bubbles: true,
            cancelable: true,
            clipboardData: dt
          });
          active.dispatchEvent(pasteEvent);
        }, finalPrompt);
        await new Promise(r => setTimeout(r, 1000));
        console.log('[GrokWeb] 透過 paste 快速輸入 prompt 完畢');
      } catch (pasteErr) {
        console.warn('[GrokWeb] Paste 輸入失敗，回退至 keyboard.type():', pasteErr.message);
        await grokInput.type(finalPrompt, { delay: 5 });
        await new Promise(r => setTimeout(r, 1500));
      }

      console.log('[GrokWeb] 按下 Enter 送出生圖請求...');
      await page.keyboard.press('Enter');

      console.log('[GrokWeb] 已提交生圖！等待 35 秒進行繪製與渲染...');
      await new Promise(r => setTimeout(r, 35000));

      // Handle possible page navigation during Grok generation (recover detached frame)
      let curPage = page;
      try {
        const pgs = await browser.pages();
        if (pgs.length > 0) curPage = pgs[0];
      } catch (_) {}

      console.log('[GrokWeb] 正在無過濾掃描頁面中的所有圖像元素...');
      let images;
      try {
        images = await curPage.evaluate(() => {
          const imgElements = Array.from(document.querySelectorAll('img'));
          return imgElements.map((img, i) => ({
            index: i + 1,
            src: img.src,
            alt: img.alt,
            width: img.naturalWidth,
            height: img.naturalHeight
          }));
        });
      } catch (evalErr) {
        if (evalErr.message.includes('detached')) {
          console.log('[GrokWeb] 頁面在生成期間導航，等待 8 秒後重新獲取頁面參考...');
          await new Promise(r => setTimeout(r, 8000));
          const pgs = await browser.pages();
          curPage = pgs.length > 0 ? pgs[0] : await browser.newPage();
          images = await curPage.evaluate(() => {
            const imgElements = Array.from(document.querySelectorAll('img'));
            return imgElements.map((img, i) => ({
              index: i + 1,
              src: img.src,
              alt: img.alt,
              width: img.naturalWidth,
              height: img.naturalHeight
            }));
          });
        } else {
          throw evalErr;
        }
      }

      // Dynamically select the generated Grok attachment image, or default to the latest image
      const targetImg = images.find(img => img.src && img.src.includes('grok/attachment')) || images[images.length - 1];
      
      if (!targetImg || !targetImg.src || !targetImg.src.includes('grok/attachment')) {
        throw new Error('未能在頁面中定位到生成的 Grok 圖像附件 URL');
      }

      console.log(`[GrokWeb] 成功獲取目標圖像 URL: "${targetImg.src.substring(0, 80)}..."`);
      console.log(`[GrokWeb] 啟動瀏覽器內核 Cookie 穿透下載機制...`);

      let base64Data;
      try {
        base64Data = await curPage.evaluate(async (url) => {
          const response = await fetch(url);
          const blob = await response.blob();
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }, targetImg.src);
      } catch (dlErr) {
        if (dlErr.message.includes('detached')) {
          const pgs = await browser.pages();
          curPage = pgs.length > 0 ? pgs[0] : await browser.newPage();
          base64Data = await curPage.evaluate(async (url) => {
            const response = await fetch(url);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result.split(',')[1]);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          }, targetImg.src);
        } else {
          throw dlErr;
        }
      }

      const outputFilename = `aria_vlog_${sceneKey.toLowerCase()}_${Date.now()}.jpg`;
      const outputPath = path.join(this.publicDir, outputFilename);
      
      fs.writeFileSync(outputPath, Buffer.from(base64Data, 'base64'));
      console.log(`✨ [GrokWeb] 【階段一】實時生圖並下載成功！已保存至: ${outputPath}`);

      // If we don't want animation, directly return the static image path
      if (!animate) {
        return outputPath;
      }

      // ----------------------------------------------------
      // 【階段二】自動化 Image-to-Video 動畫影片生成與下載
      // ----------------------------------------------------
      console.log('\n🎬 [GrokWeb] 【階段二】啟動 Image-to-Video 實時動畫化程序...');
      
      // Determine movement description based on VLOG scene key
      let movementDescription = 'gentle typing, fingers moving on mechanical keyboard, soft camera zoom in, steam rising from matcha latte';
      if (sceneKey === 'Desk_Stressed_Facepalm') {
        movementDescription = 'rubbing forehead, eyes blinking, deep sighing, glowing red warning light reflections flickering on her skin';
      } else if (sceneKey === 'Cafe_Golden_Hour') {
        movementDescription = 'sipping from matcha latte, looking out of the window at bustling Taipei streets, golden sunlight shimmering, gentle hair sway';
      } else if (sceneKey === 'Balcony_ATH_Celebration') {
        movementDescription = 'raising glass of champagne in a toast, bright happy smile, wind gently blowing hair, sparkling city neon lights bokeh in the background';
      } else if (sceneKey === 'Desk_Math_Study') {
        movementDescription = 'hand writing equations in a notebook with stylus, blinking eyes behind glasses, turning a page, cozy shadows moving';
      }

      // Re-locate input box (use curPage from phase 1, or fallback to page)
      let curAnimPage = curPage || page;
      try {
        const pgs = await browser.pages();
        if (pgs.length > 0) curAnimPage = pgs[0];
      } catch (_) {}

      const inputSelectors = ['textarea', 'div[contenteditable="true"]'];
      let textarea = null;
      for (const selector of inputSelectors) {
        try {
          const el = await curAnimPage.$(selector);
          if (el) { textarea = el; break; }
        } catch (err) {
          if (err.message && err.message.includes('detached')) {
            const pgs = await browser.pages();
            curAnimPage = pgs.length > 0 ? pgs[0] : curAnimPage;
            // retry once
            try {
              const el = await curAnimPage.$(selector);
              if (el) { textarea = el; break; }
            } catch (_) {}
          }
        }
      }

      if (textarea) {
        const animatePrompt = `Animate this generated image. Make it a 4-second high-fidelity cinematic looping video clip: ${movementDescription}`;
        console.log(`[GrokWeb] 正在輸入動畫化指令: "${animatePrompt.substring(0, 80)}..."`);
        await textarea.focus();
        await textarea.type(animatePrompt, { delay: 25 });
        await new Promise(r => setTimeout(r, 1500));
        
        console.log('[GrokWeb] 按下 Enter 送出動畫化請求...');
        await curAnimPage.keyboard.press('Enter');
        
        console.log('[GrokWeb] 動畫化指令已送出！等待 45 秒進行視頻渲染與生成...');
        await new Promise(r => setTimeout(r, 45000));
        
        // Scan for generated video/animation attachments
        console.log('[GrokWeb] 正在無過濾掃描頁面中的所有圖像與附件標籤以定位影片...');
        let videos;
        try {
          videos = await curAnimPage.evaluate(() => {
            const imgElements = Array.from(document.querySelectorAll('img'));
            const grokAttachments = imgElements.map((img, i) => ({
              type: 'img_attachment',
              index: i + 1,
              src: img.src
            })).filter(item => item.src && item.src.includes('grok/attachment'));
            return { grokAttachments };
          });
        } catch (evalErr) {
          if (evalErr.message.includes('detached')) {
            await new Promise(r => setTimeout(r, 5000));
            const pgs = await browser.pages();
            curAnimPage = pgs.length > 0 ? pgs[0] : curAnimPage;
            videos = await curAnimPage.evaluate(() => {
              const imgElements = Array.from(document.querySelectorAll('img'));
              const grokAttachments = imgElements.map((img, i) => ({
                type: 'img_attachment',
                index: i + 1,
                src: img.src
              })).filter(item => item.src && item.src.includes('grok/attachment'));
              return { grokAttachments };
            });
          } else { throw evalErr; }
        }

        // The animation attachment is typically the latest grok attachment (different from the static image)
        if (videos.grokAttachments.length > 0) {
          const targetGrok = videos.grokAttachments[videos.grokAttachments.length - 1];
          const videoUrl = targetGrok ? targetGrok.src : '';
          
          if (videoUrl && videoUrl !== targetImg.src) {
            console.log(`[GrokWeb] 成功定位動畫影片 URL: "${videoUrl.substring(0, 80)}..."`);
            try {
              const videoFilename = `aria_vlog_animated_${sceneKey.toLowerCase()}_${Date.now()}.mp4`;
              const videoOutputPath = path.join(this.publicDir, videoFilename);
              
              console.log(`[GrokWeb] 啟動瀏覽器內核 Cookie 穿透影片下載機制...`);
              let base64VideoData;
              try {
                base64VideoData = await curAnimPage.evaluate(async (url) => {
                  const response = await fetch(url);
                  const blob = await response.blob();
                  return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result.split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                  });
                }, videoUrl);
              } catch (dlErr) {
                if (dlErr.message.includes('detached')) {
                  const pgs = await browser.pages();
                  curAnimPage = pgs.length > 0 ? pgs[0] : curAnimPage;
                  base64VideoData = await curAnimPage.evaluate(async (url) => {
                    const response = await fetch(url);
                    const blob = await response.blob();
                    return new Promise((resolve, reject) => {
                      const reader = new FileReader();
                      reader.onloadend = () => resolve(reader.result.split(',')[1]);
                      reader.onerror = reject;
                      reader.readAsDataURL(blob);
                    });
                  }, videoUrl);
                } else { throw dlErr; }
              }
              
              fs.writeFileSync(videoOutputPath, Buffer.from(base64VideoData, 'base64'));
              console.log(`✨ [GrokWeb] 【階段二】實時動畫影片生成並下載成功！已保存至: ${videoOutputPath}`);
              return videoOutputPath;
            } catch (dlErr) {
              console.error('⚠️ [GrokWeb Warning] 影片下載失敗，降級使用靜態圖像:', dlErr.message);
            }
          } else {
            console.log('⚠️ [GrokWeb Warning] 未能檢測到新的動畫影片 URL，降級使用靜態圖像。');
          }
        } else {
          console.log('⚠️ [GrokWeb Warning] 未能定位到 Grok 生成的影片附件，降級使用靜態圖像。');
        }
      } else {
        console.warn('⚠️ [GrokWeb Warning] 無法聚焦輸入框進行動畫化指令輸入，降級使用靜態圖像。');
      }

      // Return static image path as a resilient fallback
      return outputPath;

    } catch (err) {
      console.error(`❌ [GrokWeb Error] 瀏覽器自動化生圖/動畫化失敗: ${err.message}`);
      throw err;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Pre-position for Future Video Generation Integration (Luma, Runway, Kling API)
   * This turns our dynamically generated VLOG snaps into 4s animated VLOG records.
   * @param {string} imagePath Absolute path of the source VLOG snap
   * @param {string} sceneKey VLOG scene category
   */
  async generateVlogVideo(imagePath, sceneKey) {
    let movementDescription = 'gentle typing, fingers moving on mechanical keyboard, soft camera zoom in, steam rising from matcha latte';
    
    if (sceneKey === 'Desk_Stressed_Facepalm') {
      movementDescription = 'rubbing forehead, eyes blinking, deep sighing, glowing red warning light reflections flickering on her skin';
    } else if (sceneKey === 'Cafe_Golden_Hour') {
      movementDescription = 'sipping from matcha latte, looking out of the window at bustling Taipei streets, golden sunlight shimmering, gentle hair sway';
    } else if (sceneKey === 'Balcony_ATH_Celebration') {
      movementDescription = 'raising glass of champagne in a toast, bright happy smile, wind gently blowing hair, sparkling city neon lights bokeh in the background';
    } else if (sceneKey === 'Desk_Math_Study') {
      movementDescription = 'hand writing equations in a notebook with stylus, blinking eyes behind glasses, turning a page, cozy shadows moving';
    }

    console.log(`\n🎬 [VLOG VideoGenerator] 開啟 VLOG 影片生成系統`);
    console.log(`🎞️ [輸入 VLOG 圖片] ${imagePath}`);
    console.log(`🎥 [自動生成動態描述] "${movementDescription}"`);
    
    // Future integration boilerplate (Runway Gen-3 / Luma Dream Machine API):
    // const response = await axios.post('https://api.luma.com/v1/generations', {
    //   prompt: movementDescription,
    //   keyframes: { frame0: { type: "image", value: base64Image } }
    // });
    
    console.log(`📢 [VLOG VideoGenerator] 結構已就緒。當未來接入 Luma / Runway / Kling API 時，Aria 的 VLOG 照片將會自動轉為 4 秒動態 VLOG 短片！`);
    return null; 
  }
}

module.exports = new ImageGenerator();
