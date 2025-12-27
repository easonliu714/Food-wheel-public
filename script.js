// script.js - 入口點與事件綁定

window.onload = () => {
    try {
        console.log("Window loaded. Initializing...");

        // 1. 初始化店家轉盤
        window.canvas = document.getElementById('wheel');
        if(window.canvas) window.ctx = window.canvas.getContext('2d');

        // 2. 初始化菜單轉盤
        window.menuCanvas = document.getElementById('menuWheel');
        if(window.menuCanvas) window.menuCtx = window.menuCanvas.getContext('2d');

        // 載入評價紀錄
        const savedRatings = localStorage.getItem('food_wheel_user_ratings');
        if (savedRatings) {
            try { window.userRatings = JSON.parse(savedRatings); } catch(e) { console.error(e); }
        }

        // 載入關鍵字
        if (typeof window.loadUserKeywords === 'function') {
            window.loadUserKeywords();
        } else {
            window.activeKeywordDict = { ...window.defaultKeywordDict };
        }

        // 載入 API Keys
        const savedKey = localStorage.getItem('food_wheel_api_key');
        if (savedKey) {
            window.loadGoogleMapsScript(savedKey);
        } else {
            document.getElementById('setup-screen').style.display = 'block';
            document.getElementById('app-screen').style.display = 'none';
            
            window.populateSetupKeywords(); 
            window.populateSetupGeneralPrefs();
            
            const geminiKey = localStorage.getItem('food_wheel_gemini_key');
            if(geminiKey && document.getElementById('userGeminiKey')) {
                document.getElementById('userGeminiKey').value = geminiKey;
            }

            window.showGuide('desktop');
        }

        // 綁定過濾器
        const filterCheckbox = document.getElementById('filterDislike');
        if (filterCheckbox) {
            filterCheckbox.addEventListener('change', () => { window.refreshWheelData(); });
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
            window.setControlsDisabled(true); 

            const spinAngle = Math.floor(Math.random() * 1800) + 1800; 
            window.currentRotation += spinAngle;
            window.canvas.style.transition = 'transform 4s cubic-bezier(0.15, 0, 0.15, 1)';
            window.canvas.style.transform = `rotate(${window.currentRotation}deg)`;

            // === 轉動時隱藏結果與按鈕 ===
            document.getElementById('storeName').innerText = "命運旋轉中...";
            document.getElementById('storeRating').innerText = "";
            document.getElementById('storeAddress').innerText = "";
            document.getElementById('storeDistance').innerText = "";
            document.getElementById('userPersonalRating').innerText = "";
            
            const btnLike = document.getElementById('btnLike');
            const btnDislike = document.getElementById('btnDislike');
            if(btnLike) btnLike.style.display = 'none';
            if(btnDislike) btnDislike.style.display = 'none';

            ['navLink', 'webLink', 'menuPhotoLink', 'btnAiMenu'].forEach(id => {
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

                    // 顯示結果
                    window.updateWinnerStatus(winner);
                    window.updateHitCountUI(winner.place_id); // 更新次數

                    if (spinMode === 'eliminate') {
                        window.eliminatedIds.add(winner.place_id); 
                        setTimeout(() => {
                            window.canvas.style.transition = 'none';
                            window.currentRotation = 0;
                            window.canvas.style.transform = `rotate(0deg)`;
                            window.refreshWheelData(); // 此處會重繪表格並套用刪除線
                            window.setControlsDisabled(false); 
                        }, 2000); 
                    } else {
                        window.setControlsDisabled(false);
                        spinBtn.disabled = false;
                        window.refreshWheelData(); // 此處會重繪表格，更新次數顯示
                    }
                } catch (error) {
                    console.error("Spin Logic Error:", error);
                    window.setControlsDisabled(false);
                    spinBtn.disabled = false;
                }
            }, 4000);

        } catch (e) {
            console.error("Spin Init Error:", e);
            spinBtn.disabled = false;
            window.setControlsDisabled(false);
        }
    };
}

