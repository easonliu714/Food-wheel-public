// ================== script.js : 入口點與核心互動邏輯 ==================
// Version: 2025-12-28-v8
// Tasks:
// 1. 修正跨日營業時間判斷邏輯 (Manual Check)
// 2. 轉盤結果區增加營業時間免責聲明
// 3. [New] 綁定 "增加回訪機率" Checkbox 事件

window.onload = () => {
    try {
        console.log("Window loaded. Starting initialization...");

        // 1. 初始化 Canvas
        window.canvas = document.getElementById('wheel');
        if(window.canvas) window.ctx = window.canvas.getContext('2d');
        window.menuCanvas = document.getElementById('menuWheel');
        if(window.menuCanvas) window.menuCtx = window.menuCanvas.getContext('2d');

        // 2. 載入使用者資料
        const savedRatings = localStorage.getItem('food_wheel_user_ratings');
        if (savedRatings) {
            try { window.userRatings = JSON.parse(savedRatings); } catch(e) { console.error(e); }
        }

        // 載入關鍵字
        if (typeof window.loadUserKeywords === 'function') window.loadUserKeywords();
        else window.activeKeywordDict = { ...window.defaultKeywordDict };

        // 3. 檢查 Key 並決定流程
        const savedKey = localStorage.getItem('food_wheel_api_key');
        
        if (typeof window.populateSetupKeywords === 'function') window.populateSetupKeywords(); 
        if (typeof window.populateSetupGeneralPrefs === 'function') window.populateSetupGeneralPrefs();
        
        const geminiKey = localStorage.getItem('food_wheel_gemini_key');
        if(geminiKey && document.getElementById('userGeminiKey')) {
            document.getElementById('userGeminiKey').value = geminiKey;
        }

        if (savedKey) {
            console.log("Saved key found, loading Maps SDK...");
            if (typeof window.loadGoogleMapsScript === 'function') {
                window.loadGoogleMapsScript(savedKey);
            } else {
                console.error("loadGoogleMapsScript function missing!");
                alert("系統錯誤：UI 模組未正確載入");
            }
        } else {
            console.log("No key found, showing Setup screen.");
            document.getElementById('setup-screen').style.display = 'block';
            document.getElementById('app-screen').style.display = 'none';
            if (typeof window.showGuide === 'function') window.showGuide('desktop');
        }

        // 4. 綁定過濾器與加權器事件
        const filterCheckbox = document.getElementById('filterDislike');
        if (filterCheckbox) {
            filterCheckbox.addEventListener('change', () => { 
                if (typeof window.refreshWheelData === 'function') window.refreshWheelData(); 
            });
        }
        // [NEW] 綁定加權回訪事件
        const boostLikeCheckbox = document.getElementById('boostLike');
        if (boostLikeCheckbox) {
            boostLikeCheckbox.addEventListener('change', () => { 
                if (typeof window.refreshWheelData === 'function') window.refreshWheelData(); 
            });
        }

    } catch (err) {
        console.error("Initialization Crash:", err);
        alert("程式初始化失敗：" + err.message);
    }
};

// Spin 按鈕邏輯
const spinBtn = document.getElementById('spinBtn');
if(spinBtn) {
    spinBtn.onclick = () => {
        try {
            if (window.places.length === 0) return;
            
            let spinMode = 'repeat';
            const spinModeEl = document.getElementById('spinMode'); 
            if (spinModeEl) spinMode = spinModeEl.value;
            
            spinBtn.disabled = true; 
            
            const spinAngle = Math.floor(Math.random() * 1800) + 1800; 
            window.currentRotation += spinAngle;
            window.canvas.style.transition = 'transform 4s cubic-bezier(0.15, 0, 0.15, 1)';
            window.canvas.style.transform = `rotate(${window.currentRotation}deg)`;

            // 轉動時隱藏結果與操作按鈕
            ['storeName', 'storeRating', 'storeAddress', 'storePhone', 'storeStatus', 'storeDistance', 'userPersonalRating'].forEach(id => {
                const el = document.getElementById(id);
                if(el) {
                    if(id==='storeName') el.innerText = "命運旋轉中...";
                    else el.innerText = "";
                }
            });
            
            ['navLink', 'webLink', 'menuPhotoLink', 'btnAiMenu', 'btnLike', 'btnDislike'].forEach(id => {
                const el = document.getElementById(id);
                if(el) el.style.display = 'none';
            });

            setTimeout(() => {
                try {
                    const numOptions = window.places.length;
                    const arcSize = 360 / numOptions;
                    const actualRotation = window.currentRotation % 360;
                    let winningIndex = Math.floor((360 - actualRotation) / arcSize) % numOptions;
                    if (winningIndex < 0) winningIndex += numOptions;
                    
                    const winner = window.places[winningIndex];
                    if(!winner) throw new Error("Winner undefined");

                    updateResultUI(winner);

                    if (spinMode === 'eliminate') {
                        // 淘汰模式下，如果該店家因為加權佔據了兩個位置，我們需要把它的 ID 加入淘汰名單
                        // refreshWheelData 在下次繪製時，會根據 ID 排除，所以兩個位置都會同時消失，邏輯正確。
                        window.eliminatedIds.add(winner.place_id); 
                        setTimeout(() => {
                            window.canvas.style.transition = 'none';
                            window.currentRotation = 0;
                            window.canvas.style.transform = `rotate(0deg)`;
                            if (typeof window.refreshWheelData === 'function') window.refreshWheelData(); 
                        }, 2000); 
                    } else {
                        spinBtn.disabled = false;
                        if (typeof window.refreshWheelData === 'function') window.refreshWheelData(); 
                    }
                } catch (error) {
                    console.error("Spin Logic Error:", error);
                    spinBtn.disabled = false;
                }
            }, 4000);

        } catch (e) {
            console.error("Spin Init Error:", e);
            spinBtn.disabled = false;
        }
    };
}

