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

// 教學資料
window.guideData = {
    desktop: { title: "💻 電腦版申請步驟", steps: [{title:"1. 登入 Google Cloud", desc:"使用 Chrome 前往 console.cloud.google.com"}, {title:"2. 建立專案", desc:"建立一個新專案 (FoodWheel)"}, {title:"3. 綁定帳單", desc:"前往 Billing 綁定信用卡 (免費額度內不收費)"}, {title:"4. 啟用 API", desc:"啟用: Maps JS API, Places API, Geocoding API, Distance Matrix API"}, {title:"5. 取得 Key", desc:"前往 Credentials 建立 API Key 並貼上"}] },
    android: { title: "🤖 Android 步驟", steps: [{title:"1. 切換電腦版網站", desc:"手機瀏覽器勾選「電腦版網站」"}, {title:"2. 建立專案與綁卡", desc:"操作同電腦版"}, {title:"3. 複製 Key", desc:"將 Key 貼到下方欄位"}] },
    ios: { title: "🍎 iOS 步驟", steps: [{title:"1. 切換電腦版網站", desc:"Safari 網址列左側 Aa > 切換為電腦版網站"}, {title:"2. 建立專案", desc:"操作同電腦版"}] }
};
