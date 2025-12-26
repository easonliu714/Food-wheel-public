// ================== 全域變數定義 ==================
let places = []; // 輪盤上目前可用的店家
let allSearchResults = []; // 搜尋到的所有原始店家
let hitCounts = {}; // 次數統計
let userRatings = {}; // 個人評價
let eliminatedIds = new Set(); // 淘汰名單
let currentRotation = 0;
let userCoordinates = null; 

// Canvas 相關
let canvas = null;
let ctx = null;

// 預設關鍵字字典 (系統預設值)
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

// 實際運作時使用的關鍵字字典 (會優先讀取使用者設定)
let activeKeywordDict = { ...defaultKeywordDict };

// ================== 0. 教學內容 ==================
const commonApiList = `
    <ul class="api-list">
        <li>✅ Maps JavaScript API</li>
        <li>✅ Places API (搜尋)</li>
        <li>✅ Geocoding API (地址)</li>
        <li>✅ Distance Matrix API (距離)</li>
    </ul>
`;

const guideData = {
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
                desc: "左側選單(☰) 前往「API 和服務（APIs & Services）」>「啟用 API 和服務」，搜尋並啟用以下 4 個服務：" + commonApiList,
                img: './images/desktop_4.jpg'
            },
            {
                title: "5. 取得 API Key",
                desc: "左側選單(☰)前往「憑證 (Credentials)」，點擊「建立憑證」>「API 金鑰」。複製該金鑰並貼到下方的輸入框。",
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
                desc: "左側選單(☰) 前往「API 和服務（APIs & Services）」>「啟用 API 和服務」。搜尋並啟用以下服務：" + commonApiList,
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
                desc: "左側選單(☰) 前往「API 和服務（APIs & Services）」>「啟用 API 和服務」。搜尋並啟用：" + commonApiList,
                img: './images/ios_4.jpg'
            },
            {
                title: "5. 取得 Key",
                desc: "選單(☰) > 「API 和服務（APIs & Services）」 > 「憑證 (Credentials)」 > Create Credentials > API Key。複製顯示的亂碼字串貼到下方輸入框。",
                img: './images/ios_5.jpg'
            }
        ]
    }
};

function showGuide(platform) {
    const container = document.getElementById('guide-content');
    if(!container) return;
    
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const btns = document.querySelectorAll('.tab-btn');
    if(platform === 'desktop' && btns[0]) btns[0].classList.add('active');
    if(platform === 'android' && btns[1]) btns[1].classList.add('active');
    if(platform === 'ios' && btns[2]) btns[2].classList.add('active');

    const data = guideData[platform];
    let html = `<h3>${data.title}</h3>`;
    data.steps.forEach(step => {
        let imgHtml = step.img ? `<div class="step-image-container"><img src="${step.img}" alt="${step.title}"></div>` : '';
        html += `<div class="step-card"><div class="step-header"><div class="step-title">${step.title}</div></div>${imgHtml}<div class="step-content"><p>${step.desc}</p></div></div>`;
    });
    container.innerHTML = html;
}

// ================== 1. 初始化 ==================

window.onload = () => {
    // 確保 Canvas 載入
    canvas = document.getElementById('wheel');
    if(canvas) ctx = canvas.getContext('2d');

    // 載入評價
    const savedRatings = localStorage.getItem('food_wheel_user_ratings');
    if (savedRatings) {
        try { userRatings = JSON.parse(savedRatings); } catch(e) { console.error(e); }
    }

    // 1. 載入關鍵字邏輯
    loadUserKeywords();

    // 載入 API Key
    const savedKey = localStorage.getItem('food_wheel_api_key');
    if (savedKey) {
        loadGoogleMapsScript(savedKey);
    } else {
        const setupScreen = document.getElementById('setup-screen');
        const appScreen = document.getElementById('app-screen');
        if(setupScreen) setupScreen.style.display = 'block';
        if(appScreen) appScreen.style.display = 'none';
        
        // 2. 填入設定頁面的輸入框
        populateSetupKeywords(); 
        populateSetupGeneralPrefs();
        
        showGuide('desktop');
    }

    // 綁定過濾器事件
    const filterCheckbox = document.getElementById('filterDislike');
    if (filterCheckbox) {
        filterCheckbox.addEventListener('change', () => {
            refreshWheelData(); 
        });
    }
};

// ================== 設定頁面資料處理 (關鍵字) ==================

function loadUserKeywords() {
    const savedKw = localStorage.getItem('food_wheel_custom_keywords');
    if (savedKw) {
        try {
            const parsed = JSON.parse(savedKw);
            activeKeywordDict = {};
            for (const key in defaultKeywordDict) {
                if (parsed[key] && parsed[key].trim() !== "") {
                    activeKeywordDict[key] = parsed[key];
                } else {
                    activeKeywordDict[key] = defaultKeywordDict[key];
                }
            }
        } catch (e) {
            console.error("載入關鍵字錯誤，使用預設值", e);
            activeKeywordDict = { ...defaultKeywordDict };
        }
    } else {
        activeKeywordDict = { ...defaultKeywordDict };
    }
}

