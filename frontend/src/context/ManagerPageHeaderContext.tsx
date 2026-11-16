import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/** Titre de l'écran menahel, affiché par la coque sous la salutation (Figma « Home Header »). */
export interface ManagerPageHeader {
  title: string;
  subtitle?: string;
}

type Ctx = { header: ManagerPageHeader | null; setHeader: (header: ManagerPageHeader | null) => void };

const ManagerPageHeaderContext = createContext<Ctx>({ header: null, setHeader: () => undefined });

export function ManagerPageHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeader] = useState<ManagerPageHeader | null>(null);
  const value = useMemo(() => ({ header, setHeader }), [header]);
  return <ManagerPageHeaderContext.Provider value={value}>{children}</ManagerPageHeaderContext.Provider>;
}

export function useManagerPageHeaderValue(): ManagerPageHeader | null {
  return useContext(ManagerPageHeaderContext).header;
}

/** Une page déclare son titre ; il disparaît quand elle se démonte. Sans coque, ne fait rien. */
export function useManagerPageHeader(title: string, subtitle?: string): void {
  const { setHeader } = useContext(ManagerPageHeaderContext);
  useEffect(() => {
    setHeader(title ? { title, subtitle } : null);
    return () => setHeader(null);
  }, [setHeader, title, subtitle]);
}
