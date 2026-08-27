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

    // Première chose remontée : ce que l'app croit être. Si `cordova.exec` est
    // absent, le plugin natif ne peut atteindre aucun code iOS, quoi qu'on
    // fasse ensuite — c'est le risque propre à une WKWebView qui charge une
    // page distante plutôt que des fichiers embarqués.
    const cordova = (window as unknown as { cordova?: { exec?: unknown } }).cordova;
    remoteLog("démarrage de PushInit", {
      platform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform(),
      hasCordova: Boolean(cordova),
      hasCordovaExec: typeof cordova?.exec,
      standalone: window.matchMedia?.("(display-mode: standalone)").matches ?? null,
    });

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
 * Envoie une ligne de diagnostic au serveur, qui la fait ressortir dans les
 * logs Vercel. Les logs de l'app iOS ne se lisent qu'avec un Mac ; c'est le
 * seul moyen d'observer ce qui se passe sur l'appareil sans en avoir un.
 *
 * Ne lève jamais et n'est jamais attendu : un diagnostic ne doit pas pouvoir
 * casser ce qu'il observe. `keepalive` pour que la requête survive si la page
 * est mise en arrière-plan juste après.
 *
 * Diagnostic temporaire : à retirer une fois les notifications réglées.
 */
function remoteLog(message: string, data?: unknown) {
  console.log(`[PushInit] ${message}`, data ?? "");
  try {
    void fetch("/api/debug/push-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        events: [{ message, data: data === undefined ? undefined : safeJson(data) }],
      }),
    }).catch(() => {});
  } catch {
    // Hors ligne, ou fetch indisponible : sans importance.
  }
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * iOS et Android (app installée).
 *
 * On n'utilise PAS le SDK OneSignal ici, et c'est un constat, pas un choix de
 * style : il n'existe que sous forme de plugin Cordova, et le pont Cordova ne
 * se monte pas dans une WKWebView qui charge une page distante. Mesuré sur
 * l'appareil : `window.cordova` existe (coquille posée par Capacitor) mais
 * `cordova.exec` est absent, donc le tout premier appel natif échouait avec
 * « window.cordova.exec is not a function ». Rien de ce qui suivait ne pouvait
 * fonctionner, et aucun abonnement n'était jamais créé.
 *
 * @capacitor/push-notifications passe par le pont Capacitor, lui bien présent —
 * c'est ce même pont qui fait que Capacitor.getPlatform() renvoie « ios ». Il
 * nous donne le jeton APNs, que le serveur enregistre ensuite auprès de
 * OneSignal.
 *
 * L'import reste dynamique et dans l'effet : ces modules touchent `window` au
 * chargement, un import statique casserait le rendu serveur.
 */
async function initNative(clientId: string, show: ShowPrompt) {
  const log = remoteLog;

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    log("plugin Capacitor importé", { register: typeof PushNotifications.register });

    // Les écouteurs sont posés AVANT register() : iOS peut délivrer le jeton
    // très vite, et un écouteur ajouté après l'aurait manqué.
    await PushNotifications.addListener("registration", (token) => {
      log("jeton push reçu", {
        platform: Capacitor.getPlatform(),
        token: `${token.value.slice(0, 12)}… (${token.value.length})`,
      });
      void registerDeviceToken(token.value, Capacitor.getPlatform());
    });

    await PushNotifications.addListener("registrationError", (err) => {
      // Ici on saura si iOS refuse l'enregistrement — typiquement un problème
      // d'entitlement ou de profil, et non plus de pont JS.
      log("le système a REFUSÉ l'enregistrement push", { error: String(err.error) });
    });

    const current = await PushNotifications.checkPermissions();
    log("permission actuelle", current.receive);

    if (current.receive === "granted") {
      await PushNotifications.register();
      log("register() appelé (permission déjà accordée)");
      return;
    }

    if (current.receive === "denied") {
      // iOS ne repropose jamais : seul un passage par les Réglages débloque.
      log("permission refusée sur cet appareil — Réglages requis");
      return;
    }

    if (wasDismissed()) {
      log("carte déjà écartée sur cet appareil — non réaffichée");
      return;
    }

    // La boîte de dialogue système n'est ouverte qu'ici, depuis le bouton
    // « Activer », donc après l'explication — jamais au lancement.
    show(async () => {
      const asked = await PushNotifications.requestPermissions();
      log("réponse à la demande de permission", asked.receive);
      if (asked.receive !== "granted") return false;
      // register() déclenche l'enregistrement APNs ; le jeton arrive ensuite
      // par l'écouteur « registration » posé plus haut.
      await PushNotifications.register();
      log("register() appelé après acceptation");
      return true;
    });
  } catch (err) {
    // Une app sans notifications reste utilisable : on n'interrompt rien.
    remoteLog("initialisation native EN ÉCHEC", {
      name: err instanceof Error ? err.name : typeof err,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Transmet le jeton au serveur, qui le rattache au client chez OneSignal.
 * L'appareil n'a ainsi jamais besoin de la clé REST.
 */
async function registerDeviceToken(token: string, platform: string) {
  try {
    const res = await fetch("/api/push/register-device", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, platform }),
    });
    const body = await res.json().catch(() => ({}));
    remoteLog("enregistrement du jeton auprès du serveur", {
      status: res.status,
      ...body,
    });
  } catch (err) {
    remoteLog("enregistrement du jeton IMPOSSIBLE", {
      message: err instanceof Error ? err.message : String(err),
    });
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