function populateSetupKeywords() {
    const mapping = {
        'kw_breakfast': 'breakfast',
        'kw_lunch': 'lunch',
        'kw_afternoon_tea': 'afternoon_tea',
        'kw_dinner': 'dinner',
        'kw_late_night': 'late_night',
        'kw_noodles_rice': 'noodles_rice',
        'kw_western_steak': 'western_steak',
        'kw_dessert': 'dessert',
        'kw_all': 'all'
    };
    
    for (const [id, key] of Object.entries(mapping)) {
        const input = document.getElementById(id);
        if (input) {
            input.value = activeKeywordDict[key]; 
        }
    }
}

// ================== 設定頁面資料處理 (一般設定) ==================

function populateSetupGeneralPrefs() {
    const prefsJson = localStorage.getItem('food_wheel_prefs');
    if (prefsJson) {
        try {
            const prefs = JSON.parse(prefsJson);
            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el && val !== undefined && val !== null) {
                    el.value = val;
                }
            };

            setVal('setupSearchMode', prefs.searchMode);
            setVal('setupMinRating', prefs.minRating);
            setVal('setupSpinMode', prefs.spinMode);
            setVal('setupTransport', prefs.transport);
            setVal('setupMaxTime', prefs.maxTime);
            setVal('setupPriceLevel', prefs.priceLevel);
            setVal('setupResultCount', prefs.resultCount);
            
        } catch (e) { console.error("Error parsing general prefs", e); }
    }
}

// ================== 儲存與重設 ==================

function saveAndStart() {
    const inputKey = document.getElementById('userApiKey').value.trim();
    if (inputKey.length < 20) return alert("API Key 格式不正確");
    
    const userPrefs = {
        searchMode: document.getElementById('setupSearchMode').value,
        minRating: document.getElementById('setupMinRating').value,
        transport: document.getElementById('setupTransport').value,
        maxTime: document.getElementById('setupMaxTime').value,
        priceLevel: document.getElementById('setupPriceLevel').value,
        resultCount: document.getElementById('setupResultCount').value,
        spinMode: document.getElementById('setupSpinMode') ? document.getElementById('setupSpinMode').value : 'repeat'
    };
    
    const customKw = {};
    const mapping = {
        'kw_breakfast': 'breakfast',
        'kw_lunch': 'lunch',
        'kw_afternoon_tea': 'afternoon_tea',
        'kw_dinner': 'dinner',
        'kw_late_night': 'late_night',
        'kw_noodles_rice': 'noodles_rice',
        'kw_western_steak': 'western_steak',
        'kw_dessert': 'dessert',
        'kw_all': 'all'
    };
    
    for (const [id, key] of Object.entries(mapping)) {
        const input = document.getElementById(id);
        if (input && input.value.trim() !== "") {
            customKw[key] = input.value.trim();
        } else {
            customKw[key] = defaultKeywordDict[key];
        }
    }
    
    activeKeywordDict = customKw;
    localStorage.setItem('food_wheel_custom_keywords', JSON.stringify(customKw));
    localStorage.setItem('food_wheel_api_key', inputKey);
    localStorage.setItem('food_wheel_prefs', JSON.stringify(userPrefs));
    
    loadGoogleMapsScript(inputKey);
}

function resetApiKey() {
    if(confirm("確定要重設 API Key 嗎？\n(您的偏好設定、自訂關鍵字與評價紀錄將會保留)")) {
        localStorage.removeItem('food_wheel_api_key');
        location.reload(); 
    }
}

function editPreferences() {
    document.getElementById('app-screen').style.display = 'none';
    document.getElementById('setup-screen').style.display = 'block';
    const savedKey = localStorage.getItem('food_wheel_api_key');
    if(savedKey) document.getElementById('userApiKey').value = savedKey;
    
    populateSetupKeywords();
    populateSetupGeneralPrefs(); 

    const prefsBox = document.querySelector('.preferences-box');
    if(prefsBox) prefsBox.scrollIntoView({ behavior: 'smooth' });
}

function loadGoogleMapsScript(apiKey) {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
        document.getElementById('setup-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'block';
        initApp(); 
    };
    script.onerror = () => {
        alert("API 載入失敗，請檢查 Key");
        localStorage.removeItem('food_wheel_api_key');
        location.reload();
    };
    document.head.appendChild(script);
}

function initApp() {
    applyPreferencesToApp();
    autoSelectMealType();
    initLocation();
    resetGame(true);
}

