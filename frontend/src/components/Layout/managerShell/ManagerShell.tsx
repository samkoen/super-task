import type { ReactNode } from "react";
import { Box } from "@mui/material";
import { useAuth } from "../../../context/AuthContext";
import { ManagerPageHeaderProvider, useManagerPageHeaderValue } from "../../../context/ManagerPageHeaderContext";
import { useEmployeeChatUnread } from "../../../hooks/useEmployeeChatUnread";
import { useManagerShell } from "../../../hooks/useManagerShell";
import { flowScreenBackground } from "../../../styles/flowTokens";
import { managerBottomContentPadCss } from "../../../utils/managerBottomNav";
import { LivePullToRefresh } from "../../ui/PullToRefresh";
import ManagerCreateSheet from "./ManagerCreateSheet";
import ManagerMoreSheet from "./ManagerMoreSheet";
import ManagerPillNav from "./ManagerPillNav";
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
 * contenu dans une colonne, pilule 4 onglets en bas. Remplace menu latéral, FAB et barre 3 onglets.
 */
export default function ManagerShell(props: Props) {
  return (
    <ManagerPageHeaderProvider>
      <ManagerShellBody {...props} />
    </ManagerPageHeaderProvider>
  );
}

function ManagerShellBody({ children, overlays, muteIncoming, onLogout }: Props) {
  const { user } = useAuth();
  const header = useManagerPageHeaderValue();
  // Rôle non transmis exprès : on veut le total des non-lus de toutes les conversations menahel.
  const chatUnread = useEmployeeChatUnread(true, undefined);
  const shell = useManagerShell();

  return (
    <Box sx={{ height: "100vh", overflowY: "auto", overflowX: "hidden", background: flowScreenBackground, WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}>
      <LivePullToRefresh>
        <Box component="main" sx={{ maxWidth: 1280, mx: "auto", px: { xs: 3, md: 4 } }}>
          <ManagerTopBar
            name={user?.full_name}
            photoUrl={user?.avatar_url}
            title={header?.title}
            subtitle={header?.subtitle}
            showBack={shell.showBack}
            muteIncoming={muteIncoming}
            onBack={shell.goBack}
            onCreate={shell.openCreate}
            onOpenMore={shell.openMore}
          />
          {shell.tasksView ? <ManagerTasksViewSwitch active={shell.tasksView} onSelect={shell.selectTasksView} /> : null}
          {children}
          <Box aria-hidden sx={{ height: managerBottomContentPadCss() }} />
        </Box>
      </LivePullToRefresh>
      <ManagerPillNav active={shell.activeTab} chatUnread={chatUnread} onSelect={shell.selectTab} />
      <ManagerCreateSheet open={shell.createOpen} onClose={shell.closeCreate} onChoose={shell.choose} />
      <ManagerMoreSheet
        open={shell.moreOpen}
        title={user?.full_name || ""}
        items={shell.moreItems}
        onClose={shell.closeMore}
        onSelect={shell.selectMore}
        onLogout={() => {
          shell.closeMore();
          onLogout();
        }}
      />
      {overlays}
    </Box>
  );
}
