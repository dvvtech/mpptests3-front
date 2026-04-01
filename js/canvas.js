let canvas = null;
let ctx = null;
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let panStartOffsetX = 0;
let panStartOffsetY = 0;
let initialPinchDistance = 0;
let initialPinchScale = 1;
let initialPinchOffsetX = 0;
let initialPinchOffsetY = 0;
let pinchCenterX = 0;
let pinchCenterY = 0;

function initColoring() {
    canvas = document.getElementById('coloring-canvas');
    if (!canvas) return;

    ctx = canvas.getContext('2d');
    App.canvas = canvas;
    App.ctx = ctx;

    initColorPalette();
    initCanvasEvents();
    initToolButtons();
    updateTestTitle();

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

function updateTestTitle() {
    const testNameEl = document.getElementById('test-name');
    if (testNameEl && App.state.selectedTest) {
        testNameEl.textContent = App.state.selectedTest.name;
    } else if (testNameEl) {
        testNameEl.textContent = 'Тест не выбран';
    }
}

function initColorPalette() {
    const palette = document.getElementById('color-palette');
    if (!palette) return;

    palette.innerHTML = '';

    appConfig.colors.forEach((color, index) => {
        const btn = document.createElement('button');
        const isWhite = color.hex.toLowerCase() === '#ffffff' || color.hex.toLowerCase() === 'white';
        btn.className = 'color-btn border border-gray-300' + (index === 0 ? ' selected' : '');
        btn.style.backgroundColor = color.hex;
        btn.title = color.name;
        btn.dataset.color = color.hex;
        btn.addEventListener('click', () => {
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            App.state.currentColor = color.hex;
            if (App.state.isPanning) {
                App.state.isPanning = false;
                document.getElementById('canvas-wrapper')?.classList.remove('panning');
                const panBtn = document.getElementById('btn-pan');
                if (panBtn) {
                    panBtn.classList.remove('bg-blue-500', 'text-white');
                    panBtn.classList.add('bg-gray-100', 'hover:bg-gray-200');
                    panBtn.title = 'Режим перемещения';
                }
            }
        });
        palette.appendChild(btn);
    });
}

function initCanvasEvents() {
    if (!canvas) return;

    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('mousemove', onPointerMove);
    canvas.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('mouseleave', onPointerUp);

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);

    const brushSizeInput = document.getElementById('brush-size');
    const brushSizeValue = document.getElementById('brush-size-value');
    if (brushSizeInput && brushSizeValue) {
        brushSizeInput.addEventListener('input', (e) => {
            App.state.brushSize = parseInt(e.target.value);
            brushSizeValue.textContent = e.target.value;
        });
    }

    const wrapper = document.getElementById('canvas-wrapper');
    if (wrapper) {
        wrapper.addEventListener('wheel', onWheel, { passive: false });
    }
}

function getCanvasPos(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) {
        return { x: 0, y: 0 };
    }

    const angle = ((App.state.rotation % 360) + 360) % 360;

    let x, y;
    const rx = (clientX - rect.left) / rect.width;
    const ry = (clientY - rect.top) / rect.height;

    switch (angle) {
        case 90:
            x = ry * canvas.width;
            y = (1 - rx) * canvas.height;
            break;
        case 180:
            x = (1 - rx) * canvas.width;
            y = (1 - ry) * canvas.height;
            break;
        case 270:
            x = (1 - ry) * canvas.width;
            y = rx * canvas.height;
            break;
        default:
            x = rx * canvas.width;
            y = ry * canvas.height;
    }

    return {
        x: Math.max(0, Math.min(canvas.width, x)),
        y: Math.max(0, Math.min(canvas.height, y))
    };
}

function onPointerDown(e) {
    e.preventDefault();

    const resultsPanel = document.getElementById('results-panel');
    if (resultsPanel && !resultsPanel.classList.contains('hidden')) return;

    if (App.state.isPanning) {
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
        panStartOffsetX = App.state.offsetX;
        panStartOffsetY = App.state.offsetY;
    } else {
        isDrawing = true;
        const pos = getCanvasPos(e.clientX, e.clientY);
        lastX = pos.x;
        lastY = pos.y;
        drawDot(pos.x, pos.y);
    }
}

