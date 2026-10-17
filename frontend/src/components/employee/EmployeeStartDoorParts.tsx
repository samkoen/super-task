import { Avatar, Box, ButtonBase, Typography, alpha, keyframes } from "@mui/material";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import { avatarInitials } from "../../utils/avatarInitials";
import { mediaUrl } from "../../utils/mediaUrl";
import { he } from "../../i18n/he";
import { EMPLOYEE_BRAND, EMPLOYEE_BRAND_DARK, EMPLOYEE_INK } from "../../styles/employeeUi";

const MUTE = "#5B6B7B";
const BRAND_SOFT = "#E6F3F0";
const BRAND_LIGHT = "#14937D";

const ringBlink = keyframes`
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
`;

const glowBlink = keyframes`
  0%, 100% { box-shadow: 0 18px 36px ${alpha(EMPLOYEE_BRAND, 0.32)}, 0 0 0 10px ${alpha(EMPLOYEE_BRAND, 0.08)}; }
  50% { box-shadow: 0 22px 48px ${alpha(EMPLOYEE_BRAND, 0.45)}, 0 0 0 16px ${alpha(EMPLOYEE_BRAND, 0.14)}; }
`;

const noMotion = { "@media (prefers-reduced-motion: reduce)": { animation: "none" } } as const;

/** Avatar à cheval sur le ciel, nom, date du jour, puis le lieu (une seule fois). */
export function StartDoorIdentity({
  name,
  photoUrl,
  dateLabel,
  meta,
}: {
  name?: string;
  photoUrl?: string | null;
  dateLabel?: string;
  meta?: string;
}) {
  return (
    <Box
      data-testid="start-door-identity"
      sx={{ mt: -5.5, px: 2, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}
    >
      <Avatar
        src={mediaUrl(photoUrl) ?? undefined}
        alt={name || ""}
        sx={{
          width: 88,
          height: 88,
          fontSize: 32,
          fontWeight: 800,
          color: EMPLOYEE_BRAND,
          bgcolor: BRAND_SOFT,
          border: "4px solid #fff",
          boxShadow: `0 10px 24px ${alpha(EMPLOYEE_INK, 0.22)}`,
        }}
      >
        {avatarInitials(name)}
      </Avatar>
      <Typography component="p" sx={{ mt: 1.25, fontSize: "1.55rem", fontWeight: 800, lineHeight: 1.15, color: EMPLOYEE_INK }}>
        {name}
      </Typography>
      {dateLabel ? (
        <Typography component="p" sx={{ mt: 0.5, fontSize: "1rem", fontWeight: 500, color: MUTE }}>
          {dateLabel}
        </Typography>
      ) : null}
      {meta ? <PlacePill>{meta}</PlacePill> : null}
    </Box>
  );
}

function PlacePill({ children }: { children: string }) {
  return (
    <Box
      sx={{
        mt: 1,
        px: 1.5,
        py: 0.5,
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        borderRadius: 999,
        bgcolor: BRAND_SOFT,
        color: EMPLOYEE_BRAND_DARK,
        fontSize: "0.9rem",
        fontWeight: 700,
        overflowWrap: "anywhere",
      }}
    >
      <PlaceOutlinedIcon sx={{ fontSize: 17 }} aria-hidden />
      {children}
    </Box>
  );
}

function FingerprintGlyph() {
  return (
    <Box
      component="svg"
      viewBox="0 0 24 24"
      aria-hidden
      sx={{
        width: 72,
        height: 72,
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 1.2,
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }}
    >
      <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
      <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
      <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
      <path d="M2 12a10 10 0 0 1 18-6" />
      <path d="M2 16h.01" />
      <path d="M21.8 16c.2-2 .131-5.354 0-6" />
      <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
      <path d="M8.65 22c.21-.66.45-1.32.57-2" />
      <path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
    </Box>
  );
}

/** Gros bouton vert : empreinte + heure, anneau vert qui clignote doucement autour. */
export function StartDoorButton({ timeLabel, onOpen }: { timeLabel: string; onOpen: () => void }) {
  return (
    <Box sx={{ position: "relative", width: 208, height: 208, display: "grid", placeItems: "center" }}>
      <Box
        component="svg"
        viewBox="0 0 208 208"
        aria-hidden
        data-testid="start-door-ring"
        sx={{ position: "absolute", inset: 0, animation: `${ringBlink} 2.4s ease-in-out infinite`, ...noMotion }}
      >
        <circle cx="104" cy="104" r="101" fill="none" stroke={EMPLOYEE_BRAND} strokeWidth="3" />
      </Box>
      <ButtonBase
        onClick={onOpen}
        aria-label={he.punchOpenShift}
        sx={{
          width: 172,
          height: 172,
          borderRadius: "50%",
          color: "#fff",
          flexDirection: "column",
          gap: 0.5,
          background: `linear-gradient(145deg, ${BRAND_LIGHT} 0%, ${EMPLOYEE_BRAND} 55%, ${EMPLOYEE_BRAND_DARK} 100%)`,
          animation: `${glowBlink} 2.4s ease-in-out infinite`,
          transition: "transform 120ms ease",
          "&:active": { transform: "scale(0.96)" },
          ...noMotion,
          "&.Mui-focusVisible": { outline: `3px solid ${EMPLOYEE_BRAND}`, outlineOffset: 8 },
        }}
      >
        <FingerprintGlyph />
        <Typography component="span" sx={{ fontSize: 22, fontWeight: 800, direction: "ltr", letterSpacing: "0.02em" }}>
          {timeLabel}
        </Typography>
      </ButtonBase>
    </Box>
  );
}
