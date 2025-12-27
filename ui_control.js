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
        let imgHtml = step.img ? `<div class="step-image-container"><img src="${step.img}" alt="Step Image"></div>` : '';
        html += `<div class="step-card"><div class="step-header"><div class="step-title">${step.title}</div></div>${imgHtml}<div class="step-content"><p>${step.desc}</p></div></div>`;
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
            
            // Gemini Model 設定
            if(prefs.geminiModel) {
                const modelSelect = document.getElementById('geminiModelSelect');
                if(modelSelect) {
                    // 如果選項不存在，先加一個預設的，等到驗證時會更新
                    if(modelSelect.options.length === 0) {
                        modelSelect.innerHTML = `<option value="${prefs.geminiModel}" selected>${prefs.geminiModel}</option>`;
                    } else {
                        modelSelect.value = prefs.geminiModel;
                    }
                }
            }
        } catch (e) { console.error("設定載入失敗", e); }
    }
};

// 驗證 Gemini Key 並取得模型列表
window.validateGeminiKey = async function() {
    const key = document.getElementById('userGeminiKey').value.trim();
    if(!key) return alert("請先輸入 Gemini API Key");
    
    const btn = document.getElementById('btnValidateGemini');
    const originalText = btn.innerText;
    btn.innerText = "驗證中...";
    btn.disabled = true;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await response.json();
        
        if(data.error) throw new Error(data.error.message);
        
        // 過濾出支援 generateContent 的模型
        const models = data.models.filter(m => m.supportedGenerationMethods.includes("generateContent"));
        
        const select = document.getElementById('geminiModelSelect');
        select.innerHTML = ""; // 清空
        
        if(models.length === 0) throw new Error("此 Key 無法存取任何生成模型");

        models.forEach(m => {
            const opt = document.createElement('option');
            // 只取 models/gemini-1.5-flash 這種格式的 id
            opt.value = m.name.replace('models/', '');
            opt.innerText = m.displayName + ` (${m.name.replace('models/', '')})`;
            select.appendChild(opt);
        });

        // 預設選中 flash 或 pro
        const defaultModel = models.find(m => m.name.includes('flash')) || models[0];
        select.value = defaultModel.name.replace('models/', '');

        alert(`✅ Gemini Key 驗證成功！\n已載入 ${models.length} 個可用模型。`);
        
    } catch(e) {
        alert("❌ Gemini 驗證失敗：" + e.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
};

// Maps API Key 驗證
window.validateAndSaveKey = async function() {
    const inputKey = document.getElementById('userApiKey').value.trim();
    if (!inputKey) return alert("請輸入 Google Maps API Key");

    const btn = document.querySelector('.start-btn');
    const originalText = btn.innerText;
    btn.innerText = "驗證中...";
    btn.disabled = true;

    // 清除舊的 script 以防干擾
    const oldScript = document.getElementById('google-maps-script');
    if(oldScript) oldScript.remove();

    // 預防性定義錯誤回調，但稍後會移除
    window.gm_authFailure = () => {
        alert("❌ 驗證失敗：Google 拒絕了此 Key。\n常見原因：\n1. Key 輸入錯誤\n2. 未啟用 Billing (綁定信用卡)");
        btn.innerText = originalText;
        btn.disabled = false;
    };

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${inputKey}&libraries=places,geometry&callback=onMapsApiValidationSuccess`;
    script.async = true;

    window.onMapsApiValidationSuccess = async () => {
        // 成功載入 JS，現在測試實際功能
        try {
            // 移除錯誤監聽，避免稍後的非同步錯誤導致誤報
            window.gm_authFailure = () => {}; 

            // 1. 測試 Geocoding
            const geocoder = new google.maps.Geocoder();
            await new Promise((resolve, reject) => {
                geocoder.geocode({ 'address': 'Taipei' }, (results, status) => {
                    if (status === 'OK' || status === 'ZERO_RESULTS') resolve();
                    else reject(`Geocoding API 未啟用 (${status})`);
                });
            });

            // 2. 測試 Places
            const dummyDiv = document.createElement('div');
            const placesService = new google.maps.places.PlacesService(dummyDiv);
            await new Promise((resolve, reject) => {
                placesService.findPlaceFromQuery({ query: 'Restaurant', fields: ['name'] }, (results, status) => {
                    if (status === 'OK' || status === 'ZERO_RESULTS') resolve();
                    else reject(`Places API 未啟用 (${status})`);
                });
            });

            // 3. 測試 Distance Matrix
            const distService = new google.maps.DistanceMatrixService();
            await new Promise((resolve, reject) => {
                distService.getDistanceMatrix({
                    origins: [{lat: 25.03, lng: 121.56}],
                    destinations: [{lat: 25.04, lng: 121.57}],
                    travelMode: 'DRIVING'
                }, (response, status) => {
                    if (status === 'OK') resolve();
                    else reject(`Distance Matrix API 未啟用 (${status})`);
                });
            });

            alert("✅ 驗證成功！所有必要 API 皆已啟用。");
            window.saveAndStart(true); 

        } catch (err) {
            alert(`⚠️ API Key 有效，但權限不足：\n${err}\n請至 Google Cloud Console 啟用對應 API。`);
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
            delete window.onMapsApiValidationSuccess;
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
    const geminiModel = document.getElementById('geminiModelSelect').value;
    
    if (inputKey.length < 20) return alert("Google Maps API Key 格式不正確");
    
    const userPrefs = {
        searchMode: document.getElementById('setupSearchMode').value,
        minRating: document.getElementById('setupMinRating').value,
        transport: document.getElementById('setupTransport').value,
        maxTime: document.getElementById('setupMaxTime').value,
        priceLevel: document.getElementById('setupPriceLevel').value,
        resultCount: document.getElementById('setupResultCount').value,
        spinMode: document.getElementById('setupSpinMode') ? document.getElementById('setupSpinMode').value : 'repeat',
        geminiModel: geminiModel // 儲存選擇的模型
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
    
    const savedKey = localStorage.getItem('food_wheel_api_key');
    if(savedKey) document.getElementById('userApiKey').value = savedKey;
    const savedGeminiKey = localStorage.getItem('food_wheel_gemini_key');
    if(savedGeminiKey) document.getElementById('userGeminiKey').value = savedGeminiKey;
    
    window.populateSetupKeywords(); 
    window.populateSetupGeneralPrefs(); 
};

window.loadGoogleMapsScript = function(apiKey) {
    if (typeof google !== 'undefined' && google.maps) { window.initApp(); return; }
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
        alert("API 載入失敗"); 
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
