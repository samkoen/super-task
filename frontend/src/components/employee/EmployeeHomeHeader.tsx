import { Box, Button, Typography, alpha } from "@mui/material";
import FreeBreakfastIcon from "@mui/icons-material/FreeBreakfast";
import { he } from "../../i18n/he";
import { EMPLOYEE_BRAND, EMPLOYEE_BRAND_DARK, EMPLOYEE_INK } from "../../styles/employeeUi";
import { useBranchSky } from "../../hooks/useBranchSky";
import type { QualityRatingSummary } from "../../utils/qualityRating";
import EmployeeAvatar from "./EmployeeAvatar";
import EmployeeQualityRating from "./EmployeeQualityRating";
import { EmployeeShiftProgress, shiftStatusLabel } from "./employeeShiftStatus";
import StartDoorHero from "./StartDoorHero";

export interface EmployeeHomeHeaderProps {
  name?: string;
  photoUrl?: string | null;
  onEditPhoto?: () => void;
  onDeletePhoto?: () => void;
  dateLabel?: string;
  /** « סניף … · תפקיד » : affiché une seule fois. */
  meta?: string;
  slogan?: string | null;
  /** Ville du סניף pour la météo ; ירושלים si absente. */
  branchCity?: string | null;
  onShift?: boolean;
  onBreak?: boolean;
  breakBusy?: boolean;
  onToggleBreak?: () => void;
  progress?: number | null;
  completedCount?: number;
  totalCount?: number;
  qualityRating?: QualityRatingSummary | null;
}

const MUTE = "#5B6B7B";
const SKY_HEIGHT = 132;

const cardSx = {
  mb: 2,
  overflow: "hidden",
  borderRadius: "28px",
  bgcolor: "#fff",
  border: `1px solid ${alpha(EMPLOYEE_INK, 0.06)}`,
  boxShadow: `0 12px 32px ${alpha(EMPLOYEE_INK, 0.08)}`,
} as const;

function HomeIdentity({
  name,
  dateLabel,
  meta,
  slogan,
}: Pick<EmployeeHomeHeaderProps, "name" | "dateLabel" | "meta" | "slogan">) {
  return (
    <Box sx={{ flex: 1, minWidth: 0, pt: 1 }}>
      <Typography component="h1" sx={{ fontSize: "1.45rem", fontWeight: 800, lineHeight: 1.15, color: EMPLOYEE_INK }}>
        {name}
      </Typography>
      {dateLabel ? (
        <Typography sx={{ fontSize: "0.95rem", fontWeight: 500, color: MUTE }}>{dateLabel}</Typography>
      ) : null}
      {meta ? (
        <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: MUTE, overflowWrap: "anywhere" }}>
          {meta}
        </Typography>
      ) : null}
      {slogan ? (
        <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: EMPLOYEE_BRAND }}>{slogan}</Typography>
      ) : null}
    </Box>
  );
}

function StatusDot({ onBreak, onShift }: { onBreak: boolean; onShift: boolean }) {
  const dot = onBreak ? "#F59E0B" : onShift ? "#16A34A" : "#94A3B8";
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
      <Box aria-hidden sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: dot }} />
      <Typography sx={{ fontSize: "0.95rem", fontWeight: 700, color: EMPLOYEE_INK }}>
        {shiftStatusLabel(onBreak, onShift)}
      </Typography>
    </Box>
  );
}

function PresenceRow({
  onShift,
  onBreak,
  breakBusy,
  onToggleBreak,
}: Pick<EmployeeHomeHeaderProps, "onShift" | "onBreak" | "breakBusy" | "onToggleBreak">) {
  return (
    <Box sx={{ mt: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
      <StatusDot onBreak={Boolean(onBreak)} onShift={Boolean(onShift)} />
      {onToggleBreak ? (
        <Button
          variant="outlined"
          color={onBreak ? "warning" : "primary"}
          disabled={breakBusy}
          onClick={onToggleBreak}
          startIcon={<FreeBreakfastIcon />}
          sx={{ minHeight: 44, px: 2, borderRadius: "14px", fontWeight: 800, color: onBreak ? undefined : EMPLOYEE_BRAND_DARK }}
        >
          {onBreak ? he.employeeBreakEnd : he.employeeBreakStart}
        </Button>
      ) : null}
    </Box>
  );
}

/** Haut de la liste des tâches : ciel météo du סניף, identité, présence et avancement. */
export default function EmployeeHomeHeader(props: EmployeeHomeHeaderProps) {
  const sky = useBranchSky(props.branchCity);
  return (
    <Box component="header" data-testid="employee-home-header" sx={cardSx}>
      <StartDoorHero scene={sky.scene} place={sky.place} temperatureC={sky.temperatureC} height={SKY_HEIGHT} />
      <Box sx={{ px: 2, pb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
          <Box sx={{ mt: -5 }}>
            <EmployeeAvatar
              name={props.name}
              photoUrl={props.photoUrl}
              size={80}
              editable
              onEdit={props.onEditPhoto}
              onDelete={props.onDeletePhoto}
              ring
            />
          </Box>
          <HomeIdentity name={props.name} dateLabel={props.dateLabel} meta={props.meta} slogan={props.slogan} />
        </Box>
        <PresenceRow
          onShift={props.onShift}
          onBreak={props.onBreak}
          breakBusy={props.breakBusy}
          onToggleBreak={props.onToggleBreak}
        />
        {props.progress != null ? (
          <EmployeeShiftProgress
            progress={props.progress}
            completed={props.completedCount}
            total={props.totalCount}
          />
        ) : null}
        {props.qualityRating != null ? (
          <Box mt={1}>
            <EmployeeQualityRating summary={props.qualityRating} />
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
