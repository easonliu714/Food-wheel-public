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
    const detailDisplay = document.getElementById('detailedAddressDisplay');
    
    if(addrInput) addrInput.value = "定位中...";
    if(detailDisplay) detailDisplay.style.display = 'none';

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
            window.userCoordinates = results[0].geometry.location;
            const detailDisplay = document.getElementById('detailedAddressDisplay');
            if (detailDisplay) {
                detailDisplay.style.display = 'block';
                detailDisplay.innerText = `🎯 已定位至：${results[0].formatted_address}`;
            }
            window.startSearch(window.userCoordinates, keywordsRaw);
        } else {
            alert("找不到此地址");
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
        alert("搜尋錯誤");
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
            alert("路程計算失敗");
            btn.innerText = "🔄 開始搜尋店家";
            btn.disabled = false;
        });
};

window.refreshWheelData = function() {
    const filterDislikeEl = document.getElementById('filterDislike');
    const filterDislike = filterDislikeEl ? filterDislikeEl.checked : false;
    
    window.places = window.allSearchResults.filter(p => {
        if (window.eliminatedIds.has(p.place_id)) return false;
        if (filterDislike && window.userRatings[p.place_id] === 'dislike') return false;
        return true;
    });

    const searchBtn = document.querySelector('.search-btn');
    if(searchBtn && !searchBtn.disabled && searchBtn.innerText.includes("搜尋完成")) {
        searchBtn.innerText = `搜尋完成 (共 ${window.places.length} 間)`;
    }

    window.initResultList(window.allSearchResults);
    window.drawWheel();
    window.enableSpinButton(window.places.length);
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

window.initResultList = function(list) {
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
        const isEliminated = window.eliminatedIds.has(p.place_id);
        const isDislike = window.userRatings[p.place_id] === 'dislike';
        const isFiltered = filterDislike && isDislike;

        const tr = document.createElement('tr');
        tr.id = `row-${p.place_id}`; 
        
        if (isEliminated || isFiltered) tr.classList.add('eliminated'); 

        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name)}&query_place_id=${p.place_id}`;
        
        let nameHtml = `<a href="${mapUrl}" target="_blank" class="store-link" title="在 Google 地圖上查看">${p.name}</a>`;
        if (window.userRatings[p.place_id]) {
            if (window.userRatings[p.place_id] === 'like') {
                nameHtml = `<span class="personal-tag like">👍</span> ` + nameHtml;
            } else if (isDislike) {
                nameHtml = `<span class="personal-tag dislike">💣</span> ` + nameHtml;
            }
        }

        const ratingText = p.rating ? `${p.rating} <span style="font-size:0.8em; color:#666;">(${p.user_ratings_total || 0})</span>` : "無評價";
        const distanceText = p.realDistanceText ? `${p.realDistanceText}<br><span style="font-size:0.85em; color:#666;">${p.realDurationText}</span>` : "未知";

        tr.innerHTML = `<td>${nameHtml}</td><td>⭐ ${ratingText}</td><td>${distanceText}</td><td class="hit-count">${window.hitCounts[p.place_id] || 0}</td>`;
        tbody.appendChild(tr);
    });
};

window.resetGame = function(fullReset) {
    window.currentRotation = 0; 
    window.canvas.style.transform = `rotate(0deg)`;
    window.canvas.style.transition = 'none'; 
    
    const storeName = document.getElementById('storeName');
    if(storeName) storeName.innerText = "點擊輪盤開始抉擇";
    
    ['storeRating', 'storeAddress', 'storeDistance', 'userPersonalRating'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.innerText = "";
    });
    
    // 隱藏結果區按鈕
    ['navLink', 'webLink', 'menuPhotoLink', 'btnAiMenu'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.display = 'none';
    });

    if(fullReset) {
        window.places = [];
        window.allSearchResults = [];
        window.eliminatedIds.clear();
        if(window.ctx) window.ctx.clearRect(0, 0, 400, 400);
        window.enableSpinButton(0);
    }
};

window.setControlsDisabled = function(disabled) {
    const ids = ['filterDislike', 'spinMode', 'resultCount', 'mealType', 'geoBtn', 'searchMode'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.disabled = disabled;
    });
};

window.enableSpinButton = function(count) {
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
        if (window.allSearchResults.length > 0) {
            spinBtn.innerText = "商家已全數濾除/淘汰";
        } else {
            spinBtn.innerText = "請先搜尋店家";
        }
    }
};

window.drawWheel = function() {
    const numOptions = window.places.length;
    if(window.ctx) window.ctx.clearRect(0, 0, 400, 400);
    if (numOptions === 0) return;
    
    const arcSize = (2 * Math.PI) / numOptions;
    const startAngleOffset = -Math.PI / 2;

    window.places.forEach((place, i) => {
        const angle = startAngleOffset + (i * arcSize);
        if(window.ctx) {
            window.ctx.fillStyle = `hsl(${i * (360 / numOptions)}, 70%, 60%)`;
            window.ctx.beginPath();
            window.ctx.moveTo(200, 200);
            window.ctx.arc(200, 200, 200, angle, angle + arcSize);
            window.ctx.fill();
            window.ctx.stroke();

            window.ctx.save();
            window.ctx.translate(200, 200);
            window.ctx.rotate(angle + arcSize / 2);
            let fontSize = 16; if (numOptions > 20) fontSize = 12; if (numOptions > 30) fontSize = 10;
            window.ctx.fillStyle = "white"; window.ctx.font = `bold ${fontSize}px Arial`;
            let text = place.name; if (text.length > 8) text = text.substring(0, 7) + "..";
            window.ctx.fillText(text, 60, 5);
            window.ctx.restore();
        }
    });
};
