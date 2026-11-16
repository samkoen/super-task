import type { ReactNode } from "react";
import { Avatar, Box, ButtonBase, Typography } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import arrowLeftIcon from "../../../assets/flow1/icon-arrow-left.svg";
import bellIcon from "../../../assets/flow1/icon-bell.svg";
import NotificationBell from "../../notifications/NotificationBell";
import { useResolvedMediaSrc } from "../../../hooks/useResolvedMediaSrc";
import { he } from "../../../i18n/he";
import { flowColor, flowSize, flowText } from "../../../styles/flowTokens";
import { greetingFor } from "../../../utils/flowStack";
import { systemTopInsetCss } from "../../../utils/systemInsets";

type Props = {
  name?: string | null;
  photoUrl?: string | null;
  /** Titre déclaré par la page (`useManagerPageHeader`) ; absent = pas de bloc titre. */
  title?: string;
  subtitle?: string;
  showBack: boolean;
  muteIncoming?: boolean;
  onBack: () => void;
  onCreate: () => void;
  onOpenMore: () => void;
};

type RoundProps = { label: string; testId: string; onClick: () => void; children: ReactNode };

/** Bouton rond 56 du Figma (« Round Button ») : fond blanc, icône neutral/600. */
function RoundButton({ label, testId, onClick, children }: RoundProps) {
  return (
    <ButtonBase
      aria-label={label}
      data-testid={testId}
      onClick={onClick}
      sx={{ position: "relative", flexShrink: 0, width: flowSize.roundButton, height: flowSize.roundButton, borderRadius: "50%", bgcolor: flowColor.neutral0 }}
    >
      {children}
    </ButtonBase>
  );
}

function IconImg({ src, size }: { src: string; size: number }) {
  return <Box component="img" src={src} alt="" sx={{ width: size, height: size, display: "block" }} />;
}

function Bell({ muteIncoming }: { muteIncoming?: boolean }) {
  return (
    <NotificationBell
      muteIncoming={muteIncoming}
      renderTrigger={(open, unread) => (
        <RoundButton label={he.notificationsTitle} testId="manager-topbar-bell" onClick={open}>
          <IconImg src={bellIcon} size={22} />
          {unread > 0 ? (
            <Box sx={{ position: "absolute", left: 32.5, top: 17, width: 7, height: 7, borderRadius: "50%", bgcolor: flowColor.orange500 }} />
          ) : null}
        </RoundButton>
      )}
    />
  );
}

/** Avatar + « שלום …, בוקר טוב » : ouvre la sheet « עוד » (profil, דוחות, הגדרות…). */
function GreetingButton({ name, photoUrl, onClick }: { name?: string | null; photoUrl?: string | null; onClick: () => void }) {
  const media = useResolvedMediaSrc(photoUrl || null, false);
  return (
    <ButtonBase
      aria-label={he.managerOpenMore}
      data-testid="manager-topbar-more"
      onClick={onClick}
      sx={{ display: "flex", alignItems: "center", gap: "11px", minWidth: 0, maxWidth: "100%", borderRadius: 999, pl: 1 }}
    >
      <Avatar
        src={media.src ?? undefined}
        alt={name || ""}
        sx={{ width: flowSize.avatar, height: flowSize.avatar, bgcolor: flowColor.neutral300, color: flowColor.neutral900, fontFamily: flowText.body.fontFamily }}
      >
        {(name || "").trim().charAt(0)}
      </Avatar>
      <Typography noWrap sx={{ ...flowText.bodyLarge, color: flowColor.alphaNeutral1000_53, minWidth: 0 }}>
        {greetingFor(name)}
      </Typography>
    </ButtonBase>
  );
}

/** Titre H1 + sous-titre de l'écran (ex. « סניף תל אביב » / « יום שני, 16 בנובמבר »). */
function TitleBlock({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography component="h1" data-testid="manager-topbar-title" sx={{ ...flowText.h1, color: flowColor.neutral900, overflowWrap: "anywhere" }}>
        {title}
      </Typography>
      {subtitle ? (
        <Typography data-testid="manager-topbar-subtitle" sx={{ ...flowText.bodyLarge, color: flowColor.alphaBlack800_72 }}>
          {subtitle}
        </Typography>
      ) : null}
    </Box>
  );
}

/**
 * En-tête commun à tous les écrans menahel, comme le Figma (« Home Header » + « toolbar ») :
 * avatar et salutation, titre de l'écran, puis retour éventuel, « + » et cloche à gauche.
 */
export default function ManagerTopBar({ name, photoUrl, title, subtitle, showBack, muteIncoming, onBack, onCreate, onOpenMore }: Props) {
  return (
    <Box component="header" data-testid="manager-topbar" sx={{ pt: `calc(8px + ${systemTopInsetCss()})` }}>
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "16px" }}>
        <GreetingButton name={name} photoUrl={photoUrl} onClick={onOpenMore} />
        {title ? <TitleBlock title={title} subtitle={subtitle} /> : null}
      </Box>
      <Box sx={{ direction: "ltr", display: "flex", gap: "12px", pt: "16px", pb: "16px" }}>
        {showBack ? (
          <RoundButton label={he.flowBack} testId="manager-topbar-back" onClick={onBack}>
            <IconImg src={arrowLeftIcon} size={22} />
          </RoundButton>
        ) : null}
        <RoundButton label={he.managerCreate} testId="manager-topbar-create" onClick={onCreate}>
          <AddRoundedIcon sx={{ fontSize: 28, color: flowColor.neutral600 }} />
        </RoundButton>
        <Bell muteIncoming={muteIncoming} />
      </Box>
    </Box>
  );
}
