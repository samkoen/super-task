import type { ReactNode } from "react";
import { Box, Button, Chip, Paper, Typography, alpha } from "@mui/material";
import FreeBreakfastIcon from "@mui/icons-material/FreeBreakfast";
import { he } from "../../i18n/he";
import { EmployeeShiftProgress, shiftStatusLabel } from "./employeeShiftStatus";
import EmployeeAvatar from "./EmployeeAvatar";
import EmployeeQualityRating from "./EmployeeQualityRating";
import type { QualityRatingSummary } from "../../utils/qualityRating";
import {
  EMPLOYEE_BRAND,
  EMPLOYEE_BRAND_GRADIENT,
  EMPLOYEE_CARD_RADIUS,
  EMPLOYEE_TOUCH_MIN,
} from "../../styles/employeeUi";

interface EmployeeShiftHeaderProps {
  dateLabel?: string;
  dateNav?: ReactNode;
  name?: string;
  photoUrl?: string | null;
  photoEditable?: boolean;
  onEditPhoto?: () => void;
  onDeletePhoto?: () => void;
  meta?: string;
  slogan?: string | null;
  onShift?: boolean;
  onBreak?: boolean;
  breakBusy?: boolean;
  progress?: number | null;
  onToggleBreak?: () => void;
  extra?: ReactNode;
  qualityRating?: QualityRatingSummary | null;
  /** Carte d'accueil colorée (écran oved) au lieu de l'en-tête sobre. */
  hero?: boolean;
  greeting?: string;
  completedCount?: number;
  totalCount?: number;
}

export const employeeShiftHeaderPaperSx = {
  px: 1.5,
  py: 1.25,
  display: "flex",
  flexDirection: { xs: "column", sm: "row" },
  alignItems: { xs: "stretch", sm: "center" },
  gap: 1.25,
  overflow: "visible",
  borderRadius: 2,
} as const;

const heroPaperSx = {
  position: "relative",
  display: "flex",
  flexDirection: "column",
  gap: 2,
  p: { xs: 2, sm: 2.75 },
  color: "#fff",
  border: 0,
  borderRadius: EMPLOYEE_CARD_RADIUS,
  background: EMPLOYEE_BRAND_GRADIENT,
  boxShadow: `0 14px 34px ${alpha(EMPLOYEE_BRAND, 0.38)}`,
  overflow: "hidden",
  "&::after": {
    content: '""',
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: "50%",
    insetInlineEnd: -70,
    top: -90,
    background: alpha("#fff", 0.07),
    pointerEvents: "none",
  },
} as const;

/** Corps du hero : identité + action, en ligne sur grand écran. */
const heroBodySx = {
  display: "flex",
  flexDirection: { xs: "column", md: "row" },
  alignItems: { xs: "stretch", md: "center" },
  gap: 2,
} as const;

/** Mode sobre : le Paper gère déjà la mise en page. */
const contentsSx = { display: "contents" } as const;

type IdentityProps = Pick<
  EmployeeShiftHeaderProps,
  "name" | "meta" | "slogan" | "hero" | "greeting"
>;

function ShiftIdentityText({ name, meta, slogan, hero, greeting }: IdentityProps) {
  const soft = hero ? alpha("#fff", 0.82) : "text.secondary";
  return (
    <Box flex={1} minWidth={0}>
      {hero && greeting ? (
        <Typography variant="body1" fontWeight={600} sx={{ color: soft, lineHeight: 1.2 }}>
          {greeting}
        </Typography>
      ) : null}
      <Typography
        variant="h5"
        component="h1"
        fontWeight={800}
        sx={{ fontSize: { xs: "1.5rem", sm: "1.85rem" }, lineHeight: 1.2 }}
      >
        {name}
      </Typography>
      {meta ? (
        <Typography variant="caption" display="block" sx={{ color: soft, overflowWrap: "anywhere" }}>
          {meta}
        </Typography>
      ) : null}
      {slogan ? (
        <Typography
          variant="body2"
          fontWeight={700}
          display="block"
          sx={{ color: hero ? "#fff" : "primary.main" }}
        >
          {slogan}
        </Typography>
      ) : null}
    </Box>
  );
}

type AvatarProps = Pick<
  EmployeeShiftHeaderProps,
  "photoUrl" | "photoEditable" | "onEditPhoto" | "onDeletePhoto"
>;

function ShiftIdentity({ name, meta, slogan, hero, greeting, ...avatar }: IdentityProps & AvatarProps) {
  return (
    <Box display="flex" alignItems={hero ? "center" : "flex-start"} gap={1.75} flex={1} minWidth={0} width="100%">
      <EmployeeAvatar
        name={name}
        photoUrl={avatar.photoUrl}
        size={hero ? 92 : 112}
        editable={avatar.photoEditable}
        onEdit={avatar.onEditPhoto}
        onDelete={avatar.onDeletePhoto}
        ring={hero}
      />
      <ShiftIdentityText name={name} meta={meta} slogan={slogan} hero={hero} greeting={greeting} />
    </Box>
  );
}

type PresenceProps = Pick<
  EmployeeShiftHeaderProps,
  "onShift" | "onBreak" | "breakBusy" | "onToggleBreak" | "hero"
>;

