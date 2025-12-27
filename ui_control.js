// ================== ui_control.js : 介面控制與 API 驗證 ==================

// 顯示教學內容 (含圖片)
window.showGuide = function(platform) {
    const container = document.getElementById('guide-content');
    if(!container) return;
    
    // 切換頁籤樣式
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    const buttons = document.querySelectorAll('.tab-btn');
    if(platform==='desktop' && buttons[0]) buttons[0].classList.add('active');
    if(platform==='android' && buttons[1]) buttons[1].classList.add('active');
    if(platform==='ios' && buttons[2]) buttons[2].classList.add('active');

    // 載入對應平台資料
    const data = window.guideData[platform];
    if (!data) return;

    let html = `<h3>${data.title}</h3>`;
    data.steps.forEach(step => {
        // 如果有圖片路徑，則插入 img 標籤
        let imgHtml = step.img ? `<div class="step-image-container"><img src="${step.img}" alt="Step Image"></div>` : '';
        html += `<div class="step-card"><div class="step-header"><div class="step-title">${step.title}</div></div>${imgHtml}<div class="step-content"><p>${step.desc}</p></div></div>`;
    });
    container.innerHTML = html;
};

// 載入自訂關鍵字到設定頁面
window.populateSetupKeywords = function() {
    const mapping = {'kw_breakfast':'breakfast','kw_lunch':'lunch','kw_afternoon_tea':'afternoon_tea','kw_dinner':'dinner','kw_late_night':'late_night','kw_noodles_rice':'noodles_rice','kw_western_steak':'western_steak','kw_dessert':'dessert','kw_all':'all'};
    for (const [id, key] of Object.entries(mapping)) {
        const input = document.getElementById(id);
        if (input && window.activeKeywordDict[key]) input.value = window.activeKeywordDict[key];
    }
};

