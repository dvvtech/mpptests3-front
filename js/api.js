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
        main_characteristic: 'Вы обладаете уравновешенным характером с тенденцией к творческому подходу в решении задач. Ваш выбор цветов указывает на стремление к гармонии и внутренней стабильности.',
        strengths: 'Умение находить нестандартные решения, высокая эмпатия, развитая интуиция, способность адаптироваться к изменяющимся условиям.',
        recommendations: 'Рекомендуется уделять больше времени саморефлексии и творческим занятиям. Попробуйте медитацию или арт-терапию для поддержания внутреннего баланса. Избегайте чрезмерной самокритики.'
    };
}