function applyPreferencesToApp() {
    const prefsJson = localStorage.getItem('food_wheel_prefs');
    if (prefsJson) {
        try {
            const prefs = JSON.parse(prefsJson);
            if(prefs.searchMode) document.getElementById('searchMode').value = prefs.searchMode;
            if(prefs.minRating) document.getElementById('minRating').value = prefs.minRating;
            if(prefs.transport) document.getElementById('transportMode').value = prefs.transport;
            if(prefs.maxTime) document.getElementById('maxTime').value = prefs.maxTime;
            if(prefs.priceLevel) document.getElementById('priceLevel').value = prefs.priceLevel;
            if(prefs.resultCount) document.getElementById('resultCount').value = prefs.resultCount;
            if(prefs.spinMode && document.getElementById('spinMode')) {
                document.getElementById('spinMode').value = prefs.spinMode;
            }
        } catch (e) { console.error(e); }
    }
}

// ================== 2. 核心邏輯 ==================

function autoSelectMealType() {
    const hour = new Date().getHours();
    let type = 'lunch';
    if (hour >= 5 && hour < 10) type = 'breakfast';
    else if (hour >= 10 && hour < 14) type = 'lunch';
    else if (hour >= 14 && hour < 17) type = 'afternoon_tea';
    else if (hour >= 17 && hour < 21) type = 'dinner';
    else type = 'late_night';
    
    const mealSelect = document.getElementById('mealType');
    if(mealSelect) {
        mealSelect.value = type;
        updateKeywords(); 
    }
}

function updateKeywords() {
    const type = document.getElementById('mealType').value;
    const input = document.getElementById('keywordInput');
    if (activeKeywordDict[type]) {
        input.value = activeKeywordDict[type];
    }
}

function initLocation() {
    if (typeof google === 'undefined') return;
    const addrInput = document.getElementById('currentAddress');
    const detailDisplay = document.getElementById('detailedAddressDisplay');
    
    if(addrInput) addrInput.value = "定位中...";
    if(detailDisplay) detailDisplay.style.display = 'none';

    if (!navigator.geolocation) return alert("瀏覽器不支援定位");

    navigator.geolocation.getCurrentPosition(
        (position) => {
            userCoordinates = { lat: position.coords.latitude, lng: position.coords.longitude };
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: userCoordinates }, (results, status) => {
                if (status === "OK" && results[0]) {
                    if(addrInput) addrInput.value = results[0].formatted_address.replace(/^\d+\s*/, '').replace(/^台灣/, '');
                } else {
                    if(addrInput) addrInput.value = `${userCoordinates.lat.toFixed(5)}, ${userCoordinates.lng.toFixed(5)}`;
                }
            });
        },
        (error) => { if(addrInput) { addrInput.value = ""; addrInput.placeholder = "無法定位，請手動輸入"; } },
        { enableHighAccuracy: true }
    );
}

function handleSearch() {
    const addrInput = document.getElementById('currentAddress').value;
    const keywordsRaw = document.getElementById('keywordInput').value;
    const spinBtn = document.getElementById('spinBtn');

    if (!addrInput) return alert("請輸入地址");
    if (!keywordsRaw.trim()) return alert("請輸入關鍵字");

    resetGame(false); 

    if(spinBtn) {
        spinBtn.disabled = true;
        spinBtn.innerText = "資料載入中...";
        spinBtn.style.opacity = "0.5";
        spinBtn.style.cursor = "not-allowed";
    }

    const btn = document.querySelector('.search-btn');
    btn.innerText = "解析地址中...";
    btn.disabled = true;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: addrInput }, (results, status) => {
        if (status === "OK" && results[0]) {
            userCoordinates = results[0].geometry.location;
            const detailDisplay = document.getElementById('detailedAddressDisplay');
            if (detailDisplay) {
                detailDisplay.style.display = 'block';
                detailDisplay.innerText = `🎯 已定位至：${results[0].formatted_address}`;
            }
            startSearch(userCoordinates, keywordsRaw);
        } else {
            alert("找不到此地址");
            btn.innerText = "🔄 開始搜尋店家";
            btn.disabled = false;
        }
    });
}

