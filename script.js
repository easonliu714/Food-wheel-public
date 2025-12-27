// ================== 全域變數定義 ==================
let places = []; // 輪盤上目前可用的店家
let allSearchResults = []; // 搜尋到的所有原始店家
let hitCounts = {}; // 次數統計
let userRatings = {}; // 個人評價
let eliminatedIds = new Set(); // 淘汰名單
let currentRotation = 0;
let userCoordinates = null; 

let canvas = null;
let ctx = null;

// === AI 菜單系統全域變數 ===
let currentStoreForMenu = null;
let menuCanvas = null;
let menuCtx = null;
let menuRotation = 0;
let currentMenuData = []; // 當前類別的菜色
let fullMenuData = []; // AI 解析回來的完整菜單
let shoppingCart = [];
let selectedPhotoData = null; // 用戶選中或上傳的圖片 Base64

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

// 實際運作時使用的關鍵字字典
let activeKeywordDict = { ...defaultKeywordDict };

// ================== 0. 教學內容資料庫 ==================
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
                desc: "左側選單(☰) 前往「API 和服務」>「啟用 API 和服務」，搜尋並啟用以下 4 個服務：" + commonApiList,
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
                desc: "左側選單(☰) 前往「API 和服務」>「啟用 API 和服務」。搜尋並啟用以下服務：" + commonApiList,
                img: './images/android_4.jpg'
            },
            {
                title: "5. 複製金鑰",
                desc: "選單(☰) > APIs & Services > Credentials > Create Credentials > API Key。複製顯示的亂碼字串貼到下方輸入框。",
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
                desc: "左側選單(☰) 前往「API 和服務」>「啟用 API 和服務」。搜尋並啟用：" + commonApiList,
                img: './images/ios_4.jpg'
            },
            {
                title: "5. 取得 Key",
                desc: "選單 > APIs & Services > Credentials > Create Credentials > API Key。複製顯示的亂碼字串貼到下方輸入框。",
                img: './images/ios_5.jpg'
            }
        ]
    }
};


