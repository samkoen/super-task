import type { ElementType } from "react";
import { Box, ButtonBase, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { EMPLOYEE_BRAND, EMPLOYEE_INK } from "../../styles/employeeUi";

export interface ChoiceCardOption<T extends string> {
  value: T;
  label: string;
  hint?: string;
  icon?: ElementType;
}

/** Choix exclusif présenté en grandes cartes : l'icône, le nom, puis une phrase d'explication. */
export default function ChoiceCards<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  disabled = false,
}: {
  options: ChoiceCardOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  disabled?: boolean;
}) {
  return (
    <Box role="group" aria-label={ariaLabel} sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
      {options.map(({ value: optionValue, label, hint, icon: Icon }) => {
        const selected = value === optionValue;
        return (
          <ButtonBase
            key={optionValue}
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onChange(optionValue)}
            sx={{
              flex: "1 1 150px",
              minHeight: 96,
              p: 1.5,
              borderRadius: "16px",
              border: "2px solid",
              borderColor: selected ? EMPLOYEE_BRAND : "divider",
              bgcolor: selected ? alpha(EMPLOYEE_BRAND, 0.08) : "background.paper",
              flexDirection: "column",
              alignItems: "flex-start",
              textAlign: "start",
              gap: 0.5,
            }}
          >
            <Box display="flex" alignItems="center" gap={1} sx={{ color: selected ? EMPLOYEE_BRAND : EMPLOYEE_INK }}>
              {Icon ? <Icon /> : null}
              <Typography component="span" fontWeight={800} sx={{ fontSize: "1.1rem", color: "inherit" }}>
                {label}
              </Typography>
            </Box>
            {hint ? (
              <Typography component="span" color="text.secondary" sx={{ fontSize: "0.95rem" }}>
                {hint}
              </Typography>
            ) : null}
          </ButtonBase>
        );
      })}
    </Box>
  );
}
