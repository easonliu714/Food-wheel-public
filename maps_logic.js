// maps_logic.js
// 負責 Google Maps 初始化、搜尋、轉盤邏輯 (完全復刻原版邏輯)

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
    if (activeKeywordDict[type]) input.value = activeKeywordDict[type];
}

function initLocation() {
    if (typeof google === 'undefined') return;
    const addrInput = document.getElementById('currentAddress');
    
    if(addrInput) addrInput.value = "定位中...";

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

    if(spinBtn) { spinBtn.disabled = true; spinBtn.innerText = "資料載入中..."; }

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: addrInput }, (results, status) => {
        if (status === "OK" && results[0]) {
            userCoordinates = results[0].geometry.location;
            startSearch(userCoordinates, keywordsRaw);
        } else {
            alert("找不到此地址");
            spinBtn.innerText = "請先搜尋店家";
        }
    });
}

// 核心搜尋邏輯：完全恢復 script.js 的半徑計算
function startSearch(location, keywordsRaw) {
    const service = new google.maps.places.PlacesService(document.createElement('div'));
    
    // 取得使用者設定參數
    const priceLevel = parseInt(document.getElementById('priceLevel').value, 10);
    const transportMode = document.getElementById('transportMode').value;
    const maxTime = parseInt(document.getElementById('maxTime').value, 10);
    
    // 【原版邏輯恢復】計算動態半徑
    // 走路預設 20 km/h, 開車預設 60 km/h (保守估計，用於抓取候選名單)
    const estimatedSpeedKmH = (transportMode === 'WALKING') ? 20 : 60;
    
    // 距離 (km) = 速度 (km/h) * 時間 (h)
    const maxDistKm = estimatedSpeedKmH * (maxTime / 60);
    
    // 轉換為公尺，並設定邊界 (最小 1000m 以免太少，最大 50000m 為 API 極限)
    let calculatedRadius = Math.floor(maxDistKm * 1000);
    calculatedRadius = Math.max(1000, calculatedRadius);
    calculatedRadius = Math.min(50000, calculatedRadius);

    console.log(`搜尋策略: 模式=${transportMode}, 時間=${maxTime}分, 計算半徑=${calculatedRadius}m`);
    
    // 關鍵字處理
    const splitKeywords = keywordsRaw.split(/\s+/).filter(k => k.length > 0);
    let searchQueries = [...splitKeywords];
    if (splitKeywords.length > 1) searchQueries.push(keywordsRaw);

    let promises = [];
    const btn = document.querySelector('.search-btn');
    btn.innerText = "搜尋中...";

    // 執行搜尋 (Nearby Search with Radius)
    searchQueries.forEach(keyword => {
        let request = { 
            location: location, 
            radius: calculatedRadius, 
            keyword: keyword 
        };
        
        if (priceLevel !== -1) request.maxPrice = priceLevel;
        
        promises.push(new Promise(resolve => {
            service.nearbySearch(request, (results, status) => {
                // 不論是否 ZERO_RESULTS 都回傳，方便後續合併
                resolve((status === 'OK' && results) ? results : []);
            });
        }));
    });

    Promise.all(promises).then(resultsArray => {
        let combinedResults = [].concat(...resultsArray);
        if (combinedResults.length === 0) {
            alert("附近無符合條件的店家 (請嘗試增加時間或變更關鍵字)");
            btn.innerText = "🔄 開始搜尋店家";
            return;
        }
        processResults(location, combinedResults);
    });
}

function processResults(origin, results) {
    const btn = document.querySelector('.search-btn');
    const userMaxCount = parseInt(document.getElementById('resultCount').value, 10);
    const transportMode = document.getElementById('transportMode').value;
    const minRating = parseFloat(document.getElementById('minRating').value);
    const maxTime = parseInt(document.getElementById('maxTime').value, 10);
    
    // 去重與基本評分過濾
    const uniqueIds = new Set();
    let filtered = [];
    results.forEach(p => {
        if (!uniqueIds.has(p.place_id) && p.rating >= minRating && p.user_ratings_total > 0) {
            uniqueIds.add(p.place_id);
            filtered.push(p);
        }
    });

    // Distance Matrix API 限制 (一次最多 25 個目的地比較保險，原版可能設定 50)
    // 為了安全起見，我們取前 50 個候選
    if (filtered.length > 50) filtered = filtered.slice(0, 50);

    if (filtered.length === 0) {
        alert("評分過濾後無符合條件店家");
        btn.innerText = "🔄 開始搜尋店家";
        return;
    }

    btn.innerText = "計算實際路程...";
    
    const service = new google.maps.DistanceMatrixService();
    const destLocs = filtered.map(d => d.geometry.location);

    service.getDistanceMatrix({
        origins: [origin],
        destinations: destLocs,
        travelMode: google.maps.TravelMode[transportMode],
    }, (response, status) => {
        if (status === 'OK') {
            const elements = response.rows[0].elements;
            let validResults = [];

            for (let i = 0; i < filtered.length; i++) {
                if (elements[i].status === 'OK') {
                    const durationMins = Math.ceil(elements[i].duration.value / 60);
                    
                    // 【原版邏輯】嚴格檢查實際路程時間
                    if (durationMins <= maxTime) {
                        filtered[i].realDurationMins = durationMins;
                        filtered[i].realDistanceText = elements[i].distance.text;
                        filtered[i].realDurationText = elements[i].duration.text;
                        validResults.push(filtered[i]);
                    }
                }
            }
            
            // 排序邏輯
            const searchMode = document.getElementById('searchMode').value;
            if (searchMode === 'nearby') {
                // 距離優先
                validResults.sort((a,b) => a.realDurationMins - b.realDurationMins);
            } else {
                // 熱門優先 (評分 * log(評論數))
                validResults.sort((a,b) => (b.rating * Math.log(b.user_ratings_total)) - (a.rating * Math.log(a.user_ratings_total)));
            }

            // 截取使用者設定的數量
            allSearchResults = validResults.slice(0, userMaxCount);
            
            if (allSearchResults.length === 0) {
                 alert("經路程計算後，沒有店家在時間限制內到達");
                 btn.innerText = "🔄 開始搜尋店家";
            } else {
                 refreshWheelData();
                 btn.innerText = "搜尋完成";
            }
        } else {
            alert("距離計算 API 失敗");
            btn.innerText = "🔄 開始搜尋店家";
        }
    });
}

