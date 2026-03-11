let canvas = null;
let ctx = null;
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let panStartX = 0;
let panStartY = 0;

function initColoring() {
    canvas = document.getElementById('coloring-canvas');
    if (!canvas) return;
    
    ctx = canvas.getContext('2d');
    App.canvas = canvas;
    App.ctx = ctx;
    
    initColorPalette();
    initCanvasEvents();
    initToolButtons();
    
    const savedData = App.loadFromLocalStorage();
    if (savedData) {
        const genderSelect = document.getElementById('gender');
        const birthDateInput = document.getElementById('birthDate');
        
        if (genderSelect && savedData.gender) {
            genderSelect.value = savedData.gender;
        }
        if (birthDateInput && savedData.birthDate) {
            birthDateInput.value = savedData.birthDate;
        }
    }
    
    App.drawPlaceholderImage();
    App.updateUndoRedoButtons();
}

function initColorPalette() {
    const palette = document.getElementById('color-palette');
    if (!palette) return;
    
    palette.innerHTML = '';
    
    appConfig.colors.forEach((color, index) => {
        const btn = document.createElement('button');
        btn.className = 'color-btn' + (index === 0 ? ' selected' : '');
        btn.style.backgroundColor = color.hex;
        btn.title = color.name;
        btn.dataset.color = color.hex;
        btn.addEventListener('click', () => {
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            App.state.currentColor = color.hex;
            document.getElementById('canvas-wrapper').classList.remove('panning');
            App.state.isPanning = false;
        });
        palette.appendChild(btn);
    });
}

function initCanvasEvents() {
    const canvasWrapper = document.getElementById('canvas-wrapper');
    const canvasContainer = document.getElementById('canvas-container');
    
    if (!canvas || !canvasWrapper) return;
    
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
    
    const brushSizeInput = document.getElementById('brush-size');
    const brushSizeValue = document.getElementById('brush-size-value');
    if (brushSizeInput && brushSizeValue) {
        brushSizeInput.addEventListener('input', (e) => {
            App.state.brushSize = parseInt(e.target.value);
            brushSizeValue.textContent = e.target.value;
        });
    }
}

function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    lastX = (touch.clientX - rect.left) * scaleX;
    lastY = (touch.clientY - rect.top) * scaleY;
    isDrawing = true;
    
    if (App.state.isPanning) {
        panStartX = touch.clientX;
        panStartY = touch.clientY;
    }
}

function handleTouchMove(e) {
    e.preventDefault();
    if (!isDrawing) return;
    
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const currentX = (touch.clientX - rect.left) * scaleX;
    const currentY = (touch.clientY - rect.top) * scaleY;
    
    if (App.state.isPanning) {
        const deltaX = touch.clientX - panStartX;
        const deltaY = touch.clientY - panStartY;
        panStartX = touch.clientX;
        panStartY = touch.clientY;
        
        const container = document.getElementById('canvas-container');
        const wrapper = document.getElementById('canvas-wrapper');
        if (container && wrapper) {
            const currentTransform = wrapper.style.transform || '';
            const translateMatch = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
            let currentX = 0, currentY = 0;
            if (translateMatch) {
                currentX = parseFloat(translateMatch[1]);
                currentY = parseFloat(translateMatch[2]);
            }
            wrapper.style.transform = `translate(${currentX + deltaX}px, ${currentY + deltaY}px) scale(${App.state.scale}) rotate(${App.state.rotation}deg)`;
        }
    } else {
        drawLine(lastX, lastY, currentX, currentY);
    }
    
    lastX = currentX;
    lastY = currentY;
}

function startDrawing(e) {
    isDrawing = true;
    
    if (App.state.isPanning) {
        panStartX = e.clientX;
        panStartY = e.clientY;
        return;
    }
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    lastX = (e.clientX - rect.left) * scaleX;
    lastY = (e.clientY - rect.top) * scaleY;
}

