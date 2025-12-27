// ai_menu.js
// 負責圖片處理、Gemini API 呼叫、菜單轉盤

let currentStoreForMenu = null;
let currentMenuData = [];
let fullMenuData = [];
let shoppingCart = [];
let menuRotation = 0;
let menuCanvas = null;
let menuCtx = null;
let selectedImages = []; // 儲存多張圖片的 { data: base64, mime: type }

// 開啟菜單介面
function openAiMenuSelector() {
    if (!currentStoreForMenu) return;
    document.getElementById('main-view').style.display = 'none';
    document.getElementById('menu-screen').style.display = 'block';
    document.getElementById('menuStoreTitle').innerText = `菜單：${currentStoreForMenu.name}`;
    
    // 重置
    document.getElementById('ai-step-1').style.display = 'block';
    document.getElementById('ai-step-2').style.display = 'none';
    document.getElementById('photo-preview-area').innerHTML = '';
    selectedImages = [];
    document.getElementById('btnAnalyzeMenu').disabled = true;
    document.getElementById('btnAnalyzeMenu').style.opacity = '0.5';
}

function closeMenuSystem() {
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('main-view').style.display = 'block';
}

// 處理多張圖片上傳
function handleFileUpload(input) {
    if (input.files) {
        Array.from(input.files).forEach(file => {
            processImage(file);
        });
    }
    input.value = ''; // 清空以允許重複上傳相同檔案
}

// 核心：圖片壓縮處理 (解決 400 Bad Request)
function processImage(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.src = e.target.result;
        img.onload = function() {
            // 壓縮邏輯
            const canvas = document.createElement('canvas');
            const MAX_SIZE = 1024; // 限制長邊為 1024px
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
                if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
            } else {
                if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // 轉為 JPEG 且品質 0.8
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
            
            // 加入列表
            selectedImages.push({
                data: compressedBase64.split(',')[1],
                mime: 'image/jpeg'
            });

            // 更新預覽 UI
            updatePreviewUI(compressedBase64, selectedImages.length - 1);
            
            const btn = document.getElementById('btnAnalyzeMenu');
            btn.disabled = false;
            btn.style.opacity = '1';
        };
    };
    reader.readAsDataURL(file);
}

function updatePreviewUI(base64, index) {
    const container = document.getElementById('photo-preview-area');
    const wrapper = document.createElement('div');
    wrapper.className = 'preview-wrapper';
    wrapper.innerHTML = `
        <img src="${base64}" class="preview-thumb">
        <div class="remove-img-btn" onclick="removeImage(this, ${index})">x</div>
    `;
    container.appendChild(wrapper);
}

function removeImage(el, index) {
    // 簡單移除 DOM，資料陣列較難同步移除，這邊做視覺移除即可，
    // 實際送出時可能會有冗餘，但為求簡單暫不重構 Index
    el.parentElement.remove();
    // 標記為 null
    selectedImages[index] = null;
    
    // 檢查是否還有有效圖片
    const hasValid = selectedImages.some(img => img !== null);
    if (!hasValid) {
        document.getElementById('btnAnalyzeMenu').disabled = true;
        document.getElementById('btnAnalyzeMenu').style.opacity = '0.5';
    }
}

// 測試 Key
async function testGeminiKey() {
    const key = document.getElementById('userGeminiKey').value.trim();
    if(!key) return alert("請輸入 Key");
    
    const btn = event.target;
    const originalText = btn.innerText;
    btn.innerText = "測試中...";
    
    try {
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ contents: [{ parts: [{ text: "Hello" }] }] })
        });
        
        if (response.ok) alert("✅ Key 有效！");
        else alert("❌ Key 無效或額度已滿 (Error: " + response.status + ")");
    } catch(e) {
        alert("❌ 測試失敗: " + e.message);
    } finally {
        btn.innerText = originalText;
    }
}