function onPointerMove(e) {
    e.preventDefault();

    if (App.state.isPanning && isPanning) {
        const dx = e.clientX - panStartX;
        const dy = e.clientY - panStartY;
        App.state.offsetX = panStartOffsetX + dx;
        App.state.offsetY = panStartOffsetY + dy;
        applyTransform();
    } else if (isDrawing) {
        const pos = getCanvasPos(e.clientX, e.clientY);
        drawLine(lastX, lastY, pos.x, pos.y);
        lastX = pos.x;
        lastY = pos.y;
    }
}

function onPointerUp(e) {
    if (isDrawing) {
        isDrawing = false;
        App.saveState();
    }
    isPanning = false;
}

function onTouchStart(e) {
    const resultsPanel = document.getElementById('results-panel');
    if (resultsPanel && !resultsPanel.classList.contains('hidden')) return;

    if (e.touches.length === 2 && App.state.isPanning) {
        e.preventDefault();
        isDrawing = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialPinchDistance = Math.sqrt(dx * dx + dy * dy);
        initialPinchScale = App.state.scale;
        initialPinchOffsetX = App.state.offsetX;
        initialPinchOffsetY = App.state.offsetY;
        pinchCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        pinchCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    } else if (e.touches.length === 1) {
        e.preventDefault();
        const touch = e.touches[0];
        if (App.state.isPanning) {
            isPanning = true;
            panStartX = touch.clientX;
            panStartY = touch.clientY;
            panStartOffsetX = App.state.offsetX;
            panStartOffsetY = App.state.offsetY;
        } else {
            isDrawing = true;
            const pos = getCanvasPos(touch.clientX, touch.clientY);
            lastX = pos.x;
            lastY = pos.y;
            drawDot(pos.x, pos.y);
        }
    }
}

function onTouchMove(e) {
    if (e.touches.length === 2 && App.state.isPanning) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const newScale = Math.min(Math.max(initialPinchScale * (distance / initialPinchDistance), 0.2), 5);
        App.state.scale = Math.round(newScale * 10) / 10;
        const scaleRatio = newScale / initialPinchScale;
        App.state.offsetX = pinchCenterX - (pinchCenterX - initialPinchOffsetX) * scaleRatio;
        App.state.offsetY = pinchCenterY - (pinchCenterY - initialPinchOffsetY) * scaleRatio;
        applyTransform();
    } else if (e.touches.length === 1) {
        e.preventDefault();
        const touch = e.touches[0];
        if (App.state.isPanning && isPanning) {
            const dx = touch.clientX - panStartX;
            const dy = touch.clientY - panStartY;
            App.state.offsetX = panStartOffsetX + dx;
            App.state.offsetY = panStartOffsetY + dy;
            applyTransform();
        } else if (isDrawing) {
            const pos = getCanvasPos(touch.clientX, touch.clientY);
            drawLine(lastX, lastY, pos.x, pos.y);
            lastX = pos.x;
            lastY = pos.y;
        }
    }
}

function onTouchEnd(e) {
    if (e.touches.length < 2) {
        initialPinchDistance = 0;
    }
    if (e.touches.length === 0) {
        if (isDrawing) {
            isDrawing = false;
            App.saveState();
        }
        isPanning = false;
        initialPinchScale = App.state.scale;
        initialPinchOffsetX = App.state.offsetX;
        initialPinchOffsetY = App.state.offsetY;
    }
    if (e.touches.length === 0) {
        if (isDrawing) {
            isDrawing = false;
            App.saveState();
        }
        isPanning = false;
    }
}

function onWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    zoomBy(delta);
}

function drawDot(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, App.state.brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = App.state.currentColor;
    ctx.fill();
    App.state.usedColors.add(App.state.currentColor);
}

function drawLine(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = App.state.currentColor;
    ctx.lineWidth = App.state.brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    App.state.usedColors.add(App.state.currentColor);
}

function applyTransform() {
    if (!canvas) return;

    const s = App.state.scale;
    const ox = App.state.offsetX;
    const oy = App.state.offsetY;
    const rot = App.state.rotation;

    canvas.style.transform = `translate(${ox}px, ${oy}px) rotate(${rot}deg) scale(${s})`;
    canvas.style.transformOrigin = '0 0';

    const zoomLevel = document.getElementById('zoom-level');
    if (zoomLevel) zoomLevel.textContent = Math.round(s * 100) + '%';
}

function initToolButtons() {
    document.getElementById('btn-home')?.addEventListener('click', goToHome);
    document.getElementById('btn-rotate-left')?.addEventListener('click', () => rotate(-90));
    document.getElementById('btn-rotate-right')?.addEventListener('click', () => rotate(90));
    document.getElementById('btn-zoom-in')?.addEventListener('click', () => zoomBy(0.1));
    document.getElementById('btn-zoom-out')?.addEventListener('click', () => zoomBy(-0.1));
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
    App.state.rotation = App.state.rotation + degrees;
    applyTransform();
}

