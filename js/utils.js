const Utils = {
    validateSettings: function() {
        const gender = document.getElementById('gender')?.value;
        const birthDate = document.getElementById('birthDate')?.value;
        
        let isValid = true;
        
        const genderError = document.getElementById('gender-error');
        const birthdateError = document.getElementById('birthdate-error');
        const testError = document.getElementById('test-error');
        
        if (genderError) genderError.classList.add('hidden');
        if (birthdateError) birthdateError.classList.add('hidden');
        if (testError) testError.classList.add('hidden');
        
        if (!gender) {
            if (genderError) genderError.classList.remove('hidden');
            isValid = false;
        }
        
        if (!birthDate) {
            if (birthdateError) birthdateError.classList.remove('hidden');
            isValid = false;
        }
        
        if (!selectedTest && !App.state.selectedTest) {
            if (testError) testError.classList.remove('hidden');
            isValid = false;
        }
        
        return { isValid: isValid };
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
