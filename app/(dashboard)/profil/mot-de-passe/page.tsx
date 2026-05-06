"use client";

import { useActionState } from "react";
import { changePassword } from "./actions";
import Link from "next/link";
import { Lock, ArrowLeft, CheckCircle } from "lucide-react";

const inputCls =
  "w-full bg-d5-surface border border-d5-border rounded-xl px-4 py-3 text-white text-sm placeholder-d5-muted focus:outline-none focus:border-d5-gold transition-colors";

export default function ChangePasswordPage() {
  const [state, action, pending] = useActionState(changePassword, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/profil" className="text-d5-muted hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Changer mon mot de passe</h1>
          <p className="text-d5-muted text-sm">Choisis un mot de passe sécurisé</p>
        </div>
      </div>

      {state.success ? (
        <div className="card flex flex-col items-center justify-center py-12 text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center">
            <CheckCircle size={28} className="text-green-400" />
          </div>
          <div>
            <p className="text-white font-semibold">Mot de passe modifié !</p>
            <p className="text-d5-muted text-sm mt-1">Tu peux maintenant te connecter avec ton nouveau mot de passe.</p>
          </div>
          <Link href="/profil" className="text-d5-gold text-sm font-medium hover:underline">
            Retour au profil
          </Link>
        </div>
      ) : (
        <form action={action} className="card space-y-4">
          {state.error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{state.error}</p>
            </div>
          )}

          <div>
            <label className="block text-xs text-d5-muted mb-1.5">Mot de passe actuel</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-d5-muted" />
              <input
                type="password"
                name="currentPassword"
                required
                placeholder="Ton mot de passe actuel"
                className={`${inputCls} pl-10`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-d5-muted mb-1.5">Nouveau mot de passe</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-d5-muted" />
              <input
                type="password"
                name="newPassword"
                required
                minLength={8}
                placeholder="8 caractères minimum"
                className={`${inputCls} pl-10`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-d5-muted mb-1.5">Confirmer le nouveau mot de passe</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-d5-muted" />
              <input
                type="password"
                name="confirmPassword"
                required
                placeholder="Retape le nouveau mot de passe"
                className={`${inputCls} pl-10`}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full py-3.5 bg-d5-gold text-black font-bold rounded-xl hover:bg-d5-gold/90 transition-colors disabled:opacity-50"
          >
            {pending ? "Modification..." : "Changer le mot de passe"}
          </button>
        </form>
      )}
    </div>
  );
}
