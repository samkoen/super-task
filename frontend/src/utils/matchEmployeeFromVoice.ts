export interface VoiceEmployeeRef {
  id: string;
  full_name: string;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Match id depuis un nom (complet ou prénom) dans la liste d’équipe. */
export function matchEmployeeIdByName(
  name: string | null | undefined,
  employees: VoiceEmployeeRef[],
): string | null {
  const normalized = normalizeName(name || "");
  if (!normalized || employees.length === 0) return null;

  for (const e of employees) {
    if (normalizeName(e.full_name) === normalized) return e.id;
  }
  for (const e of employees) {
    const full = normalizeName(e.full_name);
    if (full.includes(normalized) || normalized.includes(full)) return e.id;
  }
  const parts = normalized.split(" ").filter(Boolean);
  if (parts.length) {
    for (const e of employees) {
      const full = normalizeName(e.full_name);
      if (parts.every((p) => full.includes(p))) return e.id;
    }
  }
  return null;
}

/** Cherche un nom du roster dans le texte (titre/description). */
export function matchEmployeeIdInText(
  text: string | null | undefined,
  employees: VoiceEmployeeRef[],
): string | null {
  const hay = normalizeName(text || "");
  if (!hay || employees.length === 0) return null;

  type Hit = { score: number; id: string };
  const hits: Hit[] = [];
  for (const e of employees) {
    const full = normalizeName(e.full_name);
    if (!full) continue;
    if (hay.includes(full)) {
      hits.push({ score: full.length + 100, id: e.id });
      continue;
    }
    const first = full.split(" ")[0] || "";
    if (first.length >= 3) {
      const esc = first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      // Préfixes hébreu collés : ליוסי / לדנה
      const re = new RegExp(`(?:^|[\\s,.:;"'])(?:[לבמהוש])?${esc}(?:[\\s,.:;"']|$)`);
      if (re.test(hay)) hits.push({ score: first.length, id: e.id });
    }
  }
  if (!hits.length) return null;
  hits.sort((a, b) => b.score - a.score);
  const best = hits[0].score;
  const top = hits.filter((h) => h.score === best);
  if (top.length > 1) return null;
  return top[0].id;
}
