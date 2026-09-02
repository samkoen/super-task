import { useState, type MouseEvent } from "react";
import { Avatar, Box, IconButton, Menu, MenuItem } from "@mui/material";
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
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const onPhotoActivate = (event: MouseEvent<HTMLElement>) => {
    activateAvatarPhoto(event, canDelete, editable, onEdit, setMenuAnchor);
  };
  return (
    <Box position="relative" flexShrink={0} width={size} height={size} zIndex={2} sx={{ overflow: "visible" }}>
      <AvatarFace name={name} src={src} size={size} clickable={editable || canDelete} onClick={onPhotoActivate} />
      {editable ? <AvatarCameraBadge onClick={onPhotoActivate} /> : null}
      <AvatarPhotoMenu
        anchor={menuAnchor}
        editable={editable}
        canDelete={canDelete}
        onClose={() => setMenuAnchor(null)}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </Box>
  );
}

function activateAvatarPhoto(
  event: MouseEvent<HTMLElement>,
  canDelete: boolean,
  editable: boolean,
  onEdit: (() => void) | undefined,
  openMenu: (el: HTMLElement) => void,
) {
  event.stopPropagation();
  if (canDelete) {
    openMenu(event.currentTarget);
    return;
  }
  if (editable) onEdit?.();
}

function AvatarFace({
  name,
  src,
  size,
  clickable,
  onClick,
}: {
  name?: string;
  src?: string;
  size: number;
  clickable: boolean;
  onClick: (event: MouseEvent<HTMLElement>) => void;
}) {
  return (
    <Avatar
      src={src}
      alt={name || ""}
      onClick={clickable ? onClick : undefined}
      sx={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        fontWeight: 800,
        cursor: clickable ? "pointer" : "default",
      }}
    >
      {avatarInitials(name)}
    </Avatar>
  );
}

function AvatarCameraBadge({ onClick }: { onClick: (event: MouseEvent<HTMLElement>) => void }) {
  return (
    <IconButton
      size="small"
      aria-label={he.employeeChangePhoto}
      onClick={onClick}
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
        "&:hover": { bgcolor: "primary.main", filter: "brightness(0.9)" },
      }}
    >
      <PhotoCameraIcon sx={{ fontSize: 16 }} />
    </IconButton>
  );
}

function AvatarPhotoMenu({
  anchor,
  editable,
  canDelete,
  onClose,
  onEdit,
  onDelete,
}: {
  anchor: HTMLElement | null;
  editable: boolean;
  canDelete: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const pick = (action?: () => void) => {
    onClose();
    action?.();
  };
  return (
    <Menu
      anchorEl={anchor}
      open={Boolean(anchor)}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      transformOrigin={{ vertical: "top", horizontal: "center" }}
    >
      {editable ? <MenuItem onClick={() => pick(onEdit)}>{he.employeeChangePhoto}</MenuItem> : null}
      {canDelete ? (
        <MenuItem onClick={() => pick(onDelete)} sx={{ color: "error.main" }}>
          {he.employeeDeletePhoto}
        </MenuItem>
      ) : null}
    </Menu>
  );
}