function showGuide(platform) {
    const data = guideData[platform];
    const container = document.getElementById('guide-content');
    
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const btns = document.querySelectorAll('.tab-btn');
    if(platform === 'desktop') btns[0].classList.add('active');
    if(platform === 'android') btns[1].classList.add('active');
    if(platform === 'ios') btns[2].classList.add('active');

    let html = `<h3>${data.title}</h3>`;
    data.steps.forEach(step => {
        let imgHtml = '';
        if (step.img) {
            imgHtml = `<div class="step-image-container"><img src="${step.img}" alt="${step.title}"></div>`;
        } else {
            imgHtml = `<div class="step-image-container"><div class="img-placeholder">（此處可插入 ${platform} 操作截圖：${step.title}）</div></div>`;
        }

        html += `
            <div class="step-card">
                <div class="step-header">
                    <div class="step-title">${step.title}</div>
                </div>
                ${imgHtml}
                <div class="step-content">
                    <p>${step.desc}</p>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// ================== 1. 系統初始化與 Key 管理 ==================

window.onload = () => {
    // 1. 初始化店家轉盤
    canvas = document.getElementById('wheel');
    if(canvas) ctx = canvas.getContext('2d');

    // 2. 初始化菜單轉盤
    menuCanvas = document.getElementById('menuWheel');
    if(menuCanvas) menuCtx = menuCanvas.getContext('2d');

    // 載入評價紀錄
    const savedRatings = localStorage.getItem('food_wheel_user_ratings');
    if (savedRatings) {
        try { userRatings = JSON.parse(savedRatings); } catch(e) { console.error(e); }
    }

    // 載入關鍵字設定
    loadUserKeywords();

    // 載入 API Keys
    const savedKey = localStorage.getItem('food_wheel_api_key');
    if (savedKey) {
        loadGoogleMapsScript(savedKey);
    } else {
        // 顯示設定畫面
        document.getElementById('setup-screen').style.display = 'block';
        document.getElementById('app-screen').style.display = 'none';
        
        populateSetupKeywords(); 
        populateSetupGeneralPrefs();
        
        // 填入儲存的 Gemini Key (如果有)
        const geminiKey = localStorage.getItem('food_wheel_gemini_key');
        if(geminiKey) document.getElementById('userGeminiKey').value = geminiKey;

        showGuide('desktop');
    }

    // 綁定過濾器
    const filterCheckbox = document.getElementById('filterDislike');
    if (filterCheckbox) {
        filterCheckbox.addEventListener('change', () => { refreshWheelData(); });
    }
};

// ================== 設定頁面資料處理 ==================

function loadUserKeywords() {
    const savedKw = localStorage.getItem('food_wheel_custom_keywords');
    if (savedKw) {
        try { activeKeywordDict = { ...defaultKeywordDict, ...JSON.parse(savedKw) }; } 
        catch (e) { activeKeywordDict = { ...defaultKeywordDict }; }
    }
}

function populateSetupKeywords() {
    const mapping = {'kw_breakfast':'breakfast','kw_lunch':'lunch','kw_afternoon_tea':'afternoon_tea','kw_dinner':'dinner','kw_late_night':'late_night','kw_noodles_rice':'noodles_rice','kw_western_steak':'western_steak','kw_dessert':'dessert','kw_all':'all'};
    for (const [id, key] of Object.entries(mapping)) {
        const input = document.getElementById(id);
        if (input) input.value = activeKeywordDict[key];
    }
}

function populateSetupGeneralPrefs() {
    const prefsJson = localStorage.getItem('food_wheel_prefs');
    if (prefsJson) {
        try {
            const prefs = JSON.parse(prefsJson);
            const setVal = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
            setVal('setupSearchMode', prefs.searchMode);
            setVal('setupMinRating', prefs.minRating);
            setVal('setupSpinMode', prefs.spinMode);
            setVal('setupTransport', prefs.transport);
            setVal('setupMaxTime', prefs.maxTime);
            setVal('setupPriceLevel', prefs.priceLevel);
            setVal('setupResultCount', prefs.resultCount);
        } catch (e) {}
    }
}

function saveAndStart() {
    const inputKey = document.getElementById('userApiKey').value.trim();
    const geminiKey = document.getElementById('userGeminiKey').value.trim(); 
    
    if (inputKey.length < 20) return alert("Google Maps API Key 格式不正確");
    
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
    const mapping = {'kw_breakfast':'breakfast','kw_lunch':'lunch','kw_afternoon_tea':'afternoon_tea','kw_dinner':'dinner','kw_late_night':'late_night','kw_noodles_rice':'noodles_rice','kw_western_steak':'western_steak','kw_dessert':'dessert','kw_all':'all'};
    for (const [id, key] of Object.entries(mapping)) {
        const input = document.getElementById(id);
        customKw[key] = (input && input.value.trim() !== "") ? input.value.trim() : defaultKeywordDict[key];
    }
    
    activeKeywordDict = customKw;
    localStorage.setItem('food_wheel_custom_keywords', JSON.stringify(customKw));
    localStorage.setItem('food_wheel_api_key', inputKey);
    if(geminiKey) localStorage.setItem('food_wheel_gemini_key', geminiKey); 
    localStorage.setItem('food_wheel_prefs', JSON.stringify(userPrefs));
    
    loadGoogleMapsScript(inputKey);
}

function resetApiKey() {
    if(confirm("確定要重設所有 API Key 嗎？")) { 
        localStorage.removeItem('food_wheel_api_key'); 
        localStorage.removeItem('food_wheel_gemini_key');
        location.reload(); 
    }
}

function editPreferences() {
    document.getElementById('app-screen').style.display = 'none';
    document.getElementById('setup-screen').style.display = 'block';
    const savedKey = localStorage.getItem('food_wheel_api_key');
    if(savedKey) document.getElementById('userApiKey').value = savedKey;
    const savedGeminiKey = localStorage.getItem('food_wheel_gemini_key');
    if(savedGeminiKey) document.getElementById('userGeminiKey').value = savedGeminiKey;
    
    populateSetupKeywords(); populateSetupGeneralPrefs(); 
}

function loadGoogleMapsScript(apiKey) {
    if (typeof google !== 'undefined') { initApp(); return; } // 防止重複載入
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true; script.defer = true;
    script.onload = () => { 
        document.getElementById('setup-screen').style.display = 'none'; 
        document.getElementById('app-screen').style.display = 'block'; 
        initApp(); 
    };
    script.onerror = () => { alert("Google Maps API 載入失敗"); localStorage.removeItem('food_wheel_api_key'); location.reload(); };
    document.head.appendChild(script);
}

function initApp() { applyPreferencesToApp(); autoSelectMealType(); initLocation(); resetGame(true); }

function applyPreferencesToApp() {
    const prefsJson = localStorage.getItem('food_wheel_prefs');
    if (prefsJson) {
        try {
            const prefs = JSON.parse(prefsJson);
            const setVal = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
            setVal('searchMode', prefs.searchMode);
            setVal('minRating', prefs.minRating);
            setVal('transportMode', prefs.transport);
            setVal('maxTime', prefs.maxTime);
            setVal('priceLevel', prefs.priceLevel);
            setVal('resultCount', prefs.resultCount);
            setVal('spinMode', prefs.spinMode);
        } catch (e) {}
    }
}

// ================== 2. 核心搜尋與轉盤邏輯 ==================

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

// 雙模式搜尋策略 (Nearby vs Famous with Step-wise Scan)
function startSearch(location, keywordsRaw) {
    const service = new google.maps.places.PlacesService(document.createElement('div'));
    const priceLevel = parseInt(document.getElementById('priceLevel').value, 10);
    const transportMode = document.getElementById('transportMode').value;
    const maxTime = parseInt(document.getElementById('maxTime').value, 10);
    const searchMode = document.getElementById('searchMode').value;
    
    // 1. 關鍵字策略：拆分 + 原句
    const splitKeywords = keywordsRaw.split(/\s+/).filter(k => k.length > 0);
    let searchQueries = [...splitKeywords];
    if (splitKeywords.length > 1) {
        searchQueries.push(keywordsRaw);
    }

    // 2. 速度與距離計算
    let speedMetersPerMin = 0;
    if (transportMode === 'DRIVING') {
        speedMetersPerMin = 1000; // 60 km/h
    } else {
        speedMetersPerMin = 333.33; // 20 km/h
    }

    const maxTheoreticalRadius = speedMetersPerMin * maxTime;
    // 幾何過濾半徑 = 速度 x 時間 x 1.5
    const maxLinearDist = maxTheoreticalRadius * 1.5;

    const btn = document.querySelector('.search-btn');
    let statusText = "";
    let promises = [];

    if (searchMode === 'nearby') {
        // Mode A: 距離優先
        statusText = `📍 距離優先搜尋 (抓取最近 60 筆)...`;
        searchQueries.forEach(keyword => {
            let request = {
                location: location,
                rankBy: google.maps.places.RankBy.DISTANCE,
                keyword: keyword
            };
            if (priceLevel !== -1) request.maxPrice = priceLevel;
            promises.push(fetchPlacesWithPagination(service, request, 3));
        });

    } else {
        // Mode B: 熱門優先 (分段掃描)
        let steps = [];
        for (let t = 5; t <= maxTime; t += 5) steps.push(t);
        if (maxTime % 5 !== 0) steps.push(maxTime);
        steps = [...new Set(steps)].sort((a,b)=>a-b);

        statusText = `🌟 熱門優先：分段掃描 (${steps.join(',')}分) x 關鍵字...`;

        searchQueries.forEach(keyword => {
            steps.forEach(stepTime => {
                let stepRadius = stepTime * speedMetersPerMin;
                if (stepRadius < 500) stepRadius = 500; 

                let request = {
                    location: location,
                    radius: stepRadius,
                    rankBy: google.maps.places.RankBy.PROMINENCE,
                    keyword: keyword
                };
                if (priceLevel !== -1) request.maxPrice = priceLevel;
                promises.push(fetchPlacesWithPagination(service, request, 3));
            });
        });
    }

    btn.innerText = statusText;

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

function fetchPlacesWithPagination(service, request, maxPages = 3) {
    return new Promise((resolve) => {
        let allResults = [];
        let pageCount = 0;
        
        service.nearbySearch(request, (results, status, pagination) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                allResults = allResults.concat(results);
                pageCount++;
                if (pagination && pagination.hasNextPage && pageCount < maxPages && allResults.length < (maxPages * 20)) {
                    setTimeout(() => { pagination.nextPage(); }, 2000);
                } else {
                    resolve(allResults);
                }
            } else {
                resolve(allResults);
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

    const uniqueIds = new Set();
    let filtered = [];
    
    results.forEach(p => {
        if (p.rating && p.rating >= minRating && p.user_ratings_total > 0) {
            if (!uniqueIds.has(p.place_id)) {
                uniqueIds.add(p.place_id);
                // 幾何過濾
                const loc = p.geometry.location;
                const distanceMeters = google.maps.geometry.spherical.computeDistanceBetween(origin, loc);
                if (distanceMeters <= maxLinearDist) {
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

    // 排序與保障名額
    const safeZoneDist = maxLinearDist / 3; 

    if (searchMode === 'nearby') {
        filtered.sort((a, b) => a.geometryDistance - b.geometryDistance);
    } else {
        filtered.sort((a, b) => {
            const getScore = (place) => {
                let score = place.rating * Math.log10(place.user_ratings_total + 1);
                // 近距離保障加權
                if (place.geometryDistance <= safeZoneDist) score *= 3.0; 
                return score;
            };
            return getScore(b) - getScore(a);
        });
    }

    // 取前 80 間送 Distance Matrix
    if (filtered.length > 80) filtered = filtered.slice(0, 80);

    // 批量計算
    const batchSize = 25;
    const batches = [];
    for (let i = 0; i < filtered.length; i += batchSize) {
        batches.push(filtered.slice(i, i + batchSize));
    }

    Promise.all(batches.map(batch => getDistances(origin, batch, transportMode)))
        .then(resultsArray => {
            let validPlaces = [].concat(...resultsArray);
            
            // 時間過濾
            validPlaces = validPlaces.filter(p => p.realDurationMins <= maxTime);

            if (validPlaces.length === 0) {
                alert(`${maxTime} 分鐘內無符合店家 (實際路程超時)`);
                btn.innerText = "🔄 開始搜尋店家";
                btn.disabled = false;
                return;
            }

            // 最終排序
            if (searchMode === 'nearby') {
                validPlaces.sort((a, b) => a.realDurationMins - b.realDurationMins);
            } else {
                validPlaces.sort((a, b) => {
                    const scoreA = a.rating * Math.log10(a.user_ratings_total + 1);
                    const scoreB = b.rating * Math.log10(b.user_ratings_total + 1);
                    return scoreB - scoreA;
                });
            }

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
        
        // 讀取當前設定 (以畫面為主)
        let spinMode = 'repeat';
        const spinModeEl = document.getElementById('spinMode'); 
        if (spinModeEl) {
            spinMode = spinModeEl.value;
        }
        
        const spinBtn = document.getElementById('spinBtn');
        spinBtn.disabled = true; 
        setControlsDisabled(true); 

        const spinAngle = Math.floor(Math.random() * 1800) + 1800; 
        currentRotation += spinAngle;
        canvas.style.transition = 'transform 4s cubic-bezier(0.15, 0, 0.15, 1)';
        canvas.style.transform = `rotate(${currentRotation}deg)`;

        // 轉動時隱藏結果
        const btnLike = document.getElementById('btnLike');
        const btnDislike = document.getElementById('btnDislike');
        const ratingText = document.getElementById('userPersonalRating');
        if(btnLike) btnLike.style.display = 'none'; // Grid 項目隱藏
        if(btnDislike) btnDislike.style.display = 'none'; // Grid 項目隱藏
        if(ratingText) ratingText.innerText = "";
        
        // 隱藏連結按鈕
        ['navLink', 'webLink', 'menuPhotoLink', 'btnAiMenu'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.style.display = 'none';
        });

        setTimeout(() => {
            try {
                const numOptions = places.length;
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
    currentStoreForMenu = winner; // 儲存當前店家供 AI 使用

    const nameEl = document.getElementById('storeName');
    if(nameEl) nameEl.innerText = "就決定吃：" + winner.name;
    
    const ratingEl = document.getElementById('storeRating');
    if (ratingEl) {
        ratingEl.innerText = winner.rating ? `⭐ ${winner.rating} (${winner.user_ratings_total || 0} 則評價)` : "暫無評價資料";
    }
    
    const address = winner.formatted_address || winner.vicinity || "地址不詳";
    const storeAddressEl = document.getElementById('storeAddress');
    if(storeAddressEl) storeAddressEl.innerText = `⏳ 正在查詢詳細資訊...\n📍 ${address}`;

    // 按鈕控制
    const btnLike = document.getElementById('btnLike');
    const btnDislike = document.getElementById('btnDislike');
    const ratingText = document.getElementById('userPersonalRating');
    const navLink = document.getElementById('navLink');
    const webLink = document.getElementById('webLink');
    const menuPhotoLink = document.getElementById('menuPhotoLink');
    const btnAiMenu = document.getElementById('btnAiMenu');

    // 評價按鈕一律顯示 (grid 佈局)
    btnLike.style.display = 'block';
    btnDislike.style.display = 'block';

    // 連結按鈕先隱藏
    if(navLink) navLink.style.display = 'none';
    if(webLink) webLink.style.display = 'none';
    if(menuPhotoLink) menuPhotoLink.style.display = 'none';
    if(btnAiMenu) btnAiMenu.style.display = 'none';

    // 狀態重置
    if(btnLike) {
        btnLike.classList.remove('active');
        btnLike.onclick = () => handleUserRating(winner.place_id, 'like');
    }
    if(btnDislike) {
        btnDislike.classList.remove('active');
        btnDislike.onclick = () => handleUserRating(winner.place_id, 'dislike');
    }
    if(ratingText) ratingText.innerText = "";

    // 顯示個人評價
    if (userRatings[winner.place_id] === 'like') {
        if(btnLike) btnLike.classList.add('active');
        if(ratingText) ratingText.innerText = "👍 您曾標記：再次回訪";
    } else if (userRatings[winner.place_id] === 'dislike') {
        if(btnDislike) btnDislike.classList.add('active');
        if(ratingText) ratingText.innerText = "💣 您曾標記：踩雷";
    }

    // 查詢詳情
    const service = new google.maps.places.PlacesService(document.createElement('div'));
    service.getDetails({
        placeId: winner.place_id,
        fields: ['opening_hours', 'utc_offset_minutes', 'website', 'url', 'photos']
    }, (place, status) => {
        let openStatus = "⚪ 營業時間不明";
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            if (place.opening_hours) {
                openStatus = getDetailedOpeningStatus(place);
            }
            if(storeAddressEl) {
                storeAddressEl.innerHTML = `<strong>${openStatus}</strong><br><span style="font-size: 0.85em; color: #999;">(營業時間僅供參考)</span><br>📍 ${address}`;
            }

            // 設定連結按鈕
            if (navLink) {
                navLink.style.display = 'inline-block';
                navLink.href = place.url ? place.url : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(winner.name)}&query_place_id=${winner.place_id}`;
            }
            if (webLink && place.website) {
                webLink.style.display = 'inline-block';
                webLink.href = place.website;
            }
            if (menuPhotoLink) {
                menuPhotoLink.style.display = 'inline-block';
                // 技巧：直接搜圖
                menuPhotoLink.href = `https://www.google.com/search?q=${encodeURIComponent(winner.name + " 菜單")}&tbm=isch`; 
            }

            // 啟用 AI 菜單按鈕 (如果有 Gemini Key)
            const geminiKey = localStorage.getItem('food_wheel_gemini_key');
            if (geminiKey && btnAiMenu) {
                btnAiMenu.style.display = 'inline-block';
            }
            
            // 儲存照片列表
            if(place.photos) {
                currentStoreForMenu.photos = place.photos;
            }
        }
    });

    const distEl = document.getElementById('storeDistance');
    if (winner.realDurationText && distEl) {
         distEl.innerText = `⏱️ 預估耗時：${winner.realDurationText} (${winner.realDistanceText})`;
    }
}

