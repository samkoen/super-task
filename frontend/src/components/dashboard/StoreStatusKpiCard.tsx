import { Box, Paper, Typography, alpha } from "@mui/material";
import type { ReactNode } from "react";
import { formatKpiPercent } from "../../utils/storeKpis";

interface StoreStatusKpiCardProps {
  title: string;
  approvalPct: number;
  reportPct: number;
  reportLabel: string;
  approvalLabel: string;
  totalLabel: string;
  icon?: ReactNode;
  accent?: string;
  disabled?: boolean;
  onClick?: () => void;
}

export default function StoreStatusKpiCard({
  title,
  approvalPct,
  reportPct,
  reportLabel,
  approvalLabel,
  totalLabel,
  icon,
  accent = "#0A6B5C",
  disabled = false,
  onClick,
}: StoreStatusKpiCardProps) {
  const clickable = Boolean(onClick);
  const tone = disabled ? "#9e9e9e" : accent;

  return (
    <Paper
      variant="outlined"
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-disabled={disabled || undefined}
      onClick={onClick}
      onKeyDown={
        clickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      sx={{
        p: 2.5,
        height: "100%",
        position: "relative",
        overflow: "hidden",
        borderRadius: 3,
        opacity: disabled ? 0.55 : 1,
        cursor: clickable ? "pointer" : "default",
        bgcolor: disabled ? alpha("#9e9e9e", 0.06) : undefined,
        transition: "box-shadow 0.2s, transform 0.15s, border-color 0.15s",
        "&:hover": clickable
          ? {
              transform: "translateY(-2px)",
              boxShadow: (t) => t.shadows[3],
              borderColor: alpha(tone, 0.28),
            }
          : undefined,
        "&::before": {
          content: '""',
          position: "absolute",
          insetInlineStart: 0,
          top: 0,
          bottom: 0,
          width: 4,
          bgcolor: tone,
          borderRadius: "0 3px 3px 0",
        },
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1.5}>
        <Box minWidth={0}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ display: "block", mb: 0.75, lineHeight: 1.2 }}
          >
            {title}
          </Typography>
          {!disabled && (
            <>
              <Typography
                variant="h3"
                fontWeight={800}
                lineHeight={1.1}
                sx={{ letterSpacing: "-0.03em" }}
              >
                {formatKpiPercent(approvalPct)}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                {approvalLabel}
              </Typography>
              <Typography variant="body2" fontWeight={700} mt={1.25}>
                {formatKpiPercent(reportPct)}{" "}
                <Typography component="span" variant="caption" color="text.secondary">
                  {reportLabel}
                </Typography>
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                {totalLabel}
              </Typography>
            </>
          )}
          {disabled && (
            <Typography variant="body2" color="text.secondary" mt={1}>
              {totalLabel}
            </Typography>
          )}
        </Box>
        {icon && (
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2.5,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
              bgcolor: alpha(tone, 0.1),
              color: tone,
              fontSize: 22,
              lineHeight: 1,
            }}
          >
            {icon}
          </Box>
        )}
      </Box>
    </Paper>
  );
}
