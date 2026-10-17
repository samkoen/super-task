import { useEffect, useState } from "react";
import { fetchBranchWeather, type BranchWeather } from "../services/weatherService";

/** Météo du moment pour la ville du סניף ; `null` tant que non chargée ou en cas d'échec. */
export function useBranchWeather(city?: string | null): BranchWeather | null {
  const [weather, setWeather] = useState<BranchWeather | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetchBranchWeather(city)
      .then((value) => {
        if (!cancelled) setWeather(value);
      })
      .catch(() => {
        if (!cancelled) setWeather(null);
      });
    return () => {
      cancelled = true;
    };
  }, [city]);
  return weather;
}
