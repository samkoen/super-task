import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import { notificationService, type AppNotification } from "../../services/notificationService";
import { NOTIFICATION_EVENT } from "../../constants/events";
import IssueReportDetailDialog from "../issues/IssueReportDetailDialog";
import { he } from "../../i18n/he";

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("he-IL", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [issueReportId, setIssueReportId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationService.list();
      setItems(data.items);
      setUnreadCount(data.unread_count);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onNotify = () => {
      void refresh();
    };
    window.addEventListener(NOTIFICATION_EVENT, onNotify);
    return () => window.removeEventListener(NOTIFICATION_EVENT, onNotify);
  }, [refresh]);

  const handleOpen = () => {
    setOpen(true);
    void refresh();
  };

  const handleMarkRead = async (id: string) => {
    await notificationService.markRead(id);
    await refresh();
  };

  const handleMarkAll = async () => {
    await notificationService.markAllRead();
    await refresh();
  };

  const handleItemClick = async (item: AppNotification) => {
    if (!item.read_at) {
      await handleMarkRead(item.id);
    }
    if (item.kind === "issue_reported" && item.issue_report_id) {
      setOpen(false);
      setIssueReportId(item.issue_report_id);
    }
  };

  return (
    <>
      <IconButton color="inherit" aria-label={he.notificationsTitle} onClick={handleOpen} size="small">
        <Badge badgeContent={unreadCount} color="error" max={99}>
          <NotificationsNoneIcon />
        </Badge>
      </IconButton>

      <Drawer anchor="left" open={open} onClose={() => setOpen(false)} dir="rtl">
        <Box sx={{ width: { xs: "100vw", sm: 360 }, p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="h6" fontWeight={700}>{he.notificationsTitle}</Typography>
            {unreadCount > 0 && (
              <Button size="small" onClick={() => void handleMarkAll()}>{he.notificationsMarkAllRead}</Button>
            )}
          </Box>
          <Divider sx={{ mb: 1 }} />
          {loading && items.length === 0 ? (
            <Box display="flex" justifyContent="center" py={4}><CircularProgress size={28} /></Box>
          ) : items.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
              {he.notificationsEmpty}
            </Typography>
          ) : (
            <List disablePadding>
              {items.map((item) => (
                <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => void handleItemClick(item)}
                    sx={{
                      borderRadius: 1,
                      bgcolor: item.read_at ? "transparent" : "action.hover",
                      alignItems: "flex-start",
                    }}
                  >
                    <ListItemText
                      primary={item.title}
                      secondary={
                        <>
                          <Typography component="span" variant="body2" display="block">{item.message}</Typography>
                          <Typography component="span" variant="caption" color="text.disabled">{formatWhen(item.created_at)}</Typography>
                        </>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Drawer>

      <IssueReportDetailDialog
        reportId={issueReportId}
        onClose={() => setIssueReportId(null)}
      />
    </>
  );
}
