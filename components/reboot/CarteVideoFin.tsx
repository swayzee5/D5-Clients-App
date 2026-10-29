import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * La vidéo de clôture, en grand, une fois les dix étapes faites.
 *
 * Elle n'existait que derrière le bilan. Quelqu'un qui remplissait son bilan
 * sans aller plus loin ne la voyait jamais, et il fallait le relancer à la
 * main pour une vidéo qu'il avait déjà sous la main. C'est pourtant la seule
 * chose qui reste à voir à ce stade : tout le reste est coché.
 *
 * Posée sur les deux écrans où le participant atterrit — l'accueil et la page
 * du challenge — parce qu'on ne sait pas lequel des deux il ouvre.
 *
 * Le libellé suit l'état réel : promettre une vidéo et afficher un formulaire
 * de bilan ferait le même effet qu'un lien mort.
 */
export function CarteVideoFin({
  vignette,
  bilanRempli,
  dejaRepondu,
}: {
  /** Image d'aperçu Vimeo. Absente, la carte garde un dégradé. */
  vignette: string | null;
  bilanRempli: boolean;
  dejaRepondu: boolean;
}) {
  const titre = !bilanRempli
    ? "Ton bilan, puis ta vidéo de fin"
    : dejaRepondu
    ? "Revoir ta vidéo de fin"
    : "Ta vidéo de fin t'attend";

  const sous = !bilanRempli
    ? "Cinq minutes de bilan, puis je te parle de la suite"
    : dejaRepondu
    ? "Ta réponse est modifiable à tout moment"
    : "La partie que je voulais te dire depuis le début";

  return (
    <Link href="/reboot/bilan" className="block transition-transform active:scale-[0.98]">
      <div className="overflow-hidden rounded-2xl border-2 border-d5-gold/60 bg-d5-surface">
        <div className="relative aspect-video w-full bg-gradient-to-br from-[#2a1d00] via-black to-[#2a1d00]">
          {vignette && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={vignette}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-70"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-d5-gold shadow-lg">
              {/* Triangle plein : une icône de lecture se reconnaît de loin,
                  un libellé non. */}
              <span className="ml-1 border-y-[11px] border-l-[18px] border-y-transparent border-l-black" />
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-d5-gold">
              Challenge terminé — 10/10
            </p>
            <p className="mt-0.5 text-lg font-black leading-tight text-white">{titre}</p>
          </div>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm text-d5-muted">{sous}</p>
          <ArrowRight size={16} className="shrink-0 text-d5-gold" />
        </div>
      </div>
    </Link>
  );
}
