"""Generate Android launcher mipmaps + web favicons from SuperShift icon."""
from pathlib import Path

from PIL import Image

SRC = Path(__file__).resolve().parents[1] / "public" / "supershift-app-icon.png"
RES = Path(__file__).resolve().parents[1] / "android" / "app" / "src" / "main" / "res"
PUBLIC = Path(__file__).resolve().parents[1] / "public"

LAUNCHER = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}
FOREGROUND = {
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}
BG = (11, 18, 32, 255)  # #0B1220


def resize_square(im: Image.Image, size: int) -> Image.Image:
    return im.resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    img = Image.open(SRC).convert("RGBA")

    for folder, size in LAUNCHER.items():
        out_dir = RES / folder
        out_dir.mkdir(parents=True, exist_ok=True)
        icon = resize_square(img, size)
        icon.save(out_dir / "ic_launcher.png", "PNG")
        icon.save(out_dir / "ic_launcher_round.png", "PNG")
        print(f"{folder}: launcher {size}x{size}")

    for folder, size in FOREGROUND.items():
        out_dir = RES / folder
        canvas = Image.new("RGBA", (size, size), BG)
        logo_size = int(size * 0.72)
        logo = resize_square(img, logo_size)
        offset = (size - logo_size) // 2
        canvas.paste(logo, (offset, offset), logo)
        canvas.save(out_dir / "ic_launcher_foreground.png", "PNG")
        print(f"{folder}: foreground {size}x{size}")

    resize_square(img, 64).save(PUBLIC / "favicon.png", "PNG")
    sizes = [(16, 16), (32, 32), (48, 48)]
    icons = [resize_square(img, s[0]) for s in sizes]
    icons[0].save(PUBLIC / "favicon.ico", format="ICO", sizes=sizes, append_images=icons[1:])
    resize_square(img, 180).save(PUBLIC / "apple-touch-icon.png", "PNG")
    print("web favicons written")


if __name__ == "__main__":
    main()
