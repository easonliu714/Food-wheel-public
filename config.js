// ================== config.js : 全域配置與變數 ==================

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
    breakfast: "早餐 早午餐",
    lunch: "餐廳 小吃 午餐 異國料理",
    afternoon_tea: "飲料 甜點 咖啡",
    dinner: "餐廳 晚餐 小吃 火鍋 夜市",
    late_night: "宵夜 鹽酥雞 清粥 滷味 炸物 夜市",
    noodles_rice: "麵 飯 水餃 壽司 快炒 合菜 異國料理 中式", 
    western_steak: "牛排 義大利麵 漢堡 披薩 吃到飽 西式",
    dessert: "冰品 豆花 甜點 蛋糕",
    all: "美食 餐廳 小吃 夜市 料理 吃到飽" 
};

window.activeKeywordDict = { ...window.defaultKeywordDict };

// 完整教學資料
window.guideData = {
    desktop: { 
        title: "💻 電腦版申請步驟", 
        steps: [
            {title:"1. 登入 Google Cloud", desc:"前往 <a href='https://console.cloud.google.com/' target='_blank'>Google Cloud Console</a> 並登入 Google 帳號。"}, 
            {title:"2. 建立新專案", desc:"點擊上方專案選單 > <strong>建立新專案 (New Project)</strong>，命名為 FoodWheel。"}, 
            {title:"3. 綁定帳單 (必做)", desc:"左側選單 > <strong>帳單 (Billing)</strong> > 連結付款方式 (Google 每月贈送 $200 美金，個人使用通常免費)。"}, 
            {title:"4. 啟用 4 項 API", desc:"前往 <strong>API 和服務 > 啟用 API</strong>，搜尋並啟用：<br>1. Maps JavaScript API<br>2. Places API (New)<br>3. Geocoding API<br>4. Distance Matrix API"}, 
            {title:"5. 取得金鑰", desc:"前往 <strong>憑證 (Credentials)</strong> > 建立憑證 > API 金鑰。複製 <code>AIza</code> 開頭的字串貼入下方。"}
        ] 
    },
    android: { 
        title: "🤖 Android 手機申請步驟", 
        steps: [
            {title:"1. 開啟電腦版網站", desc:"使用 Chrome 開啟 <a href='https://console.cloud.google.com/' target='_blank'>Google Cloud</a>，點擊右上角選單勾選<strong>「電腦版網站」</strong>。"}, 
            {title:"2. 建立專案與綁卡", desc:"操作步驟同電腦版 (介面較小請放大操作)。務必確認<strong>帳單</strong>已綁定信用卡。"}, 
            {title:"3. 複製 Key", desc:"建立 API Key 後，長按複製該字串，貼到本網頁下方輸入框。"}
        ] 
    },
    ios: { 
        title: "🍎 iOS (iPhone) 申請步驟", 
        steps: [
            {title:"1. 切換電腦版網站", desc:"使用 Safari 開啟 <a href='https://console.cloud.google.com/' target='_blank'>Google Cloud</a>，點擊網址列左側 <strong>「Aa」</strong> > <strong>切換為電腦版網站</strong>。"}, 
            {title:"2. 建立專案", desc:"操作步驟同電腦版。請確保已啟用 Maps JS, Places, Geocoding, Distance Matrix 四個 API。"},
            {title:"3. 取得 Key", desc:"複製生成的 API Key 貼到下方。"}
        ] 
    }
};
