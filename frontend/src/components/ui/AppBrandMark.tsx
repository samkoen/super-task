import { he } from "../../i18n/he";

export const APP_ICON_SRC = "/super-man-app-icon.png";

type AppBrandMarkProps = {
  size?: number;
};

/** Icône de marque סופר-מן (login, sidebar, barre mobile). */
export default function AppBrandMark({ size = 40 }: AppBrandMarkProps) {
  return (
    <img
      src={APP_ICON_SRC}
      alt={he.appName}
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        display: "block",
        flexShrink: 0,
      }}
    />
  );
}