// ================== 4. AI 菜單系統 (Gemini Integration) ==================

function openAiMenuSelector() {
    if (!currentStoreForMenu) return;
    document.getElementById('main-view').style.display = 'none';
    document.getElementById('menu-screen').style.display = 'block';
    document.getElementById('menuStoreTitle').innerText = `菜單：${currentStoreForMenu.name}`;
    
    // 重置介面狀態
    document.getElementById('ai-step-1').style.display = 'block';
    document.getElementById('ai-step-2').style.display = 'none';
    document.getElementById('ai-loading').style.display = 'none';
    document.getElementById('btnAnalyzeMenu').disabled = true;
    document.getElementById('btnAnalyzeMenu').style.opacity = '0.5';
    selectedPhotoData = null;

    // 載入 Google Maps 照片縮圖
    const grid = document.getElementById('maps-photo-grid');
    grid.innerHTML = '';
    
    if (currentStoreForMenu.photos && currentStoreForMenu.photos.length > 0) {
        currentStoreForMenu.photos.slice(0, 10).forEach((photo) => {
            const imgUrl = photo.getUrl({ maxWidth: 200, maxHeight: 200 });
            const div = document.createElement('div');
            div.className = 'photo-item';
            div.innerHTML = `<img src="${imgUrl}">`;
            div.onclick = () => alert("由於瀏覽器安全限制 (CORS)，無法直接分析 Google Maps 圖片。\n請使用上方的「上傳/拍攝」按鈕，上傳菜單截圖。");
            grid.appendChild(div);
        });
    } else {
        grid.innerHTML = '<p style="grid-column:1/-1; text-align:center;">此店家沒有提供 Google Maps 照片。</p>';
    }
}

