#!/bin/bash
set -e

echo "Generating D5 Coaching app icons..."

# Install ImageMagick if needed
if ! command -v convert &>/dev/null; then
  echo "Installing ImageMagick..."
  brew install imagemagick
fi

mkdir -p resources

# Generate base 1024x1024 icon
# Dark background #0D0D0D + orange D5 text
convert -size 1024x1024 xc:"#0D0D0D" \
  -fill "#FF6A00" \
  -font "Helvetica" \
  -pointsize 520 \
  -gravity Center \
  -annotate 0 "D5" \
  resources/icon.png

# Add a subtle orange glow ring for a more polished look
convert resources/icon.png \
  \( -size 1024x1024 xc:none \
     -fill none \
     -stroke "#FF6A00" \
     -strokewidth 12 \
     -draw "roundrectangle 40,40,983,983,80,80" \) \
  -composite \
  resources/icon.png

echo "Base icon created: resources/icon.png"

# Generate splash screen (centered logo on dark bg)
convert -size 2732x2732 xc:"#0D0D0D" \
  -fill "#FF6A00" \
  -font "Helvetica" \
  -pointsize 600 \
  -gravity Center \
  -annotate 0 "D5" \
  resources/splash.png

echo "Splash created: resources/splash.png"

# Generate all iOS icon sizes using sips (built-in macOS)
ION_SRC="resources/icon.png"
ION_DIR="ios/App/App/Assets.xcassets/AppIcon.appiconset"
mkdir -p "$ION_DIR"

declare -a FILENAMES=("Icon-20.png" "Icon-20@2x.png" "Icon-20@3x.png" "Icon-29.png" "Icon-29@2x.png" "Icon-29@3x.png" "Icon-40.png" "Icon-40@2x.png" "Icon-40@3x.png" "Icon-60@2x.png" "Icon-60@3x.png" "Icon-76.png" "Icon-76@2x.png" "Icon-83.5@2x.png" "Icon-1024.png")
declare -a PIXELS=(20 40 60 29 58 87 40 80 120 120 180 76 152 167 1024)

for i in "${!FILENAMES[@]}"; do
  fname="${FILENAMES[$i]}"
  px="${PIXELS[$i]}"
  sips -z $px $px "$ION_SRC" --out "$ION_DIR/$fname" > /dev/null 2>&1
  echo "  $fname (${px}x${px})"
done

# Write Contents.json
cat > "$ION_DIR/Contents.json" << 'EOF'
{
  "images": [
    {"idiom": "iphone", "scale": "2x", "size": "20x20",   "filename": "Icon-20@2x.png"},
    {"idiom": "iphone", "scale": "3x", "size": "20x20",   "filename": "Icon-20@3x.png"},
    {"idiom": "iphone", "scale": "2x", "size": "29x29",   "filename": "Icon-29@2x.png"},
    {"idiom": "iphone", "scale": "3x", "size": "29x29",   "filename": "Icon-29@3x.png"},
    {"idiom": "iphone", "scale": "2x", "size": "40x40",   "filename": "Icon-40@2x.png"},
    {"idiom": "iphone", "scale": "3x", "size": "40x40",   "filename": "Icon-40@3x.png"},
    {"idiom": "iphone", "scale": "2x", "size": "60x60",   "filename": "Icon-60@2x.png"},
    {"idiom": "iphone", "scale": "3x", "size": "60x60",   "filename": "Icon-60@3x.png"},
    {"idiom": "ipad",   "scale": "1x", "size": "20x20",   "filename": "Icon-20.png"},
    {"idiom": "ipad",   "scale": "2x", "size": "20x20",   "filename": "Icon-20@2x.png"},
    {"idiom": "ipad",   "scale": "1x", "size": "29x29",   "filename": "Icon-29.png"},
    {"idiom": "ipad",   "scale": "2x", "size": "29x29",   "filename": "Icon-29@2x.png"},
    {"idiom": "ipad",   "scale": "1x", "size": "40x40",   "filename": "Icon-40.png"},
    {"idiom": "ipad",   "scale": "2x", "size": "40x40",   "filename": "Icon-40@2x.png"},
    {"idiom": "ipad",   "scale": "1x", "size": "76x76",   "filename": "Icon-76.png"},
    {"idiom": "ipad",   "scale": "2x", "size": "76x76",   "filename": "Icon-76@2x.png"},
    {"idiom": "ipad",   "scale": "2x", "size": "83.5x83.5","filename": "Icon-83.5@2x.png"},
    {"idiom": "ios-marketing", "scale": "1x", "size": "1024x1024", "filename": "Icon-1024.png"}
  ],
  "info": {"version": 1, "author": "xcode"}
}
EOF

echo "✅ All icons generated in $ION_DIR"
