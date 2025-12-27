// config.js
// 全域變數定義
let places = []; // 輪盤上目前可用的店家
let allSearchResults = []; // 搜尋到的所有原始店家
let hitCounts = {}; // 次數統計
let userRatings = {}; // 個人評價
let eliminatedIds = new Set(); // 淘汰名單
let currentRotation = 0;
let userCoordinates = null; 

let canvas = null;
let ctx = null;

// 預設關鍵字字典
const defaultKeywordDict = {
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

let activeKeywordDict = { ...defaultKeywordDict };

// 教學資料
const commonApiList = `<ul class="api-list"><li>✅ Maps JavaScript API</li><li>✅ Places API (搜尋)</li><li>✅ Geocoding API (地址)</li><li>✅ Distance Matrix API (距離)</li></ul>`;

const guideData = {
    desktop: {
        title: "💻 電腦版申請步驟",
        steps: [
            { title: "1. 登入 Google Cloud", desc: "前往 <a href='https://console.cloud.google.com/' target='_blank'>Google Cloud Console</a> 並登入。", img: './images/desktop_1.jpg' },
            { title: "2. 建立新專案", desc: "點擊左上角專案選單 >「建立新專案」。", img: './images/desktop_2.jpg' },
            { title: "3. 綁定帳單", desc: "左側選單（≡）>「帳單」。綁定信用卡 (享每月$200美金免費額度)。", img: './images/desktop_3.jpg' },
            { title: "4. 啟用 4 項 API", desc: "左側選單（≡） >「API 和服務（API & Service）」>「啟用 API」。搜尋並啟用：" + commonApiList, img: './images/desktop_4.jpg' },
            { title: "5. 取得 API Key", desc: "選單（≡） >「憑證（Credentials）」>「建立憑證（Create Credentials）」>「API 金鑰」。複製並貼到上方。", img: './images/desktop_5.jpg' }
        ]
    },
    android: {
        title: "🤖 Android 手機申請步驟",
        steps: [
            { title: "1. 切換電腦版網站", desc: "用 Chrome 開啟 Console，<b>點擊右上角「⋮」勾選「電腦版網站」</b>。", img: './images/android_1.jpg' },
            { title: "2. 建立新專案", desc: "放大畫面，點擊上方選單 > New Project。", img: './images/android_2.jpg' },
            { title: "3. 綁定帳單", desc: "左側選單 > Billing。綁定信用卡。", img: './images/android_3.jpg' },
            { title: "4. 啟用 API", desc: "左側選單（≡） >「API 和服務（API & Service）」>「啟用 API」。搜尋並啟用：" + commonApiList, img: './images/android_4.jpg' },
            { title: "5. 複製 Key", desc: "選單（≡） >「憑證（Credentials）」>「建立憑證（Create Credentials）」> API Key。", img: './images/android_5.jpg' }
        ]
    },
    ios: {
        title: "🍎 iOS 申請步驟",
        steps: [
            { title: "1. 切換電腦版網站", desc: "用 Safari 開啟 Console，<b>點擊網址列左側「大小(Aa)」>「切換為電腦版網站」</b>。", img: './images/ios_1.jpg' },
            { title: "2. 建立專案", desc: "手機橫放。點擊上方選單 > New Project。", img: './images/ios_2.jpg' },
            { title: "3. 綁定帳單", desc: "左側選單 > Billing。綁定信用卡。", img: './images/ios_3.jpg' },
            { title: "4. 啟用 API", desc: "左側選單（≡） >「API 和服務（API & Service）」>「啟用 API」。搜尋並啟用：" + commonApiList, img: './images/ios_4.jpg' },
            { title: "5. 取得 Key", desc: "選單（≡） >「憑證（Credentials）」>「建立憑證（Create Credentials）」> API Key。", img: './images/ios_5.jpg' }
        ]
    }
};
