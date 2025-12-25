// 全域變數
let places = []; // 輪盤上目前可用的店家 (會隨淘汰減少)
let allSearchResults = []; // 搜尋到的所有原始店家 (列表用，永遠保留)
let hitCounts = {}; // 記錄每個 place_id 被轉到的次數
let userRatings = {}; // 使用者個人評價 (from LocalStorage)
let eliminatedIds = new Set(); // 記錄被淘汰的店家 ID
let currentRotation = 0;
let userCoordinates = null; 
const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');

// 定義預設關鍵字字典
const keywordDict = {
    breakfast: "早餐 早午餐",
    lunch: "餐廳 小吃 午餐",
    afternoon_tea: "飲料 甜點 咖啡",
    dinner: "餐廳 晚餐 小吃 火鍋",
    late_night: "宵夜 鹽酥雞 清粥 滷味 炸物",
    noodles_rice: "麵 飯 水餃 壽司 快炒 合菜", 
    western_steak: "牛排 義大利麵 漢堡 披薩",
    dessert: "冰品 豆花 甜點 蛋糕",
    all: "美食 餐廳 小吃" 
};

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
            { title: "1. 登入 Google Cloud", desc: "使用 Chrome 瀏覽器前往 Google Cloud Console 並登入。", img: './images/desktop_1.jpg' },
            { title: "2. 建立新專案", desc: "點擊左上角專案選單，建立新專案。", img: './images/desktop_2.jpg' },
            { title: "3. 綁定結算帳戶", desc: "前往「帳單 (Billing)」綁定信用卡 (享每月 $200 免費額度)。", img: './images/desktop_3.jpg' },
            { title: "4. 啟用 4 項 API", desc: "前往「API 和服務」啟用：" + commonApiList, img: './images/desktop_4.jpg' },
            { title: "5. 取得 API Key", desc: "前往「憑證 (Credentials)」建立 API Key 並複製。", img: './images/desktop_5.jpg' }
        ]
    },
    android: {
        title: "🤖 Android 手機申請步驟",
        steps: [
            { title: "1. 開啟電腦版網頁", desc: "Chrome 右上角選單 > 勾選「電腦版網站」。", img: './images/android_1.jpg' },
            { title: "2. 建立新專案", desc: "建立一個新專案。", img: './images/android_2.jpg' },
            { title: "3. 綁定帳單", desc: "選單 > Billing > 綁定信用卡。", img: './images/android_3.jpg' },
            { title: "4. 啟用 API", desc: "搜尋並啟用必要 API。", img: './images/android_4.jpg' },
            { title: "5. 複製金鑰", desc: "建立 Credentials > API Key。", img: './images/android_5.jpg' }
        ]
    },
    ios: {
        title: "🍎 iOS (iPhone) 申請步驟",
        steps: [
            { title: "1. 切換電腦版網站", desc: "Safari 網址列左側「大小 (Aa)」>「切換為電腦版網站」。", img: './images/ios_1.jpg' },
            { title: "2. 建立專案", desc: "建立新專案。", img: './images/ios_2.jpg' },
            { title: "3. 設定 Billing", desc: "綁定信用卡。", img: './images/ios_3.jpg' },
            { title: "4. 啟用 API", desc: "啟用必要 API。", img: './images/ios_4.jpg' },
            { title: "5. 取得 Key", desc: "建立並複製 API Key。", img: './images/ios_5.jpg' }
        ]
    }
};

function showGuide(platform) {
    const data = guideData[platform];
    const container = document.getElementById('guide-content');
    if(!container) return;
    
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const btns = document.querySelectorAll('.tab-btn');
    if(platform === 'desktop' && btns[0]) btns[0].classList.add('active');
    if(platform === 'android' && btns[1]) btns[1].classList.add('active');
    if(platform === 'ios' && btns[2]) btns[2].classList.add('active');

    let html = `<h3>${data.title}</h3>`;
    data.steps.forEach(step => {
        let imgHtml = step.img ? `<div class="step-image-container"><img src="${step.img}" alt="${step.title}"></div>` : '';
        html += `<div class="step-card"><div class="step-header"><div class="step-title">${step.title}</div></div>${imgHtml}<div class="step-content"><p>${step.desc}</p></div></div>`;
    });
    container.innerHTML = html;
}

// ================== 1. 初始化與事件綁定 ==================

window.onload = () => {
    // 1. 載入評價
    const savedRatings = localStorage.getItem('food_wheel_user_ratings');
    if (savedRatings) {
        try { userRatings = JSON.parse(savedRatings); } catch(e) { console.error(e); }
    }

    // 2. 載入 API Key
    const savedKey = localStorage.getItem('food_wheel_api_key');
    if (savedKey) {
        loadGoogleMapsScript(savedKey);
    } else {
        const setupScreen = document.getElementById('setup-screen');
        const appScreen = document.getElementById('app-screen');
        if(setupScreen) setupScreen.style.display = 'block';
        if(appScreen) appScreen.style.display = 'none';
        showGuide('desktop');
    }

    // 3. 綁定過濾器事件
    const filterCheckbox = document.getElementById('filterDislike');
    if (filterCheckbox) {
        filterCheckbox.addEventListener('change', () => {
            refreshWheelData(); 
        });
    }
};

