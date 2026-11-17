import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { Box, ButtonBase, Menu, MenuItem, Typography } from "@mui/material";
import moreIcon from "../../assets/flow2/btn-more.svg";
import checkIcon from "../../assets/flow2/icon-check-small.svg";
import { he } from "../../i18n/he";
import { flowColor, flowRadius, flowSpace, flowText } from "../../styles/flowTokens";

/**
 * Marque discrète en plus de Done / Pending (écrans menahel) : « late » met la 2e ligne en rouge,
 * « active » entoure la ligne d'orange (tâche en cours).
 */
export type TodayTaskTone = "late" | "active";

type Props = {
  title: string;
  /** Heure « 07:30 » de l'échéance (précédée de la date si ce n'est pas le jour affiché). */
  time: string;
  /** 2e ligne : « 15 דק׳ » côté oved, « דני · ממתין לאישור » côté menahel. Masquée si vide. */
  subtitle?: string | null;
  done: boolean;
  tone?: TodayTaskTone;
  onOpen: () => void;
  /** Sans action secondaire, pas de ⋮ : toute la ligne ouvre la tâche. */
  onOpenChat?: () => void;
  testId?: string;
  /** État métier exposé tel quel (ex. « review ») pour les tests et le débogage. */
  dataState?: string;
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
function MoreMenu({ onOpen, onOpenChat }: { onOpen: () => void; onOpenChat: () => void }) {
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
export default function TodayTaskItem({ title, time, subtitle, done, tone, onOpen, onOpenChat, testId, dataState }: Props) {
  const late = !done && tone === "late";
  const active = !done && tone === "active";
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
      data-testid={testId ?? "today-task-item"}
      data-state={dataState ?? (done ? "done" : "pending")}
      data-tone={late || active ? tone : undefined}
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
        boxShadow: active ? `inset 0 0 0 1px ${flowColor.orange500}` : "none",
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
          {subtitle ? (
            <Typography
              data-testid="today-task-subtitle"
              sx={{ ...flowText.caption, color: late ? flowColor.rec : flowColor.textSecondary, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        {onOpenChat ? <MoreMenu onOpen={onOpen} onOpenChat={onOpenChat} /> : null}
      </Box>
    </Box>
  );
}
