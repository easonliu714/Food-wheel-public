// ================== config.js : 全域配置與變數 ==================
// Version: 2026-01-02-CostControlUpdate

// 定義全域變數 (掛載在 window 上以確保各檔案可存取)
window.places = []; 
window.allSearchResults = []; 
window.hitCounts = {}; 
window.userRatings = {}; 
window.eliminatedIds = new Set(); 
window.currentRotation = 0;
window.userCoordinates = null; 

// Canvas 相關
window.canvas = null;
window.ctx = null;

// AI 菜單相關
window.currentStoreForMenu = null;
window.menuCanvas = null;
window.menuCtx = null;
window.menuRotation = 0;
window.currentMenuData = [];
window.fullMenuData = [];
window.shoppingCart = [];
window.selectedPhotoData = null;

// 預設關鍵字字典
window.defaultKeywordDict = {
    breakfast: "早餐 早午餐 豆漿",
    lunch: "餐廳 小吃 午餐 異國料理 吃到飽",
    afternoon_tea: "飲料 甜點 咖啡",
    dinner: "餐廳 晚餐 小吃 火鍋 夜市",
    late_night: "宵夜 鹽酥雞 清粥 滷味 炸物 夜市",
    noodles_rice: "麵 飯 水餃 壽司 快炒 合菜 異國料理 中式", 
    western_steak: "牛排 義大利麵 漢堡 披薩 西式",
    dessert: "冰品 豆花 甜點 蛋糕",
    all: "美食 餐廳 小吃 夜市 料理 吃到飽" 
};

window.activeKeywordDict = { ...window.defaultKeywordDict };

// 共用的費用管控與安全聲明 HTML (避免重複代碼)
const COST_CONTROL_STEP = {
    title: "6. ⚠️ 重要：費用管控與安全設定",
    desc: `
        <div style="background:#fff3cd; padding:10px; border-left:4px solid #ffc107; font-size:0.9em; margin-bottom:10px; color:#856404;">
            <strong>⚠️ 免責聲明：</strong>Google 官方計費方案可能隨時變動，實際折扣及產生之費用，請務必以 <a href='https://console.cloud.google.com/billing' target='_blank' style="text-decoration:underline;">官方帳單資訊</a> 為準。本工具開發者不對因使用 API 而產生之任何費用負責。
        </div>
        為避免產生意外費用，請<strong>務必</strong>完成以下設定：<br><br>
        
        <strong>1. 確認免費方案：</strong><br>
        目前的 Google Maps Essentials 方案通常提供每月約 <strong>10,000 次</strong> 免費請求 (換算約每日 300 次)。<br><br>

        <strong>2. 設定預算通知 (Budget Alert)：</strong><br>
        前往 <a href='https://console.cloud.google.com/billing/budgets' target='_blank' style='color:#d35400; font-weight:bold;'>Google Cloud 預算頁面</a>，建立新預算，將金額上限設為 <strong>$1 美元</strong>，並開啟 Email 通知，以便在產生費用時立即收到警告。<br><br>

        <strong>3. 設定配額上限 (Daily Quotas)：</strong><br>
        前往 <a href='https://console.cloud.google.com/iam-admin/quotas' target='_blank' style='color:#d35400; font-weight:bold;'>IAM 配額管理</a>，搜尋 'Places API'、'Geocoding API' 等，建議將 <strong>Requests per day</strong> 設定為 <strong>300</strong> 次 (或其他您認為安全的數值)，作為最後一道防線。<br><br>

        <strong>4. 限制 API 金鑰 (Key Restrictions)：</strong><br>
        前往 <a href='https://console.cloud.google.com/apis/credentials' target='_blank' style='color:#d35400; font-weight:bold;'>憑證管理頁面</a>，編輯您的 API Key：<br>
        • 應用程式限制：選擇 <strong>HTTP 參照位址 (網站)</strong><br>
        • 網站限制：新增以下網址 (按 Enter 新增)<br>
        &nbsp;&nbsp;<code>*easonliu714.github.io/Food-wheel-public/*</code> (本工具網址)<br>
        &nbsp;&nbsp;<code>http://localhost:*</code> (若您會在本地測試)<br>
    `,
    img: "" // 此步驟純文字說明，不需圖片
};

