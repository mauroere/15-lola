"use client";

import { useState } from "react";
import { event } from "@/lib/event";
import { Flourish } from "@/components/Ornaments";

export default function Gifts() {
  const [status, setStatus] = useState("");

  async function copyAlias() {
    try {
      await navigator.clipboard.writeText(event.giftAlias);
      setStatus("Alias copiado.");
    } catch {
      setStatus("No se pudo copiar. Podés seleccionar el alias y copiarlo manualmente.");
    }
  }

  return (
    <section id="regalos" className="gift-section" aria-labelledby="gift-title">
      <div className="gift-card">
        <Flourish />
        <p className="chapter">V / UN DETALLE CON AMOR</p>
        <h2 id="gift-title">Tu presencia es mi mejor regalo.</h2>
        <p className="gift-message">
          Si además querés hacerme un regalo, podés usar este alias.
        </p>
        <p className="eyebrow">ALIAS PARA TRANSFERENCIAS</p>
        <p className="gift-alias">{event.giftAlias}</p>
        <button type="button" className="button button-wine" onClick={copyAlias}>
          Copiar alias
        </button>
        <p className="gift-status" role="status">{status}</p>
      </div>
    </section>
  );
}
