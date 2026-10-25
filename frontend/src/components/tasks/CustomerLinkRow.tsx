import { useState } from "react";
import { Box, Button, TextField } from "@mui/material";
import { he } from "../../i18n/he";
import { employeeFieldSx } from "../../styles/employeeUi";

/** Rattache un client Agroline au snif de la tâche (action immédiate, hors bouton d'enregistrement). */
export default function CustomerLinkRow({ onLink }: { onLink: (customerName: string) => Promise<boolean> }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const link = async () => {
    setBusy(true);
    try {
      if (await onLink(name.trim())) setName("");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <TextField
        label={he.deliveryNoteCustomer}
        value={name}
        onChange={(e) => setName(e.target.value)}
        helperText={he.deliveryNoteCustomerHint}
        fullWidth
        sx={employeeFieldSx}
      />
      <Button
        variant="outlined"
        onClick={() => void link()}
        disabled={busy || !name.trim()}
        sx={{ minHeight: 48, borderRadius: "14px", fontWeight: 700 }}
      >
        {he.deliveryNoteLinkCustomer}
      </Button>
    </Box>
  );
}
