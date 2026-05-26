# 🦞 DegenTerminal: 24/7 全自主 Web3 量化交易智能體與實時看板系統

> **DegenTerminal** 是一個 24/7 全自主運行於 Solana 鏈上的 AI 交易、安全審計與跨平台社群推廣智能體系統。本項目完美融合了 **Eliza 智能體核心靈魂**、**Jupiter/Binance 量化交易引擎**、**自動化社群宣發** 以及 **極致炫酷的磨砂玻璃擬態 (Glassmorphism) 賽博朋克實時看板官網**。

---

## 🗺️ 系統架構設計 (System Architecture)

DegenTerminal 採用「前後端分離、靜態數據導出、動態無感輪詢」的極致高穩定、零維護成本架構：

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

## 💎 系統核心亮點與功能模組 (Key Highlights)

### 1. ⚔️ Antigravity 2.0 雙雄平行對決系統 (Dual Agent Arena)
大腦層進行物理與邏輯隔離，部署兩大不同策略风格的自主運行實體，各自管理獨立的虛擬資產、倉位與歷史記錄：
*   **🟢風格狙擊手 Green (保守極致)**：
    *   **高進入門檻**：綜合風險審計分數必須達到 **85+** 才會考慮建倉。
    *   **寬鬆風控保護**：止盈目標 **+25%**，止損目標 **-10%**（避免被短期市場震盪洗出），最大超時持有時間 **45 分鐘**。
    *   **主動防護**：最大持倉上限 **2 個**。啟動**追蹤止損 (Adaptive Trailing Stop)** 機制：當浮盈觸及 $+12\%$ 時觸發，自最高點回撤 $3.5\%$ 即自動執行賣出。
*   **🟣高頻勝率工廠 ZMAC (激進高頻)**：
    *   **低進入門檻**：綜合風險審計分數 **65+** 即主動出擊，捕捉高動能突破。
    *   **窄幅超快進出**：止盈目標 **+5%**，止損目標 **-3.5%**，最大超時持有時間 **12 分鐘**，以高週轉率積累複利。
    *   **多元化分散**：最大持倉上限 **5 個**。當浮盈觸及 $+3\%$ 時觸發追蹤止損，自最高點回撤 $1.0\%$ 即鎖定利潤。

### 2. 🛡️ 智能鏈上審計與風險評估 (On-Chain Security Audit)
*   **多維度自動化掃描**：對接 **DexScreener API**，對新發行與熱門代幣進行池子深度、流動性鎖定狀態、24小時交易速率、社群完整度（Telegram/Twitter 鏈接）進行全方位安全掃描。
*   **風險分級與熔斷**：精準劃分 `LOW` / `HIGH` / `EXTREME` 三大風險等級，本金與模擬資金只投入 `LOW` 風險代幣，從源頭規避 Rug Pull 及蜜罐合約。

### 3. 📈 FNG 市場保險絲機制 (Fear & Greed Market Fuse)
對接 Fear & Greed 指數，透過 Brain 模組對當前市场情緒進行自適應微調：
*   **極度恐慌 (FNG < 25)**：激活交易熔斷，最大持倉限制調整為 `0`，暫停所有建倉。
*   **恐慌狀態 (FNG < 45)**：自動壓縮利潤預期，將 Green 止盈調至 $15\%$，ZMAC 止盈調至 $5\%$，在猴市中快速落袋為安。
*   **極度貪婪 (FNG > 75)**：收緊止損防線，Green 止損收縮至 $-7\%$，ZMAC 收縮至 $-4\%$，防止追高被套。

### 4. 🔀 雙軌保底交易引擎 (Live & Paper Trading Fallback)
*   **無感無損切換**：當本地加密錢包（受 AES-256 保護的 `wallet.enc`）餘額不足 0.01 SOL 或 RPC 出現故障時，系統會**自動且優雅地降級為 100% 安全的 Paper Trading (模擬交易)**，並在控制台及數據文件中輸出帶有 `[PAPER]` 的模擬戰報。
*   **即時熱升級**：一旦向錢包注入資金且網絡恢復，系統會**自動、無感、瞬時升級為 LIVE 實戰跟單交易**，實現真正的 24/7 不間斷防禦與交易。

