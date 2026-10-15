import { z } from 'zod';
import { env } from '../config/env';

const locationSchema = z.object({ results: z.array(z.object({
  name: z.string(), country: z.string(), latitude: z.number(), longitude: z.number(),
})).optional() });
const forecastSchema = z.object({
  current: z.object({ temperature_2m: z.number(), apparent_temperature: z.number(),
    precipitation: z.number(), weather_code: z.number() }).optional(),
  daily: z.object({ time: z.array(z.string()), temperature_2m_max: z.array(z.number().nullable()),
    temperature_2m_min: z.array(z.number().nullable()), precipitation_sum: z.array(z.number().nullable()),
    weather_code: z.array(z.number().nullable()) }).optional(),
});
export type WeatherResult = { available: true; city: string; temperatureC: number;
  feelsLikeC?: number; precipitationMm: number; condition: string; stylingTip: string;
  retrievedAt: string; forecastFor?: string; source: 'Open-Meteo' }
  | { available: false; reason: string };
const cache = new Map<string, { expires: number; value: WeatherResult }>();

async function providerJson(url: URL): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(env.WEATHER_TIMEOUT_MS), redirect: 'error' });
  if (!response.ok) {throw new Error('Weather provider unavailable');}
  return response.json();
}

/** Geocodes only an explicitly selected city; never uses precise user coordinates. */
export async function getWeatherStylingContext(city: string | null | undefined, at?: Date, timeZone = 'UTC'): Promise<WeatherResult> {
  if (!city?.trim()) {return { available: false, reason: 'Choose a city in Style Profile to enable weather-aware styling.' };}
  if (env.WEATHER_PROVIDER !== 'open-meteo') {return { available: false, reason: 'Weather provider is not configured.' };}
  if (env.NODE_ENV === 'production' && !env.WEATHER_API_KEY) {return { available: false, reason: 'Weather provider credentials are not configured.' };}
  const dateParts = at ? new Intl.DateTimeFormat('en-US', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(at) : [];
  const datePart = (type: string) => dateParts.find((part) => part.type === type)?.value ?? '';
  const day = at ? `${datePart('year')}-${datePart('month')}-${datePart('day')}` : undefined;
  const key = `${city.trim().toLowerCase()}:${day ?? 'current'}:${timeZone}`;
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {return cached.value;}
  if (at && (at.getTime() < Date.now() - 86_400_000 || at.getTime() > Date.now() + 15 * 86_400_000)) {
    return { available: false, reason: 'Weather forecasts are available only for upcoming dates within 15 days.' };
  }
  try {
    const host = env.WEATHER_API_KEY ? 'customer-api.open-meteo.com' : 'api.open-meteo.com';
    const geoHost = env.WEATHER_API_KEY ? 'customer-geocoding-api.open-meteo.com' : 'geocoding-api.open-meteo.com';
    const geoUrl = new URL(`https://${geoHost}/v1/search`);
    geoUrl.searchParams.set('name', city.trim()); geoUrl.searchParams.set('count', '1');
    if (env.WEATHER_API_KEY) {geoUrl.searchParams.set('apikey', env.WEATHER_API_KEY);}
    const location = locationSchema.parse(await providerJson(geoUrl)).results?.[0];
    if (!location) {return { available: false, reason: 'City not found. Check the spelling in Style Profile.' };}
    const url = new URL(`https://${host}/v1/forecast`);
    url.searchParams.set('latitude', String(location.latitude));
    url.searchParams.set('longitude', String(location.longitude));
    url.searchParams.set('timezone', timeZone);
    if (env.WEATHER_API_KEY) {url.searchParams.set('apikey', env.WEATHER_API_KEY);}
    if (day) {
      url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code');
      url.searchParams.set('forecast_days', '16');
    } else {url.searchParams.set('current', 'temperature_2m,apparent_temperature,precipitation,weather_code');}
    const forecast = forecastSchema.parse(await providerJson(url));
    let temperatureC: number; let precipitationMm: number; let code: number; let feelsLikeC: number | undefined;
    if (day) {
      const index = forecast.daily?.time.indexOf(day) ?? -1;
      if (index < 0 || !forecast.daily) {return { available: false, reason: 'Forecast is unavailable for this event date.' };}
      const high = forecast.daily.temperature_2m_max[index];
      const low = forecast.daily.temperature_2m_min[index];
      const rain = forecast.daily.precipitation_sum[index];
      const weatherCode = forecast.daily.weather_code[index];
      if (high === null || high === undefined || low === null || low === undefined ||
        rain === null || rain === undefined || weatherCode === null || weatherCode === undefined) {
        return { available: false, reason: 'Forecast is incomplete for this event date.' };
      }
      temperatureC = Math.round((high + low) / 2);
      precipitationMm = rain; code = weatherCode;
    } else {
      if (!forecast.current) {return { available: false, reason: 'Current weather is unavailable.' };}
      temperatureC = forecast.current.temperature_2m; precipitationMm = forecast.current.precipitation;
      feelsLikeC = forecast.current.apparent_temperature; code = forecast.current.weather_code;
    }
    const condition = code === 0 ? 'Clear' : code <= 3 ? 'Cloudy' : code <= 48 ? 'Foggy'
      : code <= 67 || code >= 80 && code <= 82 ? 'Rain' : code <= 77 || code >= 85 && code <= 86 ? 'Snow'
        : code >= 95 ? 'Thunderstorm' : 'Mixed conditions';
    const layers = temperatureC < 10 ? 'Choose warm layers and a coat.'
      : temperatureC < 20 ? 'A light layer may help.' : 'Choose breathable pieces.';
    const value: WeatherResult = { available: true, city: `${location.name}, ${location.country}`,
      temperatureC, ...(feelsLikeC === undefined ? {} : { feelsLikeC }), precipitationMm, condition,
      stylingTip: precipitationMm > 0 ? `${layers} Consider rain-ready outerwear and footwear.` : layers,
      retrievedAt: new Date().toISOString(), ...(day ? { forecastFor: day } : {}), source: 'Open-Meteo' };
    cache.set(key, { expires: Date.now() + 15 * 60_000, value });
    return value;
  } catch {
    return { available: false, reason: 'Weather is temporarily unavailable. Outfit styling can continue without it.' };
  }
}
