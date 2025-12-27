// script.js - 入口點與事件綁定 (與上一版相同)

document.getElementById('spinBtn').onclick = () => {
    try {
        if (window.places.length === 0) return;
        
        let spinMode = 'repeat';
        const spinModeEl = document.getElementById('spinMode'); 
        if (spinModeEl) spinMode = spinModeEl.value;
        
        const spinBtn = document.getElementById('spinBtn');
        spinBtn.disabled = true; 
        window.setControlsDisabled(true); 

        const spinAngle = Math.floor(Math.random() * 1800) + 1800; 
        window.currentRotation += spinAngle;
        window.canvas.style.transition = 'transform 4s cubic-bezier(0.15, 0, 0.15, 1)';
        window.canvas.style.transform = `rotate(${window.currentRotation}deg)`;

        // 隱藏結果區
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
                console.error("Spin Error:", error);
                window.setControlsDisabled(false);
                spinBtn.disabled = false;
            }
        }, 4000);

    } catch (e) {
        console.error("Spin Init Error:", e);
        document.getElementById('spinBtn').disabled = false;
        window.setControlsDisabled(false);
    }
};

document.getElementById('spinMenuBtn').onclick = function() {
    if (window.currentMenuData.length === 0) return;
    const spinBtn = document.getElementById('spinMenuBtn');
    spinBtn.disabled = true;
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
        
        spinBtn.disabled = false;
    }, 3000);
};
