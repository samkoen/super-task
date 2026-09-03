import { mediaUrl } from "./mediaUrl";

export async function fetchMediaBlob(path: string): Promise<Blob> {
  const url = mediaUrl(path);
  if (!url) throw new Error("empty media path");
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) throw new Error(`media fetch failed: ${response.status}`);
  return response.blob();
}
