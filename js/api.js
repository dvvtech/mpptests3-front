const API_ENDPOINT = 'https://api.cloud-platform.pro/mpp-tests/v1/color-analysis/analyze-lusher';

async function sendAnalysisRequest(data) {
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();        
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

function getDemoResponse() {
    return {
        mainCharacteristic: 'Вы обладаете уравновешенным характером с тенденцией к творческому подходу в решении задач. Ваш выбор цветов указывает на стремление к гармонии и внутренней стабильности.',
        strengths: ["Жизнерадостность", "Коммуникабельность", "Стремление к гармонии"],
        recommendations: ["Уделяйте внимание поддержанию баланса между активной социальной жизнью и временем для себя.", "Используйте свои коммуникативные навыки для укрепления профессиональных и личных связей."]
    };
}
