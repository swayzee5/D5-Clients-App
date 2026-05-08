import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { addProgressEntry } from "../actions"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Nouvelle mesure",
}

export default async function NouvelleEntreePage() {
  const session = await auth()
  if (!session) redirect("/login")

  const today = new Date().toISOString().split("T")[0]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/progression"
          className="p-2 rounded-xl hover:bg-d5-surface transition-colors text-d5-muted hover:text-white"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-black">Nouvelle mesure</h1>
          <p className="text-d5-muted text-sm">Enregistre tes données du jour</p>
        </div>
      </div>

      <form action={addProgressEntry} className="space-y-4">
        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Date</label>
          <input
            type="date"
            name="entryDate"
            defaultValue={today}
            required
            className="input-base"
          />
        </div>

        {/* Poids + Taille */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-sm text-white">Poids &amp; Taille</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-d5-muted mb-1.5">Poids (kg)</label>
              <input
                type="number"
                name="weightKg"
                step="0.1"
                min="30"
                max="300"
                placeholder="ex : 82.5"
                className="input-base"
              />
            </div>
            <div>
              <label className="block text-xs text-d5-muted mb-1.5">Taille (cm)</label>
              <input
                type="number"
                name="heightCm"
                step="0.5"
                min="100"
                max="250"
                placeholder="ex : 178"
                className="input-base"
              />
            </div>
          </div>
        </div>

        {/* Mensurations */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-sm text-white">Mensurations</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-d5-muted mb-1.5">Tour de taille (cm)</label>
              <input
                type="number"
                name="waistCm"
                step="0.5"
                min="0"
                placeholder="ex : 88"
                className="input-base"
              />
            </div>
            <div>
              <label className="block text-xs text-d5-muted mb-1.5">Poitrine (cm)</label>
              <input
                type="number"
                name="chestCm"
                step="0.5"
                min="0"
                placeholder="ex : 100"
                className="input-base"
              />
            </div>
            <div>
              <label className="block text-xs text-d5-muted mb-1.5">Hanches (cm)</label>
              <input
                type="number"
                name="hipsCm"
                step="0.5"
                min="0"
                placeholder="ex : 95"
                className="input-base"
              />
            </div>
            <div>
              <label className="block text-xs text-d5-muted mb-1.5">Bras (cm)</label>
              <input
                type="number"
                name="armsCm"
                step="0.5"
                min="0"
                placeholder="ex : 35"
                className="input-base"
              />
            </div>
            <div>
              <label className="block text-xs text-d5-muted mb-1.5">Cuisses (cm)</label>
              <input
                type="number"
                name="thighsCm"
                step="0.5"
                min="0"
                placeholder="ex : 55"
                className="input-base"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            Notes <span className="text-d5-muted font-normal">(optionnel)</span>
          </label>
          <textarea
            name="notes"
            rows={3}
            placeholder="Comment tu te sens aujourd&apos;hui ?"
            className="input-base resize-none"
          />
        </div>

        <button type="submit" className="btn-primary w-full">
          Enregistrer
        </button>
      </form>
    </div>
  )
}
