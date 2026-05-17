export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { pool } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ValidateButton from "./ValidateButton";
import type { Metadata } from "next";

type Section =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "highlight"; text: string };

type ModuleContent = {
  emoji: string;
  title: string;
  teaser: string;
  sections: Section[];
  action: string;
};

const MODULES: Record<string, ModuleContent> = {
  regularite: {
    emoji: "🔥",
    title: "La régularité avant l’intensité",
    teaser: "Le secret de la transformation durable",
    sections: [
      {
        type: "paragraph",
        text: "Beaucoup cherchent la séance parfaite, le programme optimal, la méthode révolutionnaire. Mais la variable la plus déterminante, c’est de revenir. Encore et encore.",
      },
      {
        type: "paragraph",
        text: "3 séances bien faites valent infiniment mieux que 5 séances bâclées ou abandonnées. Ton corps s’adapte à ce qu’on lui impose régulièrement — pas à ce qu’on lui impose une seule fois avec intensité.",
      },
      {
        type: "list",
        items: [
          "Bloque des créneaux fixes dans ton agenda comme un rendez-vous professionnel",
          "Si tu rates une séance, reprends dès que possible sans culpabilité",
          "La fatigue n’est pas un obstacle — une séance courte compte aussi",
          "La progression est invisible au quotidien et évidente au trimestre",
        ],
      },
      {
        type: "highlight",
        text: "La constance sur 3 mois change un corps. L’intensité sur 3 semaines crée des blessures.",
      },
    ],
    action: "Identifie tes 3 créneaux d’entraînement cette semaine et mets-les dans ton calendrier maintenant — avant de fermer cette page.",
  },
  hydratation: {
    emoji: "💧",
    title: "L’hydratation, ton moteur",
    teaser: "2L minimum — comprendre pourquoi",
    sections: [
      {
        type: "paragraph",
        text: "Ton corps est composé à 60% d’eau. Tes muscles, encore plus. Quand tu t’entraînes, tu perds de l’eau et des électrolytes. Si tu ne les restitues pas, ta récupération ralentit, ta force baisse — et ta concentration aussi.",
      },
      {
        type: "paragraph",
        text: "2L par jour est un plancher, pas un objectif. Si tu transpires, s’il fait chaud, si tu t’entraînes — monte à 2.5L ou 3L.",
      },
      {
        type: "list",
        items: [
          "Urine foncée → tu es déshydraté",
          "Maux de tête en fin de journée → manque d’eau probable",
          "Fatigue inexplicable → bois un verre d’eau avant de chercher ailleurs",
          "Crampes musculaires → eau + une pincée de sel",
        ],
      },
      {
        type: "highlight",
        text: "Routine simple : un grand verre dès le réveil · une bouteille visible sur ton bureau · un verre avant chaque repas.",
      },
    ],
    action: "Prépare ta bouteille d’eau ce soir pour demain matin. Mets-la là où tu la verras en premier — avant ton téléphone.",
  },
  sommeil: {
    emoji: "😴",
    title: "Le sommeil, ton meilleur allié",
    teaser: "Quand le vrai travail se fait",
    sections: [
      {
        type: "paragraph",
        text: "C’est pendant ton sommeil que ton corps répare les fibres musculaires sollicitées à l’entraînement. C’est là que ta croissance musculaire se fait réellement. C’est là que les hormones de récupération — notamment la GH — sont sécrétées.",
      },
      {
        type: "paragraph",
        text: "Dormir 5h en voulant progresser, c’est construire sur du sable.",
      },
      {
        type: "list",
        items: [
          "Coucher et lever à heure fixe — même le week-end",
          "Pas d’écran 30 min avant de dormir",
          "Chambre fraîche : 18–20°C idéal",
          "Pas de caféine après 14h",
          "Un carnet à côté du lit pour vider les pensées avant de t’endormir",
        ],
      },
      {
        type: "highlight",
        text: "Une semaine de 7–8h changera ta récupération plus que n’importe quel complément alimentaire.",
      },
    ],
    action: "Décide d’une heure de coucher ce soir et respecte-la. C’est ton action la plus importante pour ce module.",
  },
  nutrition: {
    emoji: "🥗",
    title: "Protéines à chaque repas",
    teaser: "La règle simple qui change tout",
    sections: [
      {
        type: "paragraph",
        text: "Les protéines sont les briques de tes muscles. Sans apport suffisant, ton entraînement construit sur du vide — ton corps n’a pas les matériaux pour réparer et reconstruire.",
      },
      {
        type: "paragraph",
        text: "La cible : 1.6g de protéines par kilo de poids de corps par jour. Pour 75 kg → 120g. Pour 90 kg → 144g.",
      },
      {
        type: "list",
        items: [
          "Œufs — 6g par œuf",
          "Poulet, dinde, bœuf — 25–30g pour 100g",
          "Poisson, thon, saumon — 20–25g pour 100g",
          "Fromage blanc, yaourt grec — 8–12g pour 100g",
          "Lentilles, pois chiches — 8–9g pour 100g",
        ],
      },
      {
        type: "highlight",
        text: "Règle d’une assiette : 1/4 protéines · 1/4 féculents · 1/2 légumes. Pas besoin de compter les calories.",
      },
      {
        type: "paragraph",
        text: "Ce que tu n’as PAS besoin de faire : supprimer les glucides, manger 6 fois par jour, acheter des compléments (la whéy est optionnelle, pas obligatoire).",
      },
    ],
    action: "Regarde ton dernier repas. Avait-il une source de protéines suffisante ? Si non, c’est ton premier ajustement — commence au prochain repas.",
  },
};

