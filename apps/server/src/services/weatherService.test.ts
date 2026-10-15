import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '../config/env';
import { getWeatherStylingContext } from './weatherService';

const response = (value: unknown) => ({ ok: true, json: async () => value });
describe('Open-Meteo weather adapter', () => {
  const provider = env.WEATHER_PROVIDER;
  const nodeEnv = env.NODE_ENV;
  beforeEach(() => { env.WEATHER_PROVIDER = 'open-meteo'; env.NODE_ENV = 'test'; });
  afterEach(() => { env.WEATHER_PROVIDER = provider; env.NODE_ENV = nodeEnv; vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('requires an explicit city and does not fake weather when disabled', async () => {
    expect(await getWeatherStylingContext(null)).toMatchObject({ available: false });
    env.WEATHER_PROVIDER = 'none';
    const fetchSpy = vi.fn(); vi.stubGlobal('fetch', fetchSpy);
    expect(await getWeatherStylingContext('Pune')).toMatchObject({ available: false,
      reason: 'Weather provider is not configured.' });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns observed weather with provenance and a retrieval timestamp', async () => {
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(response({ results: [{ name: 'Mumbai', country: 'India', latitude: 19.07, longitude: 72.87 }] }))
      .mockResolvedValueOnce(response({ current: { temperature_2m: 29, apparent_temperature: 32,
        precipitation: 2, weather_code: 61 } }));
    vi.stubGlobal('fetch', fetchSpy);
    const result = await getWeatherStylingContext('Mumbai');
    expect(result).toMatchObject({ available: true, city: 'Mumbai, India', temperatureC: 29,
      precipitationMm: 2, condition: 'Rain', source: 'Open-Meteo' });
    if (result.available) expect(Number.isNaN(Date.parse(result.retrievedAt))).toBe(false);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain('name=Mumbai');
    expect(String(fetchSpy.mock.calls[1]?.[0])).toContain('latitude=19.07');
  });

  it('uses the event time zone for the forecast date, including crossing UTC midnight', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-15T12:00:00Z'));
    const fetchSpy = vi.fn()
      .mockResolvedValueOnce(response({ results: [{ name: 'Kolkata', country: 'India', latitude: 22.5, longitude: 88.3 }] }))
      .mockResolvedValueOnce(response({ daily: { time: ['2026-10-17', '2026-10-18'], temperature_2m_max: [26, null],
        temperature_2m_min: [22, null], precipitation_sum: [0, null], weather_code: [0, null] } }));
    vi.stubGlobal('fetch', fetchSpy);
    const result = await getWeatherStylingContext('Kolkata', new Date('2026-10-16T19:30:00Z'), 'Asia/Kolkata');
    expect(result).toMatchObject({ available: true, forecastFor: '2026-10-17', temperatureC: 24 });
    expect(String(fetchSpy.mock.calls[1]?.[0])).toContain('timezone=Asia%2FKolkata');
  });

  it('fails gracefully when the provider times out or errors', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network failed')));
    expect(await getWeatherStylingContext('Jaipur')).toMatchObject({ available: false,
      reason: expect.stringContaining('temporarily unavailable') });
  });
});
