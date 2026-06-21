import json
import subprocess
import os
import sys

icon_src = "resources/icon.png"
iconset = "ios/App/App/Assets.xcassets/AppIcon.appiconset"
contents_path = os.path.join(iconset, "Contents.json")

if not os.path.isfile(icon_src):
    print(f"ERROR: {icon_src} not found!", file=sys.stderr)
    sys.exit(1)

if not os.path.isfile(contents_path):
    print(f"ERROR: {contents_path} not found!", file=sys.stderr)
    sys.exit(1)

print("=== Contents.json ===")
with open(contents_path) as f:
    raw = f.read()
print(raw)
contents = json.loads(raw)

print("=== Injecting icons ===")
errors = []
done = set()
for image in contents.get("images", []):
    filename = image.get("filename")
    if not filename or filename in done:
        continue
    done.add(filename)
    size_str = image.get("size", "")
    scale_str = image.get("scale", "1x")
    if not size_str:
        continue
    try:
        base_size = float(size_str.split("x")[0])
        scale = int(scale_str.replace("x", ""))
        pixel_size = int(base_size * scale)
    except Exception as e:
        print(f"SKIP: {filename} - {e}")
        continue
    out_path = os.path.join(iconset, filename)
    result = subprocess.run(
        ["sips", "-z", str(pixel_size), str(pixel_size), icon_src, "--out", out_path],
        capture_output=True, text=True
    )
    if result.returncode == 0:
        print(f"OK: {filename} ({pixel_size}x{pixel_size}px)")
    else:
        errors.append(f"FAIL: {filename} - {result.stderr.strip()}")

if errors:
    for e in errors:
        print(e, file=sys.stderr)
    sys.exit(1)
else:
    print(f"SUCCESS: {len(done)} icons injected with correct filenames!")
