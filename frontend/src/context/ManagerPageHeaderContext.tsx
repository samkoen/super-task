import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/** Bouton rond d'en-tête déclaré par une page (ex. « שליחה לכולם » de l'onglet שיחות). */
export interface ManagerHeaderAction {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  testId?: string;
}

/** Titre de l'écran menahel, affiché par la coque sous la salutation (Figma « Home Header »). */
export interface ManagerPageHeader {
  title: string;
  subtitle?: string;
  action?: ManagerHeaderAction;
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

/**
 * Une page déclare son titre (et un bouton rond d'en-tête facultatif) ; tout disparaît quand elle
 * se démonte. Sans coque, ne fait rien. L'action doit être stable (icône constante, onClick mémoïsé)
 * pour ne pas relancer l'effet à chaque rendu.
 */
export function useManagerPageHeader(title: string, subtitle?: string, action?: ManagerHeaderAction): void {
  const { setHeader } = useContext(ManagerPageHeaderContext);
  const { icon, label, onClick, testId } = action ?? {};
  useEffect(() => {
    if (!title) {
      setHeader(null);
      return () => setHeader(null);
    }
    const next = onClick ? { icon, label: label ?? "", onClick, testId } : undefined;
    setHeader({ title, subtitle, action: next });
    return () => setHeader(null);
  }, [setHeader, title, subtitle, icon, label, onClick, testId]);
}
