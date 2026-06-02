"use client";

import Link from "next/link";

const PRINT_STYLES = `
  @media print {
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { margin: 0 !important; padding: 0 !important; background: #0a0a0a !important; }
    .no-print { display: none !important; }
    nav, header, aside,
    [class*="sidebar"], [class*="layout"],
    [class*="bottom-nav"], [class*="tab-bar"] { display: none !important; }
    .cert-wrapper {
      position: fixed !important; top: 0 !important; left: 0 !important;
      width: 100vw !important; max-width: 100vw !important;
      min-height: 100vh !important; margin: 0 !important;
      border-radius: 0 !important; border: none !important;
    }
  }
`;

export default function CertificatClient({
  firstName,
  lastName,
  completionDate,
  totalCompleted,
  allDone,
}: {
  firstName: string;
  lastName: string;
  completionDate: string;
  totalCompleted: number;
  allDone: boolean;
}) {
  const remaining = 10 - totalCompleted;

  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLES }} />

      {/* Back link */}
      <div className="no-print mb-5">
        <Link href="/reboot" className="text-gray-500 hover:text-white text-sm transition-colors">
          ← Retour au challenge
        </Link>
      </div>

      {/* Certificate */}
      <div
        className="cert-wrapper"
        style={{
          background: "linear-gradient(145deg, #0d0d0d 0%, #0a0a0a 100%)",
          border: "1px solid #1e1e1e",
          borderRadius: "20px",
          padding: "44px 40px",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          maxWidth: "580px",
          margin: "0 auto",
          position: "relative",
          overflow: "hidden",
          opacity: allDone ? 1 : 0.7,
        }}
      >
        {/* Glow accents */}
        <div style={{ position: "absolute", top: "-70px", right: "-70px", width: "260px", height: "260px", background: "radial-gradient(circle, rgba(255,106,0,0.07) 0%, transparent 65%)", borderRadius: "50%", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-60px", left: "-40px", width: "200px", height: "200px", background: "radial-gradient(circle, rgba(255,106,0,0.04) 0%, transparent 65%)", borderRadius: "50%", pointerEvents: "none" }} />

        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
          <div>
            <p style={{ margin: 0, fontSize: "22px", fontWeight: 900, color: "#ff6a00", letterSpacing: "-0.5px" }}>D5 COACHING</p>
            <p style={{ margin: "3px 0 0", fontSize: "10px", color: "#444", letterSpacing: "2px", textTransform: "uppercase" }}>d5coaching-distance.com</p>
          </div>
          <div style={{ width: "44px", height: "44px", borderRadius: "11px", background: "rgba(255,106,0,0.08)", border: "1px solid rgba(255,106,0,0.18)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "19px" }}>⚡</div>
        </div>

        {/* Orange divider */}
        <div style={{ height: "1px", background: "linear-gradient(90deg, #ff6a00 0%, rgba(255,106,0,0.12) 55%, transparent 100%)", marginBottom: "32px" }} />

        {/* Title */}
        <div style={{ marginBottom: "28px" }}>
          <p style={{ margin: "0 0 5px", fontSize: "10px", color: "#ff6a00", letterSpacing: "3px", textTransform: "uppercase", fontWeight: 700 }}>Certificat de complétion</p>
          <h1 style={{ margin: 0, fontSize: "44px", fontWeight: 900, color: "#ffffff", lineHeight: 1, letterSpacing: "-2px" }}>REBOOT 40</h1>
          <p style={{ margin: "5px 0 0", fontSize: "12px", color: "#444", fontWeight: 700, letterSpacing: "4px", textTransform: "uppercase" }}>CHALLENGE</p>
        </div>

        {/* Name block */}
        <div style={{ background: "rgba(255,106,0,0.04)", border: "1px solid rgba(255,106,0,0.12)", borderRadius: "13px", padding: "20px 24px", marginBottom: "24px" }}>
          <p style={{ margin: "0 0 5px", fontSize: "10px", color: "#555", letterSpacing: "2px", textTransform: "uppercase" }}>Décerné avec fierté à</p>
          <p style={{ margin: 0, fontSize: "26px", fontWeight: 800, color: allDone ? "#ffffff" : "#555", letterSpacing: "-0.5px" }}>
            {firstName} {lastName}
          </p>
        </div>

        {/* Description */}
        <p style={{ margin: "0 0 20px", fontSize: "13px", color: "#666", lineHeight: 1.7 }}>
          Pour avoir complété le challenge <strong style={{ color: "#888" }}>Reboot 40</strong> dans son intégralité et prouvé sa capacité à être régulier.
        </p>

        {/* Accomplishments */}
        <div style={{ marginBottom: "28px" }}>
          {[
            { icon: "🏋️", text: "3 séances d’entraînement complétées" },
            { icon: "💬", text: "3 messages WhatsApp envoyés" },
            { icon: "🔥", text: "Régularité avant l’intensité — validé" },
            { icon: "💧", text: "Hydratation — validé" },
            { icon: "😴", text: "Sommeil — validé" },
            { icon: "🥗", text: "Nutrition — validé" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <span style={{ fontSize: "13px", opacity: allDone ? 1 : 0.25 }}>{item.icon}</span>
              <span style={{ fontSize: "13px", color: allDone ? "#aaa" : "#3a3a3a" }}>{item.text}</span>
              <span style={{ marginLeft: "auto", color: allDone ? "#22c55e" : "#2a2a2a", fontSize: "11px" }}>
                {allDone ? "✓" : "○"}
              </span>
            </div>
          ))}
        </div>

        {/* Footer divider */}
        <div style={{ height: "1px", background: "#181818", marginBottom: "20px" }} />

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <p style={{ margin: "0 0 3px", fontSize: "14px", fontWeight: 700, color: "#fff" }}>Daye Kaba</p>
            <p style={{ margin: 0, fontSize: "11px", color: "#444" }}>Coach · D5 Coaching Distance</p>
          </div>
          <div style={{ textAlign: "right" }}>
            {allDone ? (
              <>
                <p style={{ margin: "0 0 2px", fontSize: "10px", color: "#444", textTransform: "uppercase", letterSpacing: "1px" }}>Complété le</p>
                <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#ff6a00" }}>{completionDate}</p>
              </>
            ) : (
              <p style={{ fontSize: "11px", color: "#333" }}>{totalCompleted}/10 étapes</p>
            )}
          </div>
        </div>
      </div>

      {/* Download / lock button */}
      <div className="no-print" style={{ maxWidth: "580px", margin: "20px auto 48px" }}>
        {allDone ? (
          <button
            onClick={() => window.print()}
            style={{
              width: "100%", padding: "15px", background: "#ff6a00",
              border: "none", borderRadius: "13px", color: "#fff",
              fontSize: "15px", fontWeight: 700, cursor: "pointer",
            }}
          >
            ⬇ Télécharger en PDF
          </button>
        ) : (
          <div style={{
            width: "100%", padding: "15px", background: "#111",
            border: "1px solid #222", borderRadius: "13px",
            color: "#555", fontSize: "14px", fontWeight: 600,
            textAlign: "center",
          }}>
            🔒 Complète {remaining} étape{remaining > 1 ? "s" : ""} pour débloquer le certificat
          </div>
        )}
      </div>
    </>
  );
}
