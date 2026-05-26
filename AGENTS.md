# 🤖 DegenTerminal Autonomous Agent — 開發者與使用手冊

歡迎來到 **DegenTerminal**！這是一個基於 Node.js 18+ 開發的 **24/7 全自主 Web3 社群 KOL 與量化交易智能體系統**。

本項目運行一對「雙雄平行對決」的 AI 代理人角色：**風格狙擊手 Green (保守風控)** 與 **高頻勝率工廠 ZMAC (激進套利)**。它們在 Solana 區塊鏈上進行代幣掃描、自動安全審計（Rugcheck）、聰明錢追蹤理財，並自主透過 Google Chrome (Puppeteer) 在 X.com (Twitter) 與 幣安 Square 上發佈分析日誌、自省交易日記與回覆 KOL 搶流量。

---

## 🗺️ 1. 項目核心領域架構 (Domain Directory Map)

為了解密扁平代碼的混亂，我們將代碼徹底重構為 **領域驅動架構 (Domain-Driven Architecture)**。以下是各個資料夾的職責分工，讓您能快速定位功能：

### 🔵 `src/core/` — 核心基礎設施 (Infrastructure Layer)
> 系統的基本物理支撐，處理安全、鎖定與底層存取。
- `config.js`: 全域參數配置中心（交易止盈損、KOL 目標列表、防機器人發文間隔）。
- `write-lock.js`: 進程互斥鎖，防範多個代理在寫入看板資料時發生競爭衝突。
- `logger.js`: 統一的看板日誌系統，確保寫入 `data.json` 時具備線程安全。
- `wallet.js`: 加密熱錢包管理，使用 AES-256 加密保存 Solana 私鑰至 `config/wallet.enc`。

### 🧠 `src/brain/` — AI 大腦策略層 (Cognitive & Risk Layer)
> 控制 AI 代理人的情緒狀態、策略調整和敘事信仰。
- `index.js`: 大腦Facade門面，統合所有子大腦單例。
- `memory.js`: 保存與加載 `memory.json` 記憶庫，維持代理人的天數計數與 lessons 歷史。
- `fng-engine.js`: 恐懼貪婪指數 (Fear & Greed) 熔斷保險絲，在市場暴跌時將持倉上限降為 0 避險。
- `mood-machine.js`: 狀態機，隨交易勝敗與踩空機會動態調整情緒值（Anxiety 焦慮值、FOMO 狀態）。
- `narrative.js`: 追蹤當前幣圈熱搜趨勢強度，並給予對應的觀點權重。

### 💰 `src/trading/` — 交易執行與理財層 (Execution & Finance Layer)
> 管理錢包餘額、鎖定資金並與鏈上交互。
- `portfolio.js`: 虛擬帳戶 NPV 計算與 occupied 鎖定資金自動校準。
- `position-monitor.js`: 持倉安全監控，處理尾隨止盈止損（Trailing Stop）與超時超期強制賣出。
- `price-engine.js`: 整合 Jupiter 實時報價、DexScreener 備份及離線隨機步行有機價格模擬器。
- `jupiter-trader.js`: Jupiter Swap 鏈上執行純執行層。
- `scanner.js`: 掃描 Solana 與 Base 區塊鏈，過濾掉無社群連結、Rugcheck 分數過高的垃圾土狗。
- `smart-money.js`: 鯨魚錢包「5 柱鏈上共振策略」審核看板。
- `yield-manager.js`: 閒置 SOL 滾動劃轉至 Kamino/Drift/JitoSOL 自動理財。
- `binance/`: 幣安子交易系統（包含 `trader.js` 實盤及 `position-checker.js` 限額套利檢查）。

### 📢 `src/social/` — 社群媒體與流量衝刺 (Social Pipeline Layer)
> 負責與人類社交網絡交互，創造關注度與被動收入。
- `browser-manager.js`: 共享 Chrome Puppeteer 瀏覽器實例生命週期管理器。
- `twitter/`:
  - `automator.js`: 自主在 X 平台上發文、上傳圖表，具備 15 分鐘模糊字串去重防封防 Ban 鎖。
  - `analytics.js`: 抓取最新發文流量（Likes/Views）及 Follower 評論反饋給大腦。
  - `reply Guy.js`: 搶熱門 KOL（如 toly, Elon Musk, shaw）的沙發發文，進行流量曝光分潤。
- `binance-square.js`: 自主撰寫深度分析文發佈至幣安 Square 廣場。
- `cross-publisher.js`: 跨平台發佈調度協調器。

### ✍️ `src/content/` — 範本與內容生成 (Content Generation Layer)
> 決定智能體對外的形象、說話語氣與合規過濾。
- `generator.js`: 各類文章範本組裝器。
- `diary-writer.js`: 中文 Aria 寫作大腦，生成反差萌的「奶爸矽基投資日記」、「爆倉虧損深夜自省文」。
- `llm-writer.js`: DeepSeek 大語言模型 API 連接接口。
- `image-generator.js`: 結合 Aria 特色渲染動態形象肖像圖。