function zoomBy(delta) {
    const newScale = Math.min(Math.max(App.state.scale + delta, 0.2), 5);
    App.state.scale = Math.round(newScale * 10) / 10;
    applyTransform();
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
    img.onload = function () {
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
            if (panBtn) {
                panBtn.classList.add('bg-blue-500', 'text-white');
                panBtn.classList.remove('bg-gray-100', 'hover:bg-gray-200');
                panBtn.title = 'Режим перемещения (вкл)';
            }
        } else {
            wrapper.classList.remove('panning');
            if (panBtn) {
                panBtn.classList.remove('bg-blue-500', 'text-white');
                panBtn.classList.add('bg-gray-100', 'hover:bg-gray-200');
                panBtn.title = 'Режим перемещения';
            }
        }
    }
}

async function createCombinedCanvas() {
    const resultsScroll = document.getElementById('results-scroll');
    const canvasEl = document.getElementById('coloring-canvas');
    
    if (!resultsScroll || !canvasEl) return null;

    const clone = resultsScroll.cloneNode(true);
    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    clone.style.top = '0';
    clone.style.overflow = 'visible';
    clone.style.height = 'auto';
    clone.style.maxHeight = 'none';
    clone.style.width = resultsScroll.offsetWidth + 'px';
    
    const buttonsClone = clone.querySelector('.flex.flex-wrap.gap-2.mt-2');
    if (buttonsClone) buttonsClone.style.display = 'none';
    
    document.body.appendChild(clone);
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
        const resultsCanvas = await html2canvas(clone, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            logging: false
        });

        const canvasCopy = document.createElement('canvas');
        canvasCopy.width = canvasEl.width;
        canvasCopy.height = canvasEl.height;
        const copyCtx = canvasCopy.getContext('2d');
        copyCtx.fillStyle = '#ffffff';
        copyCtx.fillRect(0, 0, canvasCopy.width, canvasCopy.height);
        copyCtx.drawImage(canvasEl, 0, 0);

        const gap = 20;
        const combinedCanvas = document.createElement('canvas');
        combinedCanvas.width = canvasCopy.width + gap + resultsCanvas.width;
        combinedCanvas.height = Math.max(canvasCopy.height, resultsCanvas.height);
        const combinedCtx = combinedCanvas.getContext('2d');
        
        combinedCtx.fillStyle = '#ffffff';
        combinedCtx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);
        
        const canvasY = (combinedCanvas.height - canvasCopy.height) / 2;
        const resultsY = (combinedCanvas.height - resultsCanvas.height) / 2;
        
        combinedCtx.drawImage(canvasCopy, 0, canvasY);
        combinedCtx.drawImage(resultsCanvas, canvasCopy.width + gap, resultsY);

        return combinedCanvas;
    } finally {
        document.body.removeChild(clone);
    }
}

async function shareResults() {
    App.showLoading('Подготовка изображения...');
    const combinedCanvas = await createCombinedCanvas();
    App.hideLoading();
    
    if (!combinedCanvas) return;

    if (!navigator.share || !navigator.canShare) {
        alert('Функция "Поделиться" не поддерживается вашим браузером. Используйте кнопку "Сохранить".');
        return;
    }

    try {
        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}:${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

        const blob = await new Promise(resolve => combinedCanvas.toBlob(resolve, 'image/png'));
        const file = new File([blob], `результаты-теста_${dateStr}.png`, { type: 'image/png' });

        await navigator.share({
            title: 'Результаты теста',
            text: 'Результаты теста',
            files: [file]
        });
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Ошибка при отправке:', error);
            alert('Не удалось поделиться. Попробуйте сохранить файлы.');
        }
    }
}

function centerCanvas() {
    App.state.scale = 1;
    App.state.offsetX = 0;
    App.state.offsetY = 0;
    App.state.rotation = 0;
    applyTransform();
}

