function calculateColorStatistics() {
    if (!canvas || !ctx) return [];
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const colorCounts = {};
    
    for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const a = pixels[i + 3];
        
        if (a < 100) continue;
        
        const hex = rgbToHex(r, g, b);
        
        const colorName = findClosestColorName(hex);
        
        if (!colorName) continue;
        
        if (!colorCounts[colorName]) {
            const colorConfig = appConfig.colors.find(c => c.name === colorName);
            colorCounts[colorName] = {
                name: colorName,
                count: 0,
                hex: colorConfig ? colorConfig.hex : hex
            };
        }
        colorCounts[colorName].count++;
    }
    
    const totalPixels = Object.values(colorCounts).reduce((sum, c) => sum + c.count, 0);
    
    const result = Object.values(colorCounts)
        .filter(c => c.count >= 10)
        .map(c => ({
            name: c.name,
            count: c.count,
            percentage: totalPixels > 0 ? (c.count / totalPixels) * 100 : 0,
            hex: c.hex
        }))
        .sort((a, b) => b.count - a.count);
    
    return result;
}