function draw(e) {
    if (!isDrawing) return;
    
    if (App.state.isPanning) {
        const deltaX = e.clientX - panStartX;
        const deltaY = e.clientY - panStartY;
        panStartX = e.clientX;
        panStartY = e.clientY;
        
        const wrapper = document.getElementById('canvas-wrapper');
        if (wrapper) {
            const currentTransform = wrapper.style.transform || '';
            const translateMatch = currentTransform.match(/translate\(([^,]+),\s*([^)]+)\)/);
            let currentX = 0, currentY = 0;
            if (translateMatch) {
                currentX = parseFloat(translateMatch[1]);
                currentY = parseFloat(translateMatch[2]);
            }
            wrapper.style.transform = `translate(${currentX + deltaX}px, ${currentY + deltaY}px) scale(${App.state.scale}) rotate(${App.state.rotation}deg)`;
        }
        return;
    }
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;
    
    drawLine(lastX, lastY, currentX, currentY);
    
    lastX = currentX;
    lastY = currentY;
}

function drawLine(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.strokeStyle = App.state.currentColor;
    ctx.lineWidth = App.state.brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

function stopDrawing() {
    if (isDrawing) {
        isDrawing = false;
        App.saveState();
    }
}

function initToolButtons() {
    document.getElementById('btn-home')?.addEventListener('click', goToHome);
    document.getElementById('btn-rotate-left')?.addEventListener('click', () => rotate(-90));
    document.getElementById('btn-rotate-right')?.addEventListener('click', () => rotate(90));
    document.getElementById('btn-zoom-in')?.addEventListener('click', () => zoom(0.1));
    document.getElementById('btn-zoom-out')?.addEventListener('click', () => zoom(-0.1));
    document.getElementById('btn-undo')?.addEventListener('click', undo);
    document.getElementById('btn-redo')?.addEventListener('click', redo);
    document.getElementById('btn-pan')?.addEventListener('click', togglePan);
    document.getElementById('btn-center')?.addEventListener('click', centerCanvas);
    document.getElementById('btn-calculate')?.addEventListener('click', calculate);
    document.getElementById('btn-clear')?.addEventListener('click', clearCanvas);
    document.getElementById('btn-close-results')?.addEventListener('click', closeResults);
    document.getElementById('btn-send-email')?.addEventListener('click', sendEmail);
}

function goToHome() {
    App.showModal(
        'Подтверждение',
        'Вы действительно хотите перейти на главную? В этом случае ваши данные не сохранятся.',
        [
            { text: 'Отмена' },
            { 
                text: 'Перейти', 
                class: 'bg-blue-500 hover:bg-blue-600 text-white',
                callback: () => {
                    document.getElementById('settings').classList.remove('hidden');
                    document.getElementById('coloring').classList.add('hidden');
                    document.getElementById('results-panel')?.classList.add('hidden');
                    App.clearLocalStorage();
                }
            }
        ]
    );
}

function rotate(degrees) {
    App.state.rotation += degrees;
    const wrapper = document.getElementById('canvas-wrapper');
    if (wrapper) {
        wrapper.style.transform = `scale(${App.state.scale}) rotate(${App.state.rotation}deg)`;
    }
}

function zoom(delta) {
    App.state.scale = Math.max(0.5, Math.min(3, App.state.scale + delta));
    const wrapper = document.getElementById('canvas-wrapper');
    if (wrapper) {
        wrapper.style.transform = `scale(${App.state.scale}) rotate(${App.state.rotation}deg)`;
    }
    
    const zoomLevel = document.getElementById('zoom-level');
    if (zoomLevel) {
        zoomLevel.textContent = Math.round(App.state.scale * 100) + '%';
    }
}

function undo() {
    if (App.state.undoStack.length > 1) {
        App.state.redoStack.push(App.state.undoStack.pop());
        const prevState = App.state.undoStack[App.state.undoStack.length - 1];
        restoreState(prevState);
        App.updateUndoRedoButtons();
    }
}

function redo() {
    if (App.state.redoStack.length > 0) {
        const nextState = App.state.redoStack.pop();
        App.state.undoStack.push(nextState);
        restoreState(nextState);
        App.updateUndoRedoButtons();
    }
}

function restoreState(dataURL) {
    const img = new Image();
    img.onload = function() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
    };
    img.src = dataURL;
}

