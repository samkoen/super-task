import { Avatar } from "@mui/material";
import { useResolvedMediaSrc } from "../../hooks/useResolvedMediaSrc";
import { flowColor, flowText } from "../../styles/flowTokens";
import type { TeamRosterState } from "../../utils/managerTeam";

/** Anneau autour de l'avatar : orange = rien en cours (à regarder), vert = au travail, pointillé = pas arrivé. */
export const TEAM_RING: Record<TeamRosterState, { color: string; dashed?: boolean }> = {
  idle: { color: flowColor.orange500 },
  working: { color: flowColor.green700 },
  notArrived: { color: flowColor.neutral300, dashed: true },
  done: { color: flowColor.neutral300 },
  unknown: { color: flowColor.neutral300 },
  noAccess: { color: flowColor.neutral300, dashed: true },
};

type Props = { name: string; initial: string; state: TeamRosterState; photoUrl?: string | null; size?: number };

/** Photo de l'oved (ou son initiale) dans l'anneau de son état du jour. */
export default function TeamPersonAvatar({ name, initial, state, photoUrl, size = 48 }: Props) {
  const media = useResolvedMediaSrc(photoUrl || null, false);
  const ring = TEAM_RING[state];
  return (
    <Avatar
      src={media.src ?? undefined}
      alt={name}
      sx={{
        width: size, height: size, flexShrink: 0, bgcolor: flowColor.neutral0, color: flowColor.neutral900, ...flowText.h2,
        border: `2.5px ${ring.dashed ? "dashed" : "solid"} ${ring.color}`, opacity: state === "noAccess" ? 0.6 : 1,
      }}
    >
      {initial}
    </Avatar>
  );
}
