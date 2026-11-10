import { useState } from "react";
import { Box, Button, TextField, Typography } from "@mui/material";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import { he } from "../../i18n/he";
import { fieldsFromPosition, type CoordinateFields } from "../../utils/branchLocation";
import { getCurrentLocation } from "../../utils/geoPosition";

type Props = {
  value: CoordinateFields;
  onChange: (next: CoordinateFields) => void;
};

/** Coordonnées GPS du snif : saisie manuelle ou « ma position actuelle » (le menahel est sur place). */
export default function BranchLocationFields({ value, onChange }: Props) {
  const [failed, setFailed] = useState(false);

  const useMyLocation = async () => {
    setFailed(false);
    const found = await getCurrentLocation();
    if (!found) {
      setFailed(true);
      return;
    }
    onChange(fieldsFromPosition(found.lat, found.lng));
  };

  return (
    <Box display="flex" flexDirection="column" gap={1.5} data-testid="branch-location-fields">
      <Typography variant="body2" color="text.secondary">{he.branchLocationHint}</Typography>
      <Box display="flex" gap={2}>
        <TextField
          label={he.branchLatitude}
          value={value.latitude}
          onChange={(e) => onChange({ ...value, latitude: e.target.value })}
          fullWidth
          inputProps={{ dir: "ltr", inputMode: "decimal" }}
        />
        <TextField
          label={he.branchLongitude}
          value={value.longitude}
          onChange={(e) => onChange({ ...value, longitude: e.target.value })}
          fullWidth
          inputProps={{ dir: "ltr", inputMode: "decimal" }}
        />
      </Box>
      <Button size="small" startIcon={<MyLocationIcon />} onClick={() => void useMyLocation()} sx={{ alignSelf: "flex-start" }}>
        {he.branchUseMyLocation}
      </Button>
      {failed && <Typography variant="caption" color="error">{he.branchLocationFailed}</Typography>}
    </Box>
  );
}
