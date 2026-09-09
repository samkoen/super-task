const paths = new WeakMap<File, string>();

export function attachNativeMediaPath(file: File, path: string): File {
  if (path) paths.set(file, path);
  return file;
}

export function nativeMediaPath(file: File | null | undefined): string | undefined {
  return file ? paths.get(file) : undefined;
}
