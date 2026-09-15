import { Button } from "@mui/material";
import { he } from "../../i18n/he";

export default function MarkCompletionPhotoButton({
  marked,
  disabled,
  onClick,
}: {
  marked: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      size="small"
      variant={marked ? "contained" : "outlined"}
      disabled={disabled}
      onClick={onClick}
      sx={{ mt: 0.5, minHeight: 36 }}
    >
      {marked ? he.reviewPhotoMarked : he.reviewMarkPhoto}
    </Button>
  );
}
