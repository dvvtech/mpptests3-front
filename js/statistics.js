const statisticsColorLookup = new Map(
    appConfig.colors.map(color => {
        const rgb = hexToRgb(color.hex);
        return [((rgb.r << 16) | (rgb.g << 8) | rgb.b), { name: color.name, hex: color.hex }];
    })
);

function calculateColorStatistics() {
    if (!canvas || !ctx) return [];

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const colorCounts = {};
    let totalPixels = 0;

    for (let i = 0; i < pixels.length; i += 4) {
        const a = pixels[i + 3];

        if (a < 100) continue;

        const colorConfig = statisticsColorLookup.get((pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2]);

        if (!colorConfig) continue;

        if (!colorCounts[colorConfig.name]) {
            colorCounts[colorConfig.name] = {
                name: colorConfig.name,
                count: 0,
                hex: colorConfig.hex
            };
        }

        colorCounts[colorConfig.name].count++;
        totalPixels++;
    }

    return Object.values(colorCounts)
        .filter(c => c.count >= 10)
        .map(c => ({
            name: c.name,
            count: c.count,
            percentage: totalPixels > 0 ? (c.count / totalPixels) * 100 : 0,
            hex: c.hex
        }))
        .sort((a, b) => b.count - a.count);
}