// 教學資料
window.guideData = {
    desktop: { 
        title: "💻 電腦版申請步驟", 
        steps: [
            {title:"1. 登入 Google Cloud", desc:"前往 <a href='https://console.cloud.google.com/' target='_blank'>Google Cloud Console</a> 並登入 Google 帳號。", img:"images/desktop_1.jpg"}, 
            {title:"2. 建立新專案", desc:"點擊上方專案選單 > <strong>建立新專案 (New Project)</strong>，命名為 FoodWheel。", img:"images/desktop_2.jpg"}, 
            {title:"3. 綁定帳單 (必做)", desc:"左側選單（三） > <strong>帳單 (Billing)</strong> > 連結付款方式。Google 要求必須綁定信用卡才能使用地圖服務。", img:"images/desktop_3.jpg"}, 
            {title:"4. 啟用 4 項 API", desc:"選單（三） > 前往 <strong>API 和服務 > 啟用 API</strong>，搜尋並啟用：<br>1. Maps JavaScript API<br>2. Places API (New)<br>3. Geocoding API<br>4. Distance Matrix API", img:"images/desktop_4.jpg"}, 
            {title:"5. 取得金鑰", desc:"選單（三） > 前往 <strong>憑證 (Credentials)</strong> > 建立憑證 > API 金鑰。複製 <code>AIza</code> 開頭的字串貼入下方。", img:"images/desktop_5.jpg"},
            COST_CONTROL_STEP // 加入費用管控步驟
        ] 
    },
    android: { 
        title: "🤖 Android 手機申請步驟", 
        steps: [
            {title:"1. 開啟電腦版網站", desc:"使用 Chrome 開啟 <a href='https://console.cloud.google.com/' target='_blank'>Google Cloud</a>，點擊右上角選單勾選<strong>「電腦版網站」</strong>。", img:"images/android_1.jpg"}, 
            {title:"2. 建立專案", desc:"操作步驟同電腦版 (介面較小請放大操作)。點擊上方專案選單 > <strong>建立新專案 (New Project)</strong>，命名為 FoodWheel。", img:"images/android_2.jpg"}, 
            {title:"3. 綁定帳單", desc:"左側選單（三） > <strong>帳單 (Billing)</strong> > 確認<strong>帳單</strong>已綁定信用卡。", img:"images/android_3.jpg"},
            {title:"4. 啟用 API", desc:"選單（三） > 前往 <strong>API 和服務 > 啟用 API</strong>，搜尋並啟用上述 4 項必要的 API 服務。", img:"images/android_4.jpg"},
            {title:"5. 複製 Key", desc:"選單（三） > 前往 <strong>憑證 (Credentials)</strong> > 建立憑證 > API 金鑰。建立 API Key 後，長按複製該字串，貼到本網頁下方輸入框。", img:"images/android_5.jpg"},
            {
                ...COST_CONTROL_STEP,
                desc: COST_CONTROL_STEP.desc + "<br><br><strong>⚠️ 手機 App 特別注意：</strong><br>若您將網頁安裝為手機 App (PWA) 或 APK，API Key 的「HTTP 參照位址限制」可能無法生效。請務必執行上述的第 2 點 (預算通知) 與 第 3 點 (配額限制) 以確保安全。"
            } // 手機版加入額外提醒
        ] 
    },
    ios: { 
        title: "🍎 iOS (iPhone) 申請步驟", 
        steps: [
            {title:"1. 切換電腦版網站", desc:"使用 Safari 開啟 <a href='https://console.cloud.google.com/' target='_blank'>Google Cloud</a>，點擊網址列左側 <strong>「Aa」</strong> > <strong>切換為電腦版網站</strong>。", img:"images/ios_1.jpg"}, 
            {title:"2. 建立專案", desc:"操作步驟同電腦版。點擊上方專案選單 > <strong>建立新專案 (New Project)</strong>，命名為 FoodWheel。", img:"images/ios_2.jpg"},
            {title:"3. 設定帳單", desc:"左側選單（三） > <strong>帳單 (Billing)</strong> > 確認連結付款方式。", img:"images/ios_3.jpg"},
            {title:"4. 啟用 API", desc:"選單（三） > 前往 <strong>API 和服務 > 啟用 API</strong>，搜尋並啟用上述 4 項必要的 API 服務。", img:"images/ios_4.jpg"},
            {title:"5. 取得 Key", desc:"選單（三） > 前往 <strong>憑證 (Credentials)</strong> > 建立憑證 > API 金鑰。建立 API Key 後，長按複製生成的 API Key 貼到下方。", img:"images/ios_5.jpg"},
            {
                ...COST_CONTROL_STEP,
                desc: COST_CONTROL_STEP.desc + "<br><br><strong>⚠️ 手機 App 特別注意：</strong><br>若您將網頁加入主畫面使用，API Key 的「HTTP 參照位址限制」可能無法生效。請務必執行上述的第 2 點 (預算通知) 與 第 3 點 (配額限制) 以確保安全。"
            } // 手機版加入額外提醒
        ] 
    }
};
