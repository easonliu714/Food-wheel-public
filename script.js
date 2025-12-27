// script.js - 入口點與事件綁定

window.onload = () => {
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

    // 載入關鍵字設定
    window.loadUserKeywords();

    // 載入 API Keys
    const savedKey = localStorage.getItem('food_wheel_api_key');
    if (savedKey) {
        window.loadGoogleMapsScript(savedKey);
    } else {
        // 顯示設定畫面
        document.getElementById('setup-screen').style.display = 'block';
        document.getElementById('app-screen').style.display = 'none';
        
        window.populateSetupKeywords(); 
        window.populateSetupGeneralPrefs();
        
        // 填入儲存的 Gemini Key (如果有)
        const geminiKey = localStorage.getItem('food_wheel_gemini_key');
        if(geminiKey) document.getElementById('userGeminiKey').value = geminiKey;

        // 【修正】預設展開電腦版教學，避免留白
        window.showGuide('desktop');
    }

    // 綁定過濾器
    const filterCheckbox = document.getElementById('filterDislike');
    if (filterCheckbox) {
        filterCheckbox.addEventListener('change', () => { window.refreshWheelData(); });
    }
};

// 確保按鈕綁定正確
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

            // 隱藏結果區按鈕
            ['navLink', 'webLink', 'menuPhotoLink', 'btnAiMenu'].forEach(id => {
                document.getElementById(id).style.display = 'none';
            });
            document.getElementById('storeName').innerText = "命運旋轉中...";

            setTimeout(() => {
                try {
                    const numOptions = window.places.length;
                    const arcSize = 360 / numOptions;
                    const actualRotation = window.currentRotation % 360;
                    let winningIndex = Math.floor((360 - actualRotation) / arcSize) % numOptions;
                    if (winningIndex < 0) winningIndex += numOptions;
                    
                    const winner = window.places[winningIndex];
                    if(!winner) throw new Error("Winner undefined");

                    window.updateWinnerStatus(winner);
                    window.updateHitCountUI(winner.place_id);

                    if (spinMode === 'eliminate') {
                        window.eliminatedIds.add(winner.place_id); 
                        setTimeout(() => {
                            window.canvas.style.transition = 'none';
                            window.currentRotation = 0;
                            window.canvas.style.transform = `rotate(0deg)`;
                            window.refreshWheelData(); 
                            window.setControlsDisabled(false); 
                        }, 2000); 
                    } else {
                        window.setControlsDisabled(false);
                        spinBtn.disabled = false;
                        window.refreshWheelData(); 
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
