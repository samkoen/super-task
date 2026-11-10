import { Box, ButtonBase, Typography } from "@mui/material";
import { he } from "../../i18n/he";
import { flowColor, flowRadius, flowScreenBackground, flowText } from "../../styles/flowTokens";
import { employeeFirstName, employeeGreeting } from "../../utils/employeeNextTask";
import { useNowClock } from "../../hooks/useNowClock";
import heroSrc from "../../assets/flow1/start-hero.png";
import fingerprintSrc from "../../assets/flow1/start-fingerprint.svg";

export interface EmployeeStartDoorProps {
  /** Nom complet de l'oved : seul le prénom est affiché. */
  name?: string;
  /** Nom du סניף (« 510 ») pour le tag ; pas de tag s'il est absent. */
  branch?: string | null;
  onOpen: () => void;
}

const screenSx = {
  maxWidth: 393,
  mx: "auto",
  mb: 3,
  pt: "57px",
  pb: 6,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  borderRadius: `${flowRadius.md}px`,
  background: flowScreenBackground,
  color: flowColor.neutral900,
} as const;

function Hero() {
  return (
    <Box sx={{ width: "100%", height: 231, display: "flex", justifyContent: "flex-start", pl: "68px", direction: "ltr" }}>
      <Box sx={{ width: 230, height: 231, overflow: "hidden", position: "relative" }}>
        <Box
          component="img"
          src={heroSrc}
          alt=""
          aria-hidden
          sx={{ position: "absolute", top: 0, left: "-10.57%", width: "120.49%", height: "100%", maxWidth: "none" }}
        />
      </Box>
    </Box>
  );
}

function BranchTag({ branch }: { branch: string }) {
  return (
    <Box
      data-testid="start-door-branch"
      sx={{
        ...flowText.button,
        height: 32,
        px: "8.2px",
        minWidth: 92,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: `${flowRadius.full}px`,
        bgcolor: flowColor.alphaOrange500_20,
        color: flowColor.orange500,
      }}
    >
      {he.flowStartBranchTag(branch)}
    </Box>
  );
}

function Intro({ name, branch, hour }: { name?: string; branch?: string | null; hour: number }) {
  return (
    <Box sx={{ mt: "23px", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
      <Typography component="h2" data-testid="start-door-greeting" sx={flowText.display}>
        {he.flowStartGreeting(employeeGreeting(hour), employeeFirstName(name))}
      </Typography>
      <Typography sx={flowText.bodyLarge}>{he.flowStartReady}</Typography>
      {branch ? <BranchTag branch={branch} /> : null}
    </Box>
  );
}

function StartButton({ onOpen }: { onOpen: () => void }) {
  return (
    <ButtonBase
      onClick={onOpen}
      aria-label={he.punchOpenShift}
      sx={{
        width: 110,
        height: 110,
        borderRadius: "50%",
        transition: "transform 120ms ease",
        "&:active": { transform: "scale(0.96)" },
        "&.Mui-focusVisible": { outline: `3px solid ${flowColor.orange500}`, outlineOffset: 4 },
      }}
    >
      <Box component="img" src={fingerprintSrc} alt="" aria-hidden sx={{ width: 110, height: 110, display: "block" }} />
    </ButtonBase>
  );
}

/** Écran 01 du FLOW 1 : accueil, tag סניף, gros bouton de début de משמרת. */
export default function EmployeeStartDoor({ name, branch, onOpen }: EmployeeStartDoorProps) {
  const now = useNowClock();
  return (
    <Box component="section" aria-label={he.punchOpenShift} data-testid="start-door" sx={screenSx}>
      <Hero />
      <Intro name={name} branch={branch} hour={now.getHours()} />
      <Box sx={{ mt: "109px", display: "flex", flexDirection: "column", alignItems: "center", gap: "13px", width: "100%" }}>
        <StartButton onOpen={onOpen} />
        <Box sx={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
          <Typography sx={flowText.h2}>{he.flowStartCta}</Typography>
          <Typography sx={flowText.bodyLarge}>{he.flowStartAutoTime}</Typography>
        </Box>
      </Box>
    </Box>
  );
}
