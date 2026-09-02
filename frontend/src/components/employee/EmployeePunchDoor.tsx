import { Avatar, Box, Button, ButtonBase, Typography } from "@mui/material";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import { avatarInitials } from "../../utils/avatarInitials";
import { mediaUrl } from "../../utils/mediaUrl";
import { he } from "../../i18n/he";
import type { PunchKind } from "../../utils/punchDoor";

const AVATAR = 176;
const doorSx = (start: boolean) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 2,
  minHeight: { xs: 420, sm: 480 },
  px: 2,
  py: 4,
  borderRadius: 3,
  color: "common.white",
  bgcolor: start ? "#1B5E20" : "#6D1B2A",
});

export default function EmployeePunchDoor({
  kind,
  name,
  photoUrl,
  taskTitle,
  remainingCount = 0,
  onOpen,
  onBack,
}: {
  kind: PunchKind;
  name?: string;
  photoUrl?: string | null;
  taskTitle?: string | null;
  remainingCount?: number;
  onOpen: () => void;
  onBack?: () => void;
}) {
  const start = kind === "start";
  const label = start ? he.punchClockIn : he.punchClockOut;
  return (
    <Box sx={doorSx(start)}>
      <Typography variant="h5" fontWeight={800} textAlign="center">
        {label}
      </Typography>
      {taskTitle ? (
        <Typography variant="body1" textAlign="center" sx={{ opacity: 0.9 }}>
          {taskTitle}
        </Typography>
      ) : null}
      <PunchAvatar name={name} photoUrl={photoUrl} label={label} onOpen={onOpen} />
      <Typography variant="body2" textAlign="center" sx={{ opacity: 0.85 }}>
        {start ? he.punchClockInHint : he.punchClockOutHint}
      </Typography>
      {!start && remainingCount > 0 ? (
        <Typography variant="caption" textAlign="center" sx={{ opacity: 0.8 }}>
          {he.punchRemainingHint(remainingCount)}
        </Typography>
      ) : null}
      {onBack ? (
        <Button color="inherit" variant="outlined" onClick={onBack} sx={{ borderColor: "rgba(255,255,255,0.5)" }}>
          {he.punchBackToTasks}
        </Button>
      ) : null}
    </Box>
  );
}

function PunchAvatar({
  name,
  photoUrl,
  label,
  onOpen,
}: {
  name?: string;
  photoUrl?: string | null;
  label: string;
  onOpen: () => void;
}) {
  return (
    <ButtonBase
      onClick={onOpen}
      aria-label={label}
      sx={{ borderRadius: "50%", p: 0.5, position: "relative" }}
    >
      <Avatar
        src={mediaUrl(photoUrl) ?? undefined}
        alt={name || ""}
        sx={{ width: AVATAR, height: AVATAR, fontSize: 64, fontWeight: 800, boxShadow: 6 }}
      >
        {avatarInitials(name)}
      </Avatar>
      <Box
        sx={{
          position: "absolute",
          bottom: 8,
          left: "50%",
          transform: "translateX(-50%)",
          width: 56,
          height: 56,
          borderRadius: "50%",
          bgcolor: "rgba(0,0,0,0.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <FingerprintIcon sx={{ fontSize: 34, color: "common.white" }} />
      </Box>
    </ButtonBase>
  );
}
