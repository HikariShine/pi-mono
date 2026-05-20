# Research: Weather-Based Clothing Recommendations

## Summary

Clothing recommendations should be based on **temperature ranges**, **weather conditions** (rain, snow, wind), and **feels-like temperature** (accounting for wind chill and humidity). The core principle is a **3-layer system**: breathable base layer + adjustable mid layer + weather-protective outer layer. This approach allows adapting to temperature changes throughout the day.

---

## Findings

### 1. Temperature-Based Clothing Guide (Celsius)

| Temperature Range | Category | Recommended Clothing |
|-------------------|----------|---------------------|
| **-10°C to -1°C** (14–30°F) | Extreme Cold / Survival Mode | Heavy insulated coat, thermal underlayers, scarf, warm hat, insulated gloves, wool socks, waterproof boots [Source](https://www.felsius.app/learn/what-to-wear/) |
| **0°C to 5°C** (32–41°F) | Winter / Freezing | Winter coat, warm jumper/fleece, scarf, hat, gloves, closed insulated shoes [Source](https://www.felsius.app/learn/what-to-wear/) |
| **6°C to 10°C** (43–50°F) | Cold / Jacket Weather | Proper jacket (not just hoodie), long sleeves, jeans/trousers, closed shoes [Source](https://www.felsius.app/learn/what-to-wear/) |
| **11°C to 15°C** (52–59°F) | Cool / Hoodie Weather | Hoodie, light jacket, or cardigan; T-shirt underneath; jeans and trainers [Source](https://www.felsius.app/learn/what-to-wear/) |
| **16°C to 20°C** (61–68°F) | Mild / Light Layers | T-shirt or long sleeve, light jacket (carryable), jeans or light trousers [Source](https://www.felsius.app/learn/what-to-wear/) |
| **21°C to 25°C** (70–77°F) | Comfortable / T-shirt Weather | T-shirt, shorts or light trousers, trainers or sandals, sunglasses [Source](https://www.felsius.app/learn/what-to-wear/) |
| **26°C to 30°C** (79–86°F) | Warm | Light t-shirt or tank top, shorts, breathable shoes/sandals, sunglasses, hat [Source](https://www.felsius.app/learn/what-to-wear/) |
| **31°C to 35°C** (88–95°F) | Hot | Lightest, loosest clothing, linen or light cotton, wide-brimmed hat, sunglasses, sunscreen [Source](https://www.felsius.app/learn/what-to-wear/) |
| **36°C+** (97°F+) | Extreme Heat | Minimal, loose, light-colored clothing; stay in shade; avoid 11am–3pm sun [Source](https://www.felsius.app/learn/what-to-wear/) |

### 2. Weather Condition Adjustments

#### Rain
- **Priority**: Waterproof outer layer, water-resistant footwear
- **Recommendations**: Rain jacket or trench coat, waterproof boots, umbrella (for light rain), avoid suede shoes [Source](https://www.cleverhiker.com/apparel/best-rain-jackets/)
- **Hot + Rain**: Lightweight waterproof jacket, quick-dry fabrics, waterproof sandals or boots [Source](https://hayleyatlarge.wordpress.com/2021/08/09/how-to-dress-for-hot-rainy-weather/)

#### Snow
- **Priority**: Insulation + waterproofing + traction
- **Recommendations**: Insulated waterproof winter coat, thermal layers, waterproof snow boots with good traction, knit beanie, warm gloves, thick scarf, moisture-wicking socks [Source](https://travelpander.com/clothes-to-wear-in-snowy-weather/)

#### Wind
- **Priority**: Wind-blocking outer layer
- **Recommendations**: Windbreaker, trench coat, or jacket with tight weave; trust "feels like" temperature which accounts for wind chill [Source](https://parific.com/what-to-wear/)

#### Hot/Humid Weather
- **Priority**: Breathability and moisture-wicking
- **Best Fabrics**: Cotton, linen, lightweight merino wool, moisture-wicking synthetics [Source](https://time.com/6981614/best-clothes-hot-weather/)
- **Avoid**: Heavy polyester, tight-fitting dark clothing

### 3. The 3-Layer System Framework

For transitional or cold weather, use this proven layering approach [Source](https://www.rei.com/learn/expert-advice/layering-basics.html):

| Layer | Purpose | Examples |
|-------|---------|------------|
| **Base Layer** | Wicks sweat off skin, keeps skin dry | Cotton tee, lightweight merino, synthetic wicking fabric |
| **Mid Layer** | Retains body heat, adjustable | Cardigan, overshirt, thin sweater, fleece, light puffer |
| **Outer Layer** | Shields from wind, rain, or provides warmth | Trench coat, rain jacket, windbreaker, winter coat |

**Key Principle**: Dress for the **day's low-to-high temperature range**, not just the current temperature. A 8–12°C gap signals a layering day [Source](https://parific.com/what-to-wear/).

### 4. WMO Weather Code Clothing Mapping

Based on Open-Meteo's WMO weather codes, map to clothing recommendations:

| WMO Code | Weather Condition | Clothing Adjustment |
|----------|-------------------|---------------------|
| 0 | Clear sky | Standard temperature-based recommendation |
| 1, 2, 3 | Mainly clear, partly cloudy, overcast | Add light layer for overcast (feels cooler) |
| 45, 48 | Fog | Visibility reduced; add reflective elements if walking/cycling |
| 51–55 | Drizzle | Light rain jacket or water-resistant outer layer |
| 61–65 | Rain | Waterproof jacket, umbrella, waterproof footwear |
| 71–77 | Snow | Winter coat, insulated boots, warm accessories |
| 80–82 | Rain showers | Waterproof outer layer, quick-dry fabrics |
| 95–99 | Thunderstorm | Stay indoors if possible; full rain gear if necessary |

### 5. Additional Factors to Consider

- **"Feels Like" Temperature**: Always use apparent_temperature from weather API instead of raw temperature, as it accounts for wind chill and humidity [Source](https://parific.com/what-to-wear/)
- **Time of Day**: Mornings can be significantly cooler than afternoons; plan for the range
- **Activity Level**: Higher activity = more breathable base layers needed
- **Precipitation Probability**: >30% chance = bring rain gear
- **Wind Speed**: >20 km/h = add wind-blocking layer

---

## Implementation Algorithm

```javascript
function getClothingRecommendation(weatherData) {
  const { 
    temperature_2m, 
    apparent_temperature, 
    weather_code, 
    wind_speed_10m,
    precipitation 
  } = weatherData;
  
  // Use "feels like" temperature as primary guide
  const feelsLike = apparent_temperature || temperature_2m;
  
  // Base recommendation from temperature
  let recommendation = getBaseRecommendationByTemp(feelsLike);
  
  // Adjust for weather conditions
  if (isRainCode(weather_code) || precipitation > 0) {
    recommendation.outerLayer = 'waterproof jacket or raincoat';
    recommendation.footwear = 'waterproof boots or shoes';
    recommendation.accessories.push('umbrella');
  }
  
  if (isSnowCode(weather_code)) {
    recommendation.outerLayer = 'insulated winter coat';
    recommendation.footwear = 'insulated waterproof boots';
    recommendation.accessories.push('warm hat', 'gloves', 'scarf');
  }
  
  if (wind_speed_10m > 20) {
    recommendation.note = 'Windy conditions - outer layer should be wind-blocking';
  }
  
  return recommendation;
}
```

---

## Sources

### Kept:
- **Felsius Temperature Guide** (https://www.felsius.app/learn/what-to-wear/) — Comprehensive temperature-based clothing guide with Celsius and Fahrenheit ranges
- **REI Layering Basics** (https://www.rei.com/learn/expert-advice/layering-basics.html) — Expert advice on 3-layer system from outdoor retailer
- **Parific Transition Weather Guide** (https://parific.com/what-to-wear/) — Practical framework for dressing in variable weather
- **CleverHiker Rain Jackets** (https://www.cleverhiker.com/apparel/best-rain-jackets/) — Rain gear recommendations and waterproofing advice
- **Travel Pander Snow Clothing** (https://travelpander.com/clothes-to-wear-in-snowy-weather/) — Winter and snow-specific clothing tips
- **TIME Hot Weather Clothing** (https://time.com/6981614/best-clothes-hot-weather/) — Heat-appropriate fabric and clothing choices

### Dropped:
- Cycling-specific guides — Too specialized for general recommendations
- Fashion-focused blogs — Prioritized practical comfort over style trends
- App reviews — Not