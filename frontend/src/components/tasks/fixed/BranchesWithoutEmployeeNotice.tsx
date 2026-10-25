import { Alert } from "@mui/material";
import { he } from "../../../i18n/he";

/** Prévient avant la création : ces snifim n'ont pas d'oved, la copie n'y aurait personne à qui s'assigner. */
export default function BranchesWithoutEmployeeNotice({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  return (
    <Alert severity="warning" data-testid="branches-without-employee">
      {he.fixedTaskBranchesWithoutEmployee(names.join(", "))}
    </Alert>
  );
}
