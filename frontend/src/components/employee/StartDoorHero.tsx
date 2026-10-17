import type { ReactNode } from "react";
import { Box, alpha } from "@mui/material";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import { he } from "../../i18n/he";
import type { WeatherScene } from "../../utils/weatherScene";
import WeatherSkyArt, { SKY_GRADIENT } from "./WeatherSkyArt";

export interface StartDoorHeroProps {
  scene: WeatherScene;
  place: string;
  /** Température en °C ; absente si la météo n'a pas pu être lue. */
  temperatureC?: number | null;
  /** Hauteur du bandeau en px ; 176 par défaut (porte), plus bas sur la liste des tâches. */
  height?: number;
}

function GlassChip({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 1.5,
        py: 0.6,
        borderRadius: 999,
        color: "#fff",
        fontSize: "0.9rem",
        fontWeight: 700,
        lineHeight: 1.2,
        bgcolor: alpha("#0F172A", 0.34),
        border: `1px solid ${alpha("#fff", 0.22)}`,
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      {children}
    </Box>
  );
}

/** Bandeau du haut : ciel du סניף selon la météo, ville et température en pastilles. */
export default function StartDoorHero({ scene, place, temperatureC, height = 176 }: StartDoorHeroProps) {
  const label = he.weatherScene[scene];
  const hasTemp = typeof temperatureC === "number";
  return (
    <Box
      role="img"
      aria-label={he.weatherAria(place, label)}
      data-testid="start-door-hero"
      data-scene={scene}
      sx={{
        position: "relative",
        height,
        background: SKY_GRADIENT[scene],
        transition: "background 600ms ease",
      }}
    >
      <WeatherSkyArt scene={scene} />
      <Box sx={{ position: "relative", display: "flex", justifyContent: "space-between", p: 1.75 }}>
        <GlassChip>
          <PlaceOutlinedIcon sx={{ fontSize: 17 }} aria-hidden />
          <span data-testid="start-door-place">{place}</span>
        </GlassChip>
        {hasTemp ? (
          <GlassChip>
            <span>{label}</span>
            <span dir="ltr" data-testid="start-door-temp">
              {Math.round(temperatureC)}°
            </span>
          </GlassChip>
        ) : null}
      </Box>
    </Box>
  );
}
