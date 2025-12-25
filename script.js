// 全域變數
let places = []; // 輪盤上目前可用的店家 (會隨淘汰減少)
let allSearchResults = []; // 搜尋到的所有原始店家 (列表用，永遠保留)
let hitCounts = {}; // 記錄每個 place_id 被轉到的次數
let currentRotation = 0;
let userCoordinates = null; 
const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');

// 定義預設關鍵字字典
const keywordDict = {
    breakfast: "早餐 早午餐",
    lunch: "餐廳 小吃 午餐 異國料理",
    afternoon_tea: "飲料 甜點 咖啡",
    dinner: "餐廳 晚餐 小吃 火鍋",
    late_night: "宵夜 鹽酥雞 清粥 滷味 炸物",
    noodles_rice: "麵 飯 水餃 壽司 快炒 合菜", 
    western_steak: "牛排 義大利麵 漢堡 披薩",
    dessert: "冰品 豆花 甜點 蛋糕",
    all: "美食 餐廳 小吃 料理" 
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
    const savedKey = localStorage.getItem('food_wheel_api_key');
    if (savedKey) {
        loadGoogleMapsScript(savedKey);
    } else {
        document.getElementById('setup-screen').style.display = 'block';
        document.getElementById('app-screen').style.display = 'none';
        showGuide('desktop');
    }
    autoSelectMealType();
};

function saveAndStart() {
    const inputKey = document.getElementById('userApiKey').value.trim();
    if (inputKey.length < 20) {
        alert("API Key 格式看起來不正確，請確認。");
        return;
    }
    
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

function clearKey() {
    if(confirm("確定要清除 API Key 和設定，回到設定頁嗎？")) {
        localStorage.removeItem('food_wheel_api_key');
        localStorage.removeItem('food_wheel_prefs'); 
        location.reload(); 
    }
}

function loadGoogleMapsScript(apiKey) {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
        document.getElementById('setup-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'block';
        applyPreferences(); 
        initLocation(); 
    };
    
    script.onerror = () => {
        alert("Google Maps API 載入失敗！\n可能是 Key 無效或網路問題，請檢查後重試。");
        localStorage.removeItem('food_wheel_api_key'); 
        location.reload();
    };

    document.head.appendChild(script);
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
        } catch (e) {
            console.error("讀取偏好設定失敗", e);
        }
    }
}

window.gm_authFailure = function() {
    alert("Google Maps API 驗證失敗！\n請檢查：\n1. 是否已啟用 Places, Maps JS, Geocoding, Distance Matrix API\n2. 是否已綁定信用卡(結算帳戶)\n3. 網址限制是否正確");
    clearKey();
};


// ================== 2. 主程式邏輯 ==================

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
    
    addrInput.value = "定位中...";
    if(detailDisplay) {
        detailDisplay.style.display = 'none';
        detailDisplay.innerText = '';
    }

    if (!navigator.geolocation) {
        alert("瀏覽器不支援定位");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            userCoordinates = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: userCoordinates }, (results, status) => {
                if (status === "OK" && results[0]) {
                    let formatted = results[0].formatted_address;
                    formatted = formatted.replace(/^\d+\s*/, '').replace(/^台灣/, ''); 
                    addrInput.value = formatted;
                } else {
                    addrInput.value = `${userCoordinates.lat.toFixed(5)}, ${userCoordinates.lng.toFixed(5)}`;
                }
            });
        },
        (error) => {
            console.error(error);
            addrInput.value = "";
            addrInput.placeholder = "無法取得定位，請手動輸入地址";
        },
        { enableHighAccuracy: true }
    );
}

function handleSearch() {
    const addrInput = document.getElementById('currentAddress').value;
    const keywordsRaw = document.getElementById('keywordInput').value;
    const detailDisplay = document.getElementById('detailedAddressDisplay');

    if (!addrInput) return alert("請輸入地址或按下「重抓定位」");
    if (!keywordsRaw.trim()) return alert("請輸入至少一個關鍵字");

    const btn = document.querySelector('.search-btn');
    btn.innerText = "解析地址中...";
    btn.disabled = true;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: addrInput }, (results, status) => {
        if (status === "OK" && results[0]) {
            userCoordinates = results[0].geometry.location;
            
            if (detailDisplay) {
                detailDisplay.style.display = 'block';
                detailDisplay.innerText = `🎯 已定位至：${results[0].formatted_address}`;
            }

            startSearch(userCoordinates, keywordsRaw);
        } else {
            alert("找不到此地址，請檢查輸入內容");
            btn.innerText = "🔄 開始搜尋店家";
            btn.disabled = false;
        }
    });
}