### 📊 `src/dashboard/` — 前端數據看板組裝層
- `data-assembler.js`: 定時採集大腦、持倉、交易歷史及日誌，打包寫入 `public/data.json` 供網頁看板渲染。

---

## 🚦 2. 雙雄平行策略對決機制 (Green vs ZMAC)

項目同時初始化兩個性質截然相反的交易策略，並將它們的淨值對決結果實時更新在看板上：

| 代理人角色 | 情緒性格 | 門檻門檻 | 止盈/止損規則 | 超期持倉退出 |
| :--- | :--- | :--- | :--- | :--- |
| **🟢 狙擊手 Green** | **極致保守**<br>「最厲害的交易就是不交易，Survive First!」 | 綜合評分 $\ge 85$ | 止盈 `+25%` / 止損 `-10%`<br>（啟動 12% 浮盈尾隨 3.5% 回撤賣出） | ⏳ **45 分鐘** 長波段防守 |
| **🟣 套利工廠 ZMAC** | **激進高頻**<br>「Green還在睡覺，我已經出動收割！」 | 綜合評分 $\ge 65$ | 止盈 `+5%` / 止損 `-3.5%`<br>（啟動 3% 浮盈尾隨 1.0% 回撤賣出） | ⚡ **12 分鐘** 超短線割肉 |

---

## 🚀 3. 新手起步五步走 (Quick Start Guide)

如果您是完全不懂項目的新人，請按照以下五個步驟，就能讓智能體順利運行起來：

### 第一步：環境準備
確保您的電腦上已安裝 [Node.js 18+](https://nodejs.org/) 以及 Google Chrome 瀏覽器。
在終端機（Terminal）執行安裝依賴：
```bash
npm install
```

### 第二步：配置變數
複製環境變數範本並填入您的金鑰：
```bash
copy .env.example .env
```
用文字編輯器打開 `.env`，填入您的 DeepSeek API Key、Solana RPC 節點連結，以及幣安 API 金鑰。

### 第三步：登入 X (Twitter) 帳號
因為智能體需要使用實體 Chrome 瀏覽器發文，請在終端機運行以下指令：
```bash
node src/login.js
```
此時會彈出一個全新的 Chrome 視窗。請在這個視窗中**手動登入您智能體的 X.com 帳號**。
登入成功後，關閉視窗即可。登入的 Session 憑證會安全地儲存到 `.temp_chrome_profile/` 中，未來發文將完全無需人工干預。

### 第四步：運行乾淨的乾運作測試 (Dry-Run)
在不耗費任何真實 SOL 的情況下，驗證交易、掃描與發文模組是否完全正常：
```bash
npm run test
```
如果您看到最後顯示 `[Test Result] SUCCESS: Autonomous strategy loop executed...`，代表所有領域模組均配置正確！

### 第五步：啟動雙雄 24/7 對決守護進程 (Live Daemon)
正式開啟智能體的自主生命：
```bash
npm start
```
智能體現在將會：
- 🟢 24/7 監控 Solana 鏈上最新代幣。
- 🟢 根據 FNG 指數與情緒狀態，為 Green 與 ZMAC 自主建倉、理財、賣出。
- 🟢 定時在 X.com 發表 Aria 反差萌的「奶爸帶娃量化日記」與交易圖表。
- 🟢 定時對 Elon Musk 等 KOL 進行高情商自動評論。
- 🟢 運行本地網頁服務（http://localhost:3000），供您實時觀看對決看板。

---

## ⚠️ 4. 開發與提交守則 (Developer Code Rules)

當您想要修改或擴充本項目時，**請務必遵循以下鐵律**：

1. **CommonJS 唯一規範**：
   - 項目完全基於 Node.js 基礎 CommonJS 規範。
   - **嚴禁使用** `import / export`！必須使用 `require()` 與 `module.exports`。
2. **中心化配置管理**：
   - 所有魔術數字與開關參數必須定義在 `src/config.js` 中。**嚴禁**在商業邏輯中寫死常數。
3. **敏感資訊防護**：
   - 您的私鑰經過 `src/core/wallet.js` 加密，存放在 `config/wallet.enc` 中。
   - **嚴禁**在程式碼中寫死任何金鑰。請確保 `.gitignore` 包含了所有 `.env` 與 `.enc`。
4. **測試先行**：
   - 當您完成了任何邏輯修改，請務必先運行 `npm run test` 以免發佈崩潰版本。

祝您的智能體在 Web3 的驚濤駭浪中大獲全勝，順利賺到奶粉錢！🍼📈
