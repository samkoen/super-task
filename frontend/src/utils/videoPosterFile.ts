import { dataUrlToFile } from "./photoAnnotation";
import { captureVideoPoster } from "./videoPoster";

export async function posterFileFromVideoSrc(src: string): Promise<File | null> {
  if (!src) return null;
  const dataUrl = await captureVideoPoster(src);
  if (!dataUrl) return null;
  return dataUrlToFile(dataUrl, "poster.jpg");
}