function closeMenuSystem() {
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('main-view').style.display = 'block';
}

// 處理用戶上傳圖片 (File API)
function handleFileUpload(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            selectedPhotoData = e.target.result; // Base64 string
            // 更新 UI 顯示已選取
            const grid = document.getElementById('maps-photo-grid');
            grid.innerHTML = `<div class="photo-item selected" style="grid-column:1/-1; width:200px; margin:0 auto;"><img src="${selectedPhotoData}"></div>`;
            
            const btn = document.getElementById('btnAnalyzeMenu');
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.innerText = "🤖 圖片已就緒，開始 AI 解析";
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// 呼叫 Gemini API
async function analyzeSelectedPhotos() {
    if (!selectedPhotoData) return;
    
    const geminiKey = localStorage.getItem('food_wheel_gemini_key');
    if (!geminiKey) return alert("請先在設定頁面輸入 Google Gemini API Key");

    // 顯示 Loading
    document.getElementById('ai-loading').style.display = 'block';

    try {
        const base64Data = selectedPhotoData.split(',')[1];
        const mimeType = selectedPhotoData.split(';')[0].split(':')[1];

        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
        
        const requestBody = {
            contents: [{
                parts: [
                    { text: "你是一個菜單讀取機器人。請分析這張圖片，找出所有的菜色名稱與價格。請**嚴格**只回傳一個 JSON 陣列，格式為：[{\"category\": \"類別名稱\", \"name\": \"菜名\", \"price\": 數字價格}], 若無類別則歸類為'主餐'。不要包含 Markdown 標記 (如 ```json) 或任何其他文字。" },
                    {
                        inlineData: {
                            mimeType: mimeType,
                            data: base64Data
                        }
                    }
                ]
            }]
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        
        if (data.candidates && data.candidates[0].content) {
            let text = data.candidates[0].content.parts[0].text;
            // 清理可能存在的 Markdown code block
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            
            let menuJson;
            try {
                menuJson = JSON.parse(text);
            } catch (jsonErr) {
                throw new Error("AI 回傳格式非有效 JSON");
            }

            if (Array.isArray(menuJson) && menuJson.length > 0) {
                initAiMenuSystem(menuJson);
            } else {
                alert("AI 無法在圖片中找到可辨識的菜單資料。");
                document.getElementById('ai-loading').style.display = 'none';
            }
        } else {
            throw new Error("AI 回應格式錯誤或被阻擋");
        }

    } catch (e) {
        console.error(e);
        alert("AI 解析失敗，請檢查 API Key 是否正確，或圖片是否清晰。\n(錯誤: " + e.message + ")");
        document.getElementById('ai-loading').style.display = 'none';
    }
}

// 初始化菜單轉盤 (使用 AI 資料)
function initAiMenuSystem(menuData) {
    fullMenuData = menuData;
    shoppingCart = [];
    
    // 整理類別
    const categories = [...new Set(menuData.map(item => item.category || '主餐'))];
    const catSelect = document.getElementById('menuCategorySelect');
    catSelect.innerHTML = "";
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.innerText = cat;
        catSelect.appendChild(opt);
    });

    // 切換到步驟 2
    document.getElementById('ai-loading').style.display = 'none';
    document.getElementById('ai-step-1').style.display = 'none';
    document.getElementById('ai-step-2').style.display = 'block';
    
    updateCartUI();
    updateMenuWheel();
}

