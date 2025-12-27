// ================== ui_control.js : 介面控制與 API 驗證 ==================

window.showGuide = function(platform) {
    const container = document.getElementById('guide-content');
    if(!container) return;
    
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    // 這裡簡單模擬切換樣式，實際專案可依 class 判斷
    const buttons = document.querySelectorAll('.tab-btn');
    if(platform==='desktop' && buttons[0]) buttons[0].classList.add('active');
    if(platform==='android' && buttons[1]) buttons[1].classList.add('active');
    if(platform==='ios' && buttons[2]) buttons[2].classList.add('active');

    const data = window.guideData[platform];
    let html = `<h3>${data.title}</h3>`;
    data.steps.forEach(step => {
        html += `<div class="step-card"><div class="step-header"><div class="step-title">${step.title}</div></div><div class="step-content"><p>${step.desc}</p></div></div>`;
    });
    container.innerHTML = html;
};

window.populateSetupKeywords = function() {
    const mapping = {'kw_breakfast':'breakfast','kw_lunch':'lunch','kw_afternoon_tea':'afternoon_tea','kw_dinner':'dinner','kw_late_night':'late_night','kw_noodles_rice':'noodles_rice','kw_western_steak':'western_steak','kw_dessert':'dessert','kw_all':'all'};
    for (const [id, key] of Object.entries(mapping)) {
        const input = document.getElementById(id);
        if (input) input.value = window.activeKeywordDict[key];
    }
};

window.populateSetupGeneralPrefs = function() {
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
};

