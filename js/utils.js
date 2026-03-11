const Utils = {
    validateSettings: function() {
        const gender = document.getElementById('gender')?.value;
        const birthDate = document.getElementById('birthDate')?.value;
        
        const errors = [];
        
        if (!gender) {
            errors.push('Выберите пол');
        }
        
        if (!birthDate) {
            errors.push('Укажите дату рождения');
        }
        
        if (!selectedTest && !App.state.selectedTest) {
            errors.push('Выберите тест для раскрашивания');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    },
    
    goToColoring: function() {
        const gender = document.getElementById('gender')?.value;
        const birthDate = document.getElementById('birthDate')?.value;
        
        App.state.userData.gender = gender;
        App.state.userData.birthDate = birthDate;
        
        if (birthDate) {
            const date = new Date(birthDate);
            App.state.userData.zodiacSign = getZodiacSign(date.getDate(), date.getMonth() + 1);
        }
        
        if (!App.state.selectedTest && selectedTest) {
            App.state.selectedTest = selectedTest;
        }
        
        App.saveToLocalStorage();
        
        document.getElementById('settings').classList.add('hidden');
        document.getElementById('coloring').classList.remove('hidden');
        
        if (App.state.selectedTest) {
            setTimeout(() => {
                canvas = document.getElementById('coloring-canvas');
                if (canvas) {
                    ctx = canvas.getContext('2d');
                    App.canvas = canvas;
                    App.ctx = ctx;
                }
                App.loadImageFromFile(App.state.selectedTest);
            }, 100);
        }
    }
};
