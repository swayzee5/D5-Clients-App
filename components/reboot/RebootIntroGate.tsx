"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmIntroWatched } from "@/app/(dashboard)/reboot/intro-actions";

const COACH_EMAIL = "d5fitnesstraining@gmail.com";

/**
 * La vidéo d'explication, à voir en entier avant d'accéder au challenge.
 *
 * Rendue à la place du tableau de bord, comme le diagnostic : rien d'autre
 * n'est monté, donc rien d'autre n'est atteignable, ni par la navigation ni au
 * clavier.
 *
 * « En entier » est vérifié par le lecteur Vimeo lui-même, pas par une case à
 * cocher. Deux garde-fous : la fin de la vidéo doit être atteinte, et un saut
 * en avant ramène à l'endroit le plus loin réellement regardé. Reculer reste
 * libre — réécouter un passage est exactement ce qu'on veut encourager.
 *
 * Une sortie de secours existe malgré tout, et c'est délibéré. Une vidéo qui
 * ne se lance pas — réseau, lecteur bloqué, appareil ancien — enfermerait le
 * participant dehors sans recours, et il ne se plaindrait pas, il
 * abandonnerait. Elle n'apparaît qu'après un échec constaté, et le coach sait
 * qui l'a utilisée pour lui envoyer la vidéo en privé.
 */

type PlayerVimeo = {
  on: (evt: string, cb: (data: { seconds: number; duration: number }) => void) => void;
  getCurrentTime: () => Promise<number>;
  setCurrentTime: (s: number) => Promise<number>;
  getVideoWidth: () => Promise<number>;
  getVideoHeight: () => Promise<number>;
  ready: () => Promise<void>;
};

declare global {
  interface Window {
    Vimeo?: { Player: new (el: HTMLElement | HTMLIFrameElement) => PlayerVimeo };
  }
}

/** Au-delà de ce saut en avant, on considère que la vidéo a été passée. */
const TOLERANCE_SAUT = 3;

/**
 * Format du cadre avant que le lecteur ait répondu.
 *
 * 9/16 plutôt que 16/9 : la vidéo est tournée au téléphone, et une erreur de
 * cadrage dans ce sens laisse des bandes noires en haut et en bas d'une vidéo
 * horizontale, ce qui se remarque à peine. L'erreur inverse réduit une vidéo
 * verticale à un timbre-poste au milieu de l'écran.
 */
const FORMAT_PAR_DEFAUT = 9 / 16;