// Check Open Status Manual (Keep original logic)
function checkOpenStatusManual(periods) {
    if (!periods || periods.length === 0) return null; 
    if (periods.length === 1 && periods[0].open && !periods[0].close) return true;

    const now = new Date();
    const currentAbsMinutes = now.getDay() * 24 * 60 + now.getHours() * 60 + now.getMinutes();

    let isOpen = false;

    for (const p of periods) {
        if (!p.open || !p.close) continue;

        const openTime = parseInt(p.open.time);
        const closeTime = parseInt(p.close.time);

        let startMin = p.open.day * 24 * 60 + Math.floor(openTime / 100) * 60 + (openTime % 100);
        let endMin = p.close.day * 24 * 60 + Math.floor(closeTime / 100) * 60 + (closeTime % 100);

        if (endMin < startMin) {
            endMin += 7 * 24 * 60; 
        }

        if ((currentAbsMinutes >= startMin && currentAbsMinutes < endMin) ||
            ((currentAbsMinutes + 7*24*60) >= startMin && (currentAbsMinutes + 7*24*60) < endMin)) {
            isOpen = true;
            break;
        }
    }
    return isOpen;
}

// 輔助函式：更新結果顯示
function updateResultUI(p) {
    document.getElementById('storeName').innerText = p.name;
    document.getElementById('storeRating').innerText = p.rating ? `⭐ ${p.rating} (${p.user_ratings_total})` : "無評價";
    document.getElementById('storeAddress').innerText = p.vicinity || p.formatted_address;
    
    // 初始化
    document.getElementById('storePhone').innerText = "";
    document.getElementById('storeStatus').innerText = "讀取詳細營業時間...";
    document.getElementById('storeDistance').innerText = p.realDistanceText ? `🚗 路程：${p.realDistanceText} / ${p.realDurationText}` : "";

    ['navLink', 'menuPhotoLink', 'btnAiMenu', 'btnLike', 'btnDislike'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.display = 'inline-block';
    });
    document.getElementById('webLink').style.display = 'none';

    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name)}&destination_place_id=${p.place_id}`;
    document.getElementById('navLink').href = mapUrl;
    
    const menuQuery = `${p.name} ${p.vicinity || ""} 菜單`;
    document.getElementById('menuPhotoLink').href = `https://www.google.com/search?q=${encodeURIComponent(menuQuery)}&tbm=isch`;

    window.currentStoreForMenu = p;
    document.getElementById('btnAiMenu').style.display = 'inline-block';

    // 呼叫 Details
    const service = new google.maps.places.PlacesService(document.createElement('div'));
    service.getDetails({
        placeId: p.place_id,
        fields: ['name', 'website', 'url', 'formatted_phone_number', 'opening_hours']
    }, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            if (place.formatted_phone_number) {
                document.getElementById('storePhone').innerText = `📞 ${place.formatted_phone_number}`;
            }
            const webBtn = document.getElementById('webLink');
            if (place.website) {
                webBtn.style.display = 'inline-block';
                webBtn.href = place.website;
            } else if (place.url) {
                // webBtn.style.display = 'inline-block';
                // webBtn.href = place.url; 
            }

            let statusHtml = "";
            let isOpen = false;

            if (place.opening_hours) {
                if (place.opening_hours.periods) {
                    const manualCheck = checkOpenStatusManual(place.opening_hours.periods);
                    if (manualCheck !== null) {
                        isOpen = manualCheck;
                    } else {
                        isOpen = place.opening_hours.isOpen ? place.opening_hours.isOpen() : place.opening_hours.open_now;
                    }
                } else {
                    isOpen = place.opening_hours.isOpen ? place.opening_hours.isOpen() : place.opening_hours.open_now;
                }

                const nextStatus = calculateNextStatusTime(place.opening_hours);
                
                if (isOpen) {
                    statusHtml = `<span style="color:#27ae60; font-weight:bold;">🟢 營業中</span>`;
                    if (nextStatus) statusHtml += ` <span style="font-size:0.9em; color:#555;">・預計 ${nextStatus} 結束營業</span>`;
                } else {
                    statusHtml = `<span style="color:#c0392b; font-weight:bold;">🔴 休息中</span>`;
                    if (nextStatus) statusHtml += ` <span style="font-size:0.9em; color:#555;">・預計 ${nextStatus} 開始營業</span>`;
                }
            } else {
                statusHtml = "營業時間未知";
            }
            statusHtml += `<br><span style="font-size:0.8rem; color:#999; display:inline-block; margin-top:5px;">(營業時間僅供參考，請以商家實際狀況為準)</span>`;
            document.getElementById('storeStatus').innerHTML = statusHtml;
        } else {
            document.getElementById('storeStatus').innerText = "無法取得詳細資訊";
        }
    });

    if(window.hitCounts[p.place_id] !== undefined) window.hitCounts[p.place_id]++;
    updateRatingUI(p.place_id);
    document.getElementById('btnLike').onclick = () => ratePlace(p.place_id, 'like');
    document.getElementById('btnDislike').onclick = () => ratePlace(p.place_id, 'dislike');
}

