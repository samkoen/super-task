import type { ReactNode } from "react";
import { Box } from "@mui/material";
import { isNightScene, type WeatherScene } from "../../utils/weatherScene";
import { Cloud, FogBands, Lightning, Moon, Rain, Snow, Stars, Sun } from "./WeatherSkyPieces";

export const SKY_GRADIENT: Record<WeatherScene, string> = {
  "clear-day": "linear-gradient(180deg, #4FB0F4 0%, #A6DAFB 62%, #FCE6B4 100%)",
  "clear-night": "linear-gradient(180deg, #0A1432 0%, #25356E 70%, #44508F 100%)",
  "partly-day": "linear-gradient(180deg, #6BBBF0 0%, #BCDFF5 62%, #F2EAD2 100%)",
  "partly-night": "linear-gradient(180deg, #0E1A3C 0%, #2A3A72 70%, #4A5890 100%)",
  cloudy: "linear-gradient(180deg, #8998AC 0%, #B6C1CE 62%, #DAE0E7 100%)",
  fog: "linear-gradient(180deg, #A9B4BF 0%, #CBD2D9 62%, #E6E9EC 100%)",
  rain: "linear-gradient(180deg, #4A637E 0%, #7A91A8 62%, #AFBFCC 100%)",
  snow: "linear-gradient(180deg, #9AAEC4 0%, #C7D4E2 62%, #EEF3F8 100%)",
  storm: "linear-gradient(180deg, #202A40 0%, #46536D 62%, #75839A 100%)",
};

const HILLS: Record<WeatherScene, [string, string]> = {
  "clear-day": ["#79BFA2", "#4F9F83"],
  "clear-night": ["#1B2C5C", "#101D43"],
  "partly-day": ["#79BFA2", "#4F9F83"],
  "partly-night": ["#1B2C5C", "#101D43"],
  cloudy: ["#7FA999", "#5F917F"],
  fog: ["#A4BDB4", "#8BA89D"],
  rain: ["#5C8576", "#46705F"],
  snow: ["#DDE7EF", "#C5D3DF"],
  storm: ["#33505A", "#263E47"],
};

const GREY = "#C9D2DC";
const DARK = "#55627A";

function precipitation(cloud: string, fall: ReactNode, extra?: ReactNode): ReactNode {
  return (
    <>
      <Cloud x={110} y={64} scale={1.35} fill={cloud} />
      <Cloud x={290} y={78} scale={1.15} fill={cloud} opacity={0.92} />
      {fall}
      {extra}
    </>
  );
}

const SKY_ART: Record<WeatherScene, ReactNode> = {
  "clear-day": (
    <>
      <Sun x={96} y={74} />
      <Cloud x={300} y={84} scale={0.7} opacity={0.85} />
    </>
  ),
  "clear-night": (
    <>
      <Stars />
      <Moon x={96} y={72} />
    </>
  ),
  "partly-day": (
    <>
      <Sun x={92} y={66} />
      <Cloud x={118} y={96} scale={1.25} />
      <Cloud x={308} y={62} scale={0.75} opacity={0.9} />
    </>
  ),
  "partly-night": (
    <>
      <Stars />
      <Moon x={96} y={66} />
      <Cloud x={120} y={96} scale={1.2} fill="#6E7BA6" />
    </>
  ),
  cloudy: (
    <>
      <Cloud x={100} y={70} scale={1.3} fill={GREY} />
      <Cloud x={290} y={88} scale={1.1} fill="#fff" opacity={0.9} />
    </>
  ),
  fog: (
    <>
      <Cloud x={110} y={64} scale={1.1} fill="#F3F5F7" opacity={0.9} />
      <FogBands />
    </>
  ),
  rain: precipitation(DARK, <Rain />),
  snow: precipitation("#F4F7FA", <Snow />),
  storm: precipitation("#3A465E", <Rain />, <Lightning x={196} y={86} />),
};
/** Illustration plein cadre du ciel du סניף : décor selon la météo, collines au premier plan. */
export default function WeatherSkyArt({ scene }: { scene: WeatherScene }) {
  const [back, front] = HILLS[scene];
  return (
    <Box
      component="svg"
      viewBox="0 0 400 240"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
      data-scene={scene}
      data-night={isNightScene(scene) ? "true" : "false"}
      sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
    >
      <g transform="translate(15 50)">{SKY_ART[scene]}</g>
      <path d="M0 196C60 168 124 172 184 192S306 204 400 172V240H0Z" fill={back} />
      <path d="M0 220C80 198 152 214 232 210S352 198 400 212V240H0Z" fill={front} />
    </Box>
  );
}
