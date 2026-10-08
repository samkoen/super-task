import { useState, type ReactNode } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { EMPLOYEE_CARD_RADIUS } from "../../styles/employeeUi";

export interface DashboardSectionAccordionProps {
  title: string;
  count?: number;
  countColor?: "default" | "primary" | "warning" | "error" | "success" | "info";
  defaultExpanded?: boolean;
  summaryHint?: string;
  mb?: number;
  children: ReactNode;
}

const accordionSx = (mb: number) =>
  ({
    mb,
    boxShadow: "0 2px 10px rgba(15, 23, 42, 0.06)",
    border: 1,
    borderColor: "divider",
    borderRadius: `${EMPLOYEE_CARD_RADIUS} !important`,
    overflow: "hidden",
    "&:before": { display: "none" },
  }) as const;

export default function DashboardSectionAccordion({
  title,
  count,
  countColor = "primary",
  defaultExpanded = false,
  summaryHint,
  mb = 3,
  children,
}: DashboardSectionAccordionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Accordion expanded={expanded} onChange={(_, open) => setExpanded(open)} sx={accordionSx(mb)}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 64, px: 2.25 }}>
        <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap" width="100%" pr={1}>
          <Typography variant="subtitle1" fontWeight={800} sx={{ fontSize: "1.05rem" }}>
            {title}
          </Typography>
          {count != null && (
            <Chip
              size="small"
              label={count}
              color={countColor}
              variant={countColor === "default" ? "outlined" : "filled"}
              sx={{ fontWeight: 800 }}
            />
          )}
          {summaryHint && !expanded && (
            <Typography variant="body2" color="text.secondary">
              {summaryHint}
            </Typography>
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0, px: 2.25, pb: 2.25 }}>{children}</AccordionDetails>
    </Accordion>
  );
}
