import type { User } from "../services/api";
import { isViewAsPreview } from "./viewAsPreview";

export function employeeChromeMenuFlags(user: User | null | undefined) {
  const preview = isViewAsPreview(user);
  const isBranchManager = user?.role === "branch_manager";
  return {
    showExitViewAs: preview,
    showViewAsEmployee: isBranchManager && !preview,
    showManagerArea: isBranchManager && !preview,
  };
}
