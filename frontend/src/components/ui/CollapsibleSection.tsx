import { useId, useState, type ReactNode } from "react";
import { Box, Button, Collapse } from "@mui/material";
import { alpha } from "@mui/material/styles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { EMPLOYEE_BRAND, EMPLOYEE_INK } from "../../styles/employeeUi";

/**
 * Section facultative repliée par défaut : un gros bouton la déplie.
 * Le contenu reste monté (états et champs conservés) ; seule l'ouverture initiale change.
 */
export default function CollapsibleSection({
  label,
  children,
  defaultOpen = false,
}: {
  label: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  return (
    <Box>
      <Button
        fullWidth
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        endIcon={
          <ExpandMoreIcon
            sx={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
          />
        }
        sx={{
          justifyContent: "space-between",
          minHeight: 52,
          px: 2,
          borderRadius: "14px",
          fontSize: "1rem",
          fontWeight: 700,
          color: EMPLOYEE_INK,
          bgcolor: alpha(EMPLOYEE_BRAND, 0.06),
          "&:hover": { bgcolor: alpha(EMPLOYEE_BRAND, 0.12) },
        }}
      >
        {label}
      </Button>
      <Collapse in={open} id={panelId}>
        <Box sx={{ pt: 1.5 }}>{children}</Box>
      </Collapse>
    </Box>
  );
}