function togglePan() {
    App.state.isPanning = !App.state.isPanning;
    const wrapper = document.getElementById('canvas-wrapper');
    const panBtn = document.getElementById('btn-pan');
    
    if (wrapper) {
        if (App.state.isPanning) {
            wrapper.classList.add('panning');
            if (panBtn) panBtn.classList.add('bg-blue-200');
        } else {
            wrapper.classList.remove('panning');
            if (panBtn) panBtn.classList.remove('bg-blue-200');
        }
    }
}

function centerCanvas() {
    App.state.rotation = 0;
    App.state.scale = 1;
    
    const wrapper = document.getElementById('canvas-wrapper');
    if (wrapper) {
        wrapper.style.transform = '';
    }
    
    const zoomLevel = document.getElementById('zoom-level');
    if (zoomLevel) zoomLevel.textContent = '100%';
}

function clearCanvas() {
    App.showModal(
        'Подтверждение',
        'Очистить раскраску? Все изменения будут потеряны. Это действие нельзя отменить.',
        [
            { text: 'Отмена' },
            { 
                text: 'Очистить', 
                class: 'bg-red-500 hover:bg-red-600 text-white',
                callback: () => {
                    if (App.state.selectedTest) {
                        App.loadImageFromFile(App.state.selectedTest);
                    } else {
                        App.drawPlaceholderImage();
                    }
                    document.getElementById('results-panel')?.classList.add('hidden');
                }
            }
        ]
    );
}

function calculate() {
    const stats = calculateColorStatistics();
    
    if (stats.length === 0) {
        App.showModal('Предупреждение', 'Вы не использовали ни одного цвета для раскраски. Пожалуйста, раскрасьте тест перед анализом.', [{ text: 'OK' }]);
        return;
    }
    
    App.showLoading('Анализ раскраски...');
    
    const birthDateStr = App.state.userData.birthDate;
    const birthDate = birthDateStr ? new Date(birthDateStr) : new Date();
    const age = birthDateStr ? calculateAge(birthDateStr) : 25;
    const zodiacSign = getZodiacSign(birthDate.getDate(), birthDate.getMonth() + 1);
    
    const requestData = {
        user_color: {
            colors: stats.map(s => ({
                color: s.name,
                percentage: s.percentage
            })),
            age: age,
            gender: App.state.userData.gender || 'male',
            zodiac_sign: zodiacSign
        },
        version: 1
    };
    
    sendAnalysisRequest(requestData)
        .then(response => {
            App.hideLoading();
            showResults(stats, response);
        })
        .catch(error => {
            App.hideLoading();
            console.error('API Error:', error);
            const demoResponse = getDemoResponse();
            showResults(stats, demoResponse);
        });
}

function showResults(stats, response) {
    const resultsPanel = document.getElementById('results-panel');
    const colorBars = document.getElementById('color-bars');
    const mainCharacteristic = document.getElementById('main-characteristic');
    const strengths = document.getElementById('strengths');
    const recommendations = document.getElementById('recommendations');
    
    if (!resultsPanel) return;
    
    if (colorBars) {
        colorBars.innerHTML = '';
        stats.forEach(stat => {
            const container = document.createElement('div');
            container.className = 'color-bar-container';
            container.innerHTML = `
                <span class="color-bar-name">${stat.name}</span>
                <div class="color-bar-wrapper">
                    <div class="color-bar" style="width: ${stat.percentage}%; background-color: ${stat.hex};"></div>
                </div>
                <span class="color-bar-percent">${stat.percentage.toFixed(1)}%</span>
            `;
            colorBars.appendChild(container);
        });
    }
    
    if (mainCharacteristic) {
        mainCharacteristic.textContent = response.main_characteristic || 'Данные недоступны';
    }
    if (strengths) {
        strengths.textContent = response.strengths || 'Данные недоступны';
    }
    if (recommendations) {
        recommendations.textContent = response.recommendations || 'Данные недоступны';
    }
    
    resultsPanel.classList.remove('hidden');
}

