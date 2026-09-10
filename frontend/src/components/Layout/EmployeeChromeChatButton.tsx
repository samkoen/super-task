import { useNavigate } from "react-router-dom";
import ChatOutlinedIcon from "@mui/icons-material/ChatOutlined";
import { Badge, IconButton, alpha } from "@mui/material";
import { he } from "../../i18n/he";
import { useAuth } from "../../context/AuthContext";
import { useEmployeeChatUnread } from "../../hooks/useEmployeeChatUnread";

export default function EmployeeChromeChatButton() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const unread = useEmployeeChatUnread(true, user?.role);
  return (
    <IconButton
      color="inherit"
      aria-label={he.directChatOpen}
      onClick={() => navigate("/employee/chats")}
      sx={{ "&:hover": { bgcolor: alpha("#fff", 0.08) } }}
    >
      <Badge badgeContent={unread} color="error">
        <ChatOutlinedIcon />
      </Badge>
    </IconButton>
  );
}