// 【核心修正】雙模式搜尋策略 (Nearby vs Famous with Step-wise Scan)
function startSearch(location, keywordsRaw) {
    const service = new google.maps.places.PlacesService(document.createElement('div'));
    const priceLevel = parseInt(document.getElementById('priceLevel').value, 10);
    const transportMode = document.getElementById('transportMode').value;
    const maxTime = parseInt(document.getElementById('maxTime').value, 10);
    const searchMode = document.getElementById('searchMode').value; // 'nearby' 或 'famous'
    
    // 1. 關鍵字策略：拆分 + 原句 (平行搜尋)
    const splitKeywords = keywordsRaw.split(/\s+/).filter(k => k.length > 0);
    let searchQueries = [...splitKeywords];
    if (splitKeywords.length > 1) {
        searchQueries.push(keywordsRaw);
    }

    // 2. 速度定義與半徑/幾何過濾距離計算
    let speedMetersPerMin = 0;
    if (transportMode === 'DRIVING') {
        speedMetersPerMin = 1000; // 60 km/h = 1000 m/min
    } else {
        speedMetersPerMin = 333.33; // 20 km/h = ~333 m/min (走路/單車)
    }

    // 計算最大理論半徑 (用於 Famous 模式的最大邊界與 Geometry Filter)
    const maxTheoreticalRadius = speedMetersPerMin * maxTime;
    
    // 計算幾何過濾半徑 (Geometry Filter) = 速度 x 時間 x 1.5
    const maxLinearDist = maxTheoreticalRadius * 1.5;

    const btn = document.querySelector('.search-btn');
    let statusText = "";

    // 3. 建立搜尋請求矩陣
    let promises = [];

    if (searchMode === 'nearby') {
        // === Mode A: 距離優先 (Nearby Mode) ===
        // 不設 Radius，RankBy=DISTANCE，抓取最近的店
        statusText = `📍 距離優先搜尋 (抓取最近 60 筆)...`;
        
        searchQueries.forEach(keyword => {
            let request = {
                location: location,
                rankBy: google.maps.places.RankBy.DISTANCE,
                keyword: keyword
            };
            if (priceLevel !== -1) request.maxPrice = priceLevel;
            
            // 強制抓滿 3 頁
            promises.push(fetchPlacesWithPagination(service, request, 3));
        });

    } else {
        // === Mode B: 熱門優先 (Famous Mode) - 分段式同心圓掃描 ===
        // 邏輯：每 5 分鐘切一個半徑，分別搜尋 Prominence
        let steps = [];
        for (let t = 5; t <= maxTime; t += 5) {
            steps.push(t);
        }
        // 如果 maxTime 不是 5 的倍數，確保最後一個時間點有被加進去 (例如 user 輸入 12 分)
        if (maxTime % 5 !== 0) steps.push(maxTime);
        // 去重並排序
        steps = [...new Set(steps)].sort((a,b)=>a-b);

        statusText = `🌟 熱門優先：分段掃描 (${steps.join(',')}分) x 關鍵字...`;

        searchQueries.forEach(keyword => {
            steps.forEach(stepTime => {
                let stepRadius = stepTime * speedMetersPerMin;
                // API 最小半徑建議 500m
                if (stepRadius < 500) stepRadius = 500; 

                let request = {
                    location: location,
                    radius: stepRadius,
                    rankBy: google.maps.places.RankBy.PROMINENCE, // 重點：使用熱門度排序
                    keyword: keyword
                };
                if (priceLevel !== -1) request.maxPrice = priceLevel;

                // 強制抓滿 3 頁，收集該半徑內的高分店
                promises.push(fetchPlacesWithPagination(service, request, 3));
            });
        });
    }

    btn.innerText = statusText;

    // 4. 合併結果
    Promise.all(promises).then(resultsArray => {
        let combinedResults = [].concat(...resultsArray);
        
        if (combinedResults.length === 0) {
            alert("附近找不到符合條件的店家");
            btn.innerText = "🔄 開始搜尋店家";
            btn.disabled = false;
            return;
        }
        processResults(location, combinedResults, maxLinearDist);
    }).catch(err => {
        console.error(err);
        alert("搜尋錯誤");
        btn.innerText = "🔄 開始搜尋店家";
        btn.disabled = false;
    });
}

// 遞迴抓取分頁的輔助函式 (可指定抓幾頁)
function fetchPlacesWithPagination(service, request, maxPages = 3) {
    return new Promise((resolve) => {
        let allResults = [];
        let pageCount = 0;
        
        service.nearbySearch(request, (results, status, pagination) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                allResults = allResults.concat(results);
                pageCount++;
                
                // 檢查是否有下一頁 (且未達頁數上限，且總數未爆量)
                if (pagination && pagination.hasNextPage && pageCount < maxPages && allResults.length < (maxPages * 20)) {
                    // Google API 要求：next_page_token 出現後，必須等待約 2 秒才能使用
                    setTimeout(() => {
                        pagination.nextPage();
                    }, 2000);
                } else {
                    resolve(allResults);
                }
            } else {
                resolve(allResults); // 即使失敗或沒資料，也回傳目前抓到的
            }
        });
    });
}

