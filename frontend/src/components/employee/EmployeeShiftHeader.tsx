import { Box, Button, Chip, Paper, Typography } from "@mui/material";
import FreeBreakfastIcon from "@mui/icons-material/FreeBreakfast";
import { he } from "../../i18n/he";
import { EmployeeShiftProgress, shiftStatusLabel } from "./employeeShiftStatus";
import EmployeeAvatar from "./EmployeeAvatar";
import EmployeeQualityRating from "./EmployeeQualityRating";
import type { QualityRatingSummary } from "../../utils/qualityRating";

interface EmployeeShiftHeaderProps {
  dateLabel?: string;
  name?: string;
  photoUrl?: string | null;
  photoEditable?: boolean;
  onEditPhoto?: () => void;
  onDeletePhoto?: () => void;
  meta?: string;
  slogan?: string | null;
  onShift: boolean;
  onBreak: boolean;
  breakBusy?: boolean;
  progress?: number | null;
  onToggleBreak: () => void;
  qualityRating?: QualityRatingSummary | null;
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

function ShiftIdentityText({
  name,
  meta,
  slogan,
}: Pick<EmployeeShiftHeaderProps, "name" | "meta" | "slogan">) {
  return (
    <Box flex={1} minWidth={0}>
      <Typography
        variant="h5"
        component="h1"
        fontWeight={800}
        sx={{ fontSize: { xs: "1.25rem", sm: "1.7rem" }, lineHeight: 1.2 }}
      >
        {name}
      </Typography>
      {meta ? (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ overflowWrap: "anywhere" }}>
          {meta}
        </Typography>
      ) : null}
      {slogan ? (
        <Typography variant="body2" fontWeight={700} color="primary" display="block">
          {slogan}
        </Typography>
      ) : null}
    </Box>
  );
}

function ShiftIdentity({
  name,
  photoUrl,
  photoEditable,
  onEditPhoto,
  onDeletePhoto,
  meta,
  slogan,
}: Pick<
  EmployeeShiftHeaderProps,
  "name" | "photoUrl" | "photoEditable" | "onEditPhoto" | "onDeletePhoto" | "meta" | "slogan"
>) {
  return (
    <Box display="flex" alignItems="flex-start" gap={1.25} flex={1} minWidth={0} width="100%">
      <EmployeeAvatar
        name={name}
        photoUrl={photoUrl}
        size={112}
        editable={photoEditable}
        onEdit={onEditPhoto}
        onDelete={onDeletePhoto}
      />
      <ShiftIdentityText name={name} meta={meta} slogan={slogan} />
    </Box>
  );
}

function ShiftPresence({
  onShift,
  onBreak,
  breakBusy,
  onToggleBreak,
}: Pick<EmployeeShiftHeaderProps, "onShift" | "onBreak" | "breakBusy" | "onToggleBreak">) {
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
      <Chip
        size="small"
        color={onBreak ? "warning" : onShift ? "success" : "default"}
        label={shiftStatusLabel(onBreak, onShift)}
      />
      <Button
        variant={onBreak ? "contained" : "outlined"}
        color={onBreak ? "warning" : "primary"}
        disabled={breakBusy}
        onClick={onToggleBreak}
        startIcon={<FreeBreakfastIcon />}
        sx={{
          minHeight: 48,
          px: 2.5,
          fontWeight: 800,
          fontSize: "1rem",
          flex: { xs: "1 1 auto", sm: "0 0 auto" },
        }}
      >
        {breakLabel}
      </Button>
    </Box>
  );
}

export default function EmployeeShiftHeader({
  dateLabel,
  name,
  photoUrl,
  photoEditable = false,
  onEditPhoto,
  onDeletePhoto,
  meta,
  slogan,
  onShift,
  onBreak,
  breakBusy = false,
  progress = null,
  onToggleBreak,
  qualityRating,
}: EmployeeShiftHeaderProps) {
  return (
    <Box mb={1.5}>
      {dateLabel ? (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.75 }}>
          {dateLabel}
        </Typography>
      ) : null}
      <Paper variant="outlined" data-testid="employee-shift-header" sx={employeeShiftHeaderPaperSx}>
        <ShiftIdentity
          name={name}
          photoUrl={photoUrl}
          photoEditable={photoEditable}
          onEditPhoto={onEditPhoto}
          onDeletePhoto={onDeletePhoto}
          meta={meta}
          slogan={slogan}
        />
        <ShiftPresence
          onShift={onShift}
          onBreak={onBreak}
          breakBusy={breakBusy}
          onToggleBreak={onToggleBreak}
        />
      </Paper>
      <ShiftFooter qualityRating={qualityRating} progress={progress} />
    </Box>
  );
}

function ShiftFooter({
  qualityRating,
  progress,
}: Pick<EmployeeShiftHeaderProps, "qualityRating" | "progress">) {
  return (
    <>
      {qualityRating != null ? (
        <Box mt={1}>
          <EmployeeQualityRating summary={qualityRating} />
        </Box>
      ) : null}
      {progress != null ? <EmployeeShiftProgress progress={progress} /> : null}
    </>
  );
}
