/** Champs du formulaire « מודל חדש לגלריה ». */

export function galleryStartUrlForForm(startUrl: string | null | undefined): string {
  return startUrl ?? "";
}

export function galleryStartUrlPayload(startUrl: string | null | undefined): string | null {
  const cleaned = (startUrl ?? "").trim();
  return cleaned || null;
}
