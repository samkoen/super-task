import { Box, Button } from "@mui/material";
import type { FollowUpPreset } from "../../utils/chatTaskFollowUp";
import { he } from "../../i18n/he";

const PRESET_LABELS: Record<FollowUpPreset["key"], string> = {
  hour: he.followUpInHour,
  tomorrow: he.followUpTomorrow,
  week: he.followUpNextWeek,
};

/** Raccourcis de date/heure (« dans une heure », « demain 9h »…) : un appui remplace le sélecteur. */
export default function QuickTimePresets({
  presets,
  selected,
  onPick,
  disabled = false,
  row = false,
}: {
  presets: FollowUpPreset[];
  selected: string;
  onPick: (value: string) => void;
  disabled?: boolean;
  /** Boutons côte à côte (formulaires) plutôt qu'empilés (petites fenêtres). */
  row?: boolean;
}) {
  return (
    <Box display="flex" flexDirection={row ? "row" : "column"} flexWrap={row ? "wrap" : "nowrap"} gap={1}>
      {presets.map((preset) => (
        <Button
          key={preset.key}
          variant={selected === preset.value ? "contained" : "outlined"}
          disabled={disabled}
          onClick={() => onPick(preset.value)}
          sx={{
            flex: row ? "1 1 140px" : undefined,
            minHeight: 52,
            borderRadius: "14px",
            fontWeight: 800,
            fontSize: "1.05rem",
          }}
        >
          {PRESET_LABELS[preset.key]}
        </Button>
      ))}
    </Box>
  );
}
