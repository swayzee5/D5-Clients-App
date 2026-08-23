"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    OneSignalDeferred?: Array<(oneSignal: any) => void>;
  }
}

const ONESIGNAL_APP_ID = "07b914dd-bf51-42bf-80ba-43548a8d93d0";

export function PushInit({ clientId }: { clientId: string }) {
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      initNative(clientId);
    } else {
      initWeb(clientId);
    }
  }, [clientId]);

  return null;
}

/**
 * iOS et Android (app installée).
 *
 * L'import est dynamique et à l'intérieur de l'effet, jamais en haut du
 * fichier : le module écrit dans `window` dès son chargement, donc un import
 * statique casserait le rendu serveur et le build. Ici il ne s'exécute que dans
 * le navigateur embarqué, où `window` et le pont Cordova de Capacitor existent.
 */
async function initNative(clientId: string) {
  try {
    const { default: OneSignal } = await import("onesignal-cordova-plugin");

    OneSignal.initialize(ONESIGNAL_APP_ID);

    // Rattache l'appareil au client : c'est ce qui permet au serveur de cibler
    // une personne précise (include_aliases.external_id) plutôt qu'un appareil.
    OneSignal.login(clientId);

    // true = afficher la boîte de dialogue système si la permission n'a pas
    // encore été demandée. iOS ne la propose qu'une fois : si le client refuse,
    // il devra passer par les Réglages, d'où l'intérêt de ne pas la déclencher
    // au tout premier lancement une fois qu'on aura un écran d'explication.
    const accepted = await OneSignal.Notifications.requestPermission(true);
    console.log("[PushInit] permission notifications:", accepted);
  } catch (err) {
    // Une app sans notifications reste utilisable : on n'interrompt rien.
    console.error("[PushInit] initialisation native en échec", err);
  }
}

/** Navigateur et PWA — SDK web chargé depuis le CDN OneSignal. */
function initWeb(clientId: string) {
  const webAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  if (!webAppId) {
    // Sans ce log, une variable oubliée au build ne produit rien du tout :
    // pas d'invite, pas d'erreur, rien à quoi se raccrocher.
    console.warn(
      "[PushInit] NEXT_PUBLIC_ONESIGNAL_APP_ID absente — notifications web désactivées. " +
        "Cette variable est injectée au build : ajoutez-la dans Vercel puis redéployez."
    );
    return;
  }

  const script = document.createElement("script");
  script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
  script.defer = true;
  script.onerror = () => console.error("[PushInit] SDK OneSignal injoignable");
  document.head.appendChild(script);

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  window.OneSignalDeferred.push(async (OneSignal: any) => {
    try {
      await OneSignal.init({
        appId: webAppId,
        notifyButton: { enable: false },
        promptOptions: {
          slidedown: {
            prompts: [
              {
                type: "push",
                autoPrompt: true,
                text: {
                  actionMessage:
                    "Restez informé des messages de votre coach et de vos progrès.",
                  acceptButton: "Accepter",
                  cancelButton: "Non merci",
                },
                // pageViews compte les CHARGEMENTS de page, pas les navigations.
                // Next navigue côté client : le compteur restait à 1 et l'invite
                // ne se déclenchait jamais, quel que soit le nombre d'écrans vus.
                delay: { pageViews: 1, timeDelay: 5 },
              },
            ],
          },
        },
      });

      await OneSignal.login(clientId);

      const permission = OneSignal.Notifications.permission;
      const supported = OneSignal.Notifications.isPushSupported();
      console.log("[PushInit] web prêt", { supported, permission });

      if (!supported) {
        // Cas courant : Safari iOS hors écran d'accueil, ou navigateur ancien.
        console.warn(
          "[PushInit] ce navigateur ne gère pas les notifications web. " +
            "Sur iPhone, le site doit être ajouté à l'écran d'accueil."
        );
        return;
      }

      // Si l'invite automatique n'a pas eu lieu — conditions non remplies,
      // invite déjà refusée dans la session — on la propose explicitement.
      if (!permission) {
        setTimeout(() => {
          OneSignal.Slidedown.promptPush().catch((err: unknown) =>
            console.error("[PushInit] invite impossible", err)
          );
        }, 5000);
      }
    } catch (err) {
      console.error("[PushInit] initialisation web en échec", err);
    }
  });
}
