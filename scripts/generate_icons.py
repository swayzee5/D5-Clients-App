import urllib.request, os, io
from PIL import Image

logo_url = "https://raw.githubusercontent.com/swayzee5/D5-Clients-App/claude/android-twa/Logo%20D5%20App.jpeg"
print(f"Downloading logo from {logo_url}...")
with urllib.request.urlopen(logo_url) as r:
    logo_data = r.read()
print(f"Downloaded {len(logo_data)} bytes")

img = Image.open(io.BytesIO(logo_data)).convert("RGBA")
w, h = img.size
print(f"Original size: {w}x{h}")
s = min(w, h)
img = img.crop(((w-s)//2, (h-s)//2, (w+s)//2, (h+s)//2))

sizes = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
for dpi, size in sizes.items():
    d = f'android/app/src/main/res/mipmap-{dpi}'
    os.makedirs(d, exist_ok=True)
    resized = img.resize((size, size), Image.LANCZOS).convert("RGB")
    resized.save(f'{d}/ic_launcher.png', 'PNG')
    resized.save(f'{d}/ic_launcher_round.png', 'PNG')
    print(f'Generated {size}x{size} icon for {dpi}')

print('Real D5 logo icons generated successfully')