function clearCanvas() {
    App.showModal(
        'Подтверждение',
        'Очистить тест?',
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

    if (App.state.usedColors.size === 0) {
        App.showModal('Предупреждение', 'Вы не использовали ни одного цвета для раскраски. Пожалуйста, раскрасьте тест перед анализом.', [{ text: 'OK' }]);
        return;
    }

    App.showLoading('Анализ данных...');

    const stats = calculateColorStatistics();

    const birthDateStr = App.state.userData.birthDate;
    const birthDate = birthDateStr ? new Date(birthDateStr) : new Date();
    const age = birthDateStr ? calculateAge(birthDateStr) : 25;
    const zodiacSign = getZodiacSign(birthDate.getDate(), birthDate.getMonth() + 1);

    const meta = {
        gender: App.state.userData.gender || 'male',
        age: age,
        birthdate: birthDateStr
    };

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
            showResults(stats, response, meta);
            updateScaleByWindowSize();
        })
        .catch(error => {
            App.hideLoading();
            console.error('API Error:', error);
            let isRelease = false;
            if(isRelease){
                App.showModal('Сервис недоступен', 'Сервис сейчас недоступен, попробуйте позже.', [{ text: 'OK' }]);
            }
            else{
            //отображение демо результатов
            const demoResponse = getDemoResponse();
            showResults(stats, demoResponse, meta);
            updateScaleByWindowSize();
            }
        });
}

function updateScaleByWindowSize() {
    if (window.innerWidth <= 768) {
        const ratio = window.innerHeight / window.innerWidth;
        App.state.previousScale = App.state.scale;

        if (ratio > 1.5) {
            App.state.scale = 0.5;
        } else {
            App.state.scale = 0.3;
        }
    } else if (window.innerWidth <= 912) {
        App.state.scale = 0.5;
    }

    applyTransform();
}

function showResults(stats, data, meta) {
    const panel = document.getElementById('results-panel');
    const scroll = document.getElementById('results-scroll');
    if (!panel || !scroll) return;

    const chartHtml = stats.map(c => `
        <div class="color-bar-row">
            <span class="color-bar-label">${c.name}</span>
            <div class="color-bar-track">
                <div class="color-bar-fill" style="width:${c.percentage.toFixed(1)}%; background-color:${c.hex};"></div>
            </div>
            <span class="color-bar-pct">${c.percentage.toFixed(1)}%</span>
        </div>
    `).join('');

    const strengthsHtml = Array.isArray(data.strengths)
        ? data.strengths.map(s => `<li class="text-sm text-gray-700">${s}</li>`).join('')
        : (data.strengths ? `<li class="text-sm text-gray-700">${data.strengths}</li>` : '');

    const recsHtml = Array.isArray(data.recommendations)
        ? data.recommendations.map(r => `<li class="text-sm text-gray-700">${r}</li>`).join('')
        : (data.recommendations ? `<li class="text-sm text-gray-700">${data.recommendations}</li>` : '');

    const zodiacRu = getZodiacNameRu(getZodiacSign(new Date(meta.birthdate).getDate(), new Date(meta.birthdate).getMonth() + 1));
    const genderRu = meta.gender === 'male' ? 'Мужской' : 'Женский';

    const colorDistributionHtml = stats.length > 0 ? `
        <div class="mt-3 pt-3 border-t border-gray-100">
            <h4 class="text-sm font-medium text-gray-600 mb-2">Распределение цветов</h4>
            <div class="flex h-5 rounded-md overflow-hidden border border-gray-300">
                ${stats.map(c => `<div class="h-full" style="width: ${c.percentage}%; background-color: ${c.hex};" title="${c.name}: ${c.percentage.toFixed(1)}%"></div>`).join('')}
            </div>
        </div>
    ` : '';

    scroll.innerHTML = `
        <div class="mb-4">
            <h3 class="text-base font-semibold text-gray-800 mb-2">Данные пользователя</h3>
            <div class="text-sm text-gray-600 space-y-1">
                <div><span class="font-medium">Пол:</span> ${genderRu}</div>
                <div><span class="font-medium">Возраст:</span> ${meta.age} лет</div>
                <div><span class="font-medium">Знак зодиака:</span> ${zodiacRu}</div>
                <div><span class="font-medium">Тест:</span> ${App.state.selectedTest ? App.state.selectedTest.name : '—'}</div>
            </div>
        </div>

        <div class="mb-4">
            <h3 class="text-base font-semibold text-gray-800 mb-2">Использованные цвета</h3>
            ${chartHtml}
            ${colorDistributionHtml}

            ${data.dominantEnergy ? `
            <div class="mt-3 text-sm font-medium text-gray-700">
                <span class="text-gray-600"></span> ${data.dominantEnergy}
            </div>
    ` : ''}
        </div>

        ${data.mainCharacteristic ? `
        <div class="mb-4">
            <h3 class="text-base font-semibold text-gray-800 mb-2">Характеристика</h3>
            <p class="text-sm text-gray-700 leading-relaxed">${data.mainCharacteristic}</p>
        </div>` : ''}

        ${strengthsHtml ? `
        <div class="mb-4">
            <h3 class="text-base font-semibold text-gray-800 mb-2">Сильные стороны</h3>
            <ul class="list-disc list-inside space-y-1">${strengthsHtml}</ul>
        </div>` : ''}

        ${recsHtml ? `
        <div class="mb-4">
            <h3 class="text-base font-semibold text-gray-800 mb-2">Рекомендации</h3>
            <ul class="list-disc list-inside space-y-1">${recsHtml}</ul>
        </div>` : ''}

        <div class="flex flex-wrap gap-2 mt-2">
            <button id="btn-send-email"
                class="min-w-0 flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition flex items-center justify-center gap-2 leading-none">
                <span class="flex items-center gap-2">
                    <i class="fas fa-envelope"></i> Отправить на почту
                </span>
            </button>
            <button id="btn-save-results"
                class="min-w-0 flex-1 px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition flex items-center justify-center gap-2 leading-none">
                <span class="flex items-center gap-2">
                    <i class="fas fa-save"></i> Сохранить
                </span>
            </button>
            <button id="btn-share-results"
                class="min-w-0 flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 transition flex items-center justify-center gap-2 leading-none">
                <span class="flex items-center gap-2">
                    <i class="fas fa-share-alt"></i> Поделиться
                </span>
            </button>
        </div>
    `;

    App.state.lastResults = data;
    App.state.lastStats = stats;

    const emailBtn = document.getElementById('btn-send-email');
    if (emailBtn) emailBtn.addEventListener('click', sendEmail);

    const saveBtn = document.getElementById('btn-save-results');
    if (saveBtn) saveBtn.addEventListener('click', saveResults);

    const shareBtn = document.getElementById('btn-share-results');
    if (shareBtn) shareBtn.addEventListener('click', shareResults);

    const closeBtn = document.getElementById('btn-close-results');
    if (closeBtn) closeBtn.addEventListener('click', closeResults);

    panel.classList.remove('hidden');
    scroll.scrollTop = 0;
    document.getElementById('toolbar')?.classList.add('hidden');
    document.getElementById('btn-home')?.classList.add('invisible');
}

