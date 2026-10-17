/** Décors météo de l'écran d'ouverture (codes WMO d'Open-Meteo). */
export type WeatherScene =
  | "clear-day"
  | "clear-night"
  | "partly-day"
  | "partly-night"
  | "cloudy"
  | "fog"
  | "rain"
  | "snow"
  | "storm";

/** Ville par défaut quand le סניף n'a pas d'adresse exploitable. */
export const DEFAULT_WEATHER_PLACE = {
  name: "ירושלים",
  latitude: 31.7683,
  longitude: 35.2137,
} as const;

const FOG_CODES = [45, 48];
const RAIN_CODES = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82];
const SNOW_CODES = [71, 73, 75, 77, 85, 86];
const STORM_CODES = [95, 96, 99];

export function sceneFromWeather(code: number, isDay: boolean): WeatherScene {
  if (STORM_CODES.includes(code)) return "storm";
  if (SNOW_CODES.includes(code)) return "snow";
  if (RAIN_CODES.includes(code)) return "rain";
  if (FOG_CODES.includes(code)) return "fog";
  if (code === 3) return "cloudy";
  if (code === 1 || code === 2) return isDay ? "partly-day" : "partly-night";
  return isDay ? "clear-day" : "clear-night";
}

/** Sans météo disponible : ciel clair selon l'heure locale (jour de 6 h à 19 h). */
export function sceneFromClock(now: Date): WeatherScene {
  const hour = now.getHours();
  return hour >= 6 && hour < 19 ? "clear-day" : "clear-night";
}

export function isNightScene(scene: WeatherScene): boolean {
  return scene === "clear-night" || scene === "partly-night";
}
