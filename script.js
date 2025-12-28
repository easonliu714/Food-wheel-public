// ================== script.js : 入口點與核心互動邏輯 ==================
// Version: 2025-12-28-v7
// Tasks:
// 1. 修正跨日營業時間判斷邏輯 (Manual Check)
// 2. 轉盤結果區增加營業時間免責聲明
// 3. 保持官網直連與電話顯示功能

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

        // 4. 綁定過濾器事件
        const filterCheckbox = document.getElementById('filterDislike');
        if (filterCheckbox) {
            filterCheckbox.addEventListener('change', () => { 
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

// [NEW] 手動計算營業狀態 (處理跨日邏輯)
function checkOpenStatusManual(periods) {
    if (!periods || periods.length === 0) return null; // 無資料
    
    // 檢查是否 24 小時營業 (通常 periods 只有一個且沒有 close)
    if (periods.length === 1 && periods[0].open && !periods[0].close) return true;

    const now = new Date();
    // 將目前時間轉換為：從週日 00:00 開始累積的分鐘數 (0 ~ 10079)
    const currentAbsMinutes = now.getDay() * 24 * 60 + now.getHours() * 60 + now.getMinutes();

    let isOpen = false;

    for (const p of periods) {
        if (!p.open || !p.close) continue;

        const openTime = parseInt(p.open.time);
        const closeTime = parseInt(p.close.time);

        // 計算該時段的開始與結束絕對分鐘數
        let startMin = p.open.day * 24 * 60 + Math.floor(openTime / 100) * 60 + (openTime % 100);
        let endMin = p.close.day * 24 * 60 + Math.floor(closeTime / 100) * 60 + (closeTime % 100);

        // 處理跨週 (例如週六跨週日)
        // 正常情況下 Google 會切成兩段，但如果是單純的結束時間小於開始時間 (跨日)，需要校正
        // Google Places API 規範：若跨日，Close 的 Day 會是隔天。
        // 例如：Mon 11:00 (Day 1) 到 Tue 00:00 (Day 2)。 
        // startMin 會是 1*1440+..., endMin 會是 2*1440+... -> endMin > startMin，這是正常的。
        
        // 唯一特殊情況：如果 Google 回傳的資料結構有些微差異，或者我們需要處理 loopback (週六 -> 週日)
        if (endMin < startMin) {
            endMin += 7 * 24 * 60; // 加一週
        }

        // 判定目前時間是否在區間內
        // 考慮 currentAbsMinutes 可能需要跨週比對 (例如現在是週日早上，但時段是週六跨到週日)
        // 簡單做法：檢查 current 以及 current + 1週
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
            // A. 電話
            if (place.formatted_phone_number) {
                document.getElementById('storePhone').innerText = `📞 ${place.formatted_phone_number}`;
            }

            // B. 官網
            const webBtn = document.getElementById('webLink');
            if (place.website) {
                webBtn.style.display = 'inline-block';
                webBtn.href = place.website;
            } else if (place.url) {
                // webBtn.style.display = 'inline-block'; // 依需求決定是否顯示地圖連結
                // webBtn.href = place.url; 
            }

            // C. 詳細營業狀態計算 (修正版)
            let statusHtml = "";
            let isOpen = false;

            if (place.opening_hours) {
                // [FIX] 優先使用手動計算 (Manual Check)，解決跨日誤判問題
                if (place.opening_hours.periods) {
                    const manualCheck = checkOpenStatusManual(place.opening_hours.periods);
                    if (manualCheck !== null) {
                        isOpen = manualCheck;
                    } else {
                        // fallback
                        isOpen = place.opening_hours.isOpen ? place.opening_hours.isOpen() : place.opening_hours.open_now;
                    }
                } else {
                    // 若無 periods 資料，只能信賴 API
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
            
            // [NEW] 增加免責聲明
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

// 計算下一個營業變化的時間 (保持不變)
function calculateNextStatusTime(openingHours) {
    if (!openingHours || !openingHours.periods) return null;
    const now = new Date();
    const dayMap = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
    const currentDay = now.getDay();
    const isOpen = openingHours.isOpen ? openingHours.isOpen() : openingHours.open_now; // 這裡僅用於判斷要找 Open 還是 Close 時間，可沿用 API
    // 注意：如果 isOpen 被 Manual Check 修正了，這裡的 isOpen 可能會不一致，
    // 但因為這是預測「下一個」時間點，邏輯相對獨立。
    // 為了最精確，我們可以用 checkOpenStatusManual 的結果來決定找 Close 還是 Open。
    
    // 重新取得目前狀態以決定尋找目標
    const manualOpen = checkOpenStatusManual(openingHours.periods);
    const currentlyOpen = (manualOpen !== null) ? manualOpen : isOpen;

    let targetTime = null;
    let minDiff = Infinity;
    const nowAbsMinutes = currentDay * 24 * 60 + now.getHours() * 60 + now.getMinutes();

    openingHours.periods.forEach(period => {
        if (!period.open || !period.close) return;
        
        if (currentlyOpen) {
            // 找 Close
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
            // 找 Open
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
