import axios from "axios";
import { DEFAULT_WEATHER_PLACE } from "../utils/weatherScene";

export interface BranchWeather {
  temperatureC: number;
  code: number;
  isDay: boolean;
  /** Nom affiché (ville du סניף, ou ירושלים par défaut). */
  place: string;
}

interface Coordinates {
  place: string;
  latitude: number;
  longitude: number;
}

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const TIMEOUT_MS = 6000;
const CACHE_TTL_MS = 10 * 60 * 1000;

const cache = new Map<string, { at: number; value: BranchWeather }>();

export function clearWeatherCache(): void {
  cache.clear();
}

async function geocodeCity(city: string): Promise<Coordinates | null> {
  try {
    const { data } = await axios.get<{ results?: Array<{ latitude: number; longitude: number }> }>(
      GEOCODING_URL,
      { params: { name: city, count: 1, language: "he", countryCode: "IL" }, timeout: TIMEOUT_MS },
    );
    const hit = data.results?.[0];
    return hit ? { place: city, latitude: hit.latitude, longitude: hit.longitude } : null;
  } catch {
    return null;
  }
}

/** Ville inconnue ou introuvable : on prend ירושלים. */
export async function resolveWeatherPlace(city?: string | null): Promise<Coordinates> {
  const name = (city ?? "").trim();
  const found = name ? await geocodeCity(name) : null;
  return found ?? { place: DEFAULT_WEATHER_PLACE.name, ...DEFAULT_WEATHER_PLACE };
}

async function fetchCurrent(place: Coordinates): Promise<BranchWeather> {
  const { data } = await axios.get<{
    current: { temperature_2m: number; weather_code: number; is_day: number };
  }>(FORECAST_URL, {
    params: {
      latitude: place.latitude,
      longitude: place.longitude,
      current: "temperature_2m,weather_code,is_day",
      timezone: "auto",
    },
    timeout: TIMEOUT_MS,
  });
  return {
    temperatureC: data.current.temperature_2m,
    code: data.current.weather_code,
    isDay: data.current.is_day === 1,
    place: place.place,
  };
}

/** Météo du moment pour la ville du סניף (cache 10 min). Lève une erreur si le service est injoignable. */
export async function fetchBranchWeather(city?: string | null): Promise<BranchWeather> {
  const key = (city ?? "").trim().toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;
  const value = await fetchCurrent(await resolveWeatherPlace(city));
  cache.set(key, { at: Date.now(), value });
  return value;
}