function updateMenuWheel() {
    const cat = document.getElementById('menuCategorySelect').value;
    currentMenuData = fullMenuData.filter(item => (item.category || '主餐') === cat);
    drawMenuWheel();
}

function drawMenuWheel() {
    const numOptions = currentMenuData.length;
    if(menuCtx) menuCtx.clearRect(0, 0, 400, 400);
    if (numOptions === 0) return;
    
    const arcSize = (2 * Math.PI) / numOptions;
    const startAngleOffset = -Math.PI / 2;

    currentMenuData.forEach((item, i) => {
        const angle = startAngleOffset + (i * arcSize);
        if(menuCtx) {
            menuCtx.fillStyle = `hsl(${i * (360 / numOptions)}, 60%, 85%)`; // 顏色淡一點
            menuCtx.beginPath();
            menuCtx.moveTo(200, 200);
            menuCtx.arc(200, 200, 200, angle, angle + arcSize);
            menuCtx.fill();
            menuCtx.stroke();

            menuCtx.save();
            menuCtx.translate(200, 200);
            menuCtx.rotate(angle + arcSize / 2);
            let fontSize = 14; if (numOptions > 10) fontSize = 12;
            menuCtx.fillStyle = "#333";
            menuCtx.font = `bold ${fontSize}px Arial`;
            let text = item.name; if (text.length > 6) text = text.substring(0, 5) + "..";
            menuCtx.fillText(text, 60, 5);
            menuCtx.restore();
        }
    });
    
    menuRotation = 0;
    menuCanvas.style.transform = `rotate(0deg)`;
    menuCanvas.style.transition = 'none';
    
    document.getElementById('dishName').innerText = "準備選菜...";
    document.getElementById('dishPrice').innerText = "";
    document.getElementById('addToOrderBtn').style.display = 'none';
}

