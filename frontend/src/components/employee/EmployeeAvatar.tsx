import { Box, Avatar, IconButton } from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import { avatarInitials } from "../../utils/avatarInitials";
import { mediaUrl } from "../../utils/mediaUrl";
import { he } from "../../i18n/he";

interface EmployeeAvatarProps {
  name?: string;
  photoUrl?: string | null;
  size?: number;
  editable?: boolean;
  onEdit?: () => void;
}

export default function EmployeeAvatar({
  name,
  photoUrl,
  size = 72,
  editable = false,
  onEdit,
}: EmployeeAvatarProps) {
  const src = mediaUrl(photoUrl) ?? undefined;
  return (
    <Box
      position="relative"
      flexShrink={0}
      width={size}
      height={size}
      zIndex={2}
      sx={{ overflow: "visible" }}
    >
      <Avatar
        src={src}
        alt={name || ""}
        onClick={editable ? onEdit : undefined}
        sx={{
          width: size,
          height: size,
          fontSize: size * 0.36,
          fontWeight: 800,
          cursor: editable ? "pointer" : "default",
        }}
      >
        {avatarInitials(name)}
      </Avatar>
      {editable ? (
        <IconButton
          size="small"
          aria-label={he.employeeChangePhoto}
          onClick={onEdit}
          sx={{
            position: "absolute",
            bottom: 0,
            insetInlineStart: 0,
            zIndex: 3,
            bgcolor: "primary.main",
            color: "primary.contrastText",
            width: 28,
            height: 28,
            boxShadow: 1,
            "&:hover": { bgcolor: "primary.dark" },
          }}
        >
          <PhotoCameraIcon sx={{ fontSize: 16 }} />
        </IconButton>
      ) : null}
    </Box>
  );
}