// 載入一般偏好設定 (含 Gemini 模型)
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
            
            // Gemini Model 設定回填
            if(prefs.geminiModel) {
                const modelSelect = document.getElementById('geminiModelSelect');
                if(modelSelect) {
                    // 若選單尚未載入模型，先建立一個暫時選項，避免空白
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

// 驗證 Gemini Key 並取得可用模型列表
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
        
        // 過濾出支援 generateContent (文字生成) 的模型
        const models = data.models.filter(m => m.supportedGenerationMethods.includes("generateContent"));
        
        const select = document.getElementById('geminiModelSelect');
        select.innerHTML = ""; // 清空舊選項
        
        if(models.length === 0) throw new Error("此 Key 無法存取任何生成模型");

        models.forEach(m => {
            const opt = document.createElement('option');
            // 只取 models/gemini-1.5-flash 這種格式的 id (去除 models/ 前綴)
            const modelId = m.name.replace('models/', '');
            opt.value = modelId;
            opt.innerText = `${m.displayName} (${modelId})`;
            select.appendChild(opt);
        });

        // 智慧選擇預設值：優先選 flash，其次 pro，否則選第一個
        let defaultModel = models.find(m => m.name.includes('flash'));
        if (!defaultModel) defaultModel = models.find(m => m.name.includes('pro'));
        if (!defaultModel) defaultModel = models[0];
        
        select.value = defaultModel.name.replace('models/', '');

        alert(`✅ Gemini Key 驗證成功！\n已載入 ${models.length} 個可用模型。`);
        
    } catch(e) {
        alert("❌ Gemini 驗證失敗：" + e.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
};

// 測試選中的 Gemini 模型是否能正常運作
window.testSelectedGeminiModel = async function() {
    const key = document.getElementById('userGeminiKey').value.trim();
    const model = document.getElementById('geminiModelSelect').value;
    
    if(!key) return alert("請先輸入 Key");
    if(!model || model.includes("請先")) return alert("請先驗證 Key 並從清單中選擇模型");

    const btn = event.target; // 取得被按下的按鈕
    const originalText = btn.innerText;
    btn.innerText = "測試中...";
    btn.disabled = true;

    try {
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        const requestBody = {
            contents: [{ parts: [{ text: "請用繁體中文說一句簡短的問候語。" }] }]
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        
        if (data.candidates && data.candidates[0].content) {
            alert(`✅ 測試成功！\n模型 (${model}) 回應：\n"${data.candidates[0].content.parts[0].text}"`);
        } else {
            throw new Error(JSON.stringify(data));
        }
    } catch(e) {
        alert("❌ 測試失敗：" + e.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
};

// Google Maps API Key 驗證與儲存流程
window.validateAndSaveKey = async function() {
    const inputKey = document.getElementById('userApiKey').value.trim();
    if (!inputKey) return alert("請輸入 Google Maps API Key");

    const btn = document.querySelector('.start-btn'); // 搜尋 class 為 start-btn 的按鈕
    if(!btn) return; // 防呆

    const originalText = btn.innerText;
    btn.innerText = "驗證中...";
    btn.disabled = true;

    // 清除舊的 script 以防干擾 (如果使用者重複點擊驗證)
    const oldScript = document.getElementById('google-maps-script');
    if(oldScript) oldScript.remove();

    // 定義全域錯誤攔截 (當 Key 無效時 Google Maps 會觸發此函式)
    window.gm_authFailure = () => {
        alert("❌ 驗證失敗：Google 拒絕了此 Key。\n\n常見原因：\n1. Key 抄寫錯誤\n2. 該專案未啟用 Billing (需綁定信用卡)\n3. 網域限制 (Referrer) 設定錯誤");
        btn.innerText = originalText;
        btn.disabled = false;
        // 移除失敗的 script
        const failedScript = document.getElementById('google-maps-script');
        if(failedScript) failedScript.remove();
    };

    // 動態載入 Maps API 進行測試
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${inputKey}&libraries=places,geometry&callback=onMapsApiValidationSuccess`;
    script.async = true;

    // 若載入成功 (Key 格式正確)，會呼叫此回調
    window.onMapsApiValidationSuccess = async () => {
        try {
            // 為了保險，先移除錯誤監聽，避免非同步的錯誤導致誤報
            window.gm_authFailure = () => {}; 

            // 1. 測試 Geocoding API (地址解析)
            const geocoder = new google.maps.Geocoder();
            await new Promise((resolve, reject) => {
                geocoder.geocode({ 'address': 'Taipei' }, (results, status) => {
                    if (status === 'OK' || status === 'ZERO_RESULTS') resolve();
                    else reject(`Geocoding API 未啟用或異常 (${status})`);
                });
            });

            // 2. 測試 Places API (找餐廳)
            const dummyDiv = document.createElement('div');
            const placesService = new google.maps.places.PlacesService(dummyDiv);
            await new Promise((resolve, reject) => {
                placesService.findPlaceFromQuery({ query: 'Restaurant', fields: ['name'] }, (results, status) => {
                    if (status === 'OK' || status === 'ZERO_RESULTS') resolve();
                    else reject(`Places API 未啟用或異常 (${status})`);
                });
            });

            // 3. 測試 Distance Matrix API (算距離)
            const distService = new google.maps.DistanceMatrixService();
            await new Promise((resolve, reject) => {
                distService.getDistanceMatrix({
                    origins: [{lat: 25.03, lng: 121.56}],
                    destinations: [{lat: 25.04, lng: 121.57}],
                    travelMode: 'DRIVING'
                }, (response, status) => {
                    if (status === 'OK') resolve();
                    else reject(`Distance Matrix API 未啟用或異常 (${status})`);
                });
            });

            // 全部通過
            alert("✅ 驗證成功！所有必要 API 皆已啟用且運作正常。");
            window.saveAndStart(true); // 呼叫 script.js 中的儲存函式 (true = 跳過重複載入)

        } catch (err) {
            alert(`⚠️ API Key 有效，但缺少部分權限：\n${err}\n\n請前往 Google Cloud Console 啟用對應 API。`);
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
            delete window.onMapsApiValidationSuccess; // 清理全域函式
        }
    };

    // 網路連線錯誤處理
    script.onerror = () => {
        alert("❌ 無法連線至 Google Maps 伺服器，請檢查您的網路連線。");
        btn.innerText = originalText;
        btn.disabled = false;
    };

    document.head.appendChild(script);
};
