"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    OneSignalDeferred?: Array<(oneSignal: any) => void>;
  }
}

export function PushInit({ clientId }: { clientId: string }) {
  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    if (!appId) return;

    const script = document.createElement("script");
    script.src =
      "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
    script.defer = true;
    document.head.appendChild(script);

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      await OneSignal.init({
        appId,
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

      // Link this browser/device to the client account for targeted notifications
      await OneSignal.login(clientId);
    });

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [clientId]);

  return null;
}