// === 更新獲勝店家資訊 ===
window.updateWinnerStatus = function(winner) {
    window.currentStoreForMenu = winner; 

    const nameEl = document.getElementById('storeName');
    if(nameEl) nameEl.innerText = "就決定吃：" + winner.name;
    
    const ratingEl = document.getElementById('storeRating');
    if (ratingEl) {
        ratingEl.innerText = winner.rating ? `⭐ ${winner.rating} (${winner.user_ratings_total || 0} 則評價)` : "暫無評價資料";
    }
    
    const address = winner.formatted_address || winner.vicinity || "地址不詳";
    const storeAddressEl = document.getElementById('storeAddress');
    if(storeAddressEl) storeAddressEl.innerText = `⏳ 正在查詢詳細資訊...\n📍 ${address}`;

    // 顯示評價按鈕
    const btnLike = document.getElementById('btnLike');
    const btnDislike = document.getElementById('btnDislike');
    if(btnLike) { btnLike.style.display = 'block'; btnLike.classList.remove('active'); btnLike.onclick = () => window.handleUserRating(winner.place_id, 'like'); }
    if(btnDislike) { btnDislike.style.display = 'block'; btnDislike.classList.remove('active'); btnDislike.onclick = () => window.handleUserRating(winner.place_id, 'dislike'); }
    
    const ratingText = document.getElementById('userPersonalRating');
    if(ratingText) ratingText.innerText = "";
    if (window.userRatings[winner.place_id] === 'like') { if(btnLike) btnLike.classList.add('active'); if(ratingText) ratingText.innerText = "👍 您曾標記：再次回訪"; }
    else if (window.userRatings[winner.place_id] === 'dislike') { if(btnDislike) btnDislike.classList.add('active'); if(ratingText) ratingText.innerText = "💣 您曾標記：踩雷"; }

    // 查詢詳細資料 (Google Places API)
    const service = new google.maps.places.PlacesService(document.createElement('div'));
    service.getDetails({
        placeId: winner.place_id,
        fields: ['opening_hours', 'utc_offset_minutes', 'website', 'url', 'photos']
    }, (place, status) => {
        
        let openStatus = "⚪ 營業時間不明";
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            
            // 1. 營業時間狀態
            if (place.opening_hours) {
                openStatus = window.getDetailedOpeningStatus(place);
            }
            if(storeAddressEl) {
                storeAddressEl.innerHTML = `<strong>${openStatus}</strong><br><span style="font-size: 0.85em; color: #999;">(營業時間僅供參考)</span><br>📍 ${address}`;
            }

            // 2. 顯示連結按鈕
            const navLink = document.getElementById('navLink');
            const webLink = document.getElementById('webLink');
            const menuPhotoLink = document.getElementById('menuPhotoLink');
            const btnAiMenu = document.getElementById('btnAiMenu');

            if (navLink) {
                navLink.style.display = 'inline-block';
                navLink.href = place.url ? place.url : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(winner.name)}&query_place_id=${winner.place_id}`;
            }

            if (webLink && place.website) {
                webLink.style.display = 'inline-block';
                webLink.href = place.website;
            } else if (webLink) {
                webLink.style.display = 'none';
            }

            if (menuPhotoLink) {
                menuPhotoLink.style.display = 'inline-block';
                menuPhotoLink.href = `https://www.google.com/search?q=${encodeURIComponent(winner.name + " 菜單")}&tbm=isch`; 
            }

            const geminiKey = localStorage.getItem('food_wheel_gemini_key');
            if (geminiKey && btnAiMenu) {
                btnAiMenu.style.display = 'inline-block';
            } else if (btnAiMenu) {
                btnAiMenu.style.display = 'none';
            }
            
            if(place.photos) {
                window.currentStoreForMenu.photos = place.photos;
            }
        }
    });

    const distEl = document.getElementById('storeDistance');
    if (winner.realDurationText && distEl) {
         distEl.innerText = `⏱️ 預估耗時：${winner.realDurationText} (${winner.realDistanceText})`;
    }
};

// === 營業時間詳細狀態 ===
window.getDetailedOpeningStatus = function(place) {
    if (!place.opening_hours) return "⚪ 營業時間不明";
    const isOpen = place.opening_hours.isOpen();
    
    // 如果有 periods 資料，嘗試找下一個狀態
    if (place.opening_hours.periods && place.opening_hours.periods.length > 0) {
        // 這裡可以使用 Google Maps 內建的 nextCloseTime / nextOpenTime (如果是較新版 API)
        // 或是簡單回傳狀態
        return isOpen ? "🟢 營業中" : "🔴 已打烊 (請確認營業時間)";
    }
    return isOpen ? "🟢 營業中" : "🔴 已打烊";
};

// === 更新次數統計 ===
window.updateHitCountUI = function(placeId) {
    if (!window.hitCounts[placeId]) window.hitCounts[placeId] = 0;
    window.hitCounts[placeId]++;
    
    // 在 refreshWheelData 之前，先嘗試即時更新 DOM (如果存在)
    const row = document.getElementById(`row-${placeId}`);
    if (row) {
        const countCell = row.querySelector('.hit-count');
        if(countCell) countCell.innerText = window.hitCounts[placeId];
        row.classList.add('active-winner');
        setTimeout(() => row.classList.remove('active-winner'), 2000); 
    }
};

window.handleUserRating = function(placeId, type) {
    if (window.userRatings[placeId] === type) delete window.userRatings[placeId];
    else window.userRatings[placeId] = type;
    localStorage.setItem('food_wheel_user_ratings', JSON.stringify(window.userRatings));
    
    // 重新繪製轉盤以反映顏色變更 (紅/綠)
    window.refreshWheelData();
    // 更新當前顯示的按鈕狀態
    if (window.currentStoreForMenu && window.currentStoreForMenu.place_id === placeId) {
        window.updateWinnerStatus(window.currentStoreForMenu);
    }
};

// 菜單轉盤按鈕
const spinMenuBtn = document.getElementById('spinMenuBtn');
if(spinMenuBtn) {
    spinMenuBtn.onclick = function() {
        if (window.currentMenuData.length === 0) return;
        spinMenuBtn.disabled = true;
        document.getElementById('addToOrderBtn').style.display = 'none';

        const spinAngle = Math.floor(Math.random() * 1800) + 1800; 
        window.menuRotation += spinAngle;
        window.menuCanvas.style.transition = 'transform 3s cubic-bezier(0.15, 0, 0.15, 1)';
        window.menuCanvas.style.transform = `rotate(${window.menuRotation}deg)`;

        setTimeout(() => {
            const numOptions = window.currentMenuData.length;
            const arcSize = 360 / numOptions;
            const actualRotation = window.menuRotation % 360;
            let winningIndex = Math.floor((360 - actualRotation) / arcSize) % numOptions;
            if (winningIndex < 0) winningIndex += numOptions;
            
            const winner = window.currentMenuData[winningIndex];
            document.getElementById('dishName').innerText = winner.name;
            document.getElementById('dishPrice').innerText = `$${winner.price}`;
            
            const addBtn = document.getElementById('addToOrderBtn');
            addBtn.style.display = 'inline-block';
            addBtn.onclick = () => window.addDishToCart(winner);
            
            spinMenuBtn.disabled = false;
        }, 3000);
    };
}
