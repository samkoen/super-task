import { Avatar, Box, Button, ButtonBase, Typography, alpha, keyframes } from "@mui/material";
import FingerprintIcon from "@mui/icons-material/Fingerprint";
import { avatarInitials } from "../../utils/avatarInitials";
import { mediaUrl } from "../../utils/mediaUrl";
import { he } from "../../i18n/he";
import type { PunchKind } from "../../utils/punchDoor";
import {
  EMPLOYEE_CARD_RADIUS,
  EMPLOYEE_END_GRADIENT,
  EMPLOYEE_START_GRADIENT,
} from "../../styles/employeeUi";

const AVATAR = 168;

const pulse = keyframes`
  0% { transform: scale(0.96); opacity: 0.55; }
  70% { transform: scale(1.22); opacity: 0; }
  100% { transform: scale(1.22); opacity: 0; }
`;

const doorSx = (start: boolean) => ({
  position: "relative",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 2.25,
  px: 2.5,
  py: 4,
  minHeight: 440,
  borderRadius: EMPLOYEE_CARD_RADIUS,
  color: "common.white",
  background: start ? EMPLOYEE_START_GRADIENT : EMPLOYEE_END_GRADIENT,
  boxShadow: `0 16px 40px ${alpha(start ? "#14532D" : "#581C2B", 0.35)}`,
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
      <Typography variant="h4" component="h2" fontWeight={800} textAlign="center">
        {label}
      </Typography>
      {taskTitle ? <TaskPill title={taskTitle} /> : null}
      <PunchAvatar name={name} photoUrl={photoUrl} label={label} onOpen={onOpen} />
      <Typography variant="h6" fontWeight={700} textAlign="center" sx={{ color: "common.white" }}>
        {start ? he.punchClockInHint : he.punchClockOutHint}
      </Typography>
      {!start && remainingCount > 0 ? (
        <Typography variant="body2" textAlign="center" sx={{ color: alpha("#fff", 0.85) }}>
          {he.punchRemainingHint(remainingCount)}
        </Typography>
      ) : null}
      {onBack ? (
        <Button
          color="inherit"
          variant="outlined"
          onClick={onBack}
          sx={{ minHeight: 52, px: 3, borderRadius: "14px", borderColor: alpha("#fff", 0.6) }}
        >
          {he.punchBackToTasks}
        </Button>
      ) : null}
    </Box>
  );
}

function TaskPill({ title }: { title: string }) {
  return (
    <Typography
      variant="body1"
      fontWeight={600}
      textAlign="center"
      sx={{
        px: 2,
        py: 0.5,
        borderRadius: 999,
        bgcolor: alpha("#fff", 0.16),
        border: `1px solid ${alpha("#fff", 0.25)}`,
      }}
    >
      {title}
    </Typography>
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
      sx={{ borderRadius: "50%", p: 0.5, position: "relative", my: 1 }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: `4px solid ${alpha("#fff", 0.7)}`,
          animation: `${pulse} 2.2s ease-out infinite`,
          "@media (prefers-reduced-motion: reduce)": { animation: "none" },
        }}
      />
      <Avatar
        src={mediaUrl(photoUrl) ?? undefined}
        alt={name || ""}
        sx={{
          width: AVATAR,
          height: AVATAR,
          fontSize: 64,
          fontWeight: 800,
          border: "5px solid #fff",
          boxShadow: "0 12px 32px rgba(0,0,0,0.3)",
        }}
      >
        {avatarInitials(name)}
      </Avatar>
      <Box
        sx={{
          position: "absolute",
          bottom: 4,
          left: "50%",
          transform: "translateX(-50%)",
          width: 64,
          height: 64,
          borderRadius: "50%",
          bgcolor: "#fff",
          boxShadow: "0 6px 16px rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <FingerprintIcon sx={{ fontSize: 42, color: "text.primary" }} />
      </Box>
    </ButtonBase>
  );
}