function processResults(origin, results, maxLinearDist) {
    const btn = document.querySelector('.search-btn');
    const userMaxCount = parseInt(document.getElementById('resultCount').value, 10);
    const transportMode = document.getElementById('transportMode').value;
    const minRating = parseFloat(document.getElementById('minRating').value);
    const maxTime = parseInt(document.getElementById('maxTime').value, 10);
    const searchMode = document.getElementById('searchMode').value;

    // 1. 去除重複 (Deduplication)
    const uniqueIds = new Set();
    let filtered = [];
    
    results.forEach(p => {
        // 基本過濾：星等 & 評論數
        if (p.rating && p.rating >= minRating && p.user_ratings_total > 0) {
            if (!uniqueIds.has(p.place_id)) {
                uniqueIds.add(p.place_id);
                
                // 2. 幾何直線距離過濾 (Geometry Filter) - 節省 API Quota
                const loc = p.geometry.location;
                const distanceMeters = google.maps.geometry.spherical.computeDistanceBetween(origin, loc);
                
                // 使用 (速度 x 時間 x 1.5) 作為絕對門檻
                // 這能篩掉 Nearby Mode 抓回來的「超遠但距離最近」的結果 (如果有)，以及 Famous Mode 範圍邊緣的結果
                if (distanceMeters <= maxLinearDist) {
                    // 暫存直線距離供排序參考
                    p.geometryDistance = distanceMeters;
                    filtered.push(p);
                }
            }
        }
    });

    if (filtered.length === 0) {
        alert(`無符合 ${minRating} 星以上的店家 (或超出最大直線距離)`);
        btn.innerText = "🔄 開始搜尋店家";
        btn.disabled = false;
        return;
    }

    btn.innerText = `計算路程 (過濾前 ${filtered.length} 間)...`;

    // 3. 排序優化 (在送 Distance Matrix 前先挑選最有希望的)
    if (searchMode === 'nearby') {
        // Nearby Mode: 優先選直線距離近的去算路程
        filtered.sort((a, b) => a.geometryDistance - b.geometryDistance);
    } else {
        // Famous Mode: 優先選評價好的去算路程
        filtered.sort((a, b) => {
            const scoreA = a.rating * Math.log10(a.user_ratings_total + 1);
            const scoreB = b.rating * Math.log10(b.user_ratings_total + 1);
            return scoreB - scoreA;
        });
    }

    // 截斷數量，避免 Matrix API 爆量 (取前 80 間最有希望的)
    if (filtered.length > 80) {
        filtered = filtered.slice(0, 80);
    }

    // 4. 批量計算實際路程 (Distance Matrix)
    const batchSize = 25;
    const batches = [];
    for (let i = 0; i < filtered.length; i += batchSize) {
        batches.push(filtered.slice(i, i + batchSize));
    }

    Promise.all(batches.map(batch => getDistances(origin, batch, transportMode)))
        .then(resultsArray => {
            let validPlaces = [].concat(...resultsArray);
            
            // 5. 嚴格過濾實際時間
            validPlaces = validPlaces.filter(p => p.realDurationMins <= maxTime);

            if (validPlaces.length === 0) {
                alert(`${maxTime} 分鐘內無符合店家 (實際路程超時)`);
                btn.innerText = "🔄 開始搜尋店家";
                btn.disabled = false;
                return;
            }

            // 6. 最終顯示排序
            if (searchMode === 'nearby') {
                // Nearby Mode: 最終結果依「實際路程時間」排序
                validPlaces.sort((a, b) => a.realDurationMins - b.realDurationMins);
            } else {
                // Famous Mode: 最終結果依「評價分數」排序
                validPlaces.sort((a, b) => {
                    const scoreA = a.rating * Math.log10(a.user_ratings_total + 1);
                    const scoreB = b.rating * Math.log10(b.user_ratings_total + 1);
                    return scoreB - scoreA;
                });
            }

            // 截取用戶需要的數量
            allSearchResults = validPlaces.slice(0, userMaxCount); 
            eliminatedIds.clear(); 
            hitCounts = {};
            allSearchResults.forEach(p => hitCounts[p.place_id] = 0);

            refreshWheelData(); 
            
            btn.innerText = `搜尋完成 (共 ${places.length} 間)`;
            btn.disabled = false;
        })
        .catch(err => {
            console.error(err);
            alert("路程計算失敗");
            btn.innerText = "🔄 開始搜尋店家";
            btn.disabled = false;
        });
}

function refreshWheelData() {
    const filterDislikeEl = document.getElementById('filterDislike');
    const filterDislike = filterDislikeEl ? filterDislikeEl.checked : false;
    
    places = allSearchResults.filter(p => {
        if (eliminatedIds.has(p.place_id)) return false;
        if (filterDislike && userRatings[p.place_id] === 'dislike') return false;
        return true;
    });

    const searchBtn = document.querySelector('.search-btn');
    if(searchBtn && !searchBtn.disabled && searchBtn.innerText.includes("搜尋完成")) {
        searchBtn.innerText = `搜尋完成 (共 ${places.length} 間)`;
    }

    initResultList(allSearchResults);
    drawWheel();
    enableSpinButton(places.length);
}

