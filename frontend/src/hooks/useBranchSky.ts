import { useBranchWeather } from "./useBranchWeather";
import { useNowClock } from "./useNowClock";
import { DEFAULT_WEATHER_PLACE, sceneFromClock, sceneFromWeather, type WeatherScene } from "../utils/weatherScene";

export interface BranchSky {
  scene: WeatherScene;
  place: string;
  temperatureC: number | null;
}

/** Ciel du סניף : météo réelle si lue, sinon scène déduite de l'heure ; ירושלים par défaut. */
export function useBranchSky(branchCity?: string | null): BranchSky {
  const now = useNowClock();
  const weather = useBranchWeather(branchCity);
  return {
    scene: weather ? sceneFromWeather(weather.code, weather.isDay) : sceneFromClock(now),
    place: weather?.place ?? (branchCity?.trim() || DEFAULT_WEATHER_PLACE.name),
    temperatureC: weather?.temperatureC ?? null,
  };
}
