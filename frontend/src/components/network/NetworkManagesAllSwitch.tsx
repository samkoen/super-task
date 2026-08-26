import { Box, FormControlLabel, Switch, Typography } from "@mui/material";
import { he } from "../../i18n/he";

interface NetworkManagesAllSwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}

export default function NetworkManagesAllSwitch({
  checked,
  onChange,
  disabled,
}: NetworkManagesAllSwitchProps) {
  return (
    <FormControlLabel
      sx={{ mt: 1, alignItems: "flex-start", mr: 0 }}
      control={
        <Switch
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
      }
      label={
        <Box>
          <Typography>{he.networkManagesAllWorkers}</Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            {he.networkManagesAllWorkersHint}
          </Typography>
        </Box>
      }
    />
  );
}
