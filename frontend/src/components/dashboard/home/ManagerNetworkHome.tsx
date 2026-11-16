import { useState, type ReactNode } from "react";
import { Box, ButtonBase, Collapse, TextField, Typography } from "@mui/material";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import summaryDone from "../../../assets/flow1/summary-done.png";
import type { BranchSummary, HealthLevel } from "../../../services/dashboardService";
import { he } from "../../../i18n/he";
import { flowColor, flowRadius, flowText } from "../../../styles/flowTokens";
import type { NetworkOverview } from "../../../utils/managerHome";
import { filterBranchesByName } from "../../../utils/managerScopeBranch";
import ManagerColumns from "./ManagerColumns";
import { HomeSectionTitle, homeCardSx } from "./homeUi";

/** Couleur seulement quand il faut agir : un snif qui va bien n'a pas de pastille colorée. */
const DOT: Record<HealthLevel, string> = { red: flowColor.rec, orange: flowColor.orange500, green: flowColor.neutral300 };

/** Une raison en mots, la plus importante : le retard s'il y en a, sinon l'avancement. */
function branchReason(b: BranchSummary): string {
  return b.overdue > 0 ? he.managerHomeOverdue(b.overdue) : he.managerHomeBranchDone(Math.round(b.completion_rate * 100));
}

function BranchRow({ branch, onOpen, plain }: { branch: BranchSummary; onOpen: (id: string) => void; plain?: boolean }) {
  return (
    <ButtonBase
      data-testid="network-branch"
      data-health={branch.health}
      onClick={() => onOpen(branch.branch_id)}
      sx={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", px: "16px", py: "14px", justifyContent: "flex-start", borderRadius: `${flowRadius.md}px`, bgcolor: plain ? "transparent" : flowColor.neutral0 }}
    >
      <Box aria-hidden sx={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, bgcolor: DOT[branch.health] }} />
      <Typography sx={{ ...flowText.button, fontSize: 16, color: flowColor.neutral900, flex: 1, textAlign: "right" }}>{branch.name}</Typography>
      {plain ? null : <Typography sx={{ ...flowText.label, color: flowColor.alphaNeutral900_60 }}>{branchReason(branch)}</Typography>}
      <ChevronLeftRoundedIcon sx={{ color: flowColor.neutral600 }} />
    </ButtonBase>
  );
}

/** Recherche dans la liste complète, utile seulement pour une grande reshet. */
const SEARCH_FROM = 6;

function BranchSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <TextField
      size="small"
      fullWidth
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={he.managerScopeSearch}
      inputProps={{ "aria-label": he.managerScopeSearch, "data-testid": "network-all-search" }}
      sx={{ px: "8px", pb: "8px", "& .MuiOutlinedInput-root": { borderRadius: `${flowRadius.full}px`, bgcolor: flowColor.neutral100 } }}
    />
  );
}

/** « כל הסניפים (N) › » : une ligne repliée ; ouverte, la liste du pire au meilleur, avec recherche. */
function AllBranches({ branches, onOpen }: { branches: BranchSummary[]; onOpen: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const shown = filterBranchesByName(branches, query);
  return (
    <Box sx={{ ...homeCardSx, p: "8px", gap: 0 }}>
      <ButtonBase data-testid="network-all-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)} sx={{ justifyContent: "space-between", px: "16px", py: "12px", borderRadius: `${flowRadius.md}px` }}>
        <Typography sx={{ ...flowText.button, color: flowColor.neutral900 }}>{he.managerHomeAllBranches(branches.length)}</Typography>
        <ExpandMoreRoundedIcon sx={{ color: flowColor.neutral600, transform: open ? "rotate(180deg)" : "none" }} />
      </ButtonBase>
      <Collapse in={open} unmountOnExit>
        {branches.length > SEARCH_FROM ? <BranchSearch value={query} onChange={setQuery} /> : null}
        {shown.map((b) => <BranchRow key={b.branch_id} branch={b} onOpen={onOpen} plain />)}
        {query && !shown.length ? (
          <Typography data-testid="network-all-empty" sx={{ ...flowText.body, color: flowColor.alphaNeutral900_60, textAlign: "center", py: 1 }}>{he.managerScopeNoResults}</Typography>
        ) : null}
      </Collapse>
    </Box>
  );
}

/** Snifim qui demandent une action, ou l'illustration « כל הסניפים תקינים ». */
function AttentionSection({ attention, onOpen }: { attention: BranchSummary[]; onOpen: (id: string) => void }) {
  return (
    <Box component="section" sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <HomeSectionTitle>{he.managerHomeAttentionTitle}</HomeSectionTitle>
      {attention.length ? (
        attention.map((b) => <BranchRow key={b.branch_id} branch={b} onOpen={onOpen} />)
      ) : (
        <Box data-testid="network-all-healthy" sx={{ ...homeCardSx, alignItems: "center" }}>
          <Box component="img" src={summaryDone} alt="" sx={{ width: 80, height: 80, objectFit: "contain" }} />
          <Typography sx={{ ...flowText.h2, color: flowColor.neutral900 }}>{he.managerHomeAllHealthy}</Typography>
        </Box>
      )}
    </Box>
  );
}

type Props = {
  overview: NetworkOverview;
  onOpenBranch: (branchId: string) => void;
  /** Pile « לטיפולך » du menahel reshet, posée sous la phrase d'état. */
  inbox?: ReactNode;
};

/**
 * Accueil « כל הרשת », épuré (retour du 16.11 : la page reshet était trop chargée) : une phrase
 * d'état, la pile « לטיפולך », seulement les snifim qui demandent une action, et la liste repliée.
 * Même vue pour le menahel qui gère tous les oveds : le détail d'un magasin passe par le sélecteur.
 */
export default function ManagerNetworkHome({ overview, onOpenBranch, inbox }: Props) {
  const { healthy, attention, all } = overview;
  return (
    <Box data-testid="manager-network-home">
      <ManagerColumns
        first={
          <>
            <Typography data-testid="network-status" sx={{ ...flowText.bodyLarge, color: flowColor.neutral900 }}>
              {he.managerHomeNetworkStatus(healthy, attention.length)}
            </Typography>
            {inbox}
          </>
        }
        second={
          <>
            <AttentionSection attention={attention} onOpen={onOpenBranch} />
            {/* Repliée seulement si elle apporte quelque chose : inutile quand tous les snifim sont déjà au-dessus. */}
            {all.length > attention.length ? <AllBranches branches={all} onOpen={onOpenBranch} /> : null}
          </>
        }
      />
    </Box>
  );
}