function refreshWheelData() {
    const filterDislike = document.getElementById('filterDislike').checked;
    
    // 從 allSearchResults 產生 places (轉盤資料)
    places = allSearchResults.filter(p => {
        // 排除已淘汰
        if (eliminatedIds.has(p.place_id)) return false;
        // 排除使用者踩雷
        if (filterDislike && userRatings[p.place_id] === 'dislike') return false;
        return true;
    });

    initResultList(allSearchResults);
    drawWheel();
    enableSpinButton(places.length);
}

function initResultList(list) {
    const tbody = document.querySelector('#resultsTable tbody');
    if(!tbody) return;
    tbody.innerHTML = '';
    
    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">無資料</td></tr>';
        return;
    }

    list.forEach(p => {
        const isEliminated = eliminatedIds.has(p.place_id);
        const tr = document.createElement('tr');
        if(isEliminated) tr.classList.add('eliminated');
        tr.innerHTML = `<td>${p.name}</td><td>${p.rating}</td><td>${p.realDurationText||'-'}</td><td>${hitCounts[p.place_id]||0}</td>`;
        tbody.appendChild(tr);
    });
}

function drawWheel() {
    const numOptions = places.length;
    if(ctx) ctx.clearRect(0, 0, 400, 400);
    if (numOptions === 0) return;
    const arcSize = (2 * Math.PI) / numOptions;
    
    places.forEach((place, i) => {
        const angle = -Math.PI / 2 + (i * arcSize);
        ctx.fillStyle = `hsl(${i * (360 / numOptions)}, 70%, 60%)`;
        ctx.beginPath();
        ctx.moveTo(200, 200);
        ctx.arc(200, 200, 200, angle, angle + arcSize);
        ctx.fill();
        ctx.stroke();
        
        // 文字
        ctx.save();
        ctx.translate(200, 200);
        ctx.rotate(angle + arcSize / 2);
        ctx.fillStyle = "white";
        ctx.font = "bold 12px Arial";
        ctx.fillText(place.name.substring(0,6), 60, 5);
        ctx.restore();
    });
}

// 轉盤點擊事件
document.getElementById('spinBtn').onclick = () => {
    if (places.length === 0) return;
    const spinBtn = document.getElementById('spinBtn');
    spinBtn.disabled = true;
    
    const spinAngle = 1800 + Math.random() * 1800;
    currentRotation += spinAngle;
    canvas.style.transform = `rotate(${currentRotation}deg)`;
    canvas.style.transition = 'transform 4s cubic-bezier(0.15, 0, 0.15, 1)';
    
    setTimeout(() => {
        const actualRotation = currentRotation % 360;
        const arcSize = 360 / places.length;
        let index = Math.floor((360 - actualRotation) / arcSize) % places.length;
        const winner = places[index];
        
        updateWinnerUI(winner);
        
        // 紀錄次數
        if (!hitCounts[winner.place_id]) hitCounts[winner.place_id] = 0;
        hitCounts[winner.place_id]++;
        
        // 更新列表顯示次數
        initResultList(allSearchResults);

        const spinMode = document.getElementById('spinMode') ? document.getElementById('spinMode').value : 'repeat';
        if (spinMode === 'eliminate') {
            eliminatedIds.add(winner.place_id);
            setTimeout(() => { refreshWheelData(); spinBtn.disabled = false; }, 2000);
        } else {
            spinBtn.disabled = false;
        }
    }, 4000);
};

function updateWinnerUI(winner) {
    currentStoreForMenu = winner;
    document.getElementById('storeName').innerText = winner.name;
    document.getElementById('storeRating').innerText = `${winner.rating} (${winner.user_ratings_total})`;
    document.getElementById('storeAddress').innerText = winner.vicinity || winner.formatted_address;
    
    // 更新按鈕
    const navLink = document.getElementById('navLink');
    const menuBtn = document.getElementById('btnAiMenu');
    navLink.style.display = 'inline-block';
    navLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(winner.name)}&query_place_id=${winner.place_id}`;
    
    if(localStorage.getItem('food_wheel_gemini_key')) menuBtn.style.display = 'inline-block';

    // 評價按鈕
    document.getElementById('btnLike').onclick = () => { userRatings[winner.place_id] = 'like'; localStorage.setItem('food_wheel_user_ratings', JSON.stringify(userRatings)); refreshWheelData(); };
    document.getElementById('btnDislike').onclick = () => { userRatings[winner.place_id] = 'dislike'; localStorage.setItem('food_wheel_user_ratings', JSON.stringify(userRatings)); refreshWheelData(); };
}

function enableSpinButton(count) {
    const btn = document.getElementById('spinBtn');
    if(count > 0) {
        btn.disabled = false;
        btn.style.opacity = 1;
        btn.innerText = "開始抽籤";
    } else {
        btn.disabled = true;
        btn.style.opacity = 0.5;
    }
}

function resetGame(full) {
    if(full) { places = []; allSearchResults = []; eliminatedIds.clear(); }
    if(ctx) ctx.clearRect(0,0,400,400);
    enableSpinButton(0);
}