### 5. 🤖 Puppeteer 驅動的 Twitter/X 免 API 宣發系統 (Twitter Automation)
捨棄昂貴且極易遭到平台封鎖的官方 API，使用 Headless Chrome 登入並模擬真人行為：
*   **🛡️ 模糊去重安全鎖 (Fuzzy Similarity Lock)**：底層發文前會自動剔除空白、換行、數字、符號及 Emoji，只比對純中英文字元的相似度（前 80 字），徹底防範因系統重試、進程衝突或網絡不穩導致的「重複推文發佈」封號風險。
*   **🎯 DOM 彈窗銷毀動態偵測**：點擊 "Post" 發文按鈕後， Puppeteer 會動態監聽並確認 Compose 編輯器從 HTML DOM 樹中完全銷毀，確保推文 100% 成功發出後才退出，避免盲等。

### 6. ✍️ 幣安廣場自動化寫作與 Write-to-Earn (Binance Square Integration)
*   自動讀取當前 AI 智能體的交易數據、市場趨勢分析等上下文，利用內容生成器（`content_generator.js`）撰寫高質量的中文財經長文，並自動發布至幣安廣場。
*   自動在文章結尾插入創作者專屬 Handle 與幣安推薦返傭連結，實現 Write-to-Earn（寫作返佣）流量變現。
*   內置 Binance Mock Trading（測試網）模組，支持在測試網進行期貨與現貨模擬操作。

### 7. 💬 Reply Guy 流量與分潤衝刺 (KOL Interaction Loop)
*   監控特定 KOL 列表（如 Solana 創辦人 `aeyakovenko`、Jupiter 創辦人 `weremeow`、ai16z 創辦人 `shawmakesmagic`、Elon Musk 等）的最新動態。
*   檢測到新推文後自動「搶沙發」進行犀利專業的回覆，帶來極高的曝光度與被動流量。

### 8. 🖥️ 賽博實時量化看板 (Cyberpunk Web Dashboard)
*   **磨砂玻璃 UI**：採用純手寫 Vanilla CSS & JS，高規 Glassmorphism 磨砂玻璃卡片、漸變霓虹呼吸燈、精準勝率/收益 PK 條。
*   **心跳聯動更新**：智能體每次執行動作（掃描新幣、建倉買入、觸發止盈/止損、網絡異常等）均會即時導出至 `public/data.json`，前端網頁每 10 秒自動輪詢（Poll）更新，無感刷新 UI。

---

## 📂 項目目錄結構說明 (Directory Structure)

```text
├── characters/
│   ├── aria.character.json             # 角色性格配置文件 (Aria)
│   ├── degenterminal.character.json    # DegenTerminal 精英極客性格文件
│   └── profitengine.character.json     # 項目預設的 AI 量化交易員性格配置文件
│
├── config/
│   ├── memory.json                     # 智能體長短期記憶與 FNG 情緒狀態數據
│   ├── narrative_db.json               # 智能體對當前熱門加密敘事的看法與強度
│   ├── positions_aggressive.json       # ZMAC 實時活躍持倉數據庫
│   ├── positions_conservative.json     # Green 實時活躍持倉數據庫
│   ├── trade_history_aggressive.json   # ZMAC 歷史交易記錄
│   ├── trade_history_conservative.json # Green 歷史交易記錄
│   ├── wallet.enc                      # 經 AES-256 加密的安全錢包私鑰
│   └── profitengine_config.json        # 策略微調參數
│
├── public/
│   ├── index.html                      # 賽博朋克實時量化看板前端 HTML 頁面
│   ├── app.js                          # 前端看板心跳輪詢與動態 UI 渲染邏輯
│   ├── app.css                         # 極致炫酷的 Glassmorphism CSS 樣式表
│   ├── data.json                       # 核心數據接口（前端數據源）
│   └── [images/charts]                 # 系統自動生成的 ROI 歷史走勢圖與角色狀態圖片
│
├── src/
│   ├── scheduler.js                    # 24/7 守護主進程入口（雙雄對決核心調度器）
│   ├── index.js                        # DegenTerminalAgent 核心類，實現狀態流轉與日誌導出
│   ├── brain.js                        # 智能大腦（記憶管理、參數自適應、FNG 熔斷調節）
│   ├── scanner.js                      # 鏈上 DexScreener 安全掃描與風險評估模組
│   ├── trader.js                       # Jupiter 鏈上交易與 Paper Trading 模擬交易模組
│   ├── twitter.js                      # 基于 Puppeteer-core 的免 API 模擬真人 X.com 發文
│   ├── reply_guy.js                    # KOL 自動搶沙發回覆模組
│   ├── binance_square.js               # 幣安廣場自動化發文模組
│   ├── content_generator.js            # 基於 character 設定的專業財經/長文內容生成器
│   ├── chart_renderer.js               # 本地自動生成 PnL ROI 走勢圖表的 Canvas 渲染器
│   ├── wallet.js                       # 錢包加解密與密鑰安全管理模組
│   └── tests/tests_xxx.js              # 各模組功能自驗證與回測腳本
│
├── .env.example                        # 環境變數配置範本
├── DEVLOG.md                           # 項目開發歷程里程碑日誌
├── package.json                        # 依賴庫及啟動腳本配置
└── server.js                           # 簡易的靜態網頁託管服務器（本機或 Vercel 部署）
```

