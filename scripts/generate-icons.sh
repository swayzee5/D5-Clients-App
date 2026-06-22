#!/bin/bash
# Genere toutes les tailles iOS a partir de resources/icon.png (commite dans le repo)
# Utilise sips (built-in macOS) — aucune dependance externe
set -e

ICON_SRC="resources/icon.png"

if [ ! -f "$ICON_SRC" ]; then
  echo "ERROR: $ICON_SRC not found. Push your logo PNG to the repo first."
  echo "Run: gh api repos/swayzee5/D5-Clients-App/contents/resources/icon.png --method PUT ..."
  exit 1
fi

echo "Source icon found: $ICON_SRC"
file "$ICON_SRC"

ION_DIR="ios/App/App/Assets.xcassets/AppIcon.appiconset"
mkdir -p "$ION_DIR"

# Toutes les tailles requises par Apple
declare -a NAMES=(
  "Icon-20.png"      "Icon-20@2x.png"   "Icon-20@3x.png"
  "Icon-29.png"      "Icon-29@2x.png"   "Icon-29@3x.png"
  "Icon-40.png"      "Icon-40@2x.png"   "Icon-40@3x.png"
  "Icon-60@2x.png"   "Icon-60@3x.png"
  "Icon-76.png"      "Icon-76@2x.png"
  "Icon-83.5@2x.png" "Icon-1024.png"
)
declare -a SIZES=(
  20  40  60
  29  58  87
  40  80  120
  120 180
  76  152
  167 1024
)

for i in "${!NAMES[@]}"; do
  name="${NAMES[$i]}"
  size="${SIZES[$i]}"
  sips -z $size $size "$ICON_SRC" --out "$ION_DIR/$name" > /dev/null
  echo "  Generated $name (${size}x${size})"
done

# Contents.json
cat > "$ION_DIR/Contents.json" << 'JSON'
{
  "images": [
    {"idiom":"iphone",  "scale":"2x", "size":"20x20",    "filename":"Icon-20@2x.png"},
    {"idiom":"iphone",  "scale":"3x", "size":"20x20",    "filename":"Icon-20@3x.png"},
    {"idiom":"iphone",  "scale":"2x", "size":"29x29",    "filename":"Icon-29@2x.png"},
    {"idiom":"iphone",  "scale":"3x", "size":"29x29",    "filename":"Icon-29@3x.png"},
    {"idiom":"iphone",  "scale":"2x", "size":"40x40",    "filename":"Icon-40@2x.png"},
    {"idiom":"iphone",  "scale":"3x", "size":"40x40",    "filename":"Icon-40@3x.png"},
    {"idiom":"iphone",  "scale":"2x", "size":"60x60",    "filename":"Icon-60@2x.png"},
    {"idiom":"iphone",  "scale":"3x", "size":"60x60",    "filename":"Icon-60@3x.png"},
    {"idiom":"ipad",    "scale":"1x", "size":"20x20",    "filename":"Icon-20.png"},
    {"idiom":"ipad",    "scale":"2x", "size":"20x20",    "filename":"Icon-20@2x.png"},
    {"idiom":"ipad",    "scale":"1x", "size":"29x29",    "filename":"Icon-29.png"},
    {"idiom":"ipad",    "scale":"2x", "size":"29x29",    "filename":"Icon-29@2x.png"},
    {"idiom":"ipad",    "scale":"1x", "size":"40x40",    "filename":"Icon-40.png"},
    {"idiom":"ipad",    "scale":"2x", "size":"40x40",    "filename":"Icon-40@2x.png"},
    {"idiom":"ipad",    "scale":"1x", "size":"76x76",    "filename":"Icon-76.png"},
    {"idiom":"ipad",    "scale":"2x", "size":"76x76",    "filename":"Icon-76@2x.png"},
    {"idiom":"ipad",    "scale":"2x", "size":"83.5x83.5","filename":"Icon-83.5@2x.png"},
    {"idiom":"ios-marketing","scale":"1x","size":"1024x1024","filename":"Icon-1024.png"}
  ],
  "info":{"version":1,"author":"xcode"}
}
JSON

echo ""
echo "✅ All iOS icons generated from $ICON_SRC"
echo "   Directory: $ION_DIR"
