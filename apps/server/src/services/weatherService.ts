interface WeatherContext {
  city: string;
  temperature: number;
  condition: string;
  feelsLike: number;
  humidity: number;
  stylingTip: string;
}

export async function getWeatherStylingContext(city = 'Mumbai'): Promise<WeatherContext> {
  // Mock weather context — replace with real API call when WEATHER_API_KEY is set
  return {
    city,
    temperature: 29,
    condition: 'Humid, light rain later',
    feelsLike: 32,
    humidity: 78,
    stylingTip: 'Choose breathable layers and carry a light jacket. Closed footwear recommended.',
  };
}
