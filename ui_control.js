// ================== ui_control.js : 介面控制與 API 驗證 ==================

window.showGuide = function(platform) {
    const container = document.getElementById('guide-content');
    if(!container) return;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
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
        if (input && window.activeKeywordDict[key]) input.value = window.activeKeywordDict[key];
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
        } catch (e) { console.error("設定載入失敗", e); }
    }
};

window.validateAndSaveKey = async function() {
    const inputKey = document.getElementById('userApiKey').value.trim();
    if (!inputKey) return alert("請輸入 API Key");

    const btn = document.querySelector('.start-btn');
    const originalText = btn.innerText;
    btn.innerText = "驗證中...";
    btn.disabled = true;

    // 攔截 Google Maps 的全域驗證失敗回呼
    window.gm_authFailure = () => {
        alert("❌ 驗證失敗：Google 拒絕了此 Key。\n請檢查：\n1. Key 是否抄寫正確？\n2. 是否已在 Google Cloud 綁定帳單？");
        btn.innerText = originalText;
        btn.disabled = false;
        // 移除失敗的 script 避免干擾
        const oldScript = document.getElementById('google-maps-script');
        if(oldScript) oldScript.remove();
    };

    // 移除舊的 Script (如果有的話)
    const oldScript = document.getElementById('google-maps-script');
    if(oldScript) oldScript.remove();

    const script = document.createElement('script');
    script.id = 'google-maps-script'; // 給予 ID 方便管理
    script.src = `https://maps.googleapis.com/maps/api/js?key=${inputKey}&libraries=places,geometry&callback=onMapsApiValidationSuccess`;
    script.async = true;

    window.onMapsApiValidationSuccess = async () => {
        // 如果這個函式執行了，表示 Maps JS API 載入成功，但仍需檢查其他 API 權限
        try {
            const geocoder = new google.maps.Geocoder();
            await new Promise((resolve, reject) => {
                geocoder.geocode({ 'address': 'Taipei' }, (results, status) => {
                    if (status === 'OK' || status === 'ZERO_RESULTS') resolve();
                    else reject(`Geocoding API 異常 (${status}) - 請確認已啟用此 API`);
                });
            });

            const dummyDiv = document.createElement('div');
            const placesService = new google.maps.places.PlacesService(dummyDiv);
            await new Promise((resolve, reject) => {
                placesService.findPlaceFromQuery({ query: 'Restaurant', fields: ['name'] }, (results, status) => {
                    if (status === 'OK' || status === 'ZERO_RESULTS') resolve();
                    else reject(`Places API 異常 (${status}) - 請確認已啟用此 API`);
                });
            });

            // 驗證通過
            alert("✅ 驗證成功！所有必要 API 皆已啟用。");
            window.saveAndStart(true); 

        } catch (err) {
            alert(`⚠️ API Key 有效，但缺少部分權限：\n${err}`);
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
            // 清理 callback
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
    
    // 重新載入儲存的 Key
    const savedKey = localStorage.getItem('food_wheel_api_key');
    if(savedKey) document.getElementById('userApiKey').value = savedKey;
    const savedGeminiKey = localStorage.getItem('food_wheel_gemini_key');
    if(savedGeminiKey) document.getElementById('userGeminiKey').value = savedGeminiKey;
    
    // 重新載入偏好設定與關鍵字
    window.populateSetupKeywords(); 
    window.populateSetupGeneralPrefs(); 
};

window.loadGoogleMapsScript = function(apiKey) {
    // 檢查是否已經載入過
    if (typeof google !== 'undefined' && google.maps) { 
        window.initApp(); 
        return; 
    }
    
    // 避免重複加入 script tag
    if(document.getElementById('google-maps-script')) return;

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true; script.defer = true;
    script.onload = () => { 
        document.getElementById('setup-screen').style.display = 'none'; 
        document.getElementById('app-screen').style.display = 'block'; 
        window.initApp(); 
    };
    script.onerror = () => { 
        alert("Google Maps API 載入失敗，請檢查 Key 是否正確"); 
        localStorage.removeItem('food_wheel_api_key'); 
        location.reload(); 
    };
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