function saveAndStart() {
    const inputKey = document.getElementById('userApiKey').value.trim();
    if (inputKey.length < 20) return alert("API Key 格式不正確");
    
    const userPrefs = {
        minRating: document.getElementById('setupMinRating').value,
        transport: document.getElementById('setupTransport').value,
        maxTime: document.getElementById('setupMaxTime').value,
        priceLevel: document.getElementById('setupPriceLevel').value,
        resultCount: document.getElementById('setupResultCount').value,
        spinMode: document.getElementById('setupSpinMode').value 
    };
    
    localStorage.setItem('food_wheel_api_key', inputKey);
    localStorage.setItem('food_wheel_prefs', JSON.stringify(userPrefs));
    loadGoogleMapsScript(inputKey);
}

function resetApiKey() {
    if(confirm("確定要重設 API Key 嗎？\n(您的偏好設定與評價紀錄將會保留)")) {
        localStorage.removeItem('food_wheel_api_key');
        location.reload(); 
    }
}

function editPreferences() {
    document.getElementById('app-screen').style.display = 'none';
    document.getElementById('setup-screen').style.display = 'block';
    const savedKey = localStorage.getItem('food_wheel_api_key');
    if(savedKey) document.getElementById('userApiKey').value = savedKey;
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
    applyPreferences();
    autoSelectMealType();
    initLocation();
    resetGame(true); // 初始化遊戲狀態
}

