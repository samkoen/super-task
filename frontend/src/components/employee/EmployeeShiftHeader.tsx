import { Box, Chip, IconButton, Paper, Tooltip, Typography } from "@mui/material";
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
  meta?: string;
  slogan?: string | null;
  onShift: boolean;
  onBreak: boolean;
  breakBusy?: boolean;
  progress?: number | null;
  onToggleBreak: () => void;
  qualityRating?: QualityRatingSummary | null;
}

function ShiftIdentity({
  name,
  photoUrl,
  photoEditable,
  onEditPhoto,
  meta,
  slogan,
}: Pick<
  EmployeeShiftHeaderProps,
  "name" | "photoUrl" | "photoEditable" | "onEditPhoto" | "meta" | "slogan"
>) {
  return (
    <Box display="flex" alignItems="center" gap={1.25} flex={1} minWidth={0}>
      <EmployeeAvatar
        name={name}
        photoUrl={photoUrl}
        editable={photoEditable}
        onEdit={onEditPhoto}
      />
      <Box flex={1} minWidth={0}>
        <Typography
          variant="h5"
          component="h1"
          fontWeight={800}
          sx={{ fontSize: { xs: "1.4rem", sm: "1.7rem" }, lineHeight: 1.2 }}
        >
          {name}
        </Typography>
        {meta ? (
          <Typography variant="caption" color="text.secondary" display="block">
            {meta}
          </Typography>
        ) : null}
        {slogan ? (
          <Typography variant="body2" fontWeight={700} color="primary" display="block">
            {slogan}
          </Typography>
        ) : null}
      </Box>
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
    <Box display="flex" alignItems="center" gap={1} flexShrink={0}>
      <Chip
        size="small"
        color={onBreak ? "warning" : onShift ? "success" : "default"}
        label={shiftStatusLabel(onBreak, onShift)}
      />
      <Tooltip title={breakLabel}>
        <span>
          <IconButton
            color={onBreak ? "warning" : "primary"}
            disabled={breakBusy}
            onClick={onToggleBreak}
            aria-label={breakLabel}
            sx={{
              border: 1,
              borderColor: onBreak ? "warning.main" : "primary.main",
              bgcolor: onBreak ? "warning.main" : "transparent",
              color: onBreak ? "warning.contrastText" : "primary.main",
              "&:hover": {
                bgcolor: onBreak ? "warning.dark" : "action.hover",
              },
            }}
          >
            <FreeBreakfastIcon />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}

export default function EmployeeShiftHeader({
  dateLabel,
  name,
  photoUrl,
  photoEditable = false,
  onEditPhoto,
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
      <Paper
        variant="outlined"
        sx={{
          px: 1.5,
          py: 1.25,
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          flexWrap: "wrap",
          overflow: "visible",
          borderRadius: 2,
        }}
      >
        <ShiftIdentity
          name={name}
          photoUrl={photoUrl}
          photoEditable={photoEditable}
          onEditPhoto={onEditPhoto}
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
      {qualityRating != null ? (
        <Box mt={1}>
          <EmployeeQualityRating summary={qualityRating} />
        </Box>
      ) : null}
      {progress != null ? <EmployeeShiftProgress progress={progress} /> : null}
    </Box>
  );
}
