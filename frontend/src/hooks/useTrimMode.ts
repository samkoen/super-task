import { useCallback, useEffect, useState } from "react";
import { he } from "../i18n/he";
import { fullRange, isTrimmed, type TrimRange } from "../utils/flowTrim";
import { TrimUnsupportedError } from "../utils/videoTrim";

type Options = {
  total: number;
  /** Change quand la vidéo est remplacée (découpe terminée, nouvelle prise) : le mode se referme. */
  src: string | null | undefined;
  onTrim?: (range: TrimRange) => Promise<unknown>;
};

/** Mode « חיתוך » du lecteur de revue : sélection début/fin, validation, erreur lisible. */
export function useTrimMode({ total, src, onTrim }: Options) {
  const [range, setRange] = useState<TrimRange | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRange(null);
    setError(null);
  }, [src]);

  const begin = useCallback(() => {
    setError(null);
    setRange(fullRange(total));
  }, [total]);

  const cancel = useCallback(() => {
    setRange(null);
    setError(null);
  }, []);

  const apply = useCallback(async () => {
    if (!range || !onTrim || !isTrimmed(range, total)) return;
    setBusy(true);
    setError(null);
    try {
      await onTrim(range);
      setRange(null);
    } catch (failure) {
      setError(failure instanceof TrimUnsupportedError ? he.flowTrimUnsupported : he.flowTrimFailed);
    } finally {
      setBusy(false);
    }
  }, [range, onTrim, total]);

  return {
    range,
    busy,
    error,
    available: Boolean(onTrim) && total > 0,
    canApply: range !== null && isTrimmed(range, total),
    setRange,
    begin,
    cancel,
    apply,
  };
}
