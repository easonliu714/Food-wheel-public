// ================== ai_menu.js ==================
// Version: 2025-12-28-v15-ImageSave

window.menuSort = { column: null, direction: 'asc' };

// Modal 控制函式
window.openImageModal = function(src) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImg');
    if(modal && modalImg) {
        modal.style.display = "block";
        modalImg.src = src;
    }
}

window.closeImageModal = function() {
    document.getElementById('imageModal').style.display = "none";
}

window.onclick = function(event) {
    const modal = document.getElementById('imageModal');
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

window.saveMenuData = function(placeId, menuItems) {
    if (!placeId || !menuItems) return;
    let allMenus = {};
    try { allMenus = JSON.parse(localStorage.getItem('food_wheel_menus')) || {}; } catch(e) {}
    allMenus[placeId] = menuItems;
    localStorage.setItem('food_wheel_menus', JSON.stringify(allMenus));
};

// [MODIFIED] 新增：儲存菜單圖片的函式
window.saveMenuImages = function(placeId, newImages, mode) {
    let allImages = {};
    try { allImages = JSON.parse(localStorage.getItem('food_wheel_menu_images')) || {}; } catch(e) {}
    
    // 只儲存圖片的 Base64 數據字串，不存整個結構，節省空間
    const newImageStrings = newImages.map(imgObj => imgObj.data);
    
    let currentList = allImages[placeId] || [];

    if (mode === 'overwrite') {
        currentList = newImageStrings;
    } else { // append
        // 簡單去重：如果完全一樣的 base64 就不重複加
        newImageStrings.forEach(imgStr => {
            if(!currentList.includes(imgStr)) {
                currentList.push(imgStr);
            }
        });
    }
    allImages[placeId] = currentList;
    
    try {
        localStorage.setItem('food_wheel_menu_images', JSON.stringify(allImages));
    } catch(e) {
        console.error(e);
        alert("⚠️ 儲存圖片失敗：可能是瀏覽器儲存空間不足。");
    }
};

window.openAiMenuSelector = function() {
    if (!window.currentStoreForMenu) return;
    let allMenus = {};
    try { allMenus = JSON.parse(localStorage.getItem('food_wheel_menus')) || {}; } catch(e) {}
    const savedData = allMenus[window.currentStoreForMenu.place_id];

    document.getElementById('main-view').style.display = 'none';
    document.getElementById('menu-screen').style.display = 'block';
    document.getElementById('menuStoreTitle').innerText = `菜單：${window.currentStoreForMenu.name}`;
    
    document.getElementById('maps-photo-grid').innerHTML = '';
    window.selectedPhotoDataList = [];

    window.menuSort = { column: null, direction: 'asc' };

    document.getElementById('reuploadOptions').style.display = 'none';
    document.getElementById('btnCancelUpload').style.display = 'none';

    if (savedData && savedData.length > 0) {
        window.initAiMenuSystem(savedData);
    } else {
        window.showUploadStep();
    }
};

window.showUploadStep = function() {
    document.getElementById('ai-step-1').style.display = 'block';
    document.getElementById('ai-step-2').style.display = 'none';
    document.getElementById('ai-loading').style.display = 'none';
    document.getElementById('btnAnalyzeMenu').disabled = true;
    document.getElementById('btnAnalyzeMenu').style.opacity = '0.5';
};

window.triggerReupload = function() {
    window.showUploadStep();
    document.getElementById('reuploadOptions').style.display = 'block';
    document.getElementById('btnCancelUpload').style.display = 'inline-block';
    document.getElementById('maps-photo-grid').innerHTML = '';
    window.selectedPhotoDataList = [];
    document.getElementById('menuFileUpload').value = '';
};

window.cancelReupload = function() {
    if(window.fullMenuData && window.fullMenuData.length > 0) {
        document.getElementById('ai-step-1').style.display = 'none';
        document.getElementById('ai-step-2').style.display = 'block';
    } else {
        window.closeMenuSystem();
    }
};

window.closeMenuSystem = function() {
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('main-view').style.display = 'block';
};

window.handleFileUpload = function(input) {
    if (input.files && input.files.length > 0) {
        if(!window.selectedPhotoDataList) window.selectedPhotoDataList = [];
        
        const grid = document.getElementById('maps-photo-grid');
        
        let loadedCount = 0;
        Array.from(input.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = function(e) {
                window.selectedPhotoDataList.push({
                    data: e.target.result,
                    mimeType: file.type
                });
                const div = document.createElement('div');
                div.className = 'photo-item selected';
                div.innerHTML = `<img src="${e.target.result}" title="點擊放大" onclick="window.openImageModal('${e.target.result}')">`;
                grid.appendChild(div);

                loadedCount++;
                if (loadedCount === input.files.length) {
                    const btn = document.getElementById('btnAnalyzeMenu');
                    btn.disabled = false;
                    btn.style.opacity = '1';
                    btn.innerText = `🤖 圖片已就緒 (共${window.selectedPhotoDataList.length}張)，開始 AI 解析`;
                }
            };
            reader.readAsDataURL(file);
        });
    }
};

