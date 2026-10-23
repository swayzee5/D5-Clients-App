#!/usr/bin/env ruby
# frozen_string_literal: true

# Configure le projet iOS : notifications push, et declarations d'usage des
# capteurs sans lesquelles iOS tue l'application.
#
# Pourquoi un script plutôt qu'un réglage fait une fois dans Xcode : le dossier
# ios/ n'est pas versionné, il est régénéré à chaque run par `npx cap add ios`.
# Toute modification manuelle serait perdue au build suivant.
#
# Deux choses manquent au projet généré par Capacitor :
#
#   1. Un fichier d'entitlements. Le template Capacitor n'en contient aucun, et
#      sans `aps-environment` iOS refuse d'enregistrer l'app auprès d'APNs :
#      la demande de permission s'affiche, le client accepte, et rien n'arrive
#      jamais — aucun jeton n'est délivré, donc aucun abonné côté OneSignal.
#
#   2. UIBackgroundModes / remote-notification dans Info.plist. `npx cap sync`
#      l'écrit d'ailleurs en toutes lettres dans ses logs :
#      « Configuration required for onesignal-cordova-plugin ».
#
# Le script est idempotent : le relancer sur un projet déjà configuré ne change
# rien.

require "xcodeproj"
require "fileutils"

ROOT = File.expand_path("..", __dir__)
PROJECT_PATH = File.join(ROOT, "ios/App/App.xcodeproj")
APP_DIR = File.join(ROOT, "ios/App/App")
SOURCE_ENTITLEMENTS = File.join(ROOT, "ios-config/App.entitlements")
TARGET_ENTITLEMENTS = File.join(APP_DIR, "App.entitlements")
INFO_PLIST = File.join(APP_DIR, "Info.plist")

# Chemin tel que Xcode l'attend : relatif au dossier du .xcodeproj (ios/App).
ENTITLEMENTS_BUILD_SETTING = "App/App.entitlements"

abort "Projet introuvable : #{PROJECT_PATH}" unless Dir.exist?(PROJECT_PATH)
abort "Entitlements source introuvable : #{SOURCE_ENTITLEMENTS}" unless File.exist?(SOURCE_ENTITLEMENTS)

FileUtils.cp(SOURCE_ENTITLEMENTS, TARGET_ENTITLEMENTS)
puts "Entitlements copiés -> #{TARGET_ENTITLEMENTS}"

project = Xcodeproj::Project.open(PROJECT_PATH)
target = project.targets.find { |t| t.name == "App" }
abort "Cible \"App\" introuvable dans le projet" if target.nil?

app_group = project.main_group.find_subpath("App", true)
unless app_group.files.any? { |f| f.path == "App.entitlements" }
  app_group.new_reference("App.entitlements")
  puts "Référence App.entitlements ajoutée au projet"
end

target.build_configurations.each do |config|
  config.build_settings["CODE_SIGN_ENTITLEMENTS"] = ENTITLEMENTS_BUILD_SETTING
  puts "CODE_SIGN_ENTITLEMENTS defini pour la configuration #{config.name}"
end

project.save

# Info.plist : ajouter remote-notification sans écraser d'éventuels autres modes.
plist = Xcodeproj::Plist.read_from_path(INFO_PLIST)
dirty = false

modes = plist["UIBackgroundModes"] || []
unless modes.include?("remote-notification")
  modes << "remote-notification"
  plist["UIBackgroundModes"] = modes
  dirty = true
  puts "UIBackgroundModes/remote-notification ajoute a Info.plist"
end

# Sans cette cle, chaque build arrive sur TestFlight en "Missing Compliance" et
# reste indistribuable tant qu'un humain n'a pas repondu a la question sur le
# chiffrement dans App Store Connect. Un blocage silencieux de plus : le build
# est vert, l'upload reussit, et le testeur ne voit rien arriver.
#
# La declaration est "false" parce que l'app n'utilise que HTTPS fourni par le
# systeme, ce qui releve de l'exemption standard. Si un jour du chiffrement
# proprietaire est ajoute, cette valeur devra etre revue — c'est une
# declaration legale faite au nom du compte developpeur.
# Declarations d'usage de l'appareil photo et de la photothèque.
#
# Sans elles, iOS ne refuse pas poliment : il TUE l'application a l'instant ou
# le selecteur photo s'ouvre. Du point de vue du client, l'app "crashe" quand
# il appuie sur « Photographier mon repas » — rien dans l'ecran ne permet de
# le deviner, et aucun message n'est affiche.
#
# Trois fonctions en dependent : le journal de repas, les photos de
# progression, et la video de rotation. Le micro est declare parce qu'une
# capture video enregistre le son, meme quand on ne s'en sert pas.
#
# Ces textes sont montres tels quels dans la demande de permission, donc ils
# disent a quoi ca sert, pas qu'on en a besoin.
USAGES = {
  "NSCameraUsageDescription" =>
    "Pour photographier tes repas et tes photos de progression, et filmer ta video de rotation.",
  "NSPhotoLibraryUsageDescription" =>
    "Pour choisir une photo deja prise plutot que d'en reprendre une.",
  "NSMicrophoneUsageDescription" =>
    "Le son est enregistre avec ta video de progression. Il n'est jamais ecoute separement."
}.freeze

USAGES.each do |key, texte|
  next unless plist[key].nil? || plist[key].to_s.strip.empty?

  plist[key] = texte
  dirty = true
  puts "#{key} ajoute a Info.plist"
end

if plist["ITSAppUsesNonExemptEncryption"].nil?
  plist["ITSAppUsesNonExemptEncryption"] = false
  dirty = true
  puts "ITSAppUsesNonExemptEncryption=false ajoute a Info.plist"
end

Xcodeproj::Plist.write_to_path(plist, INFO_PLIST) if dirty

puts "Configuration push iOS terminee."
