import { Box, ButtonBase, InputBase } from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import { chatUi } from "../../../styles/employeeChatUi";

/** Search Field Figma : pilule grise 44px, loupe à gauche. */
export function ChatSearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}) {
  return (
    <Box
      sx={{
        height: 44,
        px: 2,
        gap: 1,
        display: "flex",
        alignItems: "center",
        borderRadius: "999px",
        bgcolor: chatUi.searchBg,
      }}
    >
      <InputBase
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputProps={{ "aria-label": placeholder, dir: "auto", type: "search" }}
        sx={{
          flex: 1,
          fontFamily: chatUi.font,
          fontSize: 15,
          color: chatUi.textPrimary,
          "& input::placeholder": { color: chatUi.textSecondary, opacity: 1 },
        }}
      />
      <SearchRoundedIcon sx={{ fontSize: 20, color: chatUi.textPrimary }} />
    </Box>
  );
}

/** Filter Chip Figma (style WhatsApp) avec compteur optionnel (Show count). */
export function ChatFilterChip({
  label,
  active,
  count = 0,
  onClick,
  testId,
}: {
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      data-testid={testId}
      aria-pressed={active}
      sx={{
        position: "relative",
        height: 36,
        minWidth: active ? 64 : undefined,
        px: 1.5,
        borderRadius: "999px",
        border: "1px solid",
        borderColor: active ? chatUi.chipActiveBorder : chatUi.borderSubtle,
        bgcolor: active ? chatUi.chipActiveBg : "transparent",
        color: active ? chatUi.chipActiveFg : chatUi.chipFg,
        fontFamily: chatUi.font,
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {label}
      {count > 0 ? (
        <Box
          component="span"
          sx={{
            position: "absolute",
            top: -7,
            insetInlineEnd: -7,
            minWidth: 18,
            height: 18,
            px: "5px",
            borderRadius: "999px",
            border: "2px solid #fff",
            bgcolor: chatUi.accent,
            color: "#fff",
            fontSize: 12,
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxSizing: "content-box",
          }}
        >
          {count}
        </Box>
      ) : null}
    </ButtonBase>
  );
}

/** Archive Row Figma : icône alignée sur la colonne des avatars, compteur à gauche. */
export function ChatArchiveRow({
  label,
  count,
  onClick,
}: {
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <ButtonBase
      onClick={onClick}
      sx={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: 3,
        py: 1.5,
        fontFamily: chatUi.font,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box sx={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ArchiveOutlinedIcon sx={{ fontSize: 20, color: chatUi.textPrimary }} />
        </Box>
        <Box component="span" sx={{ fontSize: 15, fontWeight: 600, color: chatUi.textPrimary }}>
          {label}
        </Box>
      </Box>
      <Box component="span" sx={{ fontSize: 12, fontWeight: 500, color: chatUi.textSecondary }}>
        {count}
      </Box>
    </ButtonBase>
  );
}