function closeResults() {
    document.getElementById('results-panel')?.classList.add('hidden');
    document.getElementById('toolbar')?.classList.remove('hidden');
    document.getElementById('btn-home')?.classList.remove('invisible');
    if (window.innerWidth <= 768 && App.state.previousScale !== undefined) {
        App.state.scale = App.state.previousScale;
        applyTransform();
    }
}

function sendEmail() {
    const modal = document.getElementById('email-modal');
    const input = document.getElementById('email-input');
    const error = document.getElementById('email-error');
    const sending = document.getElementById('email-sending');
    const success = document.getElementById('email-success');

    if (!modal || !input) return;

    input.value = '';
    error.classList.add('hidden');
    sending.classList.add('hidden');
    success.classList.add('hidden');
    modal.classList.remove('hidden');

    const confirmBtnReset = document.getElementById('btn-send-email-confirm');
    if (confirmBtnReset) confirmBtnReset.disabled = false;

    const cancelBtnReset = document.getElementById('btn-send-email-cancel');
    if (cancelBtnReset) cancelBtnReset.disabled = false;

    const validateEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const confirmBtn = document.getElementById('btn-send-email-confirm');
    const cancelBtn = document.getElementById('btn-send-email-cancel');

    const closeModal = () => {
        modal.classList.add('hidden');
        confirmBtn.replaceWith(confirmBtn.cloneNode(true));
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));
    };

    const sendHandler = async () => {
        const email = input.value.trim();
        const btn = document.getElementById('btn-send-email-confirm');

        if (!email) {
            error.textContent = 'Введите email';
            error.classList.remove('hidden');
            return;
        }

        if (!validateEmail(email)) {
            error.textContent = 'Введите корректный email';
            error.classList.remove('hidden');
            return;
        }

        error.classList.add('hidden');
        sending.classList.remove('hidden');
        if (btn) btn.disabled = true;

        await sendResultsToEmail(email);

        sending.classList.add('hidden');
        success.classList.remove('hidden');

        const cancelBtn = document.getElementById('btn-send-email-cancel');
        if (cancelBtn) cancelBtn.disabled = true;

        setTimeout(closeModal, 2000);
    };

    const newConfirmBtn = document.getElementById('btn-send-email-confirm');
    const newCancelBtn = document.getElementById('btn-send-email-cancel');

    newConfirmBtn.addEventListener('click', sendHandler);
    newCancelBtn.addEventListener('click', closeModal);

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendHandler();
    });
}