function applyPreferences() {
    const prefsJson = localStorage.getItem('food_wheel_prefs');
    if (prefsJson) {
        try {
            const prefs = JSON.parse(prefsJson);
            if(prefs.minRating) document.getElementById('minRating').value = prefs.minRating;
            if(prefs.transport) document.getElementById('transportMode').value = prefs.transport;
            if(prefs.maxTime) document.getElementById('maxTime').value = prefs.maxTime;
            if(prefs.priceLevel) document.getElementById('priceLevel').value = prefs.priceLevel;
            if(prefs.resultCount) document.getElementById('resultCount').value = prefs.resultCount;
            if(prefs.spinMode) document.getElementById('spinMode').value = prefs.spinMode; 
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
    if (keywordDict[type]) {
        input.value = keywordDict[type];
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

    // 搜尋開始時，重置遊戲狀態
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

function startSearch(location, keywordsRaw) {
    const service = new google.maps.places.PlacesService(document.createElement('div'));
    const priceLevel = parseInt(document.getElementById('priceLevel').value, 10);
    const keywordList = keywordsRaw.split(/\s+/).filter(k => k.length > 0);
    const btn = document.querySelector('.search-btn');
    btn.innerText = `搜尋 ${keywordList.length} 組關鍵字中...`;

    const searchPromises = keywordList.map(keyword => {
        return new Promise((resolve) => {
            const request = {
                location: location,
                rankBy: google.maps.places.RankBy.DISTANCE, 
                keyword: keyword
            };
            if (priceLevel !== -1) request.maxPrice = priceLevel;
            
            service.nearbySearch(request, (results, status) => {
                resolve((status === google.maps.places.PlacesServiceStatus.OK && results) ? results : []);
            });
        });
    });

    Promise.all(searchPromises).then(resultsArray => {
        let combinedResults = [].concat(...resultsArray);
        if (combinedResults.length === 0) {
            alert("附近找不到符合條件的店家");
            btn.innerText = "🔄 開始搜尋店家";
            btn.disabled = false;
            return;
        }
        processResults(location, combinedResults);
    }).catch(err => {
        console.error(err);
        alert("搜尋錯誤");
        btn.innerText = "🔄 開始搜尋店家";
        btn.disabled = false;
    });
}

function processResults(origin, results) {
    const btn = document.querySelector('.search-btn');
    const userMaxCount = parseInt(document.getElementById('resultCount').value, 10);
    const transportMode = document.getElementById('transportMode').value;
    const minRating = parseFloat(document.getElementById('minRating').value);
    const maxTime = parseInt(document.getElementById('maxTime').value, 10);

    const uniqueIds = new Set();
    let filtered = [];
    
    results.forEach(p => {
        if (p.rating && p.rating >= minRating && p.user_ratings_total > 0) {
            if (!uniqueIds.has(p.place_id)) {
                uniqueIds.add(p.place_id);
                filtered.push(p);
            }
        }
    });

    if (filtered.length === 0) {
        alert(`無符合 ${minRating} 星以上的店家`);
        btn.innerText = "🔄 開始搜尋店家";
        btn.disabled = false;
        return;
    }

    btn.innerText = `計算路程 (共 ${filtered.length} 間)...`;

    const batchSize = 25;
    const batches = [];
    for (let i = 0; i < filtered.length; i += batchSize) {
        batches.push(filtered.slice(i, i + batchSize));
    }

    Promise.all(batches.map(batch => getDistances(origin, batch, transportMode)))
        .then(resultsArray => {
            let validPlaces = [].concat(...resultsArray);
            validPlaces = validPlaces.filter(p => p.realDurationMins <= maxTime);

            if (validPlaces.length === 0) {
                alert(`${maxTime} 分鐘內無符合店家`);
                btn.innerText = "🔄 開始搜尋店家";
                btn.disabled = false;
                return;
            }

            validPlaces.sort((a, b) => b.rating - a.rating);

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

// 【核心修正】刷新輪盤資料 (確保按鈕狀態正確更新)
function refreshWheelData() {
    const filterDislikeEl = document.getElementById('filterDislike');
    const filterDislike = filterDislikeEl ? filterDislikeEl.checked : false;
    
    // 重新過濾名單
    places = allSearchResults.filter(p => {
        if (eliminatedIds.has(p.place_id)) return false;
        if (filterDislike && userRatings[p.place_id] === 'dislike') return false;
        return true;
    });

    // 更新搜尋按鈕文字 (保持即時性)
    const searchBtn = document.querySelector('.search-btn');
    if(searchBtn && !searchBtn.disabled && searchBtn.innerText.includes("搜尋完成")) {
        searchBtn.innerText = `搜尋完成 (共 ${places.length} 間)`;
    }

    initResultList(allSearchResults);
    drawWheel();
    enableSpinButton(places.length); // 根據新的數量決定按鈕狀態
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

// 重置遊戲狀態
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
        ctx.clearRect(0, 0, 400, 400);
        enableSpinButton(0);
    }
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
    ctx.clearRect(0, 0, 400, 400);
    if (numOptions === 0) return;
    
    const arcSize = (2 * Math.PI) / numOptions;
    const startAngleOffset = -Math.PI / 2;

    places.forEach((place, i) => {
        const angle = startAngleOffset + (i * arcSize);
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
    });
}

// 【核心修正】按鈕點擊事件，增加 DOM 檢查與 Try-Catch 防呆
document.getElementById('spinBtn').onclick = () => {
    if (places.length === 0) return;
    
    const spinBtn = document.getElementById('spinBtn');
    spinBtn.disabled = true; // 旋轉期間鎖定

    const spinAngle = Math.floor(Math.random() * 1800) + 1800; 
    currentRotation += spinAngle;
    canvas.style.transition = 'transform 4s cubic-bezier(0.15, 0, 0.15, 1)';
    canvas.style.transform = `rotate(${currentRotation}deg)`;

    // 安全隱藏操作區
    const idsToHide = ['btnLike', 'btnDislike'];
    idsToHide.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.display = 'none';
    });
    
    const userRateEl = document.getElementById('userPersonalRating');
    if(userRateEl) userRateEl.innerText = "";

    setTimeout(() => {
        try {
            const numOptions = places.length;
            if (numOptions === 0) throw new Error("No places left");

            const arcSize = 360 / numOptions;
            const actualRotation = currentRotation % 360;
            const winningIndex = Math.floor((360 - actualRotation) / arcSize) % numOptions;
            const winner = places[winningIndex];

            if(!winner) throw new Error("Winner undefined");

            updateWinnerStatus(winner);
            updateHitCountUI(winner.place_id);

            const spinMode = document.getElementById('spinMode').value;
            
            if (spinMode === 'eliminate') {
                eliminatedIds.add(winner.place_id); 
                // 延遲刷新輪盤
                setTimeout(() => {
                    canvas.style.transition = 'none';
                    currentRotation = 0;
                    canvas.style.transform = `rotate(0deg)`;
                    refreshWheelData(); // 此處會自動判斷是否解鎖按鈕
                }, 2000); 
            } else {
                // 重複模式：立即解鎖按鈕，不重繪輪盤
                spinBtn.disabled = false;
                // 強制更新一次列表狀態(避免過濾器狀態不同步)
                // refreshWheelData(); // 可加可不加，為了效能此處不重繪 Canvas，只解鎖
            }
        } catch (error) {
            console.error("Spin Error:", error);
            alert("發生錯誤，按鈕已重置");
            spinBtn.disabled = false;
        }
    }, 4000);
};

function handleUserRating(placeId, type) {
    if (userRatings[placeId] === type) delete userRatings[placeId];
    else userRatings[placeId] = type;
    
    localStorage.setItem('food_wheel_user_ratings', JSON.stringify(userRatings));
    
    // 更新按鈕 UI
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
    
    // 評價改變可能影響過濾，因此必須刷新輪盤
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

// 綁定全域函式
window.handleUserRating = handleUserRating;
window.editPreferences = editPreferences;
window.resetApiKey = resetApiKey;
window.handleSearch = handleSearch;
window.initLocation = initLocation;
window.showGuide = showGuide;
window.saveAndStart = saveAndStart;
window.clearKey = clearKey;
window.updateKeywords = updateKeywords;
