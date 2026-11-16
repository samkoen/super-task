import { useState, type ReactNode } from "react";
import { Box } from "@mui/material";
import { useAuth } from "../../../context/AuthContext";
import { ManagerPageHeaderProvider, useManagerPageHeaderValue } from "../../../context/ManagerPageHeaderContext";
import { ManagerScopeProvider, useShellManagerScope } from "../../../context/ManagerScopeContext";
import { useManagerChatUnread } from "../../../hooks/useManagerChatUnread";
import { useManagerDesktop } from "../../../hooks/useManagerDesktop";
import { useManagerShell } from "../../../hooks/useManagerShell";
import { flowScreenBackground } from "../../../styles/flowTokens";
import { managerBottomContentPadCss } from "../../../utils/managerBottomNav";
import { MANAGER_DESKTOP_CONTENT_MAX_PX, MANAGER_RAIL_WIDTH_PX } from "../../../utils/managerShell";
import { LivePullToRefresh } from "../../ui/PullToRefresh";
import ManagerCreateSheet from "./ManagerCreateSheet";
import ManagerMoreSheet from "./ManagerMoreSheet";
import ManagerPillNav from "./ManagerPillNav";
import ManagerScopePill from "./ManagerScopePill";
import ManagerScopeSheet from "./ManagerScopeSheet";
import ManagerSideRail from "./ManagerSideRail";
import ManagerTasksViewSwitch from "./ManagerTasksViewSwitch";
import ManagerTopBar from "./ManagerTopBar";

type Props = {
  /** Contenu de la page (Outlet sous Suspense). */
  children: ReactNode;
  /** Bandeaux et gardes globaux (chat, mise à jour, bug) rendus au-dessus de la coque. */
  overlays: ReactNode;
  muteIncoming: boolean;
  onLogout: () => void;
};

/**
 * Coque menahel dans le style du Figma : en-tête commun, pastilles de l'onglet משימות,
 * contenu dans une colonne, pilule 4 onglets en bas (rail latéral sur ordinateur).
 * Le menahel reshet choisit son périmètre une fois, dans l'en-tête, pour les 4 onglets.
 */
export default function ManagerShell(props: Props) {
  const { user } = useAuth();
  return (
    <ManagerPageHeaderProvider>
      <ManagerScopeProvider enabled={user?.role === "network_manager"}>
        <ManagerShellBody {...props} />
      </ManagerScopeProvider>
    </ManagerPageHeaderProvider>
  );
}

/** Pastille « כל הרשת ▾ / סניף ▾ » et sa sheet ; rien pour un menahel snif. */
function ScopeControl() {
  const scope = useShellManagerScope();
  const [open, setOpen] = useState(false);
  if (!scope) return null;
  return (
    <>
      <ManagerScopePill label={scope.branchName} inBranch={Boolean(scope.branchId)} onOpen={() => setOpen(true)} onBackToNetwork={() => scope.setBranch("")} />
      <ManagerScopeSheet
        open={open}
        branchId={scope.branchId}
        branches={scope.branches}
        onClose={() => setOpen(false)}
        onSelect={(id) => { setOpen(false); scope.setBranch(id); }}
      />
    </>
  );
}

function ManagerShellBody({ children, overlays, muteIncoming, onLogout }: Props) {
  const { user } = useAuth();
  const header = useManagerPageHeaderValue();
  // Le point orange suit le périmètre choisi dans l'en-tête, comme la page « שיחות ».
  const chatUnread = useManagerChatUnread(useShellManagerScope()?.branchId ?? "");
  const shell = useManagerShell();
  const desktop = useManagerDesktop();

  return (
    <Box sx={{ height: "100vh", overflowY: "auto", overflowX: "hidden", background: flowScreenBackground, WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", pr: desktop ? `${MANAGER_RAIL_WIDTH_PX}px` : 0 }}>
      <LivePullToRefresh>
        <Box component="main" sx={{ maxWidth: desktop ? MANAGER_DESKTOP_CONTENT_MAX_PX : 1280, mx: "auto", px: { xs: 3, md: 4 } }}>
          <ManagerTopBar
            name={user?.full_name}
            photoUrl={user?.avatar_url}
            title={header?.title}
            subtitle={header?.subtitle}
            action={header?.action}
            scope={shell.showBack ? null : <ScopeControl />}
            showAvatar={!desktop}
            showBack={shell.showBack}
            muteIncoming={muteIncoming}
            onBack={shell.goBack}
            onCreate={shell.openCreate}
            onOpenMore={shell.openMore}
          />
          {shell.tasksView ? <ManagerTasksViewSwitch active={shell.tasksView} onSelect={shell.selectTasksView} /> : null}
          {children}
          <Box aria-hidden sx={{ height: desktop ? "32px" : managerBottomContentPadCss() }} />
        </Box>
      </LivePullToRefresh>
      {desktop ? (
        <ManagerSideRail active={shell.activeTab} chatUnread={chatUnread} name={user?.full_name} photoUrl={user?.avatar_url} onSelect={shell.selectTab} onOpenMore={shell.openMore} />
      ) : (
        <ManagerPillNav active={shell.activeTab} chatUnread={chatUnread} onSelect={shell.selectTab} />
      )}
      <ManagerShellSheets shell={shell} title={user?.full_name || ""} onLogout={onLogout} />
      {overlays}
    </Box>
  );
}

type SheetsProps = { shell: ReturnType<typeof useManagerShell>; title: string; onLogout: () => void };

/** Sheets « + » (créer) et « עוד » (avatar). */
function ManagerShellSheets({ shell, title, onLogout }: SheetsProps) {
  return (
    <>
      <ManagerCreateSheet open={shell.createOpen} onClose={shell.closeCreate} onChoose={shell.choose} />
      <ManagerMoreSheet
        open={shell.moreOpen}
        title={title}
        items={shell.moreItems}
        onClose={shell.closeMore}
        onSelect={shell.selectMore}
        onLogout={() => {
          shell.closeMore();
          onLogout();
        }}
      />
    </>
  );
}
