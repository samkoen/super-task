import { Box, Avatar, IconButton } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
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
  onDelete?: () => void;
}

export default function EmployeeAvatar({
  name,
  photoUrl,
  size = 72,
  editable = false,
  onEdit,
  onDelete,
}: EmployeeAvatarProps) {
  const src = mediaUrl(photoUrl) ?? undefined;
  const canDelete = Boolean(src && onDelete);
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
        <AvatarCameraBadge onEdit={onEdit} />
      ) : null}
      {canDelete ? <AvatarDeleteBadge onDelete={onDelete} /> : null}
    </Box>
  );
}

function AvatarCameraBadge({ onEdit }: { onEdit?: () => void }) {
  return (
    <IconButton
      size="small"
      aria-label={he.employeeChangePhoto}
      onClick={(e) => {
        e.stopPropagation();
        onEdit?.();
      }}
      sx={avatarBadgeSx("primary.main", "insetInlineStart")}
    >
      <PhotoCameraIcon sx={{ fontSize: 16 }} />
    </IconButton>
  );
}

function AvatarDeleteBadge({ onDelete }: { onDelete?: () => void }) {
  return (
    <IconButton
      size="small"
      aria-label={he.employeeDeletePhoto}
      onClick={(e) => {
        e.stopPropagation();
        onDelete?.();
      }}
      sx={avatarBadgeSx("error.main", "insetInlineEnd")}
    >
      <DeleteOutlineIcon sx={{ fontSize: 16 }} />
    </IconButton>
  );
}

function avatarBadgeSx(bgcolor: string, side: "insetInlineStart" | "insetInlineEnd") {
  return {
    position: "absolute" as const,
    bottom: 0,
    [side]: 0,
    zIndex: 3,
    bgcolor,
    color: "primary.contrastText",
    width: 28,
    height: 28,
    boxShadow: 1,
    "&:hover": { bgcolor, filter: "brightness(0.9)" },
  };
}
