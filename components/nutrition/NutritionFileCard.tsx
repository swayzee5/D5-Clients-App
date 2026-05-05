"use client"

import { FileText, Download, ExternalLink, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import type { NutritionFile } from "@/lib/queries/nutrition"

interface Props {
  file: NutritionFile
  featured?: boolean
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return ""
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function formatUploadDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso))
}

export function NutritionFileCard({ file, featured = false }: Props) {
  if (featured) {
    return (
      <div className="bg-d5-surface border border-d5-border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-d5-border">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-400/10 flex items-center justify-center flex-shrink-0">
              <FileText size={20} className="text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">{file.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Clock size={12} className="text-d5-muted" />
                <span className="text-d5-muted text-xs">{formatUploadDate(file.uploadedAt)}</span>
                {file.fileSize && (
                  <>
                    <span className="text-d5-border">·</span>
                    <span className="text-d5-muted text-xs">{formatFileSize(file.fileSize)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 divide-x divide-d5-border">
          <a
            href={file.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3.5 text-sm font-medium text-white hover:bg-d5-surface-2 transition-colors"
          >
            <ExternalLink size={16} className="text-emerald-400" />
            Consulter
          </a>
          <a
            href={file.fileUrl}
            download={file.fileName}
            className="flex items-center justify-center gap-2 py-3.5 text-sm font-medium text-white hover:bg-d5-surface-2 transition-colors"
          >
            <Download size={16} className="text-emerald-400" />
            Télécharger
          </a>
        </div>
      </div>
    )
  }

  // History item (compact)
  return (
    <div
      className={cn(
        "card flex items-center gap-3 hover:border-d5-border/60 transition-colors"
      )}
    >
      <div className="w-9 h-9 rounded-xl bg-d5-surface-2 flex items-center justify-center flex-shrink-0">
        <FileText size={16} className="text-d5-muted" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{file.name}</p>
        <p className="text-xs text-d5-muted">{formatUploadDate(file.uploadedAt)}</p>
      </div>
      <a
        href={file.fileUrl}
        download={file.fileName}
        className="p-2 rounded-lg hover:bg-d5-surface-2 text-d5-muted hover:text-white transition-colors"
        aria-label="Télécharger"
      >
        <Download size={16} />
      </a>
    </div>
  )
}