function startSearch(location, keywordsRaw) {
    const service = new google.maps.places.PlacesService(document.createElement('div'));
    const maxTime = parseInt(document.getElementById('maxTime').value, 10);
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

            if (priceLevel !== -1) {
                request.maxPrice = priceLevel;
            }
            
            service.nearbySearch(request, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                    resolve(results);
                } else {
                    resolve([]); 
                }
            });
        });
    });

    Promise.all(searchPromises).then(resultsArray => {
        let combinedResults = [];
        resultsArray.forEach(res => {
            combinedResults = combinedResults.concat(res);
        });

        if (combinedResults.length === 0) {
            if (priceLevel !== -1) {
                alert("附近找不到符合預算與關鍵字的店家。\n提示：部分小吃店未在 Google Maps 標註價格，建議將預算設為「不限」再試試。");
            } else {
                alert("附近找不到符合任何關鍵字的店家。");
            }
            resetButtons();
            return;
        }

        processResults(location, combinedResults, maxTime);
    }).catch(err => {
        console.error(err);
        alert("搜尋過程發生錯誤");
        resetButtons();
    });
}

function processResults(origin, results, maxTime) {
    const btn = document.querySelector('.search-btn');
    const userMaxCount = parseInt(document.getElementById('resultCount').value, 10);
    const transportMode = document.getElementById('transportMode').value;
    const minRating = parseFloat(document.getElementById('minRating').value);

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
        alert(`搜尋結果經評分篩選後無符合店家 (需 ${minRating} 星以上)。`);
        resetButtons();
        return;
    }

    btn.innerText = `計算路程時間 (共 ${filtered.length} 間)...`;

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
                alert(`在 ${maxTime} 分鐘範圍內找不到符合店家。\n(已搜尋最近且評分合格的店家，但距離太遠)`);
                resetButtons();
                return;
            }

            validPlaces.sort((a, b) => b.rating - a.rating);

            // 更新全域變數
            places = validPlaces.slice(0, userMaxCount); // 輪盤用的 (可能會減少)
            allSearchResults = [...places]; // 列表用的 (永遠完整)
            
            // 初始化點擊次數
            hitCounts = {};
            places.forEach(p => hitCounts[p.place_id] = 0);

            // 繪製列表與輪盤
            initResultList(allSearchResults);
            drawWheel();
            enableSpinButton(places.length);
        })
        .catch(err => {
            console.error(err);
            places = filtered.slice(0, userMaxCount);
            allSearchResults = [...places];
            initResultList(allSearchResults);
            drawWheel();
            enableSpinButton(places.length);
            alert("路程計算失敗，改為顯示直線距離結果。");
        });
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
            } else {
                resolve([]); 
            }
        });
    });
}

