# 🦞 DegenTerminal: Autonomous Quantitative Trading Agent & Dashboard

> **DegenTerminal** 是一個 24/7 全自主運行於 Solana 鏈上的 AI 交易與安全審計智能體。它完美融合了 **Eliza 智能體核心靈魂**、**Jupiter 量化交易引擎**、**自動化社群宣發** 以及 **磨砂玻璃擬態實時看板官網**。

---

## 🗺️ 系統架構設計 (System Architecture)

DegenTerminal 採用「靜態數據分離、動態無感輪詢」的極致高穩定、零維護成本架構：

```mermaid
graph TD
    subgraph 鏈上與市場 (On-Chain)
        DS[DexScreener API] -->|拉取新幣資料| Scanner
        JupAPI[Jupiter Aggregator] <-->|實時報價 & 交易執行| Trader
    end

    subgraph 智能體核心 (Agent Core)
        Scanner[Scanner 審計模組] -->|分析風險評級| Agent[DegenTerminal Agent]
        Agent -->|生成 Eliza 風格推文| Twitter[Twitter 自動化模組]
        Trader[Jupiter 交易引擎] <-->|本地持倉資料庫| Positions[(positions.json)]
        Agent -->|風控監控 & 賣出判定| Trader
    end

    subgraph 社群與前端 (Web & Socials)
        Twitter -->|Headless Chrome| X[X.com 發佈戰報]
        Agent -->|實時序列化導出| DataJSON[public/data.json]
        DataJSON -->|每 10 秒平滑 Poll| WebUI[賽博朋克實時量化看板]
    end
    
    style Agent fill:#1e1e38,stroke:#00f0ff,stroke-width:2px;
    style WebUI fill:#0d0d1a,stroke:#ff007f,stroke-width:2px;
```

---

## 📅 開發里程碑與技術沉澱 (Milestones)

### 🚀 Milestone 1: 智能體靈魂與鏈上審計 (Soul & Scan)
- **智能體靈魂寫入**：在 `characters/degenterminal.character.json` 中配置了 Eliza 格式的智能體特質，定義了其極具極客、毒舌、傲嬌且犀利的硅基交易員性格。
- **鏈上審計引擎**：自主對接 DexScreener API，對新發行的代幣進行全方位安全掃描，包括 Telegram/Twitter 社群完整度、池子深度、交易速率，並精準畫分 `LOW` / `HIGH` / `EXTREME` 三大風險等級，本金只投向 `LOW` 風險代幣。

### 📈 Milestone 2: 雙軌量化跟單交易與 Twitter 自動化 (Swap & Tweet)
- **Jupiter 量化引擎**：完美對接 Solana 最強的 Jupiter 聚合器。
- **雙軌保底機制**：當熱錢包餘額不足 0.01 SOL 或 RPC 斷網時，系統將**自動且優雅地降級為 100% 安全的 Paper Trading (模擬交易)**，實時輸出 `[PAPER]` 模擬戰報；一旦注入資金，系統將**自動、無感、瞬時升級為 LIVE 實戰跟單交易**！
- **Headless Chrome Twitter 自動化**：捨棄昂貴且易被封禁的 API，使用 Headless Chrome 調用獨立沙盒 Session，模擬真人行為在 X.com 自主排版並發送建倉與 `PnL` 戰報！

### 🖥️ Milestone 3: 賽博實時量化看板與前後端數據聯動 (Dashboard & Sync)
- **極致炫酷前端視覺**：手寫前端三件套，搭配暗黑賽博配色、和諧 HSL 色彩配置、高規 Glassmorphism 磨砂玻璃卡片與霓虹呼吸漸變微動畫。
- **實時數據導出**：重構 `src/index.js`，實作 `logToWeb` 與 `updateWebDashboard`，每當智能體發生動作（如掃描新幣、建倉買入、觸發止盈/止損/超時、網路異常），自動將最新指標與 Matrix 終端日誌無損導出至 `public/data.json`。
- **前端無感輪詢**：前端 Vanilla JS 每 10 秒自動 Poll，平滑更新止盈進度條（目標 $+40\%$ 盈虧比）與滾動終端日誌。

---

## ⚡ 實時看板本地快速啟動指引

由於採用了動態靜態分離架構，您無需部署複雜的 Node.js 後端 Web 服務，即可直接在本機瀏覽器中享受極致視覺！

### 👉 **[點此直接在瀏覽器打開實時量化看板 (Dashboard)](file:///d:/Antigravity/coo/public/index.html)**

*(網頁會自動讀取本地 `public/data.json` 並為您動態渲染最真實的持倉與運行日誌！)*

---

## ⚙️ 24/7 背景託管與監控手冊

為了實現交易不間斷，項目在背景使用常駐進程管理：

### 1. 常駐進程監控
您可以使用以下 PowerShell 指令實時追蹤背景智能體的運行狀態與掃描日誌：
```powershell
# 檢視當前守護進程實時日誌
Get-Content -Path "C:\Users\xbox0\.gemini\antigravity\brain\07d77161-ed46-469f-9e72-379d745f6967\.system_generated\tasks\task-922.log" -Tail 50 -Wait
```

### 2. 核心檔案配置
- `config/positions.json`：本地 active 持倉資料庫。
- `config/wallet.enc`：經 AES-256 加密的安全錢包私鑰（受 WALLET_SECRET 保護）。
- `public/data.json`：前端與後端的心跳聯動數據。

---

## 🛡️ 本地安全最佳實踐

> [!IMPORTANT]
> **100% 安全提交保證**
> 項目已部署嚴密的 `.gitignore` 防線。我們已將 `wallet.enc`、`temp_chrome_profile/`（含有您的 X.com 登入 Cookie）、以及所有包含系統敏感路徑的 `.log` 文件排除在外。
> **請放心提交，絕不會有任何私鑰或 Session 洩露的風險！**

---

## 🔮 未來展望 (Roadmap)
- [ ] 支援 LINE Bot Webhook 中控台，實現手機 LINE 一鍵手動賣出/查詢狀態。
- [ ] 導入 DeepSeek-R1 等大模型進行更複雜的推特互動與輿情情緒分析。
- [ ] 支援一鍵免費部署至 Vercel 或者是 GitHub Pages，供全球 Degen 觀摩！
