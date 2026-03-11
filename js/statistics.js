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
        
        if (colorDistance(hex, '#EDEDED') < 30) continue;
        
        const colorName = findClosestColorName(hex);
        
        if (!colorCounts[colorName]) {
            colorCounts[colorName] = {
                name: colorName,
                count: 0,
                hex: appConfig.colors.find(c => c.name === colorName)?.hex || hex
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
            percentage: (c.count / totalPixels) * 100,
            hex: c.hex
        }))
        .sort((a, b) => b.count - a.count);
    
    return result;
}
