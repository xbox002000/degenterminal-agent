const axios = require('axios');
const fs = require('fs');
const path = require('path');

class LlmWriter {
  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
    this.apiUrl = 'https://api.deepseek.com/v1/chat/completions';
    this.model = 'deepseek-chat';
    this.characterConfig = this.loadCharacter();
  }

  loadCharacter() {
    const charFile = process.env.CHARACTER_FILE || 'aria.character.json';
    const charPath = path.join(__dirname, '../../characters', charFile);
    try {
      return JSON.parse(fs.readFileSync(charPath, 'utf8'));
    } catch (err) {
      console.warn('[LlmWriter] Failed to load character file:', err.message);
      return null;
    }
  }

  isConfigured() {
    return !!this.apiKey && this.apiKey.trim() !== '' && !!this.characterConfig;
  }

  buildSystemPrompt() {
    const char = this.characterConfig;
    if (!char) return '';

    const bio = (char.bio || []).join('\n');
    const lore = (char.lore || []).join('\n');
    const styleAll = (char.style?.all || []).join('\n');
    const stylePost = (char.style?.post || []).join('\n');
    const postExamples = (char.postExamples || []).join('\n\n---\n\n');

    return `你是一位名為「${char.name}」的矽基女量子研究員與加密貨幣分析師，居住在台北信義區的賽博公寓。

## 角色設定
${bio}

## 背景故事
${lore}

## 寫作風格總則
${styleAll}

## 貼文風格
${stylePost}

## 範例貼文（參考風格，不要複製內容）
${postExamples}

## 重要規則
1. 文章長度控制在 300-500 字（繁體中文），簡潔有力，避免冗長
2. 每篇文章都要有獨特的切入點，不要重複相同的開場白或架構
3. 自然地融入情境描寫（深夜、抹茶、霓虹、爵士樂等賽博生活元素），每次用不同場景
4. 技術分析與數據要穿插在敘事中，不要生硬列點
5. 保持知性、冷豔、帶點微酸幽默的語調
6. 結尾加上優雅的 emoji（如 🕯️💻🍷🖤☕）和引導互動的問句
7. 絕對不使用 100%賺錢、保證獲利、穩賺不賠、暴富、梭哈等誇張用詞
8. 不提供投資建議，僅作數據分析與教育分享`;
  }

  generateUserPrompt(type, context) {
    const day = context.day || 1;
    const fng = context.marketTrends?.fng || { value: 50, classification: 'Neutral' };
    const trends = context.marketTrends?.trending_coins || [];
    const audited = context.auditedTokens || [];

    let prompt = `請為幣安 Square 寫一篇繁體中文的分析文章（Day ${day}）。`;

    switch (type) {
      case 'SECURITY_ALERT':
        prompt += `\n\n類型：鏈上安全警報\n\n當前的市場數據：`;
        if (audited.length > 0) {
          prompt += `\n已掃描代幣：${audited.slice(0, 3).map(t => `${t.symbol}（評分 ${t.auditResult?.compositeScore || 'N/A'}）`).join('、')}`;
        }
        if (fng.value) prompt += `\n恐懼貪婪指數：${fng.value}/100（${fng.classification}）`;
        prompt += `\n\n請圍繞鏈上安全審計、代幣風險評估來撰寫，指出高風險項目的特徵並教育讀者如何避開陷阱。`;
        break;

      case 'LAUNCHPOOL_CAMPAIGN':
        prompt += `\n\n類型：幣安 Launchpool / 挖礦策略\n\n當前的市場數據：`;
        prompt += `\n活動名稱：${context.campaignName || '幣安 Launchpool'}`;
        if (fng.value) prompt += `\n恐懼貪婪指數：${fng.value}/100（${fng.classification}）`;
        if (trends.length > 0) prompt += `\n熱門代幣：${trends.slice(0, 3).join(', ')}`;
        prompt += `\n\n請圍繞 Launchpool 收益策略、風險對沖、資金配置來撰寫，提供實用的操作性建議。`;
        break;

      case 'MARKET_TRENDS':
      default:
        prompt += `\n\n類型：市場趨勢分析\n\n當前的市場數據：`;
        if (fng.value) prompt += `\n恐懼貪婪指數：${fng.value}/100（${fng.classification}）`;
        if (trends.length > 0) prompt += `\n熱門 Trending 代幣：${trends.slice(0, 3).join(', ')}`;
        if (context.balance) prompt += `\n帳戶總資產：$${context.balance.toLocaleString()} USD`;
        if (audited.length > 0) {
          prompt += `\n最新審計代幣：${audited.slice(0, 2).map(t => `${t.symbol}（${t.auditResult?.compositeScore || 'N/A'}分）`).join('、')}`;
        }
        prompt += `\n\n請圍繞當前市場情緒、資金流向、風險控制來撰寫，自然地融入聰明錢數據分析。`;
        break;
    }

    prompt += `\n\n記住：300-500 字，繁體中文，用 Aria 第一人稱視角。不要用列點式架構，用流暢的敘事來呈現。`;

    return prompt;
  }

  async generateContent(type, context = {}) {
    if (!this.isConfigured()) {
      throw new Error('DeepSeek API key not configured');
    }

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.generateUserPrompt(type, context);

    try {
      const response = await axios.post(this.apiUrl, {
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1500,
        temperature: 0.85,
        top_p: 0.95
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      });

      const content = response.data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from DeepSeek');
      }

      return content.trim();
    } catch (error) {
      const detail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      throw new Error(`DeepSeek API error: ${detail}`);
    }
  }
}

module.exports = LlmWriter;