function getDistances(origin, destinations, mode) {
    return new Promise((resolve) => {
        const service = new google.maps.DistanceMatrixService();
        const destLocs = destinations.map(d => d.geometry.location);
        service.getDistanceMatrix({
            origins: [origin],
            destinations: destLocs,
            travelMode: google.maps.TravelMode[mode],
            unitSystem: google.maps.UnitSystem.METRIC,
        }, (response, status) => {
            if (status === 'OK') {
                const elements = response.rows[0].elements;
                const processed = [];
                for (let i = 0; i < destinations.length; i++) {
                    const el = elements[i];
                    if (el.status === 'OK') {
                        let p = destinations[i];
                        p.realDistanceText = el.distance.text;
                        p.realDurationText = el.duration.text;
                        p.realDurationMins = Math.ceil(el.duration.value / 60);
                        processed.push(p);
                    }
                }
                resolve(processed);
            } else { resolve([]); }
        });
    });
}

function initResultList(list) {
    const tbody = document.querySelector('#resultsTable tbody');
    if(!tbody) return;
    tbody.innerHTML = ''; 
    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">無資料</td></tr>';
        return;
    }
    const filterDislikeEl = document.getElementById('filterDislike');
    const filterDislike = filterDislikeEl ? filterDislikeEl.checked : false;

    list.forEach(p => {
        const isEliminated = eliminatedIds.has(p.place_id);
        const isDislike = userRatings[p.place_id] === 'dislike';
        const isFiltered = filterDislike && isDislike;

        const tr = document.createElement('tr');
        tr.id = `row-${p.place_id}`; 
        
        if (isEliminated || isFiltered) tr.classList.add('eliminated'); 

        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name)}&query_place_id=${p.place_id}`;
        
        let nameHtml = `<a href="${mapUrl}" target="_blank" class="store-link" title="在 Google 地圖上查看">${p.name}</a>`;
        if (userRatings[p.place_id]) {
            if (userRatings[p.place_id] === 'like') {
                nameHtml = `<span class="personal-tag like">👍</span> ` + nameHtml;
            } else if (isDislike) {
                nameHtml = `<span class="personal-tag dislike">💣</span> ` + nameHtml;
            }
        }

        const ratingText = p.rating ? `${p.rating} <span style="font-size:0.8em; color:#666;">(${p.user_ratings_total || 0})</span>` : "無評價";
        const distanceText = p.realDistanceText ? `${p.realDistanceText}<br><span style="font-size:0.85em; color:#666;">${p.realDurationText}</span>` : "未知";

        tr.innerHTML = `<td>${nameHtml}</td><td>⭐ ${ratingText}</td><td>${distanceText}</td><td class="hit-count">${hitCounts[p.place_id] || 0}</td>`;
        tbody.appendChild(tr);
    });
}

function resetGame(fullReset) {
    currentRotation = 0; 
    canvas.style.transform = `rotate(0deg)`;
    canvas.style.transition = 'none'; 
    
    const storeName = document.getElementById('storeName');
    if(storeName) storeName.innerText = "點擊輪盤開始抉擇";
    
    ['storeRating', 'storeAddress', 'storeDistance', 'userPersonalRating'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.innerText = "";
    });
    
    const menuLink = document.getElementById('menuLink');
    if(menuLink) menuLink.style.display = "none";
    
    ['btnLike', 'btnDislike'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.display = 'none';
    });

    if(fullReset) {
        places = [];
        allSearchResults = [];
        eliminatedIds.clear();
        if(ctx) ctx.clearRect(0, 0, 400, 400);
        enableSpinButton(0);
    }
}

function setControlsDisabled(disabled) {
    const ids = ['filterDislike', 'spinMode', 'resultCount', 'mealType', 'geoBtn', 'searchMode'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.disabled = disabled;
    });
}

function enableSpinButton(count) {
    const spinBtn = document.getElementById('spinBtn');
    if(!spinBtn) return;

    if (count > 0) {
        spinBtn.disabled = false;
        spinBtn.style.opacity = "1";
        spinBtn.style.cursor = "pointer";
        spinBtn.innerText = "開始抽籤";
    } else {
        spinBtn.disabled = true;
        spinBtn.style.opacity = "0.5";
        spinBtn.style.cursor = "not-allowed";
        if (allSearchResults.length > 0) {
            spinBtn.innerText = "商家已全數濾除/淘汰";
        } else {
            spinBtn.innerText = "請先搜尋店家";
        }
    }
}

function drawWheel() {
    const numOptions = places.length;
    if(ctx) ctx.clearRect(0, 0, 400, 400);
    if (numOptions === 0) return;
    
    const arcSize = (2 * Math.PI) / numOptions;
    const startAngleOffset = -Math.PI / 2;

    places.forEach((place, i) => {
        const angle = startAngleOffset + (i * arcSize);
        if(ctx) {
            ctx.fillStyle = `hsl(${i * (360 / numOptions)}, 70%, 60%)`;
            ctx.beginPath();
            ctx.moveTo(200, 200);
            ctx.arc(200, 200, 200, angle, angle + arcSize);
            ctx.fill();
            ctx.stroke();

            ctx.save();
            ctx.translate(200, 200);
            ctx.rotate(angle + arcSize / 2);
            
            let fontSize = 16;
            if (numOptions > 20) fontSize = 12;
            if (numOptions > 30) fontSize = 10;
            
            ctx.fillStyle = "white";
            ctx.font = `bold ${fontSize}px Arial`;
            let text = place.name;
            if (text.length > 8) text = text.substring(0, 7) + "..";
            ctx.fillText(text, 60, 5);
            ctx.restore();
        }
    });
}

document.getElementById('spinBtn').onclick = () => {
    try {
        if (places.length === 0) return;
        
        let spinMode = 'repeat';
        const spinModeEl = document.getElementById('spinMode'); 
        
        if (spinModeEl) {
            spinMode = spinModeEl.value;
        } else {
            const prefs = JSON.parse(localStorage.getItem('food_wheel_prefs') || '{}');
            if(prefs.spinMode) spinMode = prefs.spinMode;
        }
        
        const spinBtn = document.getElementById('spinBtn');
        spinBtn.disabled = true; 
        setControlsDisabled(true); 

        const spinAngle = Math.floor(Math.random() * 1800) + 1800; 
        currentRotation += spinAngle;
        canvas.style.transition = 'transform 4s cubic-bezier(0.15, 0, 0.15, 1)';
        canvas.style.transform = `rotate(${currentRotation}deg)`;

        const btnLike = document.getElementById('btnLike');
        const btnDislike = document.getElementById('btnDislike');
        const ratingText = document.getElementById('userPersonalRating');
        if(btnLike) btnLike.style.display = 'none';
        if(btnDislike) btnDislike.style.display = 'none';
        if(ratingText) ratingText.innerText = "";

        setTimeout(() => {
            try {
                const numOptions = places.length;
                if (numOptions === 0) throw new Error("No places");

                const arcSize = 360 / numOptions;
                const actualRotation = currentRotation % 360;
                let winningIndex = Math.floor((360 - actualRotation) / arcSize) % numOptions;
                if (winningIndex < 0) winningIndex += numOptions;
                
                const winner = places[winningIndex];
                if(!winner) throw new Error("Winner undefined");

                updateWinnerStatus(winner);
                updateHitCountUI(winner.place_id);

                if (spinMode === 'eliminate') {
                    eliminatedIds.add(winner.place_id); 
                    
                    setTimeout(() => {
                        canvas.style.transition = 'none';
                        currentRotation = 0;
                        canvas.style.transform = `rotate(0deg)`;
                        
                        refreshWheelData(); 
                        setControlsDisabled(false); 
                    }, 2000); 
                } else {
                    setControlsDisabled(false);
                    spinBtn.disabled = false;
                    refreshWheelData(); 
                }
            } catch (error) {
                console.error("Spin Logic Error:", error);
                setControlsDisabled(false);
                spinBtn.disabled = false;
            }
        }, 4000);

    } catch (e) {
        console.error("Spin Init Error:", e);
        const spinBtn = document.getElementById('spinBtn');
        if(spinBtn) spinBtn.disabled = false;
        setControlsDisabled(false);
    }
};

function handleUserRating(placeId, type) {
    if (userRatings[placeId] === type) delete userRatings[placeId];
    else userRatings[placeId] = type;
    
    localStorage.setItem('food_wheel_user_ratings', JSON.stringify(userRatings));
    
    const btnLike = document.getElementById('btnLike');
    const btnDislike = document.getElementById('btnDislike');
    if(btnLike) btnLike.classList.remove('active');
    if(btnDislike) btnDislike.classList.remove('active');
    
    let text = "";
    if (userRatings[placeId] === 'like') {
        if(btnLike) btnLike.classList.add('active');
        text = "👍 您標記為：再次回訪";
    } else if (userRatings[placeId] === 'dislike') {
        if(btnDislike) btnDislike.classList.add('active');
        text = "💣 您標記為：踩雷";
    }
    const rateText = document.getElementById('userPersonalRating');
    if(rateText) rateText.innerText = text;
    
    refreshWheelData();
}

function updateWinnerStatus(winner) {
    const nameEl = document.getElementById('storeName');
    if(nameEl) nameEl.innerText = "就決定吃：" + winner.name;
    
    const ratingEl = document.getElementById('storeRating');
    if (ratingEl) {
        if (winner.rating) {
            ratingEl.innerText = `⭐ ${winner.rating} (${winner.user_ratings_total || 0} 則評價)`;
        } else {
            ratingEl.innerText = "暫無評價資料";
        }
    }
    
    const address = winner.formatted_address || winner.vicinity || "地址不詳";
    const storeAddressEl = document.getElementById('storeAddress');
    if(storeAddressEl) storeAddressEl.innerText = `⏳ 正在查詢詳細營業狀態...\n📍 ${address}`;

    const btnLike = document.getElementById('btnLike');
    const btnDislike = document.getElementById('btnDislike');
    const ratingText = document.getElementById('userPersonalRating');
    
    if(btnLike) {
        btnLike.style.display = 'inline-block';
        btnLike.classList.remove('active');
        btnLike.onclick = () => handleUserRating(winner.place_id, 'like');
    }
    if(btnDislike) {
        btnDislike.style.display = 'inline-block';
        btnDislike.classList.remove('active');
        btnDislike.onclick = () => handleUserRating(winner.place_id, 'dislike');
    }
    if(ratingText) ratingText.innerText = "";

    if (userRatings[winner.place_id] === 'like') {
        if(btnLike) btnLike.classList.add('active');
        if(ratingText) ratingText.innerText = "👍 您曾標記：再次回訪";
    } else if (userRatings[winner.place_id] === 'dislike') {
        if(btnDislike) btnDislike.classList.add('active');
        if(ratingText) ratingText.innerText = "💣 您曾標記：踩雷";
    }

    const service = new google.maps.places.PlacesService(document.createElement('div'));
    service.getDetails({
        placeId: winner.place_id,
        fields: ['opening_hours', 'utc_offset_minutes']
    }, (place, status) => {
        let openStatus = "⚪ 營業時間不明，請聯繫商家確認";
        if (status === google.maps.places.PlacesServiceStatus.OK && place && place.opening_hours) {
            openStatus = getDetailedOpeningStatus(place);
        }
        if(storeAddressEl) {
            storeAddressEl.innerHTML = `<strong>${openStatus}</strong><br><span style="font-size: 0.85em; color: #999;">(營業時間僅供參考，以商家資訊為準)</span><br>📍 ${address}`;
        }
    });

    const distEl = document.getElementById('storeDistance');
    if (winner.realDurationText && distEl) {
         distEl.innerText = `⏱️ 預估耗時：${winner.realDurationText} (${winner.realDistanceText})`;
    }
    
    const link = document.getElementById('menuLink');
    if(link) {
        link.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(winner.name)}&query_place_id=${winner.place_id}`;
        link.style.display = 'inline-block';
        link.innerText = "📍 導航去這家";
    }
}

