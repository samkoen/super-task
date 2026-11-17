import type { ReactNode } from "react";
import { Box, ButtonBase, Collapse, Typography } from "@mui/material";
import collapseDark from "../../assets/flow2/btn-collapse-dark.svg";
import collapseLight from "../../assets/flow2/btn-collapse-light.svg";
import moonIcon from "../../assets/flow2/icon-moon.svg";
import sunIcon from "../../assets/flow2/icon-sun.svg";
import { he } from "../../i18n/he";
import { flowColor, flowRadius, flowSpace, flowText } from "../../styles/flowTokens";
import type { TodayPeriod } from "../../utils/todayPeriods";

/** Couleurs du Figma : color/task-3 (בוקר), color/task-2 (צהריים), neutral/900 (ערב). */
const PERIOD_STYLE: Record<TodayPeriod, { bg: string; text: string; icon: string; arrow: string }> = {
  morning: { bg: flowColor.orange500, text: flowColor.neutral900, icon: sunIcon, arrow: collapseDark },
  noon: { bg: flowColor.green300, text: flowColor.neutral900, icon: sunIcon, arrow: collapseDark },
  evening: { bg: flowColor.neutral900, text: flowColor.neutral0, icon: moonIcon, arrow: collapseLight },
};

type Props = {
  period: TodayPeriod;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
};

/** Figma « Period Header » (43) : icône, titre, puis le chevron qui plie la liste (à gauche). */
function PeriodHeader({ period, open, onToggle }: Omit<Props, "children">) {
  const style = PERIOD_STYLE[period];
  return (
    <ButtonBase
      aria-expanded={open}
      aria-label={`${he.todayPeriodTitles[period]} · ${open ? he.todayPeriodCollapse : he.todayPeriodExpand}`}
      data-testid={`today-period-header-${period}`}
      onClick={onToggle}
      sx={{
        width: "100%",
        height: 43,
        flexShrink: 0,
        boxSizing: "border-box",
        px: `${flowSpace.s16}px`,
        display: "flex",
        alignItems: "center",
        gap: `${flowSpace.s8}px`,
        bgcolor: style.bg,
      }}
    >
      <Box component="img" src={style.icon} alt="" sx={{ flexShrink: 0, width: 21, height: 21, display: "block" }} />
      <Typography sx={{ ...flowText.button, flex: "1 0 0", minWidth: 0, textAlign: "right", color: style.text }}>
        {he.todayPeriodTitles[period]}
      </Typography>
      <Box
        component="img"
        src={style.arrow}
        alt=""
        sx={{
          flexShrink: 0,
          width: 16,
          height: 16,
          display: "block",
          transform: open ? "none" : "rotate(180deg)",
          transition: "transform 200ms ease",
        }}
      />
    </ButtonBase>
  );
}

/** Groupe « period · בוקר / צהריים / ערב » : bandeau coloré (radius 28) et carte blanche (radius 24) des tâches. */
export default function TodayPeriodSection({ period, open, onToggle, children }: Props) {
  return (
    <Box
      component="section"
      data-testid={`today-period-${period}`}
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: `${flowRadius.xl2}px`,
        bgcolor: PERIOD_STYLE[period].bg,
      }}
    >
      <PeriodHeader period={period} open={open} onToggle={onToggle} />
      <Collapse in={open} timeout={200}>
        <Box
          data-testid={`today-period-tasks-${period}`}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: `${flowSpace.s12}px`,
            p: `${flowSpace.s16}px`,
            borderRadius: `${flowRadius.xl}px`,
            bgcolor: flowColor.neutral0,
          }}
        >
          {children}
        </Box>
      </Collapse>
    </Box>
  );
}
