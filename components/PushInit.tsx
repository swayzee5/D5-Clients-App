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
      // Native iOS / Android — use the Capacitor plugin
      initNative(clientId);
    } else {
      // Browser / PWA — use the OneSignal Web SDK
      initWeb(clientId);
    }
  }, [clientId]);

  return null;
}

async function initNative(clientId: string) {
  try {
    const { default: OneSignal } = await import("onesignal-capacitor");
    OneSignal.initialize(ONESIGNAL_APP_ID);

    // Link this device to the client’s account for targeted notifications
    await OneSignal.login(clientId);

    // Ask for permission — only shown once by iOS
    await OneSignal.Notifications.requestPermission(true);
  } catch (err) {
    console.error("[PushInit native]", err);
  }
}

function initWeb(clientId: string) {
  const webAppId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  if (!webAppId) return;

  const script = document.createElement("script");
  script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
  script.defer = true;
  document.head.appendChild(script);

  window.OneSignalDeferred = window.OneSignalDeferred || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  window.OneSignalDeferred.push(async (OneSignal: any) => {
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
              delay: { pageViews: 2, timeDelay: 8 },
            },
          ],
        },
      },
    });
    await OneSignal.login(clientId);
  });
}
