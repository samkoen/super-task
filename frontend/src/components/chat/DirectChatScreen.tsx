import { Box, Dialog } from "@mui/material";
import DirectChatThread from "./DirectChatThread";
import FullscreenBackAppBar, { fullscreenChatBodySx, fullscreenChatDialogPaperSx } from "./FullscreenBackAppBar";

type Props = {
  chat: { id: string; title: string } | null;
  onClose: () => void;
  onSent?: () => void;
};

/** Chat direct en plein écran (accueil, fiche d'un oved). */
export default function DirectChatScreen({ chat, onClose, onSent }: Props) {
  return (
    <Dialog fullScreen open={Boolean(chat)} onClose={onClose} dir="rtl" PaperProps={{ sx: fullscreenChatDialogPaperSx }}>
      <FullscreenBackAppBar title={chat?.title ?? ""} onBack={onClose} />
      <Box sx={fullscreenChatBodySx}>
        {chat ? <DirectChatThread conversationId={chat.id} onSent={onSent} /> : null}
      </Box>
    </Dialog>
  );
}
