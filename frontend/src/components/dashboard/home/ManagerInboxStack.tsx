import { Box, ButtonBase, Typography } from "@mui/material";
import summaryDone from "../../../assets/flow1/summary-done.png";
import { he } from "../../../i18n/he";
import { studioSmallButtonSx } from "../../tasks/fixed/studio/studioUi";
import { flowColor, flowRadius, flowText } from "../../../styles/flowTokens";
import type { InboxItem, InboxKind } from "../../../utils/managerHome";
import { HomeSectionTitle, homeCardSx } from "./homeUi";

/** Teinte des cartes : orange = on attend une réponse, vert = preuve à valider, blanc = message. */
const TONE: Record<InboxKind, string> = {
  question: flowColor.orange500,
  review: flowColor.green300,
  chat: flowColor.neutral0,
};

/** Onglets du dessous : le plus proche de la carte est plus large (315 / 272 px du Figma sur 345). */
const TAB_WIDTHS = ["91%", "79%"];

function number(index: number): string {
  return String(index + 1).padStart(2, "0");
}

function kicker(item: InboxItem, index: number): string {
  return [number(index), he.managerHomeInboxKinds[item.kind], item.who].filter(Boolean).join(" · ");
}

function FrontCard({ item, onOpen }: { item: InboxItem; onOpen: (item: InboxItem) => void }) {
  return (
    <Box
      data-testid="inbox-card"
      data-kind={item.kind}
      sx={{ position: "relative", zIndex: 3, bgcolor: TONE[item.kind], borderRadius: `${flowRadius.xl2}px`, p: "28px", display: "flex", flexDirection: "column", gap: "12px" }}
    >
      <Typography sx={{ ...flowText.label, color: flowColor.neutral900 }}>{kicker(item, 0)}</Typography>
      <Typography sx={{ ...flowText.h2, color: flowColor.neutral900, overflowWrap: "anywhere" }}>{item.title}</Typography>
      {item.preview ? <Typography sx={{ ...flowText.body, color: flowColor.neutral900 }}>{item.preview}</Typography> : null}
      <ButtonBase
        data-testid="inbox-card-action"
        onClick={() => onOpen(item)}
        sx={{ ...studioSmallButtonSx, alignSelf: "flex-end", px: "24px", bgcolor: flowColor.neutral900, color: flowColor.neutral0 }}
      >
        {he.managerHomeInboxActions[item.kind]}
      </ButtonBase>
    </Box>
  );
}

function BackTab({ item, index, onOpen }: { item: InboxItem; index: number; onOpen: (item: InboxItem) => void }) {
  return (
    <ButtonBase
      data-testid="inbox-tab"
      onClick={() => onOpen(item)}
      sx={{
        position: "relative",
        zIndex: 2 - index,
        width: TAB_WIDTHS[index],
        alignSelf: "center",
        mt: "-24px",
        pt: "36px",
        pb: "14px",
        px: "24px",
        justifyContent: "flex-start",
        bgcolor: TONE[item.kind],
        borderRadius: `0 0 ${flowRadius.xl2}px ${flowRadius.xl2}px`,
      }}
    >
      <Typography noWrap sx={{ ...flowText.label, color: flowColor.neutral900 }}>
        {[kicker(item, index + 1), item.title].join(" · ")}
      </Typography>
    </ButtonBase>
  );
}

function EmptyInbox() {
  return (
    <Box data-testid="inbox-empty" sx={{ ...homeCardSx, alignItems: "center", textAlign: "center" }}>
      <Box component="img" src={summaryDone} alt="" sx={{ width: 96, height: 96, objectFit: "contain" }} />
      <Typography sx={{ ...flowText.h2, color: flowColor.neutral900 }}>{he.managerHomeInboxEmpty}</Typography>
      <Typography sx={{ ...flowText.body, color: flowColor.alphaNeutral900_60 }}>{he.managerHomeInboxEmptyHint}</Typography>
    </Box>
  );
}

type Props = { items: InboxItem[]; onOpen: (item: InboxItem) => void };

/**
 * « לטיפולך » : la pile de cartes du Figma appliquée à ce qui attend le menahel. La carte du
 * dessus est ouverte ; les deux suivantes dépassent en onglets ; une file vide montre « הכל מטופל ».
 */
export default function ManagerInboxStack({ items, onOpen }: Props) {
  const [front, ...rest] = items;
  return (
    <Box component="section" data-testid="manager-inbox" sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <HomeSectionTitle>{he.managerHomeInboxTitle(items.length)}</HomeSectionTitle>
      {front ? (
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <FrontCard item={front} onOpen={onOpen} />
          {rest.slice(0, 2).map((item, i) => (
            <BackTab key={item.key} item={item} index={i} onOpen={onOpen} />
          ))}
        </Box>
      ) : (
        <EmptyInbox />
      )}
    </Box>
  );
}
