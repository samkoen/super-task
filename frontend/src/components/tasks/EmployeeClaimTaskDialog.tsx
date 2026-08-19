import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import { ApiError } from "../../services/api";
import {
  taskGalleryService,
  type TaskGalleryItem,
} from "../../services/taskGalleryService";
import { useFeedback } from "../../context/FeedbackContext";
import ListSkeleton from "../ui/ListSkeleton";
import EmptyState from "../ui/EmptyState";
import { mediaUrl } from "../../utils/mediaUrl";
import { claimNeedsConfirm } from "../../utils/galleryEmployeeClaim";
import { he } from "../../i18n/he";

interface EmployeeClaimTaskDialogProps {
  open: boolean;
  onClose: () => void;
  onClaimed: () => void;
}

export default function EmployeeClaimTaskDialog({
  open,
  onClose,
  onClaimed,
}: EmployeeClaimTaskDialogProps) {
  const { showError, showSuccess } = useFeedback();
  const [items, setItems] = useState<TaskGalleryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [pending, setPending] = useState<TaskGalleryItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await taskGalleryService.listClaimable());
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const claim = async (item: TaskGalleryItem) => {
    setClaimingId(item.id);
    try {
      const res = await taskGalleryService.claim(item.id);
      showSuccess(res.message || he.employeeClaimSuccess);
      setPending(null);
      onClaimed();
      onClose();
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setClaimingId(null);
    }
  };

  const handleSelect = (item: TaskGalleryItem) => {
    if (claimNeedsConfirm(item)) {
      setPending(item);
      return;
    }
    void claim(item);
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" dir="rtl">
        <DialogTitle>{he.employeeClaimTaskTitle}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {he.employeeClaimTaskHint}
          </Typography>
          {loading ? (
            <ListSkeleton variant="cards" rows={3} />
          ) : items.length === 0 ? (
            <EmptyState
              title={he.employeeClaimTaskEmpty}
              description={he.employeeClaimTaskEmptyHint}
              icon={<PlaylistAddIcon fontSize="inherit" />}
            />
          ) : (
            <List disablePadding>
              {items.map((item) => (
                <ClaimableRow
                  key={item.id}
                  item={item}
                  disabled={Boolean(claimingId)}
                  onSelect={handleSelect}
                />
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={Boolean(claimingId)}>
            {he.cancel}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={Boolean(pending)} onClose={() => setPending(null)} dir="rtl">
        <DialogTitle>{he.employeeClaimConfirmOpen}</DialogTitle>
        <DialogActions>
          <Button onClick={() => setPending(null)}>{he.cancel}</Button>
          <Button
            variant="contained"
            disabled={!pending || claimingId === pending.id}
            onClick={() => pending && void claim(pending)}
          >
            {he.employeeClaimTask}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function ClaimableRow({
  item,
  disabled,
  onSelect,
}: {
  item: TaskGalleryItem;
  disabled: boolean;
  onSelect: (item: TaskGalleryItem) => void;
}) {
  const thumb = mediaUrl(item.reference_photo_url);
  return (
    <ListItemButton
      disabled={disabled}
      onClick={() => onSelect(item)}
      sx={{ borderRadius: 2, mb: 0.5, border: "1px solid", borderColor: "divider" }}
    >
      <ListItemAvatar>
        {thumb ? (
          <Box
            component="img"
            src={thumb}
            alt=""
            sx={{ width: 48, height: 48, objectFit: "cover", borderRadius: 1.5, display: "block" }}
          />
        ) : (
          <Box sx={{ width: 48, height: 48, borderRadius: 1.5, bgcolor: "action.hover" }} />
        )}
      </ListItemAvatar>
      <ListItemText
        primary={item.title}
        secondary={item.has_open ? he.employeeClaimHasOpen : item.description || he.taskKindLabels.ad_hoc}
        secondaryTypographyProps={{ noWrap: true }}
      />
    </ListItemButton>
  );
}
