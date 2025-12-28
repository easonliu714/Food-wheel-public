// ================== maps_logic.js ==================

// 定義保守估計的速度常數 (單位：公尺/分鐘)
// 步行 2 km/h = 2000m / 60min ≈ 33.33 m/min
// 開車 30 km/h = 30000m / 60min = 500 m/min
const CONSERVATIVE_SPEEDS = {
    WALKING: 33.33,
    DRIVING: 500
};

window.initLocation = function() {
    if (typeof google === 'undefined') { console.warn("Maps API not loaded"); return; }
    const addrInput = document.getElementById('currentAddress');
    if(addrInput) addrInput.value = "定位中...";

    if (!navigator.geolocation) return alert("瀏覽器不支援定位");

    navigator.geolocation.getCurrentPosition(
        (position) => {
            window.userCoordinates = { lat: position.coords.latitude, lng: position.coords.longitude };
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: window.userCoordinates }, (results, status) => {
                if (status === "OK" && results[0]) {
                    if(addrInput) addrInput.value = results[0].formatted_address.replace(/^\d+\s*/, '').replace(/^台灣/, '');
                } else {
                    if(addrInput) addrInput.value = `${window.userCoordinates.lat.toFixed(5)}, ${window.userCoordinates.lng.toFixed(5)}`;
                }
            });
        },
        (error) => { if(addrInput) { addrInput.value = ""; addrInput.placeholder = "無法定位，請手動輸入"; } },
        { enableHighAccuracy: true }
    );
};

window.handleSearch = function() {
    if (typeof google === 'undefined' || !google.maps) return alert("API 尚未載入");
    const addrInput = document.getElementById('currentAddress');
    const keywordsRaw = document.getElementById('keywordInput').value;
    
    if (!addrInput.value) return alert("請輸入地址");
    if (!keywordsRaw.trim()) return alert("請輸入關鍵字");

    window.resetGame(false); 
    const spinBtn = document.getElementById('spinBtn');
    if(spinBtn) { spinBtn.disabled = true; spinBtn.innerText = "資料載入中..."; }
    
    const searchBtn = document.querySelector('.search-btn');
    searchBtn.innerText = "🔍 解析地址中...";
    searchBtn.disabled = true;

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: addrInput.value }, (results, status) => {
        if (status === "OK" && results[0]) {
            window.userCoordinates = results[0].geometry.location;
            
            // 地址同步邏輯
            const formattedAddress = results[0].formatted_address;
            const simplifiedAddress = formattedAddress.replace(/^\d+\s*/, '').replace(/^台灣/, '');
            
            addrInput.value = simplifiedAddress; 
            
            const detailDisplay = document.getElementById('detailedAddressDisplay');
            if (detailDisplay) { 
                detailDisplay.style.display = 'block'; 
                detailDisplay.innerText = `🎯 已定位至：${formattedAddress}`; 
            }
            
            window.startSearch(window.userCoordinates, keywordsRaw);
        } else {
            alert("無法解析此地址");
            searchBtn.innerText = "🔄 開始搜尋店家";
            searchBtn.disabled = false;
        }
    });
};

window.startSearch = function(location, keywordsRaw) {
    const btn = document.querySelector('.search-btn');
    btn.innerText = "☁️ 搜尋周邊店家...";

    const service = new google.maps.places.PlacesService(document.createElement('div'));
    const priceLevel = parseInt(document.getElementById('priceLevel').value, 10);
    const transportMode = document.getElementById('transportMode').value; // 'WALKING' or 'DRIVING'
    const maxTime = parseInt(document.getElementById('maxTime').value, 10);
    const searchMode = document.getElementById('searchMode').value;
    
    const splitKeywords = keywordsRaw.split(/\s+/).filter(k => k.length > 0);
    let searchQueries = [...splitKeywords];
    if (splitKeywords.length > 1) searchQueries.push(keywordsRaw);

    // 這裡使用較寬鬆的「搜尋半徑」來抓取資料，確保有足夠的候選店家
    // 實際篩選會在 processResults 使用保守速度進行
    let searchSpeed = (transportMode === 'DRIVING') ? 800 : 80; // 搜尋時假設稍微正常一點的速度抓範圍
    const maxTheoreticalRadius = searchSpeed * maxTime;

    let promises = [];
    if (searchMode === 'nearby') {
        searchQueries.forEach(keyword => {
            let request = { location: location, rankBy: google.maps.places.RankBy.DISTANCE, keyword: keyword };
            if (priceLevel !== -1) request.maxPrice = priceLevel;
            promises.push(window.fetchPlacesWithPagination(service, request, 3));
        });
    } else {
        let steps = [];
        for (let t = 5; t <= maxTime; t += 5) steps.push(t);
        if (maxTime % 5 !== 0) steps.push(maxTime);
        steps = [...new Set(steps)].sort((a,b)=>a-b);
        searchQueries.forEach(keyword => {
            steps.forEach(stepTime => {
                let stepRadius = stepTime * searchSpeed;
                if (stepRadius < 500) stepRadius = 500; 
                let request = { location: location, radius: stepRadius, rankBy: google.maps.places.RankBy.PROMINENCE, keyword: keyword };
                if (priceLevel !== -1) request.maxPrice = priceLevel;
                promises.push(window.fetchPlacesWithPagination(service, request, 3));
            });
        });
    }

    Promise.all(promises).then(resultsArray => {
        let combinedResults = [].concat(...resultsArray);
        if (combinedResults.length === 0) {
            alert("API 回傳 0 筆資料");
            btn.innerText = "🔄 開始搜尋店家";
            btn.disabled = false;
            return;
        }
        window.processResults(location, combinedResults);
    }).catch(err => {
        console.error(err);
        alert("搜尋錯誤: " + err);
        btn.innerText = "🔄 開始搜尋店家";
        btn.disabled = false;
    });
};

