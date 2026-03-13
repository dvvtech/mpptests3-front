const BACKGROUND_COLOR = '#EDEDED';

const appConfig = {
    canvasWidth: 785,
    canvasHeight: 1080,
    images: [
        { id: 1, name: "Тест 1", filename: "images/test1.png", thumbnail: "images/thumbnails/test1_thumb.png" },
        { id: 2, name: "Тест 2", filename: "images/test2.png", thumbnail: "images/thumbnails/test2_thumb.png" },
        { id: 3, name: "Тест 3", filename: "images/test3.png", thumbnail: "images/thumbnails/test3_thumb.png" },
        { id: 4, name: "Тест 4", filename: "images/test4.png", thumbnail: "images/thumbnails/test4_thumb.png" },
        { id: 5, name: "Тест 5", filename: "images/test5.png", thumbnail: "images/thumbnails/test5_thumb.png" }
    ],
    colors: [
        { name: "Красный", hex: "#ef4444" },
        { name: "Оранжевый", hex: "#f97316" },
        { name: "Желтый", hex: "#eab308" },
        { name: "Розовый", hex: "#ec4899" },
        { name: "Коричневый", hex: "#92400e" },
        { name: "Зеленый", hex: "#22c55e" },
        { name: "Голубой", hex: "#0ea5e9" },
        { name: "Синий", hex: "#3b82f6" },
        { name: "Фиолетовый", hex: "#8b5cf6" },
        { name: "Бирюзовый", hex: "#06b6d4" },
        { name: "Черный", hex: "#000000" },
        { name: "Белый", hex: "#ffffff" }
    ],
    backgroundColor: BACKGROUND_COLOR
};

const App = {
    state: {
        loadedImages: {},
        undoStack: [],
        redoStack: [],
        rotation: 0,
        scale: 0.9,
        offsetX: 0,
        offsetY: 0,
        isPanning: false,
        currentColor: '#ef4444',
        brushSize: 15,
        selectedTest: null,
        userData: {
            gender: '',
            birthDate: '',
            zodiacSign: ''
        }
    },

    showLoading: function(message) {
        const overlay = document.getElementById('loading-overlay');
        const text = document.getElementById('loading-text');
        if (overlay && text) {
            text.textContent = message || 'Загрузка...';
            overlay.classList.remove('hidden');
        }
    },

    hideLoading: function() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    },

    showModal: function(title, message, buttons) {
        const overlay = document.getElementById('modal-overlay');
        const titleEl = document.getElementById('modal-title');
        const messageEl = document.getElementById('modal-message');
        const buttonsEl = document.getElementById('modal-buttons');

        if (!overlay || !titleEl || !messageEl || !buttonsEl) return;

        titleEl.textContent = title;
        messageEl.textContent = message;
        buttonsEl.innerHTML = '';

        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.textContent = btn.text;
            button.className = `px-4 py-2 rounded-lg font-medium transition ${btn.class || 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`;
            button.onclick = () => {
                overlay.classList.add('hidden');
                if (btn.callback) btn.callback();
            };
            buttonsEl.appendChild(button);
        });

        overlay.classList.remove('hidden');
    },

    showError: function(message) {
        this.showModal('Ошибка', message, [{ text: 'OK' }]);
    },

    saveToLocalStorage: function() {
        const data = {
            gender: this.state.userData.gender,
            birthDate: this.state.userData.birthDate,
            selectedTestId: this.state.selectedTest ? this.state.selectedTest.id : null
        };
        localStorage.setItem('mppTestData', JSON.stringify(data));
    },

    loadFromLocalStorage: function() {
        const data = localStorage.getItem('mppTestData');
        if (data) {
            const parsed = JSON.parse(data);
            this.state.userData.gender = parsed.gender || '';
            this.state.userData.birthDate = parsed.birthDate || '';
            if (parsed.selectedTestId) {
                this.state.selectedTest = appConfig.images.find(img => img.id === parsed.selectedTestId) || null;
            }
            return parsed;
        }
        return null;
    },

    clearLocalStorage: function() {
        localStorage.removeItem('mppTestData');
    }
};

function getZodiacSign(day, month) {
    const zodiacSigns = [
        { name: 'capricorn', start: [1, 1], end: [1, 19] },
        { name: 'aquarius', start: [1, 20], end: [2, 18] },
        { name: 'pisces', start: [2, 19], end: [3, 20] },
        { name: 'aries', start: [3, 21], end: [4, 19] },
        { name: 'taurus', start: [4, 20], end: [5, 20] },
        { name: 'gemini', start: [5, 21], end: [6, 20] },
        { name: 'cancer', start: [6, 21], end: [7, 22] },
        { name: 'leo', start: [7, 23], end: [8, 22] },
        { name: 'virgo', start: [8, 23], end: [9, 22] },
        { name: 'libra', start: [9, 23], end: [10, 22] },
        { name: 'scorpio', start: [10, 23], end: [11, 21] },
        { name: 'sagittarius', start: [11, 22], end: [12, 21] },
        { name: 'capricorn', start: [12, 22], end: [12, 31] }
    ];

    for (const sign of zodiacSigns) {
        const [startMonth, startDay] = sign.start;
        const [endMonth, endDay] = sign.end;
        
        if (month === startMonth && day >= startDay) return sign.name;
        if (month === endMonth && day <= endDay) return sign.name;
    }
    
    return 'capricorn';
}