// 初始化左側結果列表 (修改：加入超連結)
function initResultList(list) {
    const tbody = document.querySelector('#resultsTable tbody');
    tbody.innerHTML = ''; // 清空

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">無資料</td></tr>';
        return;
    }

    list.forEach(p => {
        const tr = document.createElement('tr');
        tr.id = `row-${p.place_id}`; 
        
        // 建立 Google Maps 超連結
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name)}&query_place_id=${p.place_id}`;
        
        tr.innerHTML = `
            <td><a href="${mapUrl}" target="_blank" class="store-link" title="在 Google 地圖上查看">${p.name}</a></td>
            <td>⭐${p.rating}</td>
            <td class="hit-count">0</td>
        `;
        tbody.appendChild(tr);
    });
}

// 更新列表中該店家的次數
function updateHitCountUI(placeId) {
    if (!hitCounts[placeId]) hitCounts[placeId] = 0;
    hitCounts[placeId]++;
    
    // 更新表格文字
    const row = document.getElementById(`row-${placeId}`);
    if (row) {
        const countCell = row.querySelector('.hit-count');
        if (countCell) countCell.innerText = hitCounts[placeId];
        
        // 增加高亮效果
        row.classList.add('active-winner');
        setTimeout(() => row.classList.remove('active-winner'), 2000); 
    }
}

// 標記列表項目為已淘汰
function markAsEliminated(placeId) {
    const row = document.getElementById(`row-${placeId}`);
    if (row) {
        row.classList.add('eliminated');
    }
}

function resetButtons() {
    const btn = document.querySelector('.search-btn');
    if(btn) {
        btn.innerText = "🔄 開始搜尋店家";
        btn.disabled = false;
    }
    const spinBtn = document.getElementById('spinBtn');
    if(spinBtn) {
        spinBtn.disabled = true;
        spinBtn.style.opacity = "0.5";
        spinBtn.style.cursor = "not-allowed";
        spinBtn.innerText = "請先搜尋店家";
    }
}

function enableSpinButton(count) {
    const btn = document.querySelector('.search-btn');
    const spinBtn = document.getElementById('spinBtn');
    
    if(btn) {
        btn.innerText = `搜尋完成 (共 ${count} 間)`;
        btn.disabled = false;
    }
    
    if(spinBtn) {
        spinBtn.disabled = false;
        spinBtn.style.opacity = "1";
        spinBtn.style.cursor = "pointer";
        spinBtn.innerText = "開始抽籤";
    }

    currentRotation = 0;
    canvas.style.transform = `rotate(0deg)`;
    document.getElementById('storeName').innerText = "點擊輪盤開始抉擇";
    document.getElementById('storeRating').innerText = "";
    document.getElementById('storeAddress').innerText = "";
    document.getElementById('storeDistance').innerText = "";
    document.getElementById('menuLink').style.display = "none";
}

function drawWheel() {
    const numOptions = places.length;
    if (numOptions === 0) {
        ctx.clearRect(0, 0, 400, 400);
        return;
    }
    
    const arcSize = (2 * Math.PI) / numOptions;
    const startAngleOffset = -Math.PI / 2;

    ctx.clearRect(0, 0, 400, 400);

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

document.getElementById('spinBtn').onclick = () => {
    if (places.length === 0) {
        alert("輪盤上的店家已全部抽完！請重新搜尋。");
        return;
    }
    
    const spinBtn = document.getElementById('spinBtn');
    spinBtn.disabled = true;

    const spinAngle = Math.floor(Math.random() * 1800) + 1800; 
    currentRotation += spinAngle;
    canvas.style.transition = 'transform 4s cubic-bezier(0.15, 0, 0.15, 1)';
    canvas.style.transform = `rotate(${currentRotation}deg)`;

    setTimeout(() => {
        const numOptions = places.length;
        const arcSize = 360 / numOptions;
        const actualRotation = currentRotation % 360;
        const winningIndex = Math.floor((360 - actualRotation) / arcSize) % numOptions;
        const winner = places[winningIndex];

        updateWinnerStatus(winner);
        updateHitCountUI(winner.place_id);

        const spinMode = document.getElementById('spinMode').value;
        if (spinMode === 'eliminate') {
            places.splice(winningIndex, 1);
            markAsEliminated(winner.place_id);

            setTimeout(() => {
                canvas.style.transition = 'none';
                currentRotation = 0;
                canvas.style.transform = `rotate(0deg)`;
                drawWheel();
                
                if (places.length === 0) {
                    spinBtn.innerText = "已全數抽完";
                    spinBtn.disabled = true;
                } else {
                    spinBtn.disabled = false;
                }
            }, 2000); 
        } else {
            spinBtn.disabled = false;
        }

    }, 4000);
};

function updateWinnerStatus(winner) {
    document.getElementById('storeName').innerText = "就決定吃：" + winner.name;
    
    if (document.getElementById('storeRating')) {
        if (winner.rating) {
            document.getElementById('storeRating').innerText = `⭐ ${winner.rating} (${winner.user_ratings_total || 0} 則評價)`;
        } else {
            document.getElementById('storeRating').innerText = "暫無評價資料";
        }
    }
    
    const address = winner.formatted_address || winner.vicinity || "地址不詳";
    const storeAddressEl = document.getElementById('storeAddress');
    
    storeAddressEl.innerText = `⏳ 正在查詢詳細營業狀態...\n📍 ${address}`;

    const service = new google.maps.places.PlacesService(document.createElement('div'));
    
    service.getDetails({
        placeId: winner.place_id,
        fields: ['opening_hours', 'utc_offset_minutes']
    }, (place, status) => {
        let openStatus = "⚪ 營業時間不明，請聯繫商家確認";

        if (status === google.maps.places.PlacesServiceStatus.OK && place && place.opening_hours) {
            openStatus = getDetailedOpeningStatus(place);
        }
        
        storeAddressEl.innerHTML = `
            <strong>${openStatus}</strong><br>
            <span style="font-size: 0.85em; color: #999;">(營業時間僅供參考，以商家資訊為準)</span><br>
            📍 ${address}
        `;
    });

    if (winner.realDurationText) {
         document.getElementById('storeDistance').innerText = 
            `⏱️ 預估耗時：${winner.realDurationText} (${winner.realDistanceText})`;
    }
    
    const link = document.getElementById('menuLink');
    // 使用標準 Google Maps Search URL
    link.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(winner.name)}&query_place_id=${winner.place_id}`;
    link.style.display = 'inline-block';
    link.innerText = "📍 導航去這家";
}

function getDetailedOpeningStatus(place) {
    const isOpen = place.opening_hours.isOpen();
    const periods = place.opening_hours.periods;
    
    if (!periods || periods.length === 0) {
        return isOpen ? "🟢 營業中" : "🔴 已打烊";
    }

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
    
    events.sort((a, b) => {
        if (a.day !== b.day) return a.day - b.day;
        return a.time - b.time;
    });

    let targetEvent = null;
    
    for (let e of events) {
        if (e.day > currentDay || (e.day === currentDay && e.time > currentTime)) {
            if (isOpen && e.type === 'close') {
                targetEvent = e;
                break;
            }
            if (!isOpen && e.type === 'open') {
                targetEvent = e;
                break;
            }
        }
    }

    if (!targetEvent) {
        for (let e of events) {
             if (isOpen && e.type === 'close') {
                targetEvent = e;
                break;
            }
            if (!isOpen && e.type === 'open') {
                targetEvent = e;
                break;
            }
        }
    }

    if (!targetEvent) return isOpen ? "🟢 營業中" : "🔴 已打烊";

    const dayStr = days[targetEvent.day];
    const timeStr = formatTime(targetEvent.time);

    if (isOpen) {
        return `🟢 營業中，預計 (${dayStr} ${timeStr}) 結束營業`;
    } else {
        return `🔴 已打烊，預計 (${dayStr} ${timeStr}) 開始營業`;
    }
}
