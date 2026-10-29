"use client";

import { useEffect, useRef, useState } from "react";
import { suivreFin } from "@/app/(dashboard)/reboot/fin-actions";
import { FORMAT_VERTICAL } from "@/lib/vimeo";
import type { Intention, ReglagesFin } from "@/lib/queries/reboot-fin";
import { QuestionAccompagnement } from "./QuestionAccompagnement";

/**
 * Ce qui suit le bilan : la vidéo de clôture et la prise de rendez-vous.
 *
 * Non bloquant, contrairement à la vidéo d'introduction. Celle-là est un mode
 * d'emploi, qu'on a le droit d'imposer ; celle-ci est une proposition
 * commerciale, et l'imposer à quelqu'un qui vient de confier six notes et un
 * témoignage transformerait un remerciement en péage.
 *
 * Le bouton n'apparaît pas tant qu'aucun lien de réservation n'est réglé : un
 * bouton mort à la fin d'un parcours réussi est pire que pas de bouton.
 *
 * On n'enregistre que deux choses, et uniquement pour que le coach sache qui
 * relancer : vidéo vue en entier, bouton cliqué. Un clic n'est pas un
 * rendez-vous — la réservation se fait ailleurs.
 */

const FORMAT_PAR_DEFAUT = FORMAT_VERTICAL;

export function FinParcours({
  reglages,
  ecart,
  intentionInitiale = null,
  texteInitial = null,
}: {
  reglages: ReglagesFin;
  /** Points gagnés sur le score global. Peut être nul ou négatif. */
  ecart: number;
  /** Ce qu'il a déjà répondu, pour rouvrir l'écran dans son état. */
  intentionInitiale?: Intention | null;
  texteInitial?: string | null;
  /** Son prénom. Inutilisé pour l'instant : l'invitation a quitté cet écran,
   *  et la propriété reste pour quand on lui trouvera sa place. */
  firstName?: string | null;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [format, setFormat] = useState(FORMAT_PAR_DEFAUT);
  const vueEnvoyee = useRef(false);
  const [intention, setIntention] = useState<Intention | null>(intentionInitiale);

  useEffect(() => {
    if (!reglages.videoId) return;
    let annule = false;

    const script = document.createElement("script");
    script.src = "https://player.vimeo.com/api/player.js";
    script.async = true;
    script.onload = () => {
      if (annule || !iframeRef.current || !window.Vimeo) return;
      const player = new window.Vimeo.Player(iframeRef.current);

      // Le cadre suit la vidéo : remplacer la vidéo ne doit pas demander de
      // repasser dans le code.
      void player
        .ready()
        .then(() => Promise.all([player.getVideoWidth(), player.getVideoHeight()]))
        .then(([l, h]) => {
          if (!annule && l > 0 && h > 0) setFormat(l / h);
        })
        .catch(() => {});

      player.on("ended", () => {
        if (vueEnvoyee.current) return;
        vueEnvoyee.current = true;
        void suivreFin("video");
      });
    };
    document.body.appendChild(script);

    return () => {
      annule = true;
      script.remove();
    };
  }, [reglages.videoId]);

  function versReservation() {
    // Le suivi part avant l'ouverture, sans l'attendre : faire patienter
    // quelqu'un qui vient de décider de prendre rendez-vous est le pire
    // moment possible pour une latence.
    void suivreFin("cta");
  }

  return (
    <section className="space-y-5">
      {reglages.videoId && (
        <div>
          <div
            className="overflow-hidden rounded-2xl border border-gray-800 bg-black"
            style={{
              aspectRatio: String(format),
              width: `min(100%, calc(62svh * ${format}))`,
              marginInline: "auto",
            }}
          >
            <iframe
              ref={iframeRef}
              src={`https://player.vimeo.com/video/${reglages.videoId}?title=0&byline=0&portrait=0&texttrack=fr`}
              className="h-full w-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
          <p className="mt-2 text-center text-xs text-d5-muted">
            Deux minutes. C&apos;est la partie que je voulais te dire depuis le début.
          </p>
        </div>
      )}

      {/* La question avant le bouton : c'est la vidéo qui vient d'expliquer
          ce qu'on propose, et répondre « j'hésite » doit être une option
          offerte, pas un renoncement à cliquer. */}
      <QuestionAccompagnement
        intentionInitiale={intentionInitiale}
        texteInitial={texteInitial}
        onReponse={setIntention}
      />

      {/* Un « non » ne ferme pas la porte : l'avis change entre le dimanche
          soir et le mardi, et il faut qu'il retrouve le chemin. */}
      {intention === "non" && (
        <p className="rounded-2xl border border-d5-border bg-d5-surface px-5 py-4 text-sm leading-relaxed text-gray-300">
          C&apos;est noté, et c&apos;est très bien comme ça. Tu gardes ton score, ton
          certificat et tes séances. Si tu changes d&apos;avis dans les
          prochaines semaines, reviens sur cet écran et change ta réponse —
          la proposition tient.
        </p>
      )}

      {reglages.lienReservation && (intention === "oui" || intention === "hesite") && (
        <div className="space-y-3 rounded-2xl border-2 border-d5-gold/50 bg-d5-gold/5 p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-d5-gold">
            Continuer avec moi
          </p>
          <p className="text-sm leading-relaxed text-gray-300">
            {ecart > 0
              ? `Tu as repris ${ecart} points en sept jours, avec une structure que je t'ai prêtée. La question, c'est de la tenir six mois — et ça, ça se construit.`
              : "Sept jours, c'est court. Ce qui se construit sur six mois n'a rien à voir, et c'est précisément de ça qu'on parlerait."}
          </p>

          {/* Sans prix réglé, le bloc dirait seulement « réserve un appel »,
              ce qui ne dit pas ce qu'on réserve. La ligne de repli décrit
              l'engagement sans chiffre : tant que le coach a plus de créneaux
              que de demandes, annoncer le montant ici lui fait perdre des
              gens qu'un appel aurait convaincus. */}
          <p className="rounded-xl bg-black/25 px-4 py-3 text-sm font-semibold text-white">
            {reglages.prix || "Accompagnement individuel sur 6 mois, en petit comité."}
          </p>

          <a
            href={reglages.lienReservation}
            target="_blank"
            rel="noopener"
            onClick={versReservation}
            className="block rounded-xl bg-d5-gold py-4 text-center text-sm font-bold text-black transition-transform active:scale-[0.98]"
          >
            Réserver mon appel avec Daye
          </a>
          <p className="text-center text-xs text-d5-muted">
            Sans engagement. On regarde si c&apos;est pour toi, et je te le dis
            franchement si ce n&apos;est pas le cas.
          </p>
        </div>
      )}

      {/* Rien d'autre sur cet écran. L'invitation y figurait un temps, après
          la réponse : deux boutons pleins l'un sous l'autre, et c'est le
          rendez-vous qui perdait. Un écran de décision ne porte qu'une
          décision ; le partage trouvera sa place ailleurs. */}
    </section>
  );
}
