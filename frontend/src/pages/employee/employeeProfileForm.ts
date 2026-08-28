import type { EmployeeLanguage } from "../domain/employeeLanguages";

export type EmployeeProfileForm = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  preferred_language: EmployeeLanguage;
};

export function employeeProfileFormFromUser(user: {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  preferred_language?: EmployeeLanguage;
}): EmployeeProfileForm {
  return {
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    phone: user.phone ?? "",
    preferred_language: (user.preferred_language ?? "he") as EmployeeLanguage,
  };
}