export async function generateMetadata({ params }: { params: { key: string } }): Promise<Metadata> {
  const mod = MODULES[params.key];
  return { title: mod?.title ?? "Module" };
}

export default async function ModulePage({ params }: { params: { key: string } }) {
  const mod = MODULES[params.key];
  if (!mod) notFound();

  const session = await auth();
  if (!session) redirect("/login");

  let isDone = false;
  try {
    const { rows } = await pool.query(
      `SELECT 1 FROM reboot_task_completions WHERE client_id = $1 AND task_key = $2`,
      [session.user.id, params.key]
    );
    isDone = rows.length > 0;
  } catch {}

  return (
    <div className="space-y-6 max-w-lg pb-8">
      {/* Back */}
      <Link
        href="/reboot"
        className="flex items-center gap-1.5 text-d5-muted text-sm hover:text-white transition-colors"
      >
        <ArrowLeft size={14} />
        Retour au challenge
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4">
        <span className="text-4xl shrink-0">{mod.emoji}</span>
        <div>
          <h1 className="text-xl font-bold text-white">{mod.title}</h1>
          <p className="text-d5-muted text-sm mt-0.5">{mod.teaser}</p>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {mod.sections.map((section, i) => {
          if (section.type === "paragraph") {
            return (
              <p key={i} className="text-gray-300 text-sm leading-relaxed">
                {section.text}
              </p>
            );
          }
          if (section.type === "list") {
            return (
              <ul key={i} className="space-y-2">
                {section.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-d5-gold mt-1 shrink-0">·</span>
                    {item}
                  </li>
                ))}
              </ul>
            );
          }
          if (section.type === "highlight") {
            return (
              <div key={i} className="bg-d5-gold/10 border border-d5-gold/20 rounded-xl px-4 py-3">
                <p className="text-white text-sm font-medium leading-relaxed">{section.text}</p>
              </div>
            );
          }
          return null;
        })}
      </div>

      {/* Action */}
      <div className="bg-d5-surface-2 border border-d5-border rounded-xl p-4 space-y-1.5">
        <p className="text-d5-gold text-xs font-bold uppercase tracking-wider">Ton action</p>
        <p className="text-white text-sm leading-relaxed">{mod.action}</p>
      </div>

      {/* Validate */}
      <ValidateButton taskKey={params.key} isDone={isDone} />
    </div>
  );
}