function calculateNextStatusTime(openingHours) {
    if (!openingHours || !openingHours.periods) return null;
    const now = new Date();
    const dayMap = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
    const currentDay = now.getDay();
    const isOpen = openingHours.isOpen ? openingHours.isOpen() : openingHours.open_now; 
    const manualOpen = checkOpenStatusManual(openingHours.periods);
    const currentlyOpen = (manualOpen !== null) ? manualOpen : isOpen;

    let targetTime = null;
    let minDiff = Infinity;
    const nowAbsMinutes = currentDay * 24 * 60 + now.getHours() * 60 + now.getMinutes();

    openingHours.periods.forEach(period => {
        if (!period.open || !period.close) return;
        
        if (currentlyOpen) {
            let closeDay = period.close.day;
            let closeTime = parseInt(period.close.time);
            let closeAbsMinutes = closeDay * 24 * 60 + Math.floor(closeTime/100)*60 + (closeTime%100);
            
            if (closeAbsMinutes < nowAbsMinutes) closeAbsMinutes += 7 * 24 * 60;
            let diff = closeAbsMinutes - nowAbsMinutes;
            if (diff >= 0 && diff < minDiff) {
                minDiff = diff;
                targetTime = { day: closeDay, time: period.close.time };
            }
        } else {
            let openDay = period.open.day;
            let openTime = parseInt(period.open.time);
            let openAbsMinutes = openDay * 24 * 60 + Math.floor(openTime/100)*60 + (openTime%100);
            
            if (openAbsMinutes < nowAbsMinutes) openAbsMinutes += 7 * 24 * 60;
            let diff = openAbsMinutes - nowAbsMinutes;
            if (diff >= 0 && diff < minDiff) {
                minDiff = diff;
                targetTime = { day: openDay, time: period.open.time };
            }
        }
    });

    if (targetTime) {
        const hour = targetTime.time.substring(0, 2);
        const min = targetTime.time.substring(2);
        return `${dayMap[targetTime.day]} ${hour}:${min}`;
    }
    return null;
}

function ratePlace(placeId, type) {
    if (window.userRatings[placeId] === type) {
        delete window.userRatings[placeId]; 
    } else {
        window.userRatings[placeId] = type;
    }
    localStorage.setItem('food_wheel_user_ratings', JSON.stringify(window.userRatings));
    updateRatingUI(placeId);
    if (typeof window.refreshWheelData === 'function') window.refreshWheelData();
}

function updateRatingUI(placeId) {
    const status = window.userRatings[placeId];
    const btnLike = document.getElementById('btnLike');
    const btnDislike = document.getElementById('btnDislike');
    const label = document.getElementById('userPersonalRating');
    
    btnLike.classList.remove('active');
    btnDislike.classList.remove('active');
    label.innerText = "";
    
    if (status === 'like') {
        btnLike.classList.add('active');
        label.innerText = "❤️ 您標記為「回訪」";
        label.style.color = "#27ae60";
    } else if (status === 'dislike') {
        btnDislike.classList.add('active');
        label.innerText = "💣 您標記為「踩雷」";
        label.style.color = "#c0392b";
    }
}
