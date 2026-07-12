export type EmployeeLanguage = "he" | "ar" | "th" | "fr" | "en";

export const EMPLOYEE_LANGUAGES: EmployeeLanguage[] = ["he", "ar", "th", "fr", "en"];

export const EMPLOYEE_LANGUAGE_LABELS: Record<EmployeeLanguage, string> = {
  he: "עברית",
  ar: "ערבית",
  th: "תאילנדית",
  fr: "צרפתית",
  en: "אנגלית",
};

export function employeeLanguageLabel(language: EmployeeLanguage | string | null | undefined): string {
  const code = (language || "he") as EmployeeLanguage;
  return EMPLOYEE_LANGUAGE_LABELS[code] ?? EMPLOYEE_LANGUAGE_LABELS.he;
}

export const SPEECH_LOCALES: Record<EmployeeLanguage, string> = {
  he: "he-IL",
  ar: "ar-SA",
  th: "th-TH",
  fr: "fr-FR",
  en: "en-US",
};