async function sendResultsToEmail(email) {
    try {
        const rotatedImageData = await getRotatedImageData();

        const stats = App.state.lastStats || [];
        const results = App.state.lastResults || {};

        const userData = {
            gender: App.state.userData.gender === 'male' ? 'Мужской' : 'Женский',
            birthDate: App.state.userData.birthDate,
            age: App.state.userData.birthDate ? Math.floor((new Date() - new Date(App.state.userData.birthDate)) / (365.25 * 24 * 60 * 60 * 1000)) : 0,
            zodiacSign: getZodiacNameRu(getZodiacSign(new Date(App.state.userData.birthDate).getDate(), new Date(App.state.userData.birthDate).getMonth() + 1)),
            selectedTest: App.state.selectedTest ? App.state.selectedTest.name : 'Не выбран'
        };

        const formData = new FormData();
        formData.append('email', email);
        formData.append('image', rotatedImageData, 'coloring.png');
        formData.append('stats', JSON.stringify(stats));
        formData.append('results', JSON.stringify(results));
        formData.append('userData', JSON.stringify(userData));

        const response = await fetch('https://api.cloud-platform.pro/email/mpptests/send', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Результаты отправлены:', result);

    } catch (error) {
        console.error('Ошибка при отправке на почту:', error);
        const errorEl = document.getElementById('email-error');
        if (errorEl) {
            errorEl.textContent = 'Ошибка при отправке. Попробуйте позже.';
            errorEl.classList.remove('hidden');
        }
    }
}

function getRotatedImageData() {
    return new Promise((resolve) => {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        const angle = ((App.state.rotation % 360) + 360) % 360;

        if (angle === 90 || angle === 270) {
            tempCanvas.width = canvas.height;
            tempCanvas.height = canvas.width;
        } else {
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
        }

        tempCtx.fillStyle = '#ffffff';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        tempCtx.save();
        tempCtx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
        tempCtx.rotate(angle * Math.PI / 180);
        tempCtx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
        tempCtx.restore();

        tempCanvas.toBlob(resolve, 'image/png', 1.0);
    });
}

App.saveState = function () {
    this.state.undoStack.push(canvas.toDataURL());
    if (this.state.undoStack.length > 20) {
        this.state.undoStack.shift();
    }
    this.state.redoStack = [];
    this.updateUndoRedoButtons();
};

App.updateUndoRedoButtons = function () {
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

App.drawImageOnCanvas = function (img) {
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

App.drawPlaceholderImage = function () {
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
};

function getInitialScale() {
    const ratio = window.innerHeight / window.innerWidth;
    if (ratio < 1.35) return 0.8;
    if (ratio <= 1.45) return 0.9;
    return 1;
}

App.loadImageFromFile = function (image) {
    this.showLoading('Загрузка теста...');

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
        this.state.loadedImages[image.filename] = img;
        this.state.rotation = 0;
        this.state.scale = getInitialScale();
        this.state.offsetX = 0;
        this.state.offsetY = 0;
        this.state.usedColors.clear();

        applyTransform();
        this.drawImageOnCanvas(img);
        this.state.undoStack = [];
        this.state.redoStack = [];
        this.saveState();
        this.updateUndoRedoButtons();
        updateTestTitle();

        this.hideLoading();
    };

    img.onerror = () => {
        console.error(`Не удалось загрузить изображение: ${image.filename}`);
        this.drawPlaceholderImage();
        this.state.undoStack = [];
        this.state.redoStack = [];
        this.saveState();
        this.updateUndoRedoButtons();

        this.hideLoading();

        this.showError('Не удалось загрузить изображение');
    };

    img.src = image.filename;
};

async function saveResults() {
    App.showLoading('Подготовка изображения...');
    const combinedCanvas = await createCombinedCanvas();
    App.hideLoading();
    
    if (!combinedCanvas) return;

    try {
        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}:${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

        const link = document.createElement('a');
        link.download = `результаты-теста_${dateStr}.png`;
        link.href = combinedCanvas.toDataURL('image/png');
        link.click();
    } catch (error) {
        console.error('Ошибка при сохранении:', error);
    }
}
