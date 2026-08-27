#!/usr/bin/env python3
"""Configure le projet Android généré par Capacitor.

Comme pour iOS, le dossier android/ n'est pas versionné : il est régénéré à
chaque run par `npx cap add android`. Toute modification faite à la main serait
perdue. Ce script réapplique donc ce qui doit survivre d'un build à l'autre.

Quatre choses, dont deux sont critiques pour le Play Store :

1. L'applicationId. Capacitor le prend depuis capacitor.config.ts, qui porte
   l'identifiant iOS (com.dayekaba.d5coaching). L'app Android est publiée sous
   com.d5coaching.clients ; changer cet identifiant en ferait une application
   différente aux yeux du Play Store, et les installations existantes — celle de
   Jérôme comprise — ne pourraient plus être mises à jour.

2. La signature. Le Play Store exige que chaque mise à jour soit signée avec la
   même clé que la version publiée. Le keystore vient d'un secret CI, jamais du
   dépôt, et les mots de passe ne sont plus écrits en dur comme avant.

3. versionCode, qui doit être strictement croissant à chaque envoi.

4. POST_NOTIFICATIONS, sans quoi Android 13+ n'affiche jamais la demande de
   permission — l'app resterait silencieuse sans la moindre erreur.

Échoue bruyamment si un motif attendu est absent : un patch qui ne s'applique
pas produirait un build valide mais faux, ce qui est bien pire qu'un échec.
"""

import json
import os
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP_GRADLE = ROOT / "android/app/build.gradle"
MANIFEST = ROOT / "android/app/src/main/AndroidManifest.xml"
RES = ROOT / "android/app/src/main/res"
ICON_SOURCE = ROOT / "resources/icon.png"

APPLICATION_ID = "com.d5coaching.clients"

SIGNING_CONFIG = """
    signingConfigs {
        release {
            storeFile file(System.getenv("ANDROID_KEYSTORE_PATH") ?: "keystore.jks")
            storePassword System.getenv("STORE_PASSWORD")
            // L'alias n'est pas un secret, c'est un nom. Le laisser sans repli
            // donnait un alias vide et « No key with alias '' found in
            // keystore » : le secret KEY_ALIAS n'a jamais existé, l'ancien
            // build.gradle s'appuyait sur ce même repli. Les mots de passe,
            // eux, restent exclusivement dans les secrets.
            keyAlias System.getenv("KEY_ALIAS") ?: "d5coaching"
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }
"""


def fail(message):
    sys.exit(f"configure-android: {message}")


def patch_app_gradle():
    if not APP_GRADLE.exists():
        fail(f"introuvable : {APP_GRADLE}")

    text = APP_GRADLE.read_text()

    text, n = re.subn(
        r'applicationId "[^"]+"', f'applicationId "{APPLICATION_ID}"', text, count=1
    )
    if n != 1:
        fail("applicationId introuvable dans app/build.gradle")
    print(f"applicationId -> {APPLICATION_ID}")

    # Doit croître à chaque envoi au Play Store. Fourni par la CI (numéro de run),
    # qui est monotone ; l'ancienne app maison était à 7, on part largement
    # au-dessus.
    version_code = os.environ.get("ANDROID_VERSION_CODE")
    if not version_code or not version_code.isdigit():
        fail("ANDROID_VERSION_CODE manquant ou non numérique")
    text, n = re.subn(r"versionCode \d+", f"versionCode {version_code}", text, count=1)
    if n != 1:
        fail("versionCode introuvable")

    version_name = json.loads((ROOT / "package.json").read_text())["version"]
    text, n = re.subn(r'versionName "[^"]+"', f'versionName "{version_name}"', text, count=1)
    if n != 1:
        fail("versionName introuvable")
    print(f"version {version_name} ({version_code})")

    if "signingConfigs" not in text:
        text, n = re.subn(r"\nandroid \{\n", "\nandroid {\n" + SIGNING_CONFIG, text, count=1)
        if n != 1:
            fail("bloc android { introuvable")
        text, n = re.subn(
            r"(release \{\n\s+minifyEnabled false)",
            r"\1\n            signingConfig signingConfigs.release",
            text,
            count=1,
        )
        if n != 1:
            fail("bloc release introuvable")
        print("signature release configurée")

    APP_GRADLE.write_text(text)


def patch_manifest():
    if not MANIFEST.exists():
        fail(f"introuvable : {MANIFEST}")

    text = MANIFEST.read_text()
    if "POST_NOTIFICATIONS" in text:
        return

    permission = '    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />\n'
    text, n = re.subn(
        r'(    <uses-permission android:name="android\.permission\.INTERNET" />\n)',
        r"\1" + permission,
        text,
        count=1,
    )
    if n != 1:
        fail("permission INTERNET introuvable dans le manifeste")
    MANIFEST.write_text(text)
    print("POST_NOTIFICATIONS ajoutée au manifeste")


def generate_icons():
    """Icônes de lancement à partir du vrai logo D5.

    L'ancien workflow dessinait « d5 coaching » au trait avec une police
    système, faute d'avoir la source sous la main. Elle est là maintenant.
    """
    if not ICON_SOURCE.exists():
        print(f"icône source absente ({ICON_SOURCE}) — icônes inchangées")
        return

    try:
        from PIL import Image
    except ImportError:
        fail("Pillow requis pour générer les icônes")

    source = Image.open(ICON_SOURCE).convert("RGBA")
    for density, size in {
        "mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192
    }.items():
        target = RES / f"mipmap-{density}"
        target.mkdir(parents=True, exist_ok=True)
        icon = source.resize((size, size), Image.LANCZOS)
        flat = Image.new("RGB", (size, size), (13, 13, 13))
        flat.paste(icon, mask=icon.split()[3])
        flat.save(target / "ic_launcher.png")
        flat.save(target / "ic_launcher_round.png")

    # Les icônes adaptatives (API 26+) l'emportent sur les PNG et pointent vers
    # les drawables du template Capacitor. On les retire pour que le lanceur
    # utilise le logo qu'on vient de générer.
    adaptive = RES / "mipmap-anydpi-v26"
    if adaptive.exists():
        shutil.rmtree(adaptive)

    print("icônes de lancement générées depuis resources/icon.png")


if __name__ == "__main__":
    patch_app_gradle()
    patch_manifest()
    generate_icons()
    print("Configuration Android terminée.")
