// ui_control.js
// 負責 DOM 操作、頁面切換、教學顯示

window.onload = () => {
    // Canvas 初始化
    canvas = document.getElementById('wheel');
    if(canvas) ctx = canvas.getContext('2d');
    menuCanvas = document.getElementById('menuWheel');
    if(menuCanvas) menuCtx = menuCanvas.getContext('2d');

    // 載入資料
    loadUserRatings();
    loadUserKeywords();
    
    // UI 初始化
    populateSetupKeywords();
    populateSetupGeneralPrefs();

    // 檢查 API Key
    const savedKey = localStorage.getItem('food_wheel_api_key');
    const savedGeminiKey = localStorage.getItem('food_wheel_gemini_key');
    
    if (savedKey) {
        document.getElementById('userApiKey').value = savedKey; // 填入輸入框
        loadGoogleMapsScript(savedKey); // 嘗試載入
    } else {
        showSetupScreen();
    }

    if(savedGeminiKey) document.getElementById('userGeminiKey').value = savedGeminiKey;

    // 綁定過濾器
    const filterCheckbox = document.getElementById('filterDislike');
    if (filterCheckbox) {
        filterCheckbox.addEventListener('change', () => { 
            if(typeof refreshWheelData === 'function') refreshWheelData(); 
        });
    }
};

function showSetupScreen() {
    document.getElementById('setup-screen').style.display = 'block';
    document.getElementById('app-screen').style.display = 'none';
}

function showAppScreen() {
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'block';
    if(typeof initApp === 'function') initApp();
}

function loadUserRatings() {
    const saved = localStorage.getItem('food_wheel_user_ratings');
    if (saved) try { userRatings = JSON.parse(saved); } catch(e) {}
}

function loadUserKeywords() {
    const saved = localStorage.getItem('food_wheel_custom_keywords');
    if (saved) try { activeKeywordDict = { ...defaultKeywordDict, ...JSON.parse(saved) }; } catch(e) {}
}

function populateSetupKeywords() {
    const mapping = {'kw_breakfast':'breakfast','kw_lunch':'lunch','kw_afternoon_tea':'afternoon_tea','kw_dinner':'dinner','kw_late_night':'late_night','kw_noodles_rice':'noodles_rice','kw_western_steak':'western_steak','kw_dessert':'dessert','kw_all':'all'};
    for (const [id, key] of Object.entries(mapping)) {
        const input = document.getElementById(id);
        if (input) input.value = activeKeywordDict[key];
    }
}

function populateSetupGeneralPrefs() {
    const prefsJson = localStorage.getItem('food_wheel_prefs');
    if (prefsJson) {
        try {
            const prefs = JSON.parse(prefsJson);
            const setVal = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
            setVal('setupSearchMode', prefs.searchMode);
            setVal('setupMinRating', prefs.minRating);
            setVal('setupSpinMode', prefs.spinMode);
            setVal('setupTransport', prefs.transport);
            setVal('setupMaxTime', prefs.maxTime);
            setVal('setupPriceLevel', prefs.priceLevel);
            setVal('setupResultCount', prefs.resultCount);
        } catch (e) {}
    }
}

function toggleMapsGuide() {
    const area = document.getElementById('maps-guide-area');
    area.style.display = area.style.display === 'none' ? 'block' : 'none';
}

function showGuide(platform) {
    const data = guideData[platform];
    const container = document.getElementById('guide-content');
    container.style.display = 'block'; // 顯示教學區
    
    // Tab 樣式
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    // 簡單處理 active class，實際應用可用更嚴謹的選取
    if(platform === 'desktop') document.querySelectorAll('.tab-btn')[0].classList.add('active');
    if(platform === 'android') document.querySelectorAll('.tab-btn')[1].classList.add('active');
    if(platform === 'ios') document.querySelectorAll('.tab-btn')[2].classList.add('active');

    let html = `<h4>${data.title}</h4>`;
    data.steps.forEach(step => {
        html += `
            <div class="step-card">
                <div class="step-header"><div class="step-title">${step.title}</div></div>
                <div class="step-image-container"><img src="${step.img}" alt="${step.title}"></div>
                <div class="step-content"><p>${step.desc}</p></div>
            </div>`;
    });
    container.innerHTML = html;
}

