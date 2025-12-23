// 全域變數
let places = [];
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

// ================== 1. 系統初始化與 Key 管理 ==================

window.onload = () => {
    const savedKey = localStorage.getItem('food_wheel_api_key');
    if (savedKey) {
        loadGoogleMapsScript(savedKey);
    } else {
        document.getElementById('setup-screen').style.display = 'block';
        document.getElementById('app-screen').style.display = 'none';
    }
    autoSelectMealType();
};

function saveAndStart() {
    const inputKey = document.getElementById('userApiKey').value.trim();
    if (inputKey.length < 20) {
        alert("API Key 格式看起來不正確，請確認。");
        return;
    }
    localStorage.setItem('food_wheel_api_key', inputKey);
    loadGoogleMapsScript(inputKey);
}

function clearKey() {
    if(confirm("確定要清除 API Key 並回到設定頁嗎？")) {
        localStorage.removeItem('food_wheel_api_key');
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
        initLocation(); 
    };
    
    script.onerror = () => {
        alert("Google Maps API 載入失敗！\n可能是 Key 無效或網路問題，請檢查後重試。");
        localStorage.removeItem('food_wheel_api_key'); 
        location.reload();
    };

    document.head.appendChild(script);
}

window.gm_authFailure = function() {
    alert("Google Maps API 驗證失敗！\n請檢查：\n1. 是否已啟用 Places API 和 Maps JavaScript API\n2. 是否已綁定信用卡(結算帳戶)\n3. 網址限制是否正確");
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
    // 清空詳細地址顯示 (因為是自動定位)
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
                    // 簡化地址：去除郵遞區號與台灣
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
            
            // 【新增功能 1】顯示詳細地址供確認
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
    
    // 取得價格設定
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

            // 如果有設定預算上限 (不是 -1)，就加入 maxPrice 條件
            // 根據需求：不管選哪個，minPrice 預設為 0
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
            // 如果是因為價格篩選導致沒結果，給予特定提示
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

    const uniqueIds = new Set();
    let filtered = [];
    
    results.forEach(p => {
        if (p.rating && p.rating >= 3.5 && p.user_ratings_total > 0) {
            if (!uniqueIds.has(p.place_id)) {
                uniqueIds.add(p.place_id);
                filtered.push(p);
            }
        }
    });

    if (filtered.length === 0) {
        alert("搜尋結果經評分篩選後無符合店家 (需 3.5 星以上)。");
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

            places = validPlaces.slice(0, userMaxCount);
            drawWheel();
            enableSpinButton(places.length);
        })
        .catch(err => {
            console.error(err);
            places = filtered.slice(0, userMaxCount);
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
    if (numOptions === 0) return;
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
    if (places.length === 0) return;
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

        // 呼叫更新狀態函數 (包含查詢即將營業邏輯)
        updateWinnerStatus(winner);
        
        spinBtn.disabled = false;
    }, 4000);
};

// 【新增功能 2】更新贏家狀態與營業時間判斷
function updateWinnerStatus(winner) {
    // 基本 UI 更新
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
    
    // 預設顯示載入中
    storeAddressEl.innerText = `⏳ 正在查詢營業狀態...\n📍 ${address}`;

    // 使用 Places Service getDetails 取得詳細營業時間
    const service = new google.maps.places.PlacesService(document.createElement('div'));
    
    service.getDetails({
        placeId: winner.place_id,
        fields: ['opening_hours'] // 只需取得營業時間欄位
    }, (place, status) => {
        let openStatus = "⚪ 營業時間不明，請確認";

        if (status === google.maps.places.PlacesServiceStatus.OK && place && place.opening_hours) {
            const isOpen = place.opening_hours.isOpen();
            
            if (isOpen) {
                openStatus = "🟢 營業中";
            } else {
                // 如果沒開，檢查是否即將營業
                openStatus = "🔴 已打烊/休息中"; // 預設狀態
                
                // 檢查是否在 60 分鐘內開門
                // 需要完整的 periods 資訊，但 API 有時只有 open_now
                // 這裡嘗試從 opening_hours.periods 判斷 (如果有的話)
                // 備註：isOpen() 是較新的方法，getDetails 通常會回傳 periods
                
                // 由於計算邏輯較複雜，若 API 沒回傳詳細 periods 則維持已打烊
                // 這裡是一個簡易的檢查：若有 periods 屬性
                // 此處為了程式碼簡潔，且避免時區運算過於複雜，我們依賴 Google 是否有提供 next opening 
                // 若要精確做到「即將營業」，需要遍歷 periods。
                // 這裡實作一個精簡檢查：
                if (checkIfOpeningSoon(place.opening_hours)) {
                    openStatus = "🟡 即將營業 (1小時內)";
                }
            }
        }
        
        // 更新最終顯示
        storeAddressEl.innerText = `${openStatus}\n📍 ${address}`;
    });

    if (winner.realDurationText) {
         document.getElementById('storeDistance').innerText = 
            `⏱️ 預估耗時：${winner.realDurationText} (${winner.realDistanceText})`;
    }
    
    const link = document.getElementById('menuLink');
    link.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(winner.name)}&query_place_id=${winner.place_id}`;
    link.style.display = 'inline-block';
    link.innerText = "📍 導航去這家";
}

// 輔助函數：檢查是否即將營業 (1小時內)
function checkIfOpeningSoon(openingHours) {
    if (!openingHours || !openingHours.periods) return false;
    
    const now = new Date();
    const day = now.getDay();
    const time = now.getHours() * 100 + now.getMinutes(); // 轉成 HHMM 格式數字
    
    // 尋找下一個開門時間
    // periods 格式: [{open: {day: 0, time: "1000"}, close: {...}}, ...]
    // 需處理跨日與當日稍晚
    
    let nextOpen = null;
    let minDiff = Infinity;

    openingHours.periods.forEach(p => {
        if (!p.open) return;
        
        const openDay = p.open.day;
        const openTime = parseInt(p.open.time);
        
        // 計算時間差 (分鐘)
        let diffInMinutes = 0;
        
        if (openDay === day) {
            if (openTime > time) {
                // 同一天稍晚
                const openH = Math.floor(openTime / 100);
                const openM = openTime % 100;
                const nowH = Math.floor(time / 100);
                const nowM = time % 100;
                diffInMinutes = (openH * 60 + openM) - (nowH * 60 + nowM);
            } else {
                // 時間已過，或者是下週 (不考慮，只找最近的)
                return; 
            }
        } else if (openDay === (day + 1) % 7) {
            // 明天 (或跨週的隔天)
            // 計算：(2400 - now) + openTime
            // 這種情況通常大於 60分，除非現在是 23:30 且店家 00:00 開門
            const openH = Math.floor(openTime / 100);
            const openM = openTime % 100;
            const nowH = Math.floor(time / 100);
            const nowM = time % 100;
            
            // 距離午夜的分鐘數 + 午夜到開門的分鐘數
            const minsToMidnight = (24 * 60) - (nowH * 60 + nowM);
            const minsAfterMidnight = openH * 60 + openM;
            diffInMinutes = minsToMidnight + minsAfterMidnight;
        } else {
            return; // 太遠了
        }

        if (diffInMinutes > 0 && diffInMinutes < minDiff) {
            minDiff = diffInMinutes;
        }
    });

    return minDiff <= 60;
}