window.analyzeSelectedPhotos = async function() {
    if (!window.selectedPhotoDataList || window.selectedPhotoDataList.length === 0) return;
    const geminiKey = localStorage.getItem('food_wheel_gemini_key');
    if (!geminiKey) return alert("請先在設定頁面輸入 Google Gemini API Key");
    const selectedModel = document.getElementById('geminiModelSelect').value || 'gemini-1.5-flash';
    document.getElementById('ai-loading').style.display = 'block';

    try {
        const contentsParts = [
            { text: "請分析以下菜單圖片，擷取所有菜色名稱與價格。請嚴格只回傳一個 JSON 陣列，格式為：[{\"category\": \"類別\", \"name\": \"菜名\", \"price\": 數字}], 若無類別則歸類為'主餐'。不要包含 Markdown 格式。" }
        ];
        window.selectedPhotoDataList.forEach(photo => {
            const base64Data = photo.data.split(',')[1];
            contentsParts.push({ inlineData: { mimeType: photo.mimeType, data: base64Data } });
        });
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${geminiKey}`;
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: contentsParts }] })
        });
        const data = await response.json();
        if (data.candidates && data.candidates[0].content) {
            let text = data.candidates[0].content.parts[0].text;
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            try {
                let newMenuJson = JSON.parse(text);
                if (Array.isArray(newMenuJson) && newMenuJson.length > 0) {
                    
                    let finalMenuData = newMenuJson;
                    const reuploadDiv = document.getElementById('reuploadOptions');
                    
                    // 預設模式為覆蓋 (First time or Explicit Overwrite)
                    let mode = 'overwrite';

                    if (reuploadDiv.style.display !== 'none' && window.fullMenuData && window.fullMenuData.length > 0) {
                        mode = document.querySelector('input[name="uploadMode"]:checked').value;
                        if (mode === 'append') {
                            finalMenuData = window.fullMenuData.concat(newMenuJson);
                            alert(`✅ 已成功新增 ${newMenuJson.length} 筆資料至現有菜單！`);
                        } else {
                            alert(`✅ 已覆蓋舊資料，共取得 ${newMenuJson.length} 筆資料！`);
                        }
                    }

                    // [MODIFIED] 同步儲存圖片
                    window.saveMenuImages(window.currentStoreForMenu.place_id, window.selectedPhotoDataList, mode);
                    
                    window.saveMenuData(window.currentStoreForMenu.place_id, finalMenuData);
                    window.initAiMenuSystem(finalMenuData);
                } else { throw new Error("解析結果為空"); }
            } catch (jsonErr) { throw new Error("AI 回傳格式無法讀取"); }
        } else { throw new Error("AI 回應格式錯誤"); }
    } catch (e) {
        alert("AI 解析失敗: " + e.message);
        document.getElementById('ai-loading').style.display = 'none';
    }
};

window.initAiMenuSystem = function(menuData) {
    window.fullMenuData = menuData;
    window.shoppingCart = [];
    
    const categories = [...new Set(menuData.map(item => item.category || '主餐'))];
    const catSelect = document.getElementById('menuCategorySelect');
    catSelect.innerHTML = "";
    
    const allOpt = document.createElement('option');
    allOpt.value = 'all';
    allOpt.innerText = '♾️ 全部 (All)';
    catSelect.appendChild(allOpt);

    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.innerText = cat;
        catSelect.appendChild(opt);
    });

    document.getElementById('ai-loading').style.display = 'none';
    document.getElementById('ai-step-1').style.display = 'none';
    document.getElementById('ai-step-2').style.display = 'block';
    
    const spinBtn = document.getElementById('spinMenuBtn');
    if(spinBtn) spinBtn.onclick = window.spinMenu;
    
    // [MODIFIED] 讀取並顯示已儲存的圖片
    const previewContainer = document.getElementById('menuImagesPreview');
    if (previewContainer) {
        previewContainer.innerHTML = '';
        
        let savedImages = [];
        try {
            const allImages = JSON.parse(localStorage.getItem('food_wheel_menu_images')) || {};
            savedImages = allImages[window.currentStoreForMenu.place_id] || [];
        } catch(e) {}

        if (savedImages.length > 0) {
            savedImages.forEach(base64Str => {
                const img = document.createElement('img');
                img.src = base64Str;
                img.onclick = () => window.openImageModal(base64Str);
                previewContainer.appendChild(img);
            });
            previewContainer.style.display = 'flex';
        } else {
            previewContainer.style.display = 'none';
        }
    }

    window.updateCartUI();
    window.updateMenuWheel();
    window.renderFullMenuTable();
};

window.updateMenuWheel = function() {
    const cat = document.getElementById('menuCategorySelect').value;
    if (cat === 'all') {
        window.currentMenuData = [...window.fullMenuData];
    } else {
        window.currentMenuData = window.fullMenuData.filter(item => (item.category || '主餐') === cat);
    }
    window.drawMenuWheel();
};

window.drawMenuWheel = function() {
    const numOptions = window.currentMenuData.length;
    if(window.menuCtx) window.menuCtx.clearRect(0, 0, 400, 400);
    if (numOptions === 0) return;
    const arcSize = (2 * Math.PI) / numOptions;
    const startAngleOffset = -Math.PI / 2;
    const radius = 160; const centerX = 200; const centerY = 200;
    window.currentMenuData.forEach((item, i) => {
        const angle = startAngleOffset + (i * arcSize);
        if(window.menuCtx) {
            window.menuCtx.fillStyle = `hsl(${i * (360 / numOptions)}, 60%, 85%)`;
            window.menuCtx.beginPath();
            window.menuCtx.moveTo(centerX, centerY);
            window.menuCtx.arc(centerX, centerY, radius, angle, angle + arcSize);
            window.menuCtx.fill();
            window.menuCtx.stroke();
            window.menuCtx.save();
            window.menuCtx.translate(centerX, centerY);
            window.menuCtx.rotate(angle + arcSize / 2);
            let fontSize = 14; if (numOptions > 20) fontSize = 10;
            window.menuCtx.fillStyle = "#333";
            window.menuCtx.font = `bold ${fontSize}px Arial`;
            let text = item.name; if (text.length > 6) text = text.substring(0, 5) + "..";
            window.menuCtx.fillText(text, 60, 5);
            window.menuCtx.restore();
        }
    });
    window.menuRotation = 0;
    window.menuCanvas.style.transform = `rotate(0deg)`;
    window.menuCanvas.style.transition = 'none';
    document.getElementById('dishName').innerText = "準備選菜...";
    document.getElementById('dishPrice').innerText = "";
    document.getElementById('addToOrderBtn').style.display = 'none';
};

window.spinMenu = function() {
    if (!window.currentMenuData || window.currentMenuData.length === 0) return;
    const spinBtn = document.getElementById('spinMenuBtn');
    spinBtn.disabled = true;
    const spinAngle = Math.floor(Math.random() * 1800) + 1800; 
    window.menuRotation = (window.menuRotation || 0) + spinAngle;
    window.menuCanvas.style.transition = 'transform 3s cubic-bezier(0.15, 0, 0.15, 1)';
    window.menuCanvas.style.transform = `rotate(${window.menuRotation}deg)`;
    document.getElementById('dishName').innerText = "選菜中...";
    document.getElementById('dishPrice').innerText = "";
    document.getElementById('addToOrderBtn').style.display = 'none';
    setTimeout(() => {
        const numOptions = window.currentMenuData.length;
        const arcSize = 360 / numOptions;
        const actualRotation = window.menuRotation % 360;
        let winningIndex = Math.floor((360 - actualRotation) / arcSize) % numOptions;
        if (winningIndex < 0) winningIndex += numOptions;
        const winner = window.currentMenuData[winningIndex];
        
        const category = winner.category || '主餐';
        document.getElementById('dishName').innerText = `[${category}] ${winner.name}`;
        document.getElementById('dishPrice').innerText = `$${winner.price}`;
        
        const addBtn = document.getElementById('addToOrderBtn');
        addBtn.style.display = 'inline-block';
        addBtn.onclick = () => window.addDishToCart(winner);
        spinBtn.disabled = false;
    }, 3000);
};

window.addDishToCart = function(dish) {
    window.shoppingCart.push(dish);
    window.updateCartUI();
};

window.updateCartUI = function() {
    const list = document.getElementById('cartList');
    list.innerHTML = "";
    let total = 0;
    window.shoppingCart.forEach((item, index) => {
        total += item.price;
        const li = document.createElement('li');
        li.innerHTML = `<span>${item.name}</span> <span>$${item.price} <button onclick="removeCartItem(${index})" style="background:none;border:none;cursor:pointer;color:#c0392b;">❌</button></span>`;
        list.appendChild(li);
    });
    document.getElementById('cartTotalDisplay').innerText = `$${total}`;
};

window.removeCartItem = function(index) {
    window.shoppingCart.splice(index, 1);
    window.updateCartUI();
};

window.checkout = function() {
    if (window.shoppingCart.length === 0) return alert("購物車是空的！");
    let total = 0;
    let msg = `🧾 【${window.currentStoreForMenu.name}】 點餐明細\n------------------\n`;
    window.shoppingCart.forEach(item => {
        msg += `${item.name} ... $${item.price}\n`;
        total += item.price;
    });
    msg += `------------------\n總計：$${total}`;
    alert(msg);
};

window.editMenuItem = function(index, field) {
    const item = window.fullMenuData[index];
    const oldValue = item[field] || (field==='category'?'主餐':'');
    const fieldName = field === 'name' ? '菜名' : (field === 'price' ? '價格' : '類別');
    
    const newValue = prompt(`修改 ${fieldName}：`, oldValue);
    if (newValue !== null && newValue !== oldValue) {
        if (field === 'price') {
            const price = parseInt(newValue);
            if (!isNaN(price)) item.price = price;
            else return alert("價格必須是數字");
        } else { 
            item[field] = newValue; 
        }
        window.saveMenuData(window.currentStoreForMenu.place_id, window.fullMenuData);
        window.renderFullMenuTable();
        window.updateMenuWheel();
    }
};

window.sortMenu = function(column) {
    const sortState = window.menuSort;
    if (sortState.column === column) {
        sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
        sortState.column = column;
        sortState.direction = 'asc';
    }
    
    const dir = sortState.direction === 'asc' ? 1 : -1;
    
    window.fullMenuData.sort((a, b) => {
        let valA, valB;
        if (column === 'category') {
            valA = a.category || ''; valB = b.category || '';
            return valA.localeCompare(valB, 'zh-Hant') * dir;
        } else if (column === 'name') {
            valA = a.name || ''; valB = b.name || '';
            return valA.localeCompare(valB, 'zh-Hant') * dir;
        } else if (column === 'price') {
            valA = a.price || 0; valB = b.price || 0;
            return (valA - valB) * dir;
        }
        return 0;
    });

    window.renderFullMenuTable();
};

window.getMenuSortIndicator = function(column) {
    if (window.menuSort.column !== column) return '';
    return window.menuSort.direction === 'asc' ? ' ▲' : ' ▼';
};

window.renderFullMenuTable = function() {
    const container = document.getElementById('fullMenuContainer');
    if (!container) return;
    
    let html = `<p style="font-size:0.8rem; color:#666; text-align:center;">(點擊類別、菜名或價格可修改)</p>
    <table class="menu-table"><thead><tr>
        <th onclick="window.sortMenu('category')" style="cursor:pointer; user-select:none;">類別${window.getMenuSortIndicator('category')}</th>
        <th onclick="window.sortMenu('name')" style="cursor:pointer; user-select:none;">名稱${window.getMenuSortIndicator('name')}</th>
        <th onclick="window.sortMenu('price')" style="cursor:pointer; user-select:none;">價格${window.getMenuSortIndicator('price')}</th>
        <th>操作</th>
    </tr></thead><tbody>`;
    
    window.fullMenuData.forEach((item, idx) => {
        html += `<tr>
            <td onclick="editMenuItem(${idx}, 'category')">${item.category || '主餐'}</td>
            <td onclick="editMenuItem(${idx}, 'name')" style="cursor:pointer; text-decoration:underline dashed; text-underline-offset:4px;">${item.name}</td>
            <td onclick="editMenuItem(${idx}, 'price')" style="cursor:pointer;">$${item.price}</td>
            <td><button class="small-btn" onclick='window.addDishToCart(window.fullMenuData[${idx}])'>➕</button></td>
        </tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;
};
