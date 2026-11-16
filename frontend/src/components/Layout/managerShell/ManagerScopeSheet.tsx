import { useState } from "react";
import { Box, TextField, Typography } from "@mui/material";
import HubOutlinedIcon from "@mui/icons-material/HubOutlined";
import StoreOutlinedIcon from "@mui/icons-material/StoreOutlined";
import StudioSheet from "../../tasks/fixed/studio/StudioSheet";
import type { Branch } from "../../../services/branchService";
import { he } from "../../../i18n/he";
import { flowColor, flowRadius, flowText } from "../../../styles/flowTokens";
import { filterBranchesByName } from "../../../utils/managerScopeBranch";
import ManagerSheetRow from "./ManagerSheetRow";

/** Au-delà, on propose la recherche : une reshet de quelques snifim se lit d'un coup d'œil. */
const SEARCH_FROM = 6;

type Props = {
  open: boolean;
  branchId: string;
  branches: Branch[];
  onClose: () => void;
  onSelect: (branchId: string) => void;
};

function SearchField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <TextField
      size="small"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={he.managerScopeSearch}
      inputProps={{ "aria-label": he.managerScopeSearch, "data-testid": "manager-scope-search" }}
      sx={{ "& .MuiOutlinedInput-root": { borderRadius: `${flowRadius.full}px`, bgcolor: flowColor.neutral100 } }}
    />
  );
}

/** Sheet du choix de périmètre : « כל הרשת » puis chaque snif (recherche si la reshet est grande). */
export default function ManagerScopeSheet({ open, branchId, branches, onClose, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const shown = filterBranchesByName(branches, query);
  const pick = (id: string) => { setQuery(""); onSelect(id); };
  const hint = (selected: boolean) => (selected ? he.managerScopeSelected : undefined);
  return (
    <StudioSheet open={open} title={he.managerScopeSheetTitle} subtitle={he.managerScopeSheetSubtitle} onClose={onClose} testId="manager-scope-sheet">
      {branches.length > SEARCH_FROM ? <SearchField value={query} onChange={setQuery} /> : null}
      <Box sx={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "55vh", overflowY: "auto" }}>
        <ManagerSheetRow testId="manager-scope-option-network" label={he.managerHomeNetworkTitle} hint={hint(!branchId)} icon={<HubOutlinedIcon />} onClick={() => pick("")} />
        {shown.map((b) => (
          <ManagerSheetRow key={b.id} testId={`manager-scope-option-${b.id}`} label={b.name} hint={hint(b.id === branchId)} icon={<StoreOutlinedIcon />} onClick={() => pick(b.id)} />
        ))}
        {query && !shown.length ? (
          <Typography sx={{ ...flowText.body, color: flowColor.alphaNeutral900_60, textAlign: "center", py: 1 }}>{he.managerScopeNoResults}</Typography>
        ) : null}
      </Box>
    </StudioSheet>
  );
}
