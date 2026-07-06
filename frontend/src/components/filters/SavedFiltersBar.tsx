import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import BookmarkAddIcon from "@mui/icons-material/BookmarkAdd";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { he } from "../../i18n/he";
import type { SavedFilterRecord } from "../../services/savedFiltersStorage";

function readExpanded(storageKey: string): boolean {
  try {
    return localStorage.getItem(storageKey) === "1";
  } catch {
    return false;
  }
}

export interface SavedFiltersBarProps {
  filterClient: {
    list: () => Promise<SavedFilterRecord[]>;
    create: (body: { name: string; filters: Record<string, string | number> }) => Promise<SavedFilterRecord>;
    remove: (id: string) => Promise<void>;
  };
  storageKeyExpanded: string;
  sectionTitle?: string;
  filters: Record<string, string | number>;
  activeSavedFilterId: string | null;
  onSelectSaved: (item: SavedFilterRecord) => void;
  onActiveFilterRemoved?: () => void;
}

export default function SavedFiltersBar({
  filterClient,
  storageKeyExpanded,
  sectionTitle = he.savedFiltersTitle,
  filters,
  activeSavedFilterId,
  onSelectSaved,
  onActiveFilterRemoved,
}: SavedFiltersBarProps) {
  const [items, setItems] = useState<SavedFilterRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(() => readExpanded(storageKeyExpanded));
  const [listFetched, setListFetched] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<SavedFilterRecord | null>(null);

  const setExpandedAndStore = (next: boolean) => {
    setExpanded(next);
    try {
      localStorage.setItem(storageKeyExpanded, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await filterClient.list());
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filterClient]);

  useEffect(() => {
    if (!expanded || listFetched) return;
    setListFetched(true);
    void refresh();
  }, [expanded, listFetched, refresh]);

  const handleSave = async () => {
    const name = saveName.trim();
    if (!name) return;
    setSaving(true);
    try {
      await filterClient.create({ name, filters });
      setDialogOpen(false);
      setSaveName("");
      setExpandedAndStore(true);
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ mb: expanded ? 2 : 0.5 }}>
      <Box
        onClick={() => setExpandedAndStore(!expanded)}
        role="button"
        tabIndex={0}
        display="flex"
        alignItems="center"
        gap={0.5}
        sx={{ cursor: "pointer", color: "text.secondary", width: "fit-content" }}
      >
        <ExpandMoreIcon
          fontSize="small"
          sx={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
        />
        <Typography variant="subtitle2">
          {sectionTitle}
          {!expanded && items.length > 0 && (
            <Typography component="span" variant="caption" color="text.disabled" sx={{ ml: 1 }}>
              ({items.length})
            </Typography>
          )}
        </Typography>
      </Box>

      <Collapse in={expanded}>
        <Box display="flex" flexWrap="wrap" gap={1} alignItems="center" sx={{ pt: 1 }}>
          <Button size="small" variant="outlined" startIcon={<BookmarkAddIcon />} onClick={() => setDialogOpen(true)}>
            {he.savedFiltersSaveCurrent}
          </Button>
          {loading && <CircularProgress size={22} />}
          {!loading && items.length === 0 && (
            <Typography variant="body2" color="text.secondary">{he.savedFiltersEmpty}</Typography>
          )}
          {items.map((item) => (
            <Chip
              key={item.id}
              label={item.name}
              onClick={() => onSelectSaved(item)}
              onDelete={() => setDeleteConfirmItem(item)}
              color={activeSavedFilterId === item.id ? "primary" : "default"}
              variant={activeSavedFilterId === item.id ? "filled" : "outlined"}
              size="small"
            />
          ))}
        </Box>
      </Collapse>

      <Snackbar
        open={Boolean(deleteConfirmItem)}
        message={deleteConfirmItem ? he.savedFiltersDeleteConfirm(deleteConfirmItem.name) : ""}
        action={
          <>
            <Button color="inherit" size="small" onClick={() => setDeleteConfirmItem(null)}>{he.cancel}</Button>
            <Button
              color="inherit"
              size="small"
              onClick={async () => {
                if (!deleteConfirmItem) return;
                await filterClient.remove(deleteConfirmItem.id);
                if (activeSavedFilterId === deleteConfirmItem.id) onActiveFilterRemoved?.();
                setDeleteConfirmItem(null);
                await refresh();
              }}
            >
              {he.submit}
            </Button>
          </>
        }
      />

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="xs" dir="rtl">
        <DialogTitle>{he.savedFiltersSaveDialogTitle}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={he.savedFiltersNameLabel}
            fullWidth
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            disabled={saving}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>{he.cancel}</Button>
          <Button variant="contained" onClick={() => void handleSave()} disabled={saving || !saveName.trim()}>
            {saving ? he.loading : he.submit}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
