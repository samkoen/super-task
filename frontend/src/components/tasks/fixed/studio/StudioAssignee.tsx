import { Avatar, Box, ButtonBase, Typography } from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import type { User } from "../../../../services/api";
import { he } from "../../../../i18n/he";
import { useResolvedMediaSrc } from "../../../../hooks/useResolvedMediaSrc";
import { flowColor, flowRadius, flowText } from "../../../../styles/flowTokens";

function PersonAvatar({ user, size }: { user: Pick<User, "full_name" | "avatar_url">; size: number }) {
  const media = useResolvedMediaSrc(user.avatar_url || null, false);
  return (
    <Avatar
      src={media.src ?? undefined}
      alt=""
      sx={{ width: size, height: size, bgcolor: flowColor.neutral300, color: flowColor.neutral900, fontFamily: flowText.body.fontFamily, fontSize: size * 0.4 }}
    >
      {(user.full_name || "").trim().charAt(0)}
    </Avatar>
  );
}

function PersonChip({ user, selected, label, disabled, onClick }: {
  user: User;
  selected: boolean;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <ButtonBase
      role="radio"
      aria-checked={selected}
      aria-label={label}
      data-testid={`studio-assignee-${user.id}`}
      disabled={disabled}
      onClick={onClick}
      sx={{
        position: "relative",
        width: 92,
        py: "12px",
        px: "6px",
        flexDirection: "column",
        gap: "8px",
        borderRadius: `${flowRadius.md}px`,
        border: `1.5px solid ${selected ? flowColor.navy800 : "transparent"}`,
        bgcolor: selected ? flowColor.neutral0 : flowColor.neutral100,
      }}
    >
      <PersonAvatar user={user} size={48} />
      <Typography sx={{ ...flowText.label, color: flowColor.neutral900, textAlign: "center", lineHeight: 1.2, overflowWrap: "anywhere" }}>
        {label}
      </Typography>
      {selected ? (
        <Box sx={{ position: "absolute", top: 6, left: 6, width: 20, height: 20, borderRadius: "50%", bgcolor: flowColor.navy800, display: "grid", placeItems: "center" }}>
          <CheckRoundedIcon sx={{ fontSize: 14, color: flowColor.neutral0 }} />
        </Box>
      ) : null}
    </ButtonBase>
  );
}

/** « מי מבצע » pour un seul snif : les ovdim en avatars ronds, on touche celui qui fera la tâche. */
export default function StudioAssigneePicker({
  employees,
  value,
  onChange,
  currentUserId,
  disabled = false,
}: {
  employees: User[];
  value: string;
  onChange: (userId: string) => void;
  currentUserId?: string;
  disabled?: boolean;
}) {
  if (employees.length === 0) {
    return <Typography sx={{ ...flowText.body, color: flowColor.alphaNeutral900_60 }}>{he.studioNoEmployees}</Typography>;
  }
  return (
    <Box role="radiogroup" aria-label={he.assignee} sx={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
      {employees.map((user) => {
        const self = currentUserId && user.id === currentUserId;
        const label = self ? `${user.full_name} (${he.assignToMyself})` : user.full_name;
        return (
          <PersonChip
            key={user.id}
            user={user}
            label={label}
            selected={value === user.id}
            disabled={disabled}
            onClick={() => onChange(user.id)}
          />
        );
      })}
    </Box>
  );
}

export { PersonAvatar };
