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

export interface DashboardSectionAccordionProps {
  title: string;
  count?: number;
  countColor?: "default" | "primary" | "warning" | "error" | "success" | "info";
  defaultExpanded?: boolean;
  summaryHint?: string;
  mb?: number;
  children: ReactNode;
}

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
    <Accordion
      expanded={expanded}
      onChange={(_, open) => setExpanded(open)}
      sx={{
        mb,
        boxShadow: 0,
        border: 1,
        borderColor: "divider",
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap" width="100%" pr={1}>
          <Typography variant="subtitle1" fontWeight={700}>
            {title}
          </Typography>
          {count != null && (
            <Chip
              size="small"
              label={count}
              color={countColor}
              variant={countColor === "default" ? "outlined" : "filled"}
            />
          )}
          {summaryHint && !expanded && (
            <Typography variant="body2" color="text.secondary">
              {summaryHint}
            </Typography>
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>{children}</AccordionDetails>
    </Accordion>
  );
}
