"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Bell, X } from "lucide-react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    OneSignalDeferred?: Array<(oneSignal: any) => void>;
  }
}

const ONESIGNAL_APP_ID = "07b914dd-bf51-42bf-80ba-43548a8d93d0";
const DISMISSED_KEY = "d5:push:refuse";

/**
 * On n'utilise PAS l'invite intégrée de OneSignal (le « slidedown ») : son
 * texte vient de leur tableau de bord, arrive en anglais, et ressemble à une
 * inscription à une newsletter — les clients ne comprennent pas ce qu'ils
 * acceptent. On affiche donc notre propre carte, en français, qui explique à
 * quoi servent les notifications ; c'est seulement quand le client tape
 * « Activer » qu'on ouvre la vraie boîte de dialogue du système, elle-même
 * traduite par le téléphone.
 *
 * Ce détour n'est pas que cosmétique : le navigateur et iOS ne proposent la
 * permission qu'une seule fois. Un refus réflexe sur un message incompréhensible
 * est définitif, et se rattrape uniquement dans les réglages du téléphone.
 */
export function PushInit({ clientId }: { clientId: string }) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const askRef = useRef<(() => Promise<boolean>) | null>(null);

  useEffect(() => {
    let cancelled = false;

    const show = (ask: () => Promise<boolean>) => {
      if (cancelled) return;
      askRef.current = ask;
      setVisible(true);
    };

    if (Capacitor.isNativePlatform()) {
      initNative(clientId, show);
    } else {
      initWeb(clientId, show);
    }

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const accept = useCallback(async () => {
    if (!askRef.current) return;
    setBusy(true);
    try {
      const granted = await askRef.current();
      console.log("[PushInit] permission accordée:", granted);
      // Refus compris : on ne redemandera pas à chaque ouverture. Le système ne
      // rouvrirait de toute façon plus la boîte de dialogue.
      if (!granted) rememberDismissal();
    } catch (err) {
      console.error("[PushInit] demande de permission en échec", err);
    } finally {
      setBusy(false);
      setVisible(false);
    }
  }, []);

  const dismiss = useCallback(() => {
    rememberDismissal();
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    // Au-dessus de la barre de navigation (h-20 + safe area), jamais dessous.
    <div className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 px-4">
      <div className="mx-auto max-w-lg rounded-2xl border border-d5-border bg-d5-surface p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-d5-gold/15">
            <Bell className="h-5 w-5 text-d5-gold" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-d5-text">
              Rester prévenu par ton coach
            </p>
            <p className="mt-1 text-sm leading-snug text-d5-muted">
              Reçois une notification quand ton coach t&apos;envoie un message ou
              commente une séance. Rien d&apos;autre — aucune publicité.
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Fermer"
            className="-mr-1 -mt-1 rounded-lg p-1 text-d5-muted transition-colors hover:text-d5-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={accept}
            disabled={busy}
            className="flex-1 rounded-xl bg-d5-gold px-4 py-2.5 text-sm font-semibold text-d5-bg transition-colors hover:bg-d5-gold-light disabled:opacity-60"
          >
            {busy ? "…" : "Activer les notifications"}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-xl border border-d5-border px-4 py-2.5 text-sm font-medium text-d5-muted transition-colors hover:text-d5-text"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}

function rememberDismissal() {
  try {
    localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // Mode privé : tant pis, la carte reviendra à la prochaine session.
  }
}

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

type ShowPrompt = (ask: () => Promise<boolean>) => void;

/**
 * iOS et Android (app installée).
 *
 * L'import est dynamique et à l'intérieur de l'effet, jamais en haut du
 * fichier : le module écrit dans `window` dès son chargement, donc un import
 * statique casserait le rendu serveur et le build. Ici il ne s'exécute que dans
 * le navigateur embarqué, où `window` et le pont Cordova de Capacitor existent.
 */
async function initNative(clientId: string, show: ShowPrompt) {
  try {
    const { default: OneSignal } = await import("onesignal-cordova-plugin");

    OneSignal.initialize(ONESIGNAL_APP_ID);

    // Rattache l'appareil au client : c'est ce qui permet au serveur de cibler
    // une personne précise (include_aliases.external_id) plutôt qu'un appareil.
    OneSignal.login(clientId);

    if (OneSignal.Notifications.hasPermission()) return;
    if (wasDismissed()) return;

    // La boîte de dialogue système n'est ouverte qu'ici, depuis le bouton
    // « Activer », donc après l'explication — jamais au lancement.
    show(() => OneSignal.Notifications.requestPermission(true));
  } catch (err) {
    // Une app sans notifications reste utilisable : on n'interrompt rien.
    console.error("[PushInit] initialisation native en échec", err);
  }
}

/** Navigateur et PWA — SDK web chargé depuis le CDN OneSignal. */
function initWeb(clientId: string, show: ShowPrompt) {
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
        // Toutes les invites automatiques de OneSignal sont coupées : la nôtre
        // les remplace. Sans cela, les deux s'afficheraient l'une sur l'autre.
        autoResubscribe: true,
        promptOptions: {
          slidedown: { prompts: [{ type: "push", autoPrompt: false }] },
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
      if (permission) return;
      if (wasDismissed()) return;

      show(async () => {
        // requestPermission ne renvoie rien en v16 : on relit l'état après coup.
        await OneSignal.Notifications.requestPermission();
        return Boolean(OneSignal.Notifications.permission);
      });
    } catch (err) {
      console.error("[PushInit] initialisation web en échec", err);
    }
  });
}