function StatusPill({ onBreak, onShift, hero }: Pick<PresenceProps, "onBreak" | "onShift" | "hero">) {
  const label = shiftStatusLabel(Boolean(onBreak), Boolean(onShift));
  if (!hero) {
    return (
      <Chip
        size="small"
        color={onBreak ? "warning" : onShift ? "success" : "default"}
        label={label}
      />
    );
  }
  const dot = onBreak ? "#FBBF24" : onShift ? "#4ADE80" : "#CBD5E1";
  return (
    <Chip
      label={label}
      icon={<Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: dot, mx: 1 }} />}
      sx={{
        height: 36,
        px: 0.5,
        color: "#fff",
        fontSize: "0.95rem",
        fontWeight: 700,
        bgcolor: alpha("#fff", 0.16),
        border: `1px solid ${alpha("#fff", 0.28)}`,
      }}
    />
  );
}

function breakButtonSx(hero: boolean | undefined, onBreak: boolean | undefined) {
  const base = {
    minHeight: hero ? EMPLOYEE_TOUCH_MIN : 48,
    px: 2.5,
    fontWeight: 800,
    fontSize: "1.05rem",
    flex: { xs: "1 1 auto", sm: "0 0 auto" },
  };
  if (!hero) return base;
  return {
    ...base,
    borderRadius: "14px",
    color: onBreak ? "#78350F" : EMPLOYEE_BRAND,
    bgcolor: onBreak ? "#FBBF24" : "#fff",
    "&:hover": { bgcolor: onBreak ? "#F59E0B" : alpha("#fff", 0.9), transform: "none" },
  };
}

function ShiftPresence({ onShift, onBreak, breakBusy, onToggleBreak, hero }: PresenceProps) {
  const breakLabel = onBreak ? he.employeeBreakEnd : he.employeeBreakStart;
  return (
    <Box
      display="flex"
      alignItems="center"
      gap={1}
      flexShrink={0}
      flexWrap="wrap"
      width={{ xs: "100%", sm: "auto" }}
    >
      <StatusPill onBreak={onBreak} onShift={onShift} hero={hero} />
      <Button
        variant={hero || onBreak ? "contained" : "outlined"}
        color={onBreak ? "warning" : "primary"}
        disabled={breakBusy}
        onClick={onToggleBreak}
        startIcon={<FreeBreakfastIcon />}
        sx={breakButtonSx(hero, onBreak)}
      >
        {breakLabel}
      </Button>
    </Box>
  );
}

function ShiftDateRow({
  dateLabel,
  dateNav,
  hero,
}: Pick<EmployeeShiftHeaderProps, "dateLabel" | "dateNav" | "hero">) {
  if (dateNav) return <>{dateNav}</>;
  if (!dateLabel) return null;
  return (
    <Typography
      variant="caption"
      display="block"
      sx={{ mb: hero ? 0 : 0.75, color: hero ? alpha("#fff", 0.8) : "text.secondary" }}
    >
      {dateLabel}
    </Typography>
  );
}

function ShiftFooter({
  qualityRating,
  progress,
  hero,
  completedCount,
  totalCount,
}: Pick<
  EmployeeShiftHeaderProps,
  "qualityRating" | "progress" | "hero" | "completedCount" | "totalCount"
>) {
  const rating =
    qualityRating != null ? (
      <Box mt={1}>
        <EmployeeQualityRating summary={qualityRating} />
      </Box>
    ) : null;
  if (hero) {
    return (
      <>
        {progress != null ? (
          <HeroProgressCard progress={progress} completed={completedCount} total={totalCount} />
        ) : null}
        {rating}
      </>
    );
  }
  return (
    <>
      {rating}
      {progress != null ? <EmployeeShiftProgress progress={progress} /> : null}
    </>
  );
}

/** En mode hero la progression vit sous la carte, lisible d'un coup d'œil. */
function HeroProgressCard({
  progress,
  completed,
  total,
}: {
  progress: number;
  completed?: number;
  total?: number;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{ mt: 1.5, px: 2, py: 1.5, borderRadius: EMPLOYEE_CARD_RADIUS, bgcolor: "background.paper" }}
    >
      <EmployeeShiftProgress progress={progress} completed={completed} total={total} />
    </Paper>
  );
}

export default function EmployeeShiftHeader(props: EmployeeShiftHeaderProps) {
  const { hero = false, dateLabel, dateNav, onToggleBreak, extra } = props;
  return (
    <Box mb={hero ? 2 : 1.5}>
      {hero ? null : <ShiftDateRow dateLabel={dateLabel} dateNav={dateNav} />}
      <Paper
        variant="outlined"
        data-testid="employee-shift-header"
        sx={hero ? heroPaperSx : employeeShiftHeaderPaperSx}
      >
        {hero ? <ShiftDateRow dateLabel={dateLabel} dateNav={dateNav} hero /> : null}
        <Box sx={hero ? heroBodySx : contentsSx}>
          <ShiftIdentity
            name={props.name}
            photoUrl={props.photoUrl}
            photoEditable={props.photoEditable}
            onEditPhoto={props.onEditPhoto}
            onDeletePhoto={props.onDeletePhoto}
            meta={props.meta}
            slogan={props.slogan}
            hero={hero}
            greeting={props.greeting}
          />
          {onToggleBreak ? (
            <ShiftPresence
              onShift={Boolean(props.onShift)}
              onBreak={Boolean(props.onBreak)}
              breakBusy={props.breakBusy ?? false}
              onToggleBreak={onToggleBreak}
              hero={hero}
            />
          ) : (
            extra
          )}
        </Box>
      </Paper>
      <ShiftFooter
        qualityRating={props.qualityRating}
        progress={props.progress ?? null}
        hero={hero}
        completedCount={props.completedCount}
        totalCount={props.totalCount}
      />
    </Box>
  );
}