// 重點：API Key 驗證與儲存
window.validateAndSaveKey = async function() {
    const inputKey = document.getElementById('userApiKey').value.trim();
    if (!inputKey) return alert("請輸入 API Key");

    const btn = document.querySelector('.start-btn');
    const originalText = btn.innerText;
    btn.innerText = "驗證中...";
    btn.disabled = true;

    // 定義全域回呼，捕捉驗證失敗
    window.gm_authFailure = () => {
        alert("❌ API Key 驗證失敗：Google 拒絕了此 Key。\n請檢查：\n1. Key 是否抄寫正確？\n2. Google Cloud 是否已綁定計費帳戶？");
        btn.innerText = originalText;
        btn.disabled = false;
    };

    // 嘗試動態載入 Script 進行測試
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${inputKey}&libraries=places,geometry&callback=onMapsApiValidationSuccess`;
    script.async = true;

    window.onMapsApiValidationSuccess = async () => {
        try {
            // 1. 測試 Geocoding API
            const geocoder = new google.maps.Geocoder();
            await new Promise((resolve, reject) => {
                geocoder.geocode({ 'address': 'Taipei' }, (results, status) => {
                    if (status === 'OK' || status === 'ZERO_RESULTS') resolve();
                    else reject(`Geocoding API 異常 (${status})`);
                });
            });

            // 2. 測試 Places API
            const dummyDiv = document.createElement('div');
            const placesService = new google.maps.places.PlacesService(dummyDiv);
            await new Promise((resolve, reject) => {
                placesService.findPlaceFromQuery({ query: 'Restaurant', fields: ['name'] }, (results, status) => {
                    if (status === 'OK' || status === 'ZERO_RESULTS') resolve();
                    else reject(`Places API 異常 (${status})`);
                });
            });

            // 3. 測試 Distance Matrix API
            const distService = new google.maps.DistanceMatrixService();
            await new Promise((resolve, reject) => {
                distService.getDistanceMatrix({
                    origins: [{lat: 25.03, lng: 121.56}],
                    destinations: [{lat: 25.04, lng: 121.57}],
                    travelMode: 'DRIVING'
                }, (response, status) => {
                    if (status === 'OK') resolve();
                    else reject(`Distance Matrix API 異常 (${status})`);
                });
            });

            // 全部通過
            alert("✅ 驗證成功！所有必要 API 皆已啟用。");
            window.saveAndStart(true); // 傳入 true 表示已驗證

        } catch (err) {
            alert(`⚠️ API Key 格式正確，但權限不足：\n${err}\n\n請前往 Google Cloud Console 啟用對應 API。`);
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
            delete window.onMapsApiValidationSuccess;
            delete window.gm_authFailure;
        }
    };

    script.onerror = () => {
        alert("❌ 無法連線至 Google Maps 伺服器，請檢查網路。");
        btn.innerText = originalText;
        btn.disabled = false;
    };

    document.head.appendChild(script);
};

window.saveAndStart = function(skipLoad = false) {
    const inputKey = document.getElementById('userApiKey').value.trim();
    const geminiKey = document.getElementById('userGeminiKey').value.trim();
    
    if (inputKey.length < 20) return alert("Google Maps API Key 格式不正確");
    
    const userPrefs = {
        searchMode: document.getElementById('setupSearchMode').value,
        minRating: document.getElementById('setupMinRating').value,
        transport: document.getElementById('setupTransport').value,
        maxTime: document.getElementById('setupMaxTime').value,
        priceLevel: document.getElementById('setupPriceLevel').value,
        resultCount: document.getElementById('setupResultCount').value,
        spinMode: document.getElementById('setupSpinMode') ? document.getElementById('setupSpinMode').value : 'repeat'
    };
    
    const customKw = {}; 
    const mapping = {'kw_breakfast':'breakfast','kw_lunch':'lunch','kw_afternoon_tea':'afternoon_tea','kw_dinner':'dinner','kw_late_night':'late_night','kw_noodles_rice':'noodles_rice','kw_western_steak':'western_steak','kw_dessert':'dessert','kw_all':'all'};
    for (const [id, key] of Object.entries(mapping)) {
        const input = document.getElementById(id);
        customKw[key] = (input && input.value.trim() !== "") ? input.value.trim() : window.defaultKeywordDict[key];
    }
    
    window.activeKeywordDict = customKw;
    localStorage.setItem('food_wheel_custom_keywords', JSON.stringify(customKw));
    localStorage.setItem('food_wheel_api_key', inputKey);
    if(geminiKey) localStorage.setItem('food_wheel_gemini_key', geminiKey);
    localStorage.setItem('food_wheel_prefs', JSON.stringify(userPrefs));
    
    if (!skipLoad) {
        window.loadGoogleMapsScript(inputKey);
    } else {
        // 已在驗證時載入，直接進 App
        document.getElementById('setup-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'block';
        window.initApp();
    }
};

window.resetApiKey = function() {
    if(confirm("確定要重設所有 API Key 嗎？")) { 
        localStorage.removeItem('food_wheel_api_key'); 
        localStorage.removeItem('food_wheel_gemini_key');
        location.reload(); 
    }
};

window.editPreferences = function() {
    document.getElementById('app-screen').style.display = 'none';
    document.getElementById('setup-screen').style.display = 'block';
    const savedKey = localStorage.getItem('food_wheel_api_key');
    if(savedKey) document.getElementById('userApiKey').value = savedKey;
    const savedGeminiKey = localStorage.getItem('food_wheel_gemini_key');
    if(savedGeminiKey) document.getElementById('userGeminiKey').value = savedGeminiKey;
    
    window.populateSetupKeywords(); 
    window.populateSetupGeneralPrefs(); 
};

window.loadGoogleMapsScript = function(apiKey) {
    if (typeof google !== 'undefined') { window.initApp(); return; }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true; script.defer = true;
    script.onload = () => { 
        document.getElementById('setup-screen').style.display = 'none'; 
        document.getElementById('app-screen').style.display = 'block'; 
        window.initApp(); 
    };
    script.onerror = () => { alert("API 載入失敗"); localStorage.removeItem('food_wheel_api_key'); location.reload(); };
    document.head.appendChild(script);
};

window.initApp = function() { 
    window.applyPreferencesToApp(); 
    window.autoSelectMealType(); 
    window.initLocation(); 
    window.resetGame(true); 
};

window.applyPreferencesToApp = function() {
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
};