function getZodiacNameRu(sign) {
    const names = {
        'capricorn': 'Козерог',
        'aquarius': 'Водолей',
        'pisces': 'Рыбы',
        'aries': 'Овен',
        'taurus': 'Телец',
        'gemini': 'Близнецы',
        'cancer': 'Рак',
        'leo': 'Лев',
        'virgo': 'Дева',
        'libra': 'Весы',
        'scorpio': 'Скорпион',
        'sagittarius': 'Стрелец'
    };
    return names[sign] || sign;
}

function calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function colorDistance(hex1, hex2) {
    const rgb1 = hexToRgb(hex1);
    const rgb2 = hexToRgb(hex2);
    if (!rgb1 || !rgb2) return Infinity;
    return Math.sqrt(
        Math.pow(rgb1.r - rgb2.r, 2) +
        Math.pow(rgb1.g - rgb2.g, 2) +
        Math.pow(rgb1.b - rgb2.b, 2)
    );
}

function findClosestColorName(hex) {
    let closestName = 'Неизвестный';
    let minDistance = Infinity;
    
    for (const color of appConfig.colors) {
        const distance = colorDistance(hex, color.hex);
        if (distance < minDistance) {
            minDistance = distance;
            closestName = color.name;
        }
    }
    
    return closestName;
}

let selectedTest = null;

function initApp() {
    initImageSelector();
}

function initImageSelector() {
    const imageSelector = document.getElementById('image-selector');
    if (!imageSelector) {
        return;
    }

    imageSelector.innerHTML = '';
    
    appConfig.images.forEach((image, index) => {
        const imgElement = document.createElement('div');
        imgElement.className = 'image-item border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:border-blue-400 transition duration-200 relative';
        imgElement.dataset.imageId = image.id;
        imgElement.innerHTML = `
            <div class="flex items-center justify-center image-preview" 
                 data-filename="${image.filename}" 
                 data-thumbnail="${image.thumbnail}"
                 data-index="${index}"
                 style="background-color: ${BACKGROUND_COLOR};">
                <i class="fas fa-spinner fa-spin text-gray-400"></i>
            </div>
            <div class="p-2 text-center text-sm font-medium text-gray-700 border-t border-gray-200">
                ${image.name}
            </div>
        `;
        
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const preview = entry.target;
                        const thumbnail = preview.dataset.thumbnail;
                        loadImagePreview(thumbnail, preview, true);
                        observer.unobserve(preview);
                    }
                });
            }, { rootMargin: '50px' });
            
            observer.observe(imgElement.querySelector('.image-preview'));
        } else {
            setTimeout(() => {
                loadImagePreview(image.thumbnail, imgElement.querySelector('.image-preview'), true);
            }, index * 100);
        }
        
        imgElement.addEventListener('click', () => {
            document.querySelectorAll('.image-item').forEach(item => {
                item.classList.remove('selected');
            });
            imgElement.classList.add('selected');
            selectedTest = image;
            App.state.selectedTest = image;
            
            const testError = document.getElementById('test-error');
            if (testError) testError.classList.add('hidden');
        });
        
        imageSelector.appendChild(imgElement);
    });
    
    const savedData = App.loadFromLocalStorage();
    if (savedData && savedData.selectedTestId) {
        const savedItem = document.querySelector(`[data-image-id="${savedData.selectedTestId}"]`);
        if (savedItem) {
            savedItem.classList.add('selected');
            const savedTest = appConfig.images.find(img => img.id === savedData.selectedTestId);
            if (savedTest) {
                selectedTest = savedTest;
                App.state.selectedTest = savedTest;
            }
        }
    }
}

function loadImagePreview(filename, container, isThumbnail) {
    const img = new Image();
    img.onload = function() {
        container.style.backgroundImage = `url('${filename}')`;
        container.style.backgroundSize = 'contain';
        container.style.backgroundPosition = 'center';
        container.style.backgroundRepeat = 'no-repeat';
        container.innerHTML = '';
        
        container.style.opacity = '0';
        container.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            container.style.opacity = '1';
        }, 10);
    };
    img.onerror = function() {
        if (!isThumbnail) {
            container.innerHTML = `
                <div class="text-center text-gray-400">
                    <i class="fas fa-image text-4xl"></i>
                </div>
            `;
        } else {
            const originalFilename = container.dataset.filename;
            if (originalFilename) {
                loadImagePreview(originalFilename, container, false);
            }
        }
    };
    img.src = filename;
}

function initSettings() {
    initImageSelector();
    
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
        
        if (savedData.selectedTestId) {
            const savedTest = appConfig.images.find(img => img.id === savedData.selectedTestId);
            if (savedTest) {
                selectedTest = savedTest;
                App.state.selectedTest = savedTest;
            }
        }
    }
    
    const genderSelect = document.getElementById('gender');
    const birthDateInput = document.getElementById('birthDate');
    
    if (genderSelect) {
        genderSelect.addEventListener('change', () => {
            const error = document.getElementById('gender-error');
            if (error) error.classList.add('hidden');
        });
    }
    
    if (birthDateInput) {
        birthDateInput.addEventListener('change', () => {
            const error = document.getElementById('birthdate-error');
            if (error) error.classList.add('hidden');
        });
    }
    
    const btnNext = document.getElementById('btn-next');
    if (btnNext) {
        btnNext.addEventListener('click', () => {
            const validation = Utils.validateSettings();
            
            if (validation.isValid) {
                Utils.goToColoring();
            }
        });
    }
}