function getDetailedOpeningStatus(place) {
    const isOpen = place.opening_hours.isOpen();
    const periods = place.opening_hours.periods;
    if (!periods || periods.length === 0) return isOpen ? "🟢 營業中" : "🔴 已打烊";

    let now = new Date();
    if (typeof place.utc_offset_minutes !== 'undefined') {
        const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
        now = new Date(utcTime + (place.utc_offset_minutes * 60000));
    }

    const currentDay = now.getDay();
    const currentTime = now.getHours() * 100 + now.getMinutes(); 
    const days = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    const formatTime = (t) => {
        const s = t.toString().padStart(4, '0');
        return `${s.substring(0, 2)}:${s.substring(2)}`;
    };

    let events = [];
    periods.forEach(p => {
        if (p.open) events.push({ type: 'open', day: p.open.day, time: parseInt(p.open.time) });
        if (p.close) events.push({ type: 'close', day: p.close.day, time: parseInt(p.close.time) });
    });
    events.sort((a, b) => (a.day !== b.day) ? a.day - b.day : a.time - b.time);

    let targetEvent = null;
    for (let e of events) {
        if (e.day > currentDay || (e.day === currentDay && e.time > currentTime)) {
            if ((isOpen && e.type === 'close') || (!isOpen && e.type === 'open')) {
                targetEvent = e;
                break;
            }
        }
    }
    if (!targetEvent) {
        for (let e of events) {
             if ((isOpen && e.type === 'close') || (!isOpen && e.type === 'open')) {
                targetEvent = e;
                break;
            }
        }
    }

    if (!targetEvent) return isOpen ? "🟢 營業中" : "🔴 已打烊";
    const dayStr = days[targetEvent.day];
    const timeStr = formatTime(targetEvent.time);
    return isOpen ? `🟢 營業中，預計 (${dayStr} ${timeStr}) 結束營業` : `🔴 已打烊，預計 (${dayStr} ${timeStr}) 開始營業`;
}

function updateHitCountUI(placeId) {
    if (!hitCounts[placeId]) hitCounts[placeId] = 0;
    hitCounts[placeId]++;
    
    const row = document.getElementById(`row-${placeId}`);
    if (row) {
        const countCell = row.querySelector('.hit-count');
        if (countCell) countCell.innerText = hitCounts[placeId];
        
        row.classList.add('active-winner');
        setTimeout(() => row.classList.remove('active-winner'), 2000); 
    }
}

// 綁定全域函式
window.handleUserRating = handleUserRating;
window.editPreferences = editPreferences;
window.resetApiKey = resetApiKey;
window.handleSearch = handleSearch;
window.initLocation = initLocation;
window.showGuide = showGuide;
window.saveAndStart = saveAndStart;
window.updateKeywords = updateKeywords;
