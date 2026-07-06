import { Chip } from "@mui/material";
import type { HealthLevel } from "../../services/dashboardService";
import { he } from "../../i18n/he";

const healthConfig: Record<HealthLevel, { color: "success" | "warning" | "error"; label: string }> = {
  green: { color: "success", label: he.healthGreen },
  orange: { color: "warning", label: he.healthOrange },
  red: { color: "error", label: he.healthRed },
};

export default function HealthBadge({ level, size = "small" }: { level: HealthLevel; size?: "small" | "medium" }) {
  const cfg = healthConfig[level];
  return <Chip label={cfg.label} color={cfg.color} size={size} variant="filled" />;
}

export function healthDotColor(level: HealthLevel): string {
  if (level === "red") return "error.main";
  if (level === "orange") return "warning.main";
  return "success.main";
}