document.getElementById('spinMenuBtn').onclick = () => {
    if (currentMenuData.length === 0) return;
    const spinBtn = document.getElementById('spinMenuBtn');
    spinBtn.disabled = true;
    document.getElementById('addToOrderBtn').style.display = 'none';

    const spinAngle = Math.floor(Math.random() * 1800) + 1800; 
    menuRotation += spinAngle;
    menuCanvas.style.transition = 'transform 3s cubic-bezier(0.15, 0, 0.15, 1)';
    menuCanvas.style.transform = `rotate(${menuRotation}deg)`;

    setTimeout(() => {
        const numOptions = currentMenuData.length;
        const arcSize = 360 / numOptions;
        const actualRotation = menuRotation % 360;
        let winningIndex = Math.floor((360 - actualRotation) / arcSize) % numOptions;
        if (winningIndex < 0) winningIndex += numOptions;
        
        const winner = currentMenuData[winningIndex];
        document.getElementById('dishName').innerText = winner.name;
        document.getElementById('dishPrice').innerText = `$${winner.price}`;
        
        const addBtn = document.getElementById('addToOrderBtn');
        addBtn.style.display = 'inline-block';
        addBtn.onclick = () => addDishToCart(winner);
        
        spinBtn.disabled = false;
    }, 3000);
};

