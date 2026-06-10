#!/usr/bin/env python3
"""Generate phone screenshots for Google Play Store (1080x1920, 9:16)."""
from PIL import Image, ImageDraw, ImageFont
import os

W, H = 1080, 1920
BG = (18, 18, 18)
YELLOW = (255, 190, 0)
WHITE = (255, 255, 255)
GRAY = (80, 80, 80)
LGRAY = (200, 200, 200)

def get_fonts():
      bold_paths = ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                                      "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"]
      reg_paths = ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                   "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"]
      bold = next((p for p in bold_paths if os.path.exists(p)), None)
      reg = next((p for p in reg_paths if os.path.exists(p)), None)
      if bold:
                return (ImageFont.truetype(bold, 52), ImageFont.truetype(bold, 38),
                                        ImageFont.truetype(reg or bold, 28), ImageFont.truetype(reg or bold, 22))
            d = ImageFont.load_default()
    return d, d, d, d

def draw_logo(draw, cx, cy, fonts):
      r = 80
    draw.rounded_rectangle([cx-r, cy-r, cx+r, cy+r], radius=20, fill=YELLOW)
    draw.text((cx, cy-15), "d5", font=fonts[1], fill=BG, anchor="mm")
    draw.text((cx, cy+55), "coaching", font=fonts[3], fill=BG, anchor="mm")

def screen1(fonts):
      img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    cx = W // 2
    draw_logo(d, cx, 380, fonts)
    d.text((cx, 540), "D5 Coaching", font=fonts[0], fill=WHITE, anchor="mm")
    d.text((cx, 608), "Ton espace personnel", font=fonts[2], fill=GRAY, anchor="mm")
    d.text((200, 720), "Email", font=fonts[2], fill=LGRAY, anchor="lm")
    d.rounded_rectangle([160, 745, W-160, 830], radius=12, fill=(38,38,38), outline=(70,70,70), width=2)
    d.text((200, 787), "ton@email.com", font=fonts[2], fill=GRAY, anchor="lm")
    d.text((200, 878), "Mot de passe", font=fonts[2], fill=LGRAY, anchor="lm")
    d.rounded_rectangle([160, 903, W-160, 990], radius=12, fill=(38,38,38), outline=(70,70,70), width=2)
    d.text((200, 946), "............", font=fonts[2], fill=GRAY, anchor="lm")
    d.rounded_rectangle([160, 1060, W-160, 1160], radius=28, fill=YELLOW)
    d.text((cx, 1110), "Se connecter", font=fonts[1], fill=BG, anchor="mm")
    img.save("screenshot_1_login.png")
    print("screenshot_1_login.png OK")

def screen2(fonts):
      img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    cx = W // 2
    d.rectangle([0, 0, W, 150], fill=(22,22,22))
    draw_logo(d, 80, 75, fonts)
    d.text((190, 75), "D5 Coaching", font=fonts[1], fill=WHITE, anchor="lm")
    d.text((cx, 240), "Bonjour ! 👋", font=fonts[1], fill=WHITE, anchor="mm")
    d.text((cx, 300), "Votre prochain entrainement", font=fonts[2], fill=GRAY, anchor="mm")
    d.rounded_rectangle([80, 360, W-80, 580], radius=16, fill=(28,28,28), outline=YELLOW, width=2)
    d.text((150, 410), "Seance du jour", font=fonts[1], fill=YELLOW, anchor="lm")
    d.text((150, 468), "Musculation - Haut du corps", font=fonts[2], fill=WHITE, anchor="lm")
    d.text((150, 524), "45 min  -  12 exercices", font=fonts[3], fill=GRAY, anchor="lm")
    d.rounded_rectangle([80, 620, W-80, 840], radius=16, fill=(28,28,28))
    d.text((150, 668), "Progression", font=fonts[1], fill=WHITE, anchor="lm")
    d.rounded_rectangle([150, 736, W-150, 784], radius=8, fill=(50,50,50))
    d.rounded_rectangle([150, 736, 600, 784], radius=8, fill=YELLOW)
    d.text((150, 820), "Semaine 3 / 8", font=fonts[3], fill=LGRAY, anchor="lm")
    d.rounded_rectangle([80, 878, W-80, 1078], radius=16, fill=(28,28,28))
    d.text((150, 926), "Mes statistiques", font=fonts[1], fill=WHITE, anchor="lm")
    for val, label, x in [("24","Seances",270), ("12.4k","Calories",540), ("18","Jours",810)]:
              d.text((x, 1008), label, font=fonts[3], fill=GRAY, anchor="mm")
              d.text((x, 1055), val, font=fonts[0], fill=YELLOW, anchor="mm")
          img.save("screenshot_2_dashboard.png")
    print("screenshot_2_dashboard.png OK")

def screen3(fonts):
    img = Image.new("RGB", (W, H), BG)
      d = ImageDraw.Draw(img)
    cx = W // 2
    d.rectangle([0, 0, W, 150], fill=(22,22,22))
    d.text((cx, 75), "Mon Programme", font=fonts[1], fill=WHITE, anchor="mm")
    exercises = [
              ("Developpe couche","4 x 10","80 kg"),
              ("Tractions","3 x 8","Corps"),
              ("Epaules halteres","3 x 12","20 kg"),
              ("Rowing barre","4 x 10","60 kg"),
              ("Curl biceps","3 x 15","15 kg"),
    ]
    y = 200
    for i, (name, sets, weight) in enumerate(exercises):
              fc = (32,32,32) if i%2==0 else (26,26,26)
              d.rounded_rectangle([60, y, W-60, y+155], radius=12, fill=fc)
              d.rounded_rectangle([80, y+35, 158, y+118], radius=8, fill=YELLOW)
              d.text((119, y+76), str(i+1), font=fonts[1], fill=BG, anchor="mm")
              d.text((195, y+55), name, font=fonts[2], fill=WHITE, anchor="lm")
              d.text((195, y+100), sets, font=fonts[3], fill=GRAY, anchor="lm")
              d.text((W-90, y+76), weight, font=fonts[3], fill=YELLOW, anchor="rm")
              y += 175
          d.rounded_rectangle([160, H-260, W-160, H-140], radius=28, fill=YELLOW)
    d.text((cx, H-200), "Commencer la seance", font=fonts[1], fill=BG, anchor="mm")
    img.save("screenshot_3_workout.png")
    print("screenshot_3_workout.png OK")

fonts = get_fonts()
screen1(fonts)
screen2(fonts)
screen3(fonts)
print("All 3 screenshots generated!")