---

## ⚙️ 環境配置與啟動指南 (Quick Start)

### 1. 準備環境與安裝依賴
確保您的運行環境中已安裝了 Node.js（建議 v18+）與 Google Chrome 瀏覽器（Puppeteer 自動發文與回覆模組依賴 Chrome）。

```bash
# 安裝項目依賴
npm install
```

### 2. 配置環境變數
將項目根目錄下的 `.env.example` 複製並重命名為 `.env`：

```bash
cp .env.example .env
```

打開 `.env` 檔案並配置以下核心參數：
*   `RPC_URL`：配置一條穩定的 Solana 主網 RPC 連接。
*   `CHARACTER_FILE`：指定採用的角色配置文件（如 `profitengine.character.json`）。
*   `WALLET_SECRET`：設置強解密密碼，用以加載本地安全加密錢包 `wallet.enc`。
*   `BINANCE_SQUARE_API_KEY`：填入幣安廣場 OpenAPI Key 以啟用 Write-to-Earn 長文寫作（選填）。
*   `BINANCE_REFERRAL_LINK`：填入您的幣安註冊推薦返傭代碼，獲取被動收益。

### 3. 本地快速啟動

項目提供了多個 npm 啟動指令，以配合不同的應用場景：

*   **啟動 24/7 雙雄平行交易守護進程**（核心背景運行）：
    ```bash
    npm run start
    # 或
    npm run daemon
    ```
*   **啟動本地開發模式**（帶有無痛熱重載，並自動忽略數據、圖片及配置文件變動）：
    ```bash
    npm run dev
    ```
*   **本地預覽實時量化看板網頁**（啟動 Express 靜態託管）：
    ```bash
    npm run serve
    ```
    *啟動後，請在瀏覽器中打開 `http://localhost:3000` 或直接雙擊打開 `/public/index.html` 觀賞極致視覺。*

*   **運行本地核心模組功能測試**：
    ```bash
    npm run test
    ```

---

## 🛡️ 本地安全與託管最佳實踐

1.  **私鑰高規防護**：
    本項目不直接存儲明文私鑰，而是通過 `wallet.js` 將私鑰轉換為 AES-256 加密存儲的 `config/wallet.enc`。只要您的 `.env` 中的 `WALLET_SECRET` 不洩露，私鑰即使在硬碟損壞或代碼託管洩漏時依然擁有極高的安全性。
2.  **100% 安全提交保證**：
    項目內置嚴密的 `.gitignore` 防線。我們已將 `wallet.enc`、`temp_chrome_profile/`（含有您 X.com 登入 Cookie 的 Chrome 獨立沙盒配置檔案）、以及所有包含系統敏感路徑的 `.log` 文件排除在 Git 之外，**請放心進行 Commit 提交，絕無任何私鑰或 Session 洩露之憂。**
3.  **背景守護進程檢視**：
    如果您需要查看 24 小時守護進程的實時輸出，可以在 PowerShell 中執行以下命令監控進程日誌：
    ```powershell
    Get-Content -Path "C:\Users\xbox0\.gemini\antigravity\brain\07d77161-ed46-469f-9e72-379d745f6967\.system_generated\tasks\task-922.log" -Tail 50 -Wait
    ```

---

## 🔮 未來路線圖 (Roadmap)
- [ ] **多鏈智能路由擴展**：支持 Base 與 Solana 雙鏈同時進行實體套利和跟單交易。
- [ ] **LINE Bot 控制台整合**：實現移動端一鍵一對一指令賣出、查詢狀態與調倉。
- [ ] **LLM 動態微調**：接入 DeepSeek-R1 等頂尖推理解析大模型，針對 X 平台進行更具煽動性、幽默感的自主輿情回覆。
