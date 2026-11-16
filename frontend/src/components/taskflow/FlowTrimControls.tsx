import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { Box, ButtonBase, CircularProgress, Typography } from "@mui/material";
import handleIcon from "../../assets/flow1/scrub-handle.svg";
import trimIcon from "../../assets/flow1/icon-trim.svg";
import { he } from "../../i18n/he";
import { flowColor, flowText } from "../../styles/flowTokens";
import { seekRatioFromPointer } from "../../utils/flowPlayer";
import { handleRatio, moveHandle, nearestHandle, type TrimHandle, type TrimRange } from "../../utils/flowTrim";

const pillSx = { display: "flex", alignItems: "center", gap: "6px", px: "12px", py: "8px", borderRadius: "18px", ...flowText.label } as const;

/** Figma « כפתור חיתוך » : pastille navy, texte 13 puis ciseaux 16. */
export function TrimButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <ButtonBase
      data-testid="flow-trim-button"
      disabled={disabled}
      onClick={onClick}
      sx={{ ...pillSx, direction: "ltr", bgcolor: flowColor.navy800, color: flowColor.neutral0, "&.Mui-disabled": { opacity: 0.5 } }}
    >
      {he.flowTrim}
      <Box component="img" src={trimIcon} alt="" sx={{ width: 16, height: 16, display: "block" }} />
    </ButtonBase>
  );
}

type ActionsProps = { canApply: boolean; busy: boolean; onApply: () => void; onCancel: () => void };

/** Pendant la découpe : valider la sélection ou annuler. */
export function TrimActions({ canApply, busy, onApply, onCancel }: ActionsProps) {
  return (
    <Box sx={{ display: "flex", gap: "8px" }}>
      <ButtonBase
        data-testid="flow-trim-apply"
        disabled={!canApply || busy}
        onClick={onApply}
        sx={{ ...pillSx, bgcolor: flowColor.neutral0, color: flowColor.navy800, "&.Mui-disabled": { opacity: 0.5 } }}
      >
        {he.flowTrimApply}
      </ButtonBase>
      <ButtonBase
        data-testid="flow-trim-cancel"
        disabled={busy}
        onClick={onCancel}
        sx={{ ...pillSx, bgcolor: flowColor.navy800, color: flowColor.neutral0, "&.Mui-disabled": { opacity: 0.5 } }}
      >
        {he.flowTrimCancel}
      </ButtonBase>
    </Box>
  );
}

type HandleProps = { handle: TrimHandle; range: TrimRange; total: number; onMove: (seconds: number) => void };

function Handle({ handle, range, total, onMove }: HandleProps) {
  const seconds = handle === "start" ? range.start : range.end;
  const onKeyDown = (event: KeyboardEvent) => {
    // RTL : la flèche gauche avance dans la vidéo.
    const step = event.key === "ArrowLeft" ? 1 : event.key === "ArrowRight" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    onMove(seconds + step);
  };
  return (
    <Box
      role="slider"
      tabIndex={0}
      aria-label={handle === "start" ? he.flowTrimStart : he.flowTrimEnd}
      aria-valuemin={0}
      aria-valuemax={Math.round(total)}
      aria-valuenow={Math.round(seconds)}
      data-testid={`flow-trim-${handle}`}
      onKeyDown={onKeyDown}
      sx={{ position: "absolute", width: 14, height: 14, right: `calc(${handleRatio(seconds, total) * 100}% - 7px)`, pointerEvents: "none" }}
    >
      <Box component="img" src={handleIcon} alt="" sx={{ width: 14, height: 14, display: "block" }} />
    </Box>
  );
}

type ScrubberProps = {
  range: TrimRange;
  total: number;
  onChange: (range: TrimRange, handle: TrimHandle) => void;
};

/** Barre de découpe (début à droite, comme la lecture) : deux poignées, la portion gardée reste claire. */
export function TrimScrubber({ range, total, onChange }: ScrubberProps) {
  const track = useRef<HTMLDivElement>(null);
  const active = useRef<TrimHandle>("start");
  const move = (handle: TrimHandle, seconds: number) => onChange(moveHandle(range, handle, seconds, total), handle);
  const pointerSeconds = (event: PointerEvent) => {
    const rect = track.current?.getBoundingClientRect();
    return rect ? seekRatioFromPointer(event.clientX, rect) * total : 0;
  };
  const from = handleRatio(range.start, total) * 100;
  const to = handleRatio(range.end, total) * 100;
  return (
    <Box
      ref={track}
      role="group"
      aria-label={he.flowTrimRange}
      data-testid="flow-trim-scrubber"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture?.(event.pointerId);
        active.current = nearestHandle(range, pointerSeconds(event));
        move(active.current, pointerSeconds(event));
      }}
      onPointerMove={(event) => event.buttons === 1 && move(active.current, pointerSeconds(event))}
      sx={{ position: "relative", height: 14, display: "flex", alignItems: "center", cursor: "pointer", touchAction: "none" }}
    >
      <Box sx={{ position: "absolute", left: 0, right: 0, height: 4, borderRadius: "2px", bgcolor: flowColor.neutral0, opacity: 0.5 }} />
      <Box sx={{ position: "absolute", height: 4, borderRadius: "2px", bgcolor: flowColor.neutral0, right: `${from}%`, width: `${to - from}%` }} />
      <Handle handle="start" range={range} total={total} onMove={(seconds) => move("start", seconds)} />
      <Handle handle="end" range={range} total={total} onMove={(seconds) => move("end", seconds)} />
    </Box>
  );
}

/** Découpe en cours : la vidéo est relue puis réenregistrée, l'écran attend. */
export function TrimBusy() {
  return (
    <Box
      data-testid="flow-trim-busy"
      role="status"
      sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", bgcolor: flowColor.alphaNavy800_60 }}
    >
      <CircularProgress size={32} sx={{ color: flowColor.neutral0 }} />
      <Typography sx={{ ...flowText.label, color: flowColor.neutral0 }}>{he.flowTrimWorking}</Typography>
    </Box>
  );
}