export function RebootIntroGate({ videoId, firstName }: { videoId: string; firstName?: string | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const vuJusqua = useRef(0);
  const [progression, setProgression] = useState(0);
  const [terminee, setTerminee] = useState(false);
  const [panne, setPanne] = useState(false);
  // Le format réel de la vidéo, demandé au lecteur. Codé en dur, il obligerait
  // à repasser ici à chaque fois que le coach remplace la vidéo.
  const [format, setFormat] = useState(FORMAT_PAR_DEFAUT);

  useEffect(() => {
    let annule = false;

    // Si le lecteur n'a pas démarré au bout de 25 secondes, c'est qu'il ne
    // démarrera pas. On propose alors la sortie de secours plutôt que de
    // laisser quelqu'un devant un rectangle noir.
    const minuterie = setTimeout(() => {
      if (!annule && vuJusqua.current === 0) setPanne(true);
    }, 25000);

    const script = document.createElement("script");
    script.src = "https://player.vimeo.com/api/player.js";
    script.async = true;
    script.onerror = () => { if (!annule) setPanne(true); };
    script.onload = () => {
      if (annule || !iframeRef.current || !window.Vimeo) return;
      const player = new window.Vimeo.Player(iframeRef.current);

      // Le cadre suit la vidéo, pas l'inverse : une vidéo tournée au téléphone
      // doit remplir l'écran comme n'importe quelle vidéo verticale, et une
      // vidéo horizontale doit rester horizontale. Un échec ici laisse le
      // format par défaut, qui est le cas courant.
      void player
        .ready()
        .then(() => Promise.all([player.getVideoWidth(), player.getVideoHeight()]))
        .then(([largeur, hauteur]) => {
          if (!annule && largeur > 0 && hauteur > 0) setFormat(largeur / hauteur);
        })
        .catch(() => {});

      player.on("timeupdate", ({ seconds, duration }) => {
        if (seconds > vuJusqua.current) vuJusqua.current = seconds;
        if (duration > 0) setProgression(Math.min(100, Math.round((vuJusqua.current / duration) * 100)));
      });

      player.on("seeked", ({ seconds }) => {
        // Sauter en avant ne compte pas. Revenir en arrière, si.
        if (seconds > vuJusqua.current + TOLERANCE_SAUT) {
          void player.setCurrentTime(vuJusqua.current);
        }
      });

      player.on("ended", () => setTerminee(true));
      player.on("error" as "ended", () => setPanne(true));
    };
    document.body.appendChild(script);

    return () => {
      annule = true;
      clearTimeout(minuterie);
      script.remove();
    };
  }, []);

  function continuer(methode: "video" | "secours") {
    startTransition(async () => {
      await confirmIntroWatched(methode);
      router.refresh();
    });
  }

  return (
    <div className="h-app overflow-y-auto bg-d5-bg">
      <div
        className="mx-auto max-w-lg px-5 pb-10"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1.5rem)" }}
      >
        <p className="mb-6 text-sm font-black tracking-wide text-d5-gold">
          D5 <span className="font-medium text-d5-muted">| Reboot 40</span>
        </p>

        <h1 className="text-2xl font-bold leading-tight text-white">
          {firstName ? `${firstName}, une dernière chose` : "Une dernière chose"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-d5-muted">
          Regarde cette vidéo en entier avant de commencer. Elle explique les 3 séances,
          comment cocher tes exercices, le message à poster dans le groupe et les modules à lire.
          Trois minutes qui t&apos;évitent de chercher toute la semaine.
        </p>

        {/* La largeur est déduite d'un budget de hauteur, pas l'inverse : une
            vidéo verticale occupant toute la largeur de la colonne mesurerait
            900 pixels de haut, et le bouton « Accéder à mon Reboot » passerait
            sous l'écran. 68 svh laissent la barre de progression et le bouton
            visibles sans défilement sur un téléphone. */}
        <div
          className="mt-5 overflow-hidden rounded-2xl border border-gray-800 bg-black"
          style={{
            aspectRatio: String(format),
            width: `min(100%, calc(68svh * ${format}))`,
            marginInline: "auto",
          }}
        >
          <iframe
            ref={iframeRef}
            // texttrack=fr affiche les sous-titres d'emblée : la vidéo est
            // souvent regardée sans le son, dans une salle ou à côté de
            // quelqu'un qui dort.
            src={`https://player.vimeo.com/video/${videoId}?title=0&byline=0&portrait=0&texttrack=fr`}
            className="h-full w-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-d5-muted">{terminee ? "Vidéo vue en entier" : "Progression"}</span>
            <span className="font-semibold text-d5-gold">{terminee ? "100 %" : `${progression} %`}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-d5-gold transition-all duration-500"
              style={{ width: `${terminee ? 100 : progression}%` }}
            />
          </div>
        </div>

        <button
          onClick={() => continuer("video")}
          disabled={!terminee || isPending}
          className={`mt-6 w-full rounded-xl py-4 text-sm font-bold transition-all ${
            terminee
              ? "bg-d5-gold text-black active:scale-[0.98]"
              : "cursor-not-allowed bg-d5-surface-2 text-d5-muted"
          }`}
        >
          {isPending ? "Un instant…" : terminee ? "Accéder à mon Reboot" : "Regarde la vidéo jusqu'au bout"}
        </button>

        {panne && !terminee && (
          <div className="mt-6 rounded-xl border border-d5-border bg-d5-surface-2 p-4">
            <p className="text-sm text-white">La vidéo ne se lance pas ?</p>
            <p className="mt-1 text-xs leading-relaxed text-d5-muted">
              Ton coach te l&apos;enverra directement. Tu peux continuer sans attendre.
            </p>
            <button
              onClick={() => continuer("secours")}
              disabled={isPending}
              className="mt-3 w-full rounded-xl border border-d5-gold/40 py-3 text-sm font-semibold text-d5-gold"
            >
              Continuer sans la vidéo
            </button>
          </div>
        )}

        <p className="mt-10 text-center text-xs text-d5-muted">
          Un problème ?{" "}
          <a
            href={`mailto:${COACH_EMAIL}?subject=Reboot%2040%20—%20vidéo%20d'introduction`}
            className="text-d5-gold underline underline-offset-2"
          >
            Écris à ton coach
          </a>
        </p>
      </div>
    </div>
  );
}