function toggleGeminiGuide() {
    const area = document.getElementById('gemini-guide-area');
    area.style.display = area.style.display === 'none' ? 'block' : 'none';
}

function saveAndStart() {
    const inputKey = document.getElementById('userApiKey').value.trim();
    const geminiKey = document.getElementById('userGeminiKey').value.trim();
    
    if (inputKey.length < 20) return alert("Google Maps API Key 格式不正確");
    
    // 儲存設定
    const userPrefs = {
        searchMode: document.getElementById('setupSearchMode').value,
        minRating: document.getElementById('setupMinRating').value,
        transport: document.getElementById('setupTransport').value,
        maxTime: document.getElementById('setupMaxTime').value,
        priceLevel: document.getElementById('setupPriceLevel').value,
        resultCount: document.getElementById('setupResultCount').value,
        spinMode: document.getElementById('setupSpinMode') ? document.getElementById('setupSpinMode').value : 'repeat'
    };
    
    // 儲存關鍵字
    const customKw = {}; 
    const mapping = {'kw_breakfast':'breakfast','kw_lunch':'lunch','kw_afternoon_tea':'afternoon_tea','kw_dinner':'dinner','kw_late_night':'late_night','kw_noodles_rice':'noodles_rice','kw_western_steak':'western_steak','kw_dessert':'dessert','kw_all':'all'};
    for (const [id, key] of Object.entries(mapping)) {
        const input = document.getElementById(id);
        customKw[key] = (input && input.value.trim() !== "") ? input.value.trim() : defaultKeywordDict[key];
    }
    activeKeywordDict = customKw;

    // 寫入 LocalStorage
    localStorage.setItem('food_wheel_custom_keywords', JSON.stringify(customKw));
    localStorage.setItem('food_wheel_api_key', inputKey);
    if(geminiKey) localStorage.setItem('food_wheel_gemini_key', geminiKey); 
    else localStorage.removeItem('food_wheel_gemini_key');
    localStorage.setItem('food_wheel_prefs', JSON.stringify(userPrefs));
    
    // 關鍵修正：如果 API 已經載入，直接切換畫面並初始化；否則載入 Script
    if (typeof google !== 'undefined' && google.maps) {
        showAppScreen();
        // 重新讀取偏好並套用
        if(typeof applyPreferencesToApp === 'function') applyPreferencesToApp();
    } else {
        loadGoogleMapsScript(inputKey);
    }
}

function loadGoogleMapsScript(apiKey) {
    if (typeof google !== 'undefined') { showAppScreen(); return; }
    
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true; 
    script.defer = true;
    script.onload = () => { showAppScreen(); };
    script.onerror = () => { alert("Google Maps API 載入失敗，請檢查 Key 是否正確"); showSetupScreen(); };
    document.head.appendChild(script);
}

function editPreferences() {
    showSetupScreen();
    // 重新填入值
    const savedKey = localStorage.getItem('food_wheel_api_key');
    if(savedKey) document.getElementById('userApiKey').value = savedKey;
    const savedGeminiKey = localStorage.getItem('food_wheel_gemini_key');
    if(savedGeminiKey) document.getElementById('userGeminiKey').value = savedGeminiKey;
    populateSetupKeywords(); 
    populateSetupGeneralPrefs(); 
}

function resetApiKey() {
    if(confirm("確定要重設所有資料嗎？")) { 
        localStorage.removeItem('food_wheel_api_key'); 
        localStorage.removeItem('food_wheel_gemini_key');
        localStorage.removeItem('food_wheel_prefs');
        location.reload(); 
    }
}
