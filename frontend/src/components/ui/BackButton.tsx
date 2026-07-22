import { Button } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getHomePath } from "../../config/routes";
import { he } from "../../i18n/he";

/** Retour à la page précédente, sinon accueil du rôle. */
export default function BackButton() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleBack = () => {
    const home = user ? getHomePath(user.role) : "/";
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(home);
  };

  return (
    <Button
      type="button"
      variant="text"
      color="inherit"
      size="small"
      onClick={handleBack}
      startIcon={<ArrowForwardIcon />}
      sx={{
        alignSelf: "flex-start",
        mb: 1,
        px: 0.5,
        minWidth: 0,
        fontWeight: 600,
        color: "text.secondary",
        "&:hover": { bgcolor: "action.hover", color: "text.primary" },
      }}
    >
      {he.goBack}
    </Button>
  );
}