window.fetchPlacesWithPagination = function(service, request, maxPages = 3) {
    return new Promise((resolve) => {
        let allResults = [];
        let pageCount = 0;
        service.nearbySearch(request, (results, status, pagination) => {
            if ((status === google.maps.places.PlacesServiceStatus.OK || status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) && results) {
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
};

// [方案 B 修改重點]：改用本地計算直線距離與保守耗時
window.processResults = function(origin, results) {
    const btn = document.querySelector('.search-btn');
    const userMaxCount = parseInt(document.getElementById('resultCount').value, 10);
    const transportMode = document.getElementById('transportMode').value;
    const maxTime = parseInt(document.getElementById('maxTime').value, 10);
    const searchMode = document.getElementById('searchMode').value;

    const uniqueIds = new Set();
    let filtered = [];

    // 設定保守速度
    const speedPerMin = (transportMode === 'DRIVING') ? CONSERVATIVE_SPEEDS.DRIVING : CONSERVATIVE_SPEEDS.WALKING;

    results.forEach(p => {
        if (!uniqueIds.has(p.place_id)) {
            uniqueIds.add(p.place_id);
            const loc = p.geometry.location;
            
            // 1. 計算直線距離 (Distance Matrix API 省略)
            const distanceMeters = google.maps.geometry.spherical.computeDistanceBetween(origin, loc);
            
            // 2. 計算保守預估時間
            const conservativeDurationMins = Math.ceil(distanceMeters / speedPerMin);

            // 3. 篩選符合時間限制的店家
            if (conservativeDurationMins <= maxTime) {
                p.geometryDistance = distanceMeters;
                p.conservativeDurationMins = conservativeDurationMins;
                
                // 建立顯示用的文字
                p.displayDistanceText = (distanceMeters / 1000).toFixed(1) + " km/";
                p.displayDurationText = `約 ${conservativeDurationMins} 分`;
                
                filtered.push(p);
            }
        }
    });

    if (filtered.length === 0) {
        alert("經保守估計 (走路2km/h, 開車20km/h) 計算後，無符合時間內的店家。");
        btn.innerText = "🔄 開始搜尋店家";
        btn.disabled = false;
        return;
    }

    // 排序
    if (searchMode === 'nearby') {
        filtered.sort((a, b) => a.geometryDistance - b.geometryDistance);
    }
    // 若為 famous 模式 (Google 預設排序)，則保留原始順序，或可依 rating 微調，這裡維持原始邏輯

    // 截斷數量
    window.allSearchResults = filtered.slice(0, userMaxCount);
    
    // 初始化輪盤數據
    window.eliminatedIds.clear(); 
    window.hitCounts = {};
    window.allSearchResults.forEach(p => window.hitCounts[p.place_id] = 0);

    if (typeof window.refreshWheelData === 'function') {
        window.refreshWheelData();
        btn.innerText = `搜尋完成 (共 ${window.places.length} 間)`;
        btn.disabled = false;
    } else {
        console.error("Critical: refreshWheelData not found!");
        btn.disabled = false;
    }
};

// 取得單一店家的精確路徑 (供 script.js 在中獎後呼叫)
window.getDistances = function(origin, destinations, mode) {
    return new Promise((resolve, reject) => {
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
                        // 這是 Google Maps 計算的真實路徑與預設速度耗時
                        p.realDistanceText = el.distance.text;
                        p.realDurationText = el.duration.text;
                        p.realDurationMins = Math.ceil(el.duration.value / 60);
                        processed.push(p);
                    }
                }
                resolve(processed);
            } else { 
                console.warn(`Distance Matrix Status: ${status}`);
                reject(status);
            }
        });
    });
};
