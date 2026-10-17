import { Box, Typography, alpha } from "@mui/material";
import { he } from "../../i18n/he";
import { EMPLOYEE_INK } from "../../styles/employeeUi";
import { useNowClock } from "../../hooks/useNowClock";
import { useBranchWeather } from "../../hooks/useBranchWeather";
import { formatClockTime } from "../../utils/clockTime";
import { DEFAULT_WEATHER_PLACE, sceneFromClock, sceneFromWeather } from "../../utils/weatherScene";
import { StartDoorButton, StartDoorIdentity } from "./EmployeeStartDoorParts";
import StartDoorHero from "./StartDoorHero";

export interface EmployeeStartDoorProps {
  name?: string;
  photoUrl?: string | null;
  /** Date du jour déjà formatée en hébreu. */
  dateLabel?: string;
  /** « סניף … · תפקיד » : affiché une seule fois, sous le nom. */
  meta?: string;
  /** Ville du סניף pour la météo ; ירושלים si absente. */
  branchCity?: string | null;
  onOpen: () => void;
}

const cardSx = {
  maxWidth: 420,
  mx: "auto",
  mb: 3,
  overflow: "hidden",
  textAlign: "center",
  borderRadius: "28px",
  bgcolor: "#fff",
  border: `1px solid ${alpha(EMPLOYEE_INK, 0.06)}`,
  boxShadow: `0 16px 44px ${alpha(EMPLOYEE_INK, 0.1)}`,
} as const;

/** Écran « פתיחת משמרת » : ciel météo du סניף, identité, un seul gros bouton. */
export default function EmployeeStartDoor({
  name,
  photoUrl,
  dateLabel,
  meta,
  branchCity,
  onOpen,
}: EmployeeStartDoorProps) {
  const now = useNowClock();
  const weather = useBranchWeather(branchCity);
  const scene = weather ? sceneFromWeather(weather.code, weather.isDay) : sceneFromClock(now);
  const place = weather?.place ?? (branchCity?.trim() || DEFAULT_WEATHER_PLACE.name);
  return (
    <Box component="section" aria-label={he.punchOpenShift} sx={cardSx}>
      <StartDoorHero scene={scene} place={place} temperatureC={weather?.temperatureC} />
      <StartDoorIdentity name={name} photoUrl={photoUrl} dateLabel={dateLabel} meta={meta} />
      <Box sx={{ px: 2.5, pt: 2.5, pb: 3, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Typography variant="h1" component="h2" sx={{ fontSize: "2.1rem", fontWeight: 800, lineHeight: 1.2, color: EMPLOYEE_INK }}>
          {he.punchOpenShift}
        </Typography>
        <Box sx={{ mt: 1 }}>
          <StartDoorButton timeLabel={formatClockTime(now)} onOpen={onOpen} />
        </Box>
        <Typography sx={{ mt: 1.5, maxWidth: 300, fontSize: "1.15rem", fontWeight: 500, lineHeight: 1.4, color: "#334155", textWrap: "balance" }}>
          {he.punchOpenShiftHint}
        </Typography>
      </Box>
    </Box>
  );
}