function addDishToCart(dish) {
    if(!dish) dish = currentMenuData[0]; 
    shoppingCart.push(dish);
    updateCartUI();
    document.getElementById('addToOrderBtn').style.display = 'none';
}

function updateCartUI() {
    const list = document.getElementById('cartList');
    list.innerHTML = "";
    let total = 0;
    shoppingCart.forEach((item, index) => {
        total += item.price;
        const li = document.createElement('li');
        li.innerHTML = `<span>${item.name}</span> <span>$${item.price} <button onclick="removeCartItem(${index})" style="background:none;border:none;cursor:pointer;color:#c0392b;">❌</button></span>`;
        list.appendChild(li);
    });
    document.getElementById('cartTotalDisplay').innerText = `$${total}`;
}

function removeCartItem(index) {
    shoppingCart.splice(index, 1);
    updateCartUI();
}

function checkout() {
    if (shoppingCart.length === 0) return alert("購物車是空的！");
    let total = 0;
    let msg = `🧾 【${currentStoreForMenu.name}】 點餐明細\n------------------\n`;
    shoppingCart.forEach(item => {
        msg += `${item.name} ... $${item.price}\n`;
        total += item.price;
    });
    msg += `------------------\n總計：$${total}`;
    alert(msg);
}

// 綁定全域函式
function getDetailedOpeningStatus(place) { /* 維持原樣 */ 
    const isOpen = place.opening_hours.isOpen();
    return isOpen ? "🟢 營業中" : "🔴 已打烊"; 
}
function updateHitCountUI(placeId) { /* 維持原樣 */ 
    if (!hitCounts[placeId]) hitCounts[placeId] = 0; hitCounts[placeId]++;
    const row = document.getElementById(`row-${placeId}`);
    if (row) { 
        row.querySelector('.hit-count').innerText = hitCounts[placeId]; 
        row.classList.add('active-winner'); setTimeout(() => row.classList.remove('active-winner'), 2000); 
    }
}

window.handleUserRating = handleUserRating;
window.editPreferences = editPreferences;
window.resetApiKey = resetApiKey;
window.handleSearch = handleSearch;
window.initLocation = initLocation;
window.showGuide = showGuide;
window.saveAndStart = saveAndStart;
window.updateKeywords = updateKeywords;
// 新增綁定
window.openAiMenuSelector = openAiMenuSelector;
window.closeMenuSystem = closeMenuSystem;
window.handleFileUpload = handleFileUpload;
window.analyzeSelectedPhotos = analyzeSelectedPhotos;
window.updateMenuWheel = updateMenuWheel;
window.addDishToCart = addDishToCart;
window.checkout = checkout;
window.removeCartItem = removeCartItem;
