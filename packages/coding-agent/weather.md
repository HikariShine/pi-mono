# Research: Weather API for Location and Time Data

## Summary

To get weather data for a specified location and time, **Open-Meteo** is the recommended free solution - it requires no API key, has no rate limits for non-commercial use, and provides current conditions, hourly forecasts (up to 7 days), and daily forecasts. For production applications requiring higher reliability, **OpenWeatherMap** offers 1,000 free calls/day with an API key.

## Findings

1. **Open-Meteo API (Recommended for Free Use)** — The best free weather API with no authentication required. Provides current weather, hourly forecasts (48 hours), and daily forecasts (7 days) for any geographic coordinates. [Source](https://open-meteo.com/)

2. **API Endpoint Structure** — Open-Meteo uses a simple GET request format:
   ```
   https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current={variables}&hourly={variables}&daily={variables}&timezone=auto
   ```
   [Source](https://open-meteo.com/en/docs)

3. **Available Weather Variables** — Open-Meteo provides comprehensive data including:
   - Temperature (2m, apparent/feels-like)
   - Relative humidity
   - Precipitation (rain, showers, snowfall)
   - Wind speed and direction (10m, 80m, 120m, 180m)
   - Wind gusts
   - Cloud cover
   - Pressure (MSL and surface)
   - Weather code (WMO standard codes)
   - UV index, visibility, and more
   [Source](https://open-meteo.com/en/docs)

4. **OpenWeatherMap Alternative** — Offers 1,000 calls/day on free tier with API key. Provides One Call API 3.0 with current, forecast (5 days), and historical data. Requires registration at openweathermap.org. [Source](https://openweathermap.org/api)

5. **WMO Weather Codes** — Open-Meteo uses standard WMO weather interpretation codes (0=clear, 1=mainly clear, 2=partly cloudy, 3=overcast, 45/48=fog, 51-55=drizzle, 61-65=rain, 71-77=snow, 80-82=rain showers, 95-99=thunderstorm). [Source](https://open-meteo.com/en/docs)

6. **Time Parameter Support** — Open-Meteo automatically handles timezones with `timezone=auto` parameter. Supports ISO 8601 time format for specific time queries. Past data available through historical API endpoints. [Source](https://open-meteo.com/en/docs)

## Sample API Call

**Current weather for Berlin (52.52, 13.41):**
```
https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto
```

**Sample Response:**
```json
{
  "latitude": 52.52,
  "longitude": 13.42,
  "timezone": "Europe/Berlin",
  "current": {
    "time": "2026-05-18T12:15",
    "temperature_2m": 17.7,
    "relative_humidity_2m": 41,
    "apparent_temperature": 14.6,
    "weather_code": 3,
    "wind_speed_10m": 12.0
  }
}
```

## Sources

### Kept:
- **Open-Meteo Documentation** (https://open-meteo.com/en/docs) — Complete API reference with all available variables, parameters, and WMO weather codes. Primary source for implementation.
- **Open-Meteo GitHub** (https://github.com/open-meteo/open-meteo) — Open source project with 5,400+ stars, actively maintained. Validates API reliability.
- **OpenWeatherMap API Docs** (https://openweathermap.org/api) — Alternative with free tier, well-documented, widely used in production.
- **API Bouncer Weather API Comparison** (https://apibouncer.com/guides/best-free-weather-apis) — Comprehensive comparison of free weather APIs including rate limits and features.

### Dropped:
- **WorldWeatherOnline** — Commercial focus, limited free tier details
- **WeatherAI.io** — Newer service, less established
- **WeatherXu** — Less documentation available
- **Visual Crossing** — Good but redundant with Open-Meteo coverage

## Implementation Guide

### Basic Usage (Open-Meteo):
```javascript
const getWeather = async (latitude, longitude) => {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,precipitation&timezone=auto`;
  const response = await fetch(url);
  const data = await response.json();
  return data.current;
};
```

### For Specific Time (Historical):
```javascript
const getHistoricalWeather = async (latitude, longitude, startDate, endDate) => {
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${latitude}&longitude=${longitude}&start_date=${startDate}&end_date=${endDate}&hourly=temperature_2m&timezone=auto`;
  const response = await fetch(url);
  return await response.json();
};
```

## Gaps

1. **Geocoding** — Neither Open-Meteo nor OpenWeatherMap's free tier includes city name to coordinate conversion. You'll need a separate geocoding service (like OpenStreetMap Nominatim) to convert "Beijing" to coordinates.

2. **Real-time Updates** — Free APIs update every 1-3 hours. For true real-time data (minute-by-minute), paid services are required.

3. **Severe Weather Alerts** — Open-Meteo does not provide severe weather alerts. OpenWeatherMap includes alerts in their One Call API.

## Suggested Next Steps

1. If you need to convert city names to coordinates, integrate OpenStreetMap Nominatim API (free, no key required):
   ```
   https://nominatim.openstreetmap.org/search?q={city}&format=json
   ```

2. For production use with higher reliability requirements, consider OpenWeatherMap paid tier or Tomorrow.io.

3. Test the API with your specific location and time requirements to verify data availability.
