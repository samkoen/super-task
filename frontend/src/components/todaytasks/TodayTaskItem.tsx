import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { Box, ButtonBase, Menu, MenuItem, Typography } from "@mui/material";
import moreIcon from "../../assets/flow2/btn-more.svg";
import checkIcon from "../../assets/flow2/icon-check-small.svg";
import { he } from "../../i18n/he";
import { flowColor, flowRadius, flowSpace, flowText } from "../../styles/flowTokens";

type Props = {
  title: string;
  /** Heure « 07:30 » de l'échéance. */
  time: string;
  /** « 15 דק׳ » : affichée seulement si la tâche a une durée. */
  duration?: string | null;
  done: boolean;
  onOpen: () => void;
  onOpenChat: () => void;
};

function Divider() {
  return <Box aria-hidden sx={{ flexShrink: 0, width: "1px", height: 18, bgcolor: flowColor.alphaBlack800_44 }} />;
}

/** Figma « checkbox » 18 : bordure noire (Pending) ou pastille verte avec le check blanc (Done). */
function Checkbox({ done }: { done: boolean }) {
  return (
    <Box
      data-testid="today-task-checkbox"
      data-done={done ? "true" : "false"}
      sx={{
        flexShrink: 0,
        width: 18,
        height: 18,
        boxSizing: "border-box",
        borderRadius: `${flowRadius.xs}px`,
        border: `1px solid ${done ? flowColor.statusSuccessFg : flowColor.neutral1000}`,
        bgcolor: done ? flowColor.statusSuccessFg : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {done ? <Box component="img" src={checkIcon} alt="" sx={{ width: 12, height: 12, display: "block" }} /> : null}
    </Box>
  );
}

/** ⋮ (btn-more) : ouvre le menu d'actions de la ligne sans ouvrir la tâche. */
function MoreMenu({ onOpen, onOpenChat }: Pick<Props, "onOpen" | "onOpenChat">) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const pick = (action: () => void) => () => {
    setAnchor(null);
    action();
  };
  return (
    <>
      <ButtonBase
        aria-label={he.todayTaskMore}
        data-testid="today-task-more"
        onClick={(event: MouseEvent<HTMLElement>) => {
          event.stopPropagation();
          setAnchor(event.currentTarget);
        }}
        onKeyDown={(event) => event.stopPropagation()}
        sx={{ flexShrink: 0, width: 24, height: 40, mx: "-10.4px", borderRadius: `${flowRadius.full}px` }}
      >
        <Box component="img" src={moreIcon} alt="" sx={{ width: 3.2, height: 12.8, display: "block" }} />
      </ButtonBase>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        onClick={(event) => event.stopPropagation()}
        dir="rtl"
      >
        <MenuItem data-testid="today-task-menu-open" onClick={pick(onOpen)} sx={{ ...flowText.body }}>
          {he.todayTaskOpen}
        </MenuItem>
        <MenuItem data-testid="today-task-menu-chat" onClick={pick(onOpenChat)} sx={{ ...flowText.body }}>
          {he.flowOpenTaskChat}
        </MenuItem>
      </Menu>
    </>
  );
}

/**
 * Figma « Task Item » (écran 01 du FLOW 2) : case · heure · titre et durée · ⋮, de droite à gauche.
 * Done : fond orange 20 % et case verte ; Pending : fond neutral/100 à 52 %.
 */
export default function TodayTaskItem({ title, time, duration, done, onOpen, onOpenChat }: Props) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  };
  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label={done ? `${title} · ${he.todayTaskDone}` : title}
      data-testid="today-task-item"
      data-state={done ? "done" : "pending"}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: `${flowSpace.s16}px`,
        width: "100%",
        height: 60,
        boxSizing: "border-box",
        px: `${flowSpace.s16}px`,
        py: "10px",
        borderRadius: `${flowRadius.item}px`,
        bgcolor: done ? flowColor.alphaOrange500_20 : flowColor.alphaNeutral100_52,
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
        "&:focus-visible": { outline: `2px solid ${flowColor.orange500}`, outlineOffset: 2 },
      }}
    >
      <Checkbox done={done} />
      <Divider />
      <Typography sx={{ ...flowText.bodySmall, color: flowColor.textPrimary, whiteSpace: "nowrap", flexShrink: 0 }}>
        {time}
      </Typography>
      <Divider />
      <Box sx={{ flex: "1 0 0", minWidth: 0, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <Box sx={{ minWidth: 0, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "3px" }}>
          <Typography
            data-testid="today-task-title"
            sx={{ ...flowText.taskTitle, color: flowColor.textPrimary, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {title}
          </Typography>
          {duration ? (
            <Typography sx={{ ...flowText.caption, color: flowColor.textSecondary, whiteSpace: "nowrap" }}>{duration}</Typography>
          ) : null}
        </Box>
        <MoreMenu onOpen={onOpen} onOpenChat={onOpenChat} />
      </Box>
    </Box>
  );
}
