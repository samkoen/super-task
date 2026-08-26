import { useCallback, useEffect, useState } from "react";
import {
  AppBar,
  Badge,
  Box,
  Button,
  Dialog,
  IconButton,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import ChatOutlinedIcon from "@mui/icons-material/ChatOutlined";
import { ApiError } from "../../services/api";
import { useFeedback } from "../../context/FeedbackContext";
import { he } from "../../i18n/he";
import PageHeader from "../../components/ui/PageHeader";
import EmptyState from "../../components/ui/EmptyState";
import ListSkeleton from "../../components/ui/ListSkeleton";
import EmployeeAvatar from "../../components/employee/EmployeeAvatar";
import DirectChatThread from "../../components/chat/DirectChatThread";
import {
  directChatService,
  type DirectChatCard,
} from "../../services/directChatService";
import { directChatTitle, sortDirectChatCards } from "../../utils/directChat";
import { formatTime } from "../../utils/dashboardTime";
import { useDirectChatLiveSync } from "../../hooks/useDirectChatLiveSync";

export default function ManagerDirectChatsPage() {
  const { showError, showSuccess } = useFeedback();
  const [items, setItems] = useState<DirectChatCard[]>([]);
  const [up, setUp] = useState<DirectChatCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [openTitle, setOpenTitle] = useState("");
  const [broadcastOpen, setBroadcastOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await directChatService.inbox();
      setItems(sortDirectChatCards(data.items));
      setUp(data.up);
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    void load();
  }, [load]);
  useDirectChatLiveSync(null, () => void load());

  const openCard = async (card: DirectChatCard) => {
    try {
      const opened = card.kind === "up"
        ? await directChatService.openMine()
        : await directChatService.openWith(card.counterpart_user_id);
      setOpenId(opened.conversation.id);
      setOpenTitle(directChatTitle(card));
    } catch (e) {
      showError(e instanceof ApiError ? e.message : he.errorGeneric);
    }
  };

  const closeThread = () => {
    setOpenId(null);
    void load();
  };

  const rows = up ? [up, ...items] : items;

  return (
    <Box>
      <PageHeader
        title={he.directChatTitle}
        action={
          <Button
            variant="outlined"
            startIcon={<CampaignOutlinedIcon />}
            onClick={() => setBroadcastOpen(true)}
            disabled={items.length === 0}
          >
            {he.directChatBroadcast}
          </Button>
        }
      />
      {loading ? (
        <ListSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState title={he.directChatNoPeers} icon={<ChatOutlinedIcon fontSize="inherit" />} />
      ) : (
        <List disablePadding>
          {rows.map((card) => (
            <ListItemButton
              key={`${card.kind}-${card.counterpart_user_id}`}
              onClick={() => void openCard(card)}
              sx={{ borderBottom: "1px solid", borderColor: "divider", py: 1.25 }}
            >
              <ListItemAvatar>
                <EmployeeAvatar name={card.counterpart_name} photoUrl={card.counterpart_avatar_url} size={44} />
              </ListItemAvatar>
              <ListItemText
                primary={directChatTitle(card)}
                secondary={card.last_preview || he.directChatEmpty}
                primaryTypographyProps={{ fontWeight: card.unread_count ? 800 : 600 }}
                secondaryTypographyProps={{ noWrap: true }}
              />
              <Box textAlign="left" minWidth={56}>
                {card.last_at && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    {formatTime(card.last_at)}
                  </Typography>
                )}
                {card.unread_count > 0 && (
                  <Badge badgeContent={card.unread_count} color="error" sx={{ mt: 0.5 }} />
                )}
              </Box>
            </ListItemButton>
          ))}
        </List>
      )}

      <Dialog fullScreen open={Boolean(openId)} onClose={closeThread} dir="rtl">
        <AppBar sx={{ position: "relative" }} color="inherit" elevation={1}>
          <Toolbar>
            <IconButton edge="start" onClick={closeThread} aria-label={he.close}>
              <ArrowForwardIcon />
            </IconButton>
            <Typography sx={{ mr: 2 }} variant="h6">{openTitle}</Typography>
          </Toolbar>
        </AppBar>
        <Box p={2} display="flex" flexDirection="column" sx={{ height: "100%" }}>
          {openId && <DirectChatThread conversationId={openId} onSent={() => void load()} />}
        </Box>
      </Dialog>

      <Dialog fullScreen open={broadcastOpen} onClose={() => setBroadcastOpen(false)} dir="rtl">
        <AppBar sx={{ position: "relative" }} color="inherit" elevation={1}>
          <Toolbar>
            <IconButton edge="start" onClick={() => setBroadcastOpen(false)} aria-label={he.close}>
              <ArrowForwardIcon />
            </IconButton>
            <Typography sx={{ mr: 2 }} variant="h6">{he.directChatBroadcast}</Typography>
          </Toolbar>
        </AppBar>
        <Box p={2} display="flex" flexDirection="column" sx={{ height: "100%" }}>
          <DirectChatThread
            conversationId={null}
            broadcast
            onSent={() => {
              showSuccess(he.directChatBroadcastSent(items.length));
              setBroadcastOpen(false);
              void load();
            }}
          />
        </Box>
      </Dialog>
    </Box>
  );
}
