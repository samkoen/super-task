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
import CollectionsBookmarkIcon from "@mui/icons-material/CollectionsBookmark";
import { ApiError } from "../../services/api";
import {
  taskGalleryService,
  type GalleryTaskKind,
  type TaskGalleryItem,
} from "../../services/taskGalleryService";
import { useFeedback } from "../../context/FeedbackContext";
import ListSkeleton from "../ui/ListSkeleton";
import EmptyState from "../ui/EmptyState";
import { mediaUrl } from "../../utils/mediaUrl";
import { he } from "../../i18n/he";

interface TaskGalleryPickerDialogProps {
  open: boolean;
  /** Si omis : toutes les sortes (קבועה + מזדמנת). */
  taskKind?: GalleryTaskKind;
  onClose: () => void;
  onSelect: (item: TaskGalleryItem) => void;
}

export default function TaskGalleryPickerDialog({
  open,
  taskKind,
  onClose,
  onSelect,
}: TaskGalleryPickerDialogProps) {
  const { showError } = useFeedback();
  const [items, setItems] = useState<TaskGalleryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await taskGalleryService.list(taskKind));
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, [taskKind, showError]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" dir="rtl">
      <DialogTitle>{he.taskGalleryPickTitle}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {he.taskGalleryPickHint}
        </Typography>
        {loading ? (
          <ListSkeleton variant="cards" rows={3} />
        ) : items.length === 0 ? (
          <EmptyState
            title={he.taskGalleryEmpty}
            description={he.taskGalleryEmptyHint}
            icon={<CollectionsBookmarkIcon fontSize="inherit" />}
          />
        ) : (
          <List disablePadding>
            {items.map((item) => {
              const thumb = mediaUrl(item.reference_photo_url);
              return (
              <ListItemButton
                key={item.id}
                onClick={() => onSelect(item)}
                sx={{ borderRadius: 2, mb: 0.5, border: "1px solid", borderColor: "divider" }}
              >
                <ListItemAvatar>
                  {thumb ? (
                    <Box
                      component="img"
                      src={thumb}
                      alt=""
                      sx={{
                        width: 48,
                        height: 48,
                        objectFit: "cover",
                        borderRadius: 1.5,
                        display: "block",
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 1.5,
                        bgcolor: "action.hover",
                      }}
                    />
                  )}
                </ListItemAvatar>
                <ListItemText
                  primary={item.title}
                  secondary={item.description || he.taskKindLabels[item.task_kind]}
                  secondaryTypographyProps={{ noWrap: true }}
                />
              </ListItemButton>
              );
            })}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{he.cancel}</Button>
      </DialogActions>
    </Dialog>
  );
}
