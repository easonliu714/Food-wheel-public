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
    desktop: {
        title: "💻 電腦版申請步驟 (推薦使用)",
        steps: [
            {
                title: "1. 登入 Google Cloud",
                desc: "使用 Chrome 瀏覽器前往 <a href='https://console.cloud.google.com/' target='_blank'>Google Cloud Console</a> 並登入您的 Google 帳號。",
                img: './images/desktop_1.jpg' 
            },
            {
                title: "2. 建立新專案",
                desc: "點擊左上角的專案選單，選擇「建立新專案」。輸入專案名稱 (如 FoodWheel) 並建立。",
                img: './images/desktop_2.jpg'
            },
            {
                title: "3. 綁定結算帳戶 (免費額度)",
                desc: "前往左側選單 (☰) 的「帳單 (Billing)」>「付款方式」。綁定信用卡以驗證身分 (Google 每月贈送 $200 美金額度，個人使用通常完全免費)。",
                img: './images/desktop_3.jpg'
            },
            {
                title: "4. 啟用 4 項必要 API",
                desc: "左側選單(☰) 前往「API 和服務（APIs & Services）」>「啟用 API 和服務」，搜尋並啟用以下 4 個服務：<ul class='api-list'><li>Maps JavaScript API</li><li>Places API</li><li>Geocoding API</li><li>Distance Matrix API</li></ul>",
                img: './images/desktop_4.jpg'
            },
            {
                title: "5. 取得 API Key",
                desc: "左側選單前往「憑證 (Credentials)」，點擊「建立憑證」>「API 金鑰」。複製該金鑰並貼到下方的輸入框。",
                img: './images/desktop_5.jpg'
            }
        ]
    },
    android: {
        title: "🤖 Android 手機申請步驟",
        steps: [
            {
                title: "1. 開啟電腦版網頁 (關鍵步驟)",
                desc: "開啟 Chrome 瀏覽器，前往 <a href='https://console.cloud.google.com/' target='_blank'>Google Cloud Console</a>。<br><strong>點擊右上角「⋮」選單，勾選「電腦版網站」</strong> (因為 Google 後台不支援手機介面)。",
                img: './images/android_1.jpg'
            },
            {
                title: "2. 建立新專案",
                desc: "放大畫面，點擊左上角專案選單 >「New Project」。建立一個新專案。",
                img: './images/android_2.jpg'
            },
            {
                title: "3. 綁定帳單",
                desc: "點擊左上角漢堡選單 (☰) > 「帳單 (Billing)」>「付款方式」。依指示綁定信用卡 (享每月 $200 免費額度)。",
                img: './images/android_3.jpg'
            },
            {
                title: "4. 啟用 4 項 API",
                desc: "左側選單(☰) 前往「API 和服務（APIs & Services）」>「啟用 API 和服務」。搜尋並啟用上述服務。",
                img: './images/android_4.jpg'
            },
            {
                title: "5. 複製金鑰",
                desc: "選單(☰) > 「API 和服務（APIs & Services）」 > 「憑證 (Credentials)」 > Create Credentials > API Key。複製顯示的亂碼字串貼到下方輸入框。",
                img: './images/android_5.jpg'
            }
        ]
    },
    ios: {
        title: "🍎 iOS (iPhone/iPad) 申請步驟",
        steps: [
            {
                title: "1. 切換電腦版網站 (關鍵步驟)",
                desc: "開啟 Safari，前往 <a href='https://console.cloud.google.com/' target='_blank'>Google Cloud Console</a>。<br><strong>點擊網址列左側的「大小 (Aa)」圖示，選擇「切換為電腦版網站」</strong>。",
                img: './images/ios_1.jpg'
            },
            {
                title: "2. 建立專案",
                desc: "將手機橫放操作較方便。點擊上方專案選單 > New Project。",
                img: './images/ios_2.jpg'
            },
            {
                title: "3. 設定 Billing",
                desc: "左側選單 (☰) > 「帳單 (Billing)」>「付款方式」。依指示綁定信用卡 (享每月 $200 免費額度)。",
                img: './images/ios_3.jpg'
            },
            {
                title: "4. 啟用 API",
                desc: "左側選單(☰) 前往「API 和服務（APIs & Services）」>「啟用 API 和服務」。搜尋並啟用相關服務。",
                img: './images/ios_4.jpg'
            },
            {
                title: "5. 取得 Key",
                desc: "選單 > 「API 和服務（APIs & Services）」 > 「憑證 (Credentials)」 > Create Credentials > API Key。複製顯示的亂碼字串貼到下方輸入框。",
                img: './images/ios_5.jpg'
            }
        ]
    }
};