async function analyzeSelectedPhotos() {
    const validImages = selectedImages.filter(img => img !== null);
    if (validImages.length === 0) return;
    
    const geminiKey = localStorage.getItem('food_wheel_gemini_key');
    const model = document.getElementById('geminiModelSelect').value;
    
    document.getElementById('ai-loading').style.display = 'block';
    document.getElementById('ai-status-text').innerText = "AI 正在分析圖片中...";

    try {
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
        
        // 構建 Payload (多圖)
        const parts = [{ text: "你是一個菜單讀取機器人。請分析這些圖片，找出所有的菜色名稱與價格。對於手寫菜單，請仔細辨識品項與對應價格。請**嚴格**只回傳一個 JSON 陣列，格式為：[{\"category\": \"類別名稱\", \"name\": \"菜名\", \"price\": 數字價格}], 若無類別則歸類為'主餐'。不要包含 Markdown 標記。" }];
        
        validImages.forEach(img => {
            parts.push({
                inlineData: {
                    mimeType: img.mime,
                    data: img.data
                }
            });
        });

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: parts }] })
        });

        const data = await response.json();
        
        if (data.candidates && data.candidates[0].content) {
            let text = data.candidates[0].content.parts[0].text;
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const menuJson = JSON.parse(text);
            initAiMenuSystem(menuJson);
        } else {
            throw new Error("AI 回傳結構異常");
        }
    } catch (e) {
        console.error(e);
        alert("AI 解析失敗: " + e.message);
        document.getElementById('ai-loading').style.display = 'none';
    }
}

function initAiMenuSystem(menuData) {
    fullMenuData = menuData;
    shoppingCart = [];
    const categories = [...new Set(menuData.map(item => item.category || '主餐'))];
    
    const catSelect = document.getElementById('menuCategorySelect');
    catSelect.innerHTML = "";
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat; opt.innerText = cat;
        catSelect.appendChild(opt);
    });

    document.getElementById('ai-loading').style.display = 'none';
    document.getElementById('ai-step-1').style.display = 'none';
    document.getElementById('ai-step-2').style.display = 'block';
    updateMenuWheel();
}

function updateMenuWheel() {
    const cat = document.getElementById('menuCategorySelect').value;
    currentMenuData = fullMenuData.filter(item => (item.category || '主餐') === cat);
    drawMenuWheel();
}

function drawMenuWheel() {
    const num = currentMenuData.length;
    if(menuCtx) menuCtx.clearRect(0,0,400,400);
    if(num === 0) return;
    const arc = (2*Math.PI)/num;
    
    currentMenuData.forEach((item, i) => {
        const angle = -Math.PI/2 + (i*arc);
        if(menuCtx) {
            menuCtx.fillStyle = `hsl(${i*(360/num)}, 60%, 85%)`;
            menuCtx.beginPath(); menuCtx.moveTo(200,200);
            menuCtx.arc(200,200,200,angle,angle+arc);
            menuCtx.fill(); menuCtx.stroke();
            
            menuCtx.save(); menuCtx.translate(200,200); menuCtx.rotate(angle+arc/2);
            menuCtx.fillStyle="#333"; menuCtx.font="bold 12px Arial";
            menuCtx.fillText(item.name.substring(0,6), 60, 5);
            menuCtx.restore();
        }
    });
}

document.getElementById('spinMenuBtn').onclick = () => {
    if(currentMenuData.length === 0) return;
    const btn = document.getElementById('spinMenuBtn');
    btn.disabled = true;
    
    menuRotation += 1800 + Math.random()*1000;
    const canvas = document.getElementById('menuWheel');
    canvas.style.transform = `rotate(${menuRotation}deg)`;
    canvas.style.transition = 'transform 3s ease';
    
    setTimeout(() => {
        const actual = menuRotation % 360;
        const arc = 360/currentMenuData.length;
        let idx = Math.floor((360-actual)/arc) % currentMenuData.length;
        const dish = currentMenuData[idx];
        
        document.getElementById('dishName').innerText = dish.name;
        document.getElementById('dishPrice').innerText = `$${dish.price}`;
        const addBtn = document.getElementById('addToOrderBtn');
        addBtn.style.display = 'inline-block';
        addBtn.onclick = () => addDishToCart(dish);
        btn.disabled = false;
    }, 3000);
};

function addDishToCart(dish) {
    shoppingCart.push(dish);
    updateCartUI();
}

function updateCartUI() {
    const list = document.getElementById('cartList');
    list.innerHTML = "";
    let total = 0;
    shoppingCart.forEach((item, idx) => {
        total += item.price;
        list.innerHTML += `<li>${item.name} $${item.price} <button onclick="shoppingCart.splice(${idx},1);updateCartUI()">x</button></li>`;
    });
    document.getElementById('cartTotalDisplay').innerText = `$${total}`;
}

function checkout() {
    alert(`總計 $${document.getElementById('cartTotalDisplay').innerText}，假裝結帳完成！`);
}
