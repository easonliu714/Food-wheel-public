// ================== maps_logic.js : Google Maps 核心邏輯 ==================

window.autoSelectMealType = function() {
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
        window.updateKeywords(); 
    }
};

window.updateKeywords = function() {
    const type = document.getElementById('mealType').value;
    const input = document.getElementById('keywordInput');
    if (window.activeKeywordDict[type]) {
        input.value = window.activeKeywordDict[type];
    }
};

window.initLocation = function() {
    if (typeof google === 'undefined') return;
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
    const addrInput = document.getElementById('currentAddress').value;
    const keywordsRaw = document.getElementById('keywordInput').value;
    const spinBtn = document.getElementById('spinBtn');

    if (!addrInput) return alert("請輸入地址");
    if (!keywordsRaw.trim()) return alert("請輸入關鍵字");

    window.resetGame(false); 

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
            // 更新全域座標
            window.userCoordinates = results[0].geometry.location;
            
            // 修正：正確顯示詳細地址
            const detailDisplay = document.getElementById('detailedAddressDisplay');
            if (detailDisplay) {
                detailDisplay.style.display = 'block';
                detailDisplay.innerText = `🎯 已定位至：${results[0].formatted_address}`;
            }
            
            window.startSearch(window.userCoordinates, keywordsRaw);
        } else {
            alert("找不到此地址，請嘗試輸入更完整的地址");
            btn.innerText = "🔄 開始搜尋店家";
            btn.disabled = false;
        }
    });
};

window.startSearch = function(location, keywordsRaw) {
    const service = new google.maps.places.PlacesService(document.createElement('div'));
    const priceLevel = parseInt(document.getElementById('priceLevel').value, 10);
    const transportMode = document.getElementById('transportMode').value;
    const maxTime = parseInt(document.getElementById('maxTime').value, 10);
    const searchMode = document.getElementById('searchMode').value;
    
    const splitKeywords = keywordsRaw.split(/\s+/).filter(k => k.length > 0);
    let searchQueries = [...splitKeywords];
    if (splitKeywords.length > 1) searchQueries.push(keywordsRaw);

    let speedMetersPerMin = (transportMode === 'DRIVING') ? 1000 : 333.33;
    const maxTheoreticalRadius = speedMetersPerMin * maxTime;
    const maxLinearDist = maxTheoreticalRadius * 1.5;

    const btn = document.querySelector('.search-btn');
    let statusText = "";
    let promises = [];

    if (searchMode === 'nearby') {
        statusText = `📍 距離優先搜尋 (抓取最近 60 筆)...`;
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
        statusText = `🌟 熱門優先：分段掃描 (${steps.join(',')}分) x 關鍵字...`;

        searchQueries.forEach(keyword => {
            steps.forEach(stepTime => {
                let stepRadius = stepTime * speedMetersPerMin;
                if (stepRadius < 500) stepRadius = 500; 
                let request = { location: location, radius: stepRadius, rankBy: google.maps.places.RankBy.PROMINENCE, keyword: keyword };
                if (priceLevel !== -1) request.maxPrice = priceLevel;
                promises.push(window.fetchPlacesWithPagination(service, request, 3));
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
        window.processResults(location, combinedResults, maxLinearDist);
    }).catch(err => {
        console.error(err);
        alert("搜尋過程發生錯誤");
        btn.innerText = "🔄 開始搜尋店家";
        btn.disabled = false;
    });
};

window.fetchPlacesWithPagination = function(service, request, maxPages = 3) {
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
};

window.processResults = function(origin, results, maxLinearDist) {
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
        alert(`無符合 ${minRating} 星以上的店家`);
        btn.innerText = "🔄 開始搜尋店家";
        btn.disabled = false;
        return;
    }

    btn.innerText = `計算路程 (過濾前 ${filtered.length} 間)...`;

    const safeZoneDist = maxLinearDist / 3; 
    if (searchMode === 'nearby') {
        filtered.sort((a, b) => a.geometryDistance - b.geometryDistance);
    } else {
        filtered.sort((a, b) => {
            const getScore = (place) => {
                let score = place.rating * Math.log10(place.user_ratings_total + 1);
                if (place.geometryDistance <= safeZoneDist) score *= 3.0; 
                return score;
            };
            return getScore(b) - getScore(a);
        });
    }

    if (filtered.length > 80) filtered = filtered.slice(0, 80);

    const batchSize = 25;
    const batches = [];
    for (let i = 0; i < filtered.length; i += batchSize) {
        batches.push(filtered.slice(i, i + batchSize));
    }

    Promise.all(batches.map(batch => window.getDistances(origin, batch, transportMode)))
        .then(resultsArray => {
            let validPlaces = [].concat(...resultsArray);
            validPlaces = validPlaces.filter(p => p.realDurationMins <= maxTime);

            if (validPlaces.length === 0) {
                alert(`${maxTime} 分鐘內無符合店家 (實際路程超時)`);
                btn.innerText = "🔄 開始搜尋店家";
                btn.disabled = false;
                return;
            }

            if (searchMode === 'nearby') {
                validPlaces.sort((a, b) => a.realDurationMins - b.realDurationMins);
            } else {
                validPlaces.sort((a, b) => {
                    const scoreA = a.rating * Math.log10(a.user_ratings_total + 1);
                    const scoreB = b.rating * Math.log10(b.user_ratings_total + 1);
                    return scoreB - scoreA;
                });
            }

            window.allSearchResults = validPlaces.slice(0, userMaxCount); 
            window.eliminatedIds.clear(); 
            window.hitCounts = {};
            window.allSearchResults.forEach(p => window.hitCounts[p.place_id] = 0);

            window.refreshWheelData(); 
            
            btn.innerText = `搜尋完成 (共 ${window.places.length} 間)`;
            btn.disabled = false;
        })
        .catch(err => {
            console.error(err);
            alert("路程計算失敗 (Distance Matrix API Error)");
            btn.innerText = "🔄 開始搜尋店家";
            btn.disabled = false;
        });
};

window.getDistances = function(origin, destinations, mode) {
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
};
