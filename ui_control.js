// ================== ui_control.js : 介面控制與 API 驗證 ==================

// 【修復】補回遺失的 loadUserKeywords 函式
window.loadUserKeywords = function() {
    const savedKw = localStorage.getItem('food_wheel_custom_keywords');
    if (savedKw) {
        try { 
            window.activeKeywordDict = { ...window.defaultKeywordDict, ...JSON.parse(savedKw) }; 
        } catch (e) { 
            console.error("關鍵字載入失敗，重置為預設值", e);
            window.activeKeywordDict = { ...window.defaultKeywordDict }; 
        }
    } else {
        window.activeKeywordDict = { ...window.defaultKeywordDict };
    }
    console.log("Keywords Loaded:", window.activeKeywordDict);
};

window.showGuide = function(platform) {
    const container = document.getElementById('guide-content');
    if(!container) return;
    
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const buttons = document.querySelectorAll('.tab-btn');
    if(platform==='desktop' && buttons[0]) buttons[0].classList.add('active');
    if(platform==='android' && buttons[1]) buttons[1].classList.add('active');
    if(platform==='ios' && buttons[2]) buttons[2].classList.add('active');

    const data = window.guideData[platform];
    if (!data) return;

    let html = `<h3>${data.title}</h3>`;
    data.steps.forEach(step => {
        let imgHtml = step.img ? `<div class="step-image-container"><img src="${step.img}" alt="Step Image"></div>` : '';
        html += `<div class="step-card"><div class="step-header"><div class="step-title">${step.title}</div></div>${imgHtml}<div class="step-content"><p>${step.desc}</p></div></div>`;
    });
    container.innerHTML = html;
};

window.populateSetupKeywords = function() {
    console.log("Populating Keywords...");
    const mapping = {'kw_breakfast':'breakfast','kw_lunch':'lunch','kw_afternoon_tea':'afternoon_tea','kw_dinner':'dinner','kw_late_night':'late_night','kw_noodles_rice':'noodles_rice','kw_western_steak':'western_steak','kw_dessert':'dessert','kw_all':'all'};
    for (const [id, key] of Object.entries(mapping)) {
        const input = document.getElementById(id);
        if (input && window.activeKeywordDict && window.activeKeywordDict[key]) {
            input.value = window.activeKeywordDict[key];
        }
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
            
            if(prefs.geminiModel) {
                const modelSelect = document.getElementById('geminiModelSelect');
                if(modelSelect) {
                    if(modelSelect.options.length <= 1) {
                        modelSelect.innerHTML = `<option value="${prefs.geminiModel}" selected>${prefs.geminiModel}</option>`;
                    } else {
                        modelSelect.value = prefs.geminiModel;
                    }
                }
            }
        } catch (e) { console.error("設定載入失敗", e); }
    }
};

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
        
        const models = data.models.filter(m => m.supportedGenerationMethods.includes("generateContent"));
        const select = document.getElementById('geminiModelSelect');
        select.innerHTML = ""; 
        
        if(models.length === 0) throw new Error("此 Key 無法存取任何生成模型");

        models.forEach(m => {
            const opt = document.createElement('option');
            const modelId = m.name.replace('models/', '');
            opt.value = modelId;
            opt.innerText = `${m.displayName} (${modelId})`;
            select.appendChild(opt);
        });

        let defaultModel = models.find(m => m.name.includes('flash')) || models.find(m => m.name.includes('pro')) || models[0];
        select.value = defaultModel.name.replace('models/', '');

        alert(`✅ Gemini Key 驗證成功！`);
    } catch(e) {
        alert("❌ Gemini 驗證失敗：" + e.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
};

window.testSelectedGeminiModel = async function() {
    const key = document.getElementById('userGeminiKey').value.trim();
    const model = document.getElementById('geminiModelSelect').value;
    
    if(!key) return alert("請先輸入 Key");
    if(!model || model.includes("請先")) return alert("請先驗證 Key 並選擇模型");

    const btn = event.target;
    const originalText = btn.innerText;
    btn.innerText = "測試中...";
    btn.disabled = true;

    try {
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        const requestBody = { contents: [{ parts: [{ text: "Hello" }] }] };
        const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
        const data = await response.json();
        
        if (data.candidates) alert(`✅ 測試成功！模型回應正常。`);
        else throw new Error(JSON.stringify(data));
    } catch(e) {
        alert("❌ 測試失敗：" + e.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
};

window.validateAndSaveKey = async function() {
    const inputKey = document.getElementById('userApiKey').value.trim();
    if (!inputKey) return alert("請輸入 Google Maps API Key");

    const btn = document.querySelector('.start-btn');
    if(!btn) return;
    const originalText = btn.innerText;
    btn.innerText = "驗證中...";
    btn.disabled = true;

    const oldScript = document.getElementById('google-maps-script');
    if(oldScript) oldScript.remove();

    window.gm_authFailure = () => {
        alert("❌ 驗證失敗：Google 拒絕了此 Key。\n常見原因：Key 錯誤或未綁定帳單。");
        btn.innerText = originalText;
        btn.disabled = false;
        const failedScript = document.getElementById('google-maps-script');
        if(failedScript) failedScript.remove();
    };

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${inputKey}&libraries=places,geometry&callback=onMapsApiValidationSuccess`;
    script.async = true;

    window.onMapsApiValidationSuccess = async () => {
        try {
            window.gm_authFailure = () => {}; 

            const geocoder = new google.maps.Geocoder();
            await new Promise((resolve, reject) => {
                geocoder.geocode({ 'address': 'Taipei' }, (results, status) => {
                    if (status === 'OK' || status === 'ZERO_RESULTS') resolve();
                    else reject(`Geocoding API 未啟用 (${status})`);
                });
            });

            // 驗證成功，嘗試儲存
            // 【修正】使用 try-catch 包裹 saveAndStart，避免內部錯誤被誤判為 API 錯誤
            try {
                window.saveAndStart(true); 
                alert("✅ 驗證成功！設定已儲存。");
            } catch (saveError) {
                console.error("Save failed:", saveError);
                alert("✅ API 驗證通過，但在儲存設定時發生錯誤：" + saveError.message);
            }

        } catch (err) {
            alert(`⚠️ API Key 有效，但缺少部分權限：\n${err}`);
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
            delete window.onMapsApiValidationSuccess;
        }
    };

    script.onerror = () => {
        alert("❌ 無法連線至 Google Maps 伺服器。");
        btn.innerText = originalText;
        btn.disabled = false;
    };

    document.head.appendChild(script);
};

window.saveAndStart = function(skipLoad = false) {
    console.log("Saving settings...");
    const inputKey = document.getElementById('userApiKey').value.trim();
    const geminiKeyEl = document.getElementById('userGeminiKey');
    const geminiKey = geminiKeyEl ? geminiKeyEl.value.trim() : "";
    
    // 【修正】增加防呆，避免元素找不到導致報錯
    const getVal = (id) => {
        const el = document.getElementById(id);
        return el ? el.value : "";
    };

    const userPrefs = {
        searchMode: getVal('setupSearchMode'),
        minRating: getVal('setupMinRating'),
        transport: getVal('setupTransport'),
        maxTime: getVal('setupMaxTime'),
        priceLevel: getVal('setupPriceLevel'),
        resultCount: getVal('setupResultCount'),
        spinMode: getVal('setupSpinMode'),
        geminiModel: getVal('geminiModelSelect')
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
    if(savedGeminiKey && document.getElementById('userGeminiKey')) {
        document.getElementById('userGeminiKey').value = savedGeminiKey;
    }
    
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
    console.log("App Initializing...");
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