function closeResults() {
    document.getElementById('results-panel')?.classList.add('hidden');
}

function sendEmail() {
    App.showModal(
        'Отправка результатов',
        'Функция отправки результатов на почту будет доступна позже.',
        [{ text: 'OK' }]
    );
}

App.saveState = function() {
    this.state.undoStack.push(canvas.toDataURL());
    if (this.state.undoStack.length > 20) {
        this.state.undoStack.shift();
    }
    this.state.redoStack = [];
    this.updateUndoRedoButtons();
};

App.updateUndoRedoButtons = function() {
    const undoBtn = document.getElementById('btn-undo');
    const redoBtn = document.getElementById('btn-redo');
    
    if (undoBtn) {
        undoBtn.disabled = this.state.undoStack.length <= 1;
        undoBtn.classList.toggle('opacity-50', this.state.undoStack.length <= 1);
        undoBtn.classList.toggle('cursor-not-allowed', this.state.undoStack.length <= 1);
    }
    
    if (redoBtn) {
        redoBtn.disabled = this.state.redoStack.length === 0;
        redoBtn.classList.toggle('opacity-50', this.state.redoStack.length === 0);
        redoBtn.classList.toggle('cursor-not-allowed', this.state.redoStack.length === 0);
    }
};

App.drawImageOnCanvas = function(img) {
    this.ctx.fillStyle = BACKGROUND_COLOR;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const scale = this.canvas.height / img.height;
    const drawWidth = img.width * scale;
    const drawHeight = this.canvas.height;
    const offsetX = (this.canvas.width - drawWidth) / 2;
    const offsetY = 0;

    this.ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

    if (offsetX > 0) {
        this.ctx.fillStyle = BACKGROUND_COLOR;
        this.ctx.fillRect(0, 0, offsetX, this.canvas.height);
        this.ctx.fillRect(offsetX + drawWidth, 0, this.canvas.width - (offsetX + drawWidth), this.canvas.height);
    }
};

App.drawPlaceholderImage = function() {
    if (!this.ctx || !this.canvas) return;
    
    this.ctx.fillStyle = BACKGROUND_COLOR;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.font = 'bold 40px Arial';
    this.ctx.fillStyle = '#9ca3af';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('Изображение не выбрано', this.canvas.width / 2, this.canvas.height / 2 - 30);

    this.ctx.font = '20px Arial';
    this.ctx.fillStyle = '#6b7280';
    this.ctx.fillText('Вернитесь на страницу настроек', this.canvas.width / 2, this.canvas.height / 2 + 30);

    this.hideImageLoading();
};

App.hideImageLoading = function() {
    const loading = document.getElementById('image-loading');
    if (loading) {
        loading.classList.add('hidden');
    }
};

App.showImageLoading = function() {
    const loading = document.getElementById('image-loading');
    if (loading) {
        loading.classList.remove('hidden');
    }
};

App.loadImageFromFile = function(image) {
    this.showLoading('Загрузка теста...');
    this.showImageLoading();

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
        this.state.loadedImages[image.filename] = img;
        this.state.rotation = 0;
        this.state.scale = 1;

        const wrapper = document.getElementById('canvas-wrapper');
        if (wrapper) {
            wrapper.style.transform = '';
        }

        this.drawImageOnCanvas(img);
        this.saveState();
        this.state.undoStack = [];
        this.state.redoStack = [];
        this.updateUndoRedoButtons();

        const zoomLevel = document.getElementById('zoom-level');
        if (zoomLevel) zoomLevel.textContent = '100%';

        this.hideLoading();
        this.hideImageLoading();
    };

    img.onerror = () => {
        console.error(`Не удалось загрузить изображение: ${image.filename}`);
        this.drawPlaceholderImage();
        this.saveState();
        this.state.undoStack = [];
        this.state.redoStack = [];
        this.updateUndoRedoButtons();

        this.hideLoading();
        this.hideImageLoading();

        this.showError('Не удалось загрузить изображение');
    };

    img.src = image.filename;
};
