"use client";
import { useState } from "react";
import { event } from "@/lib/event";
export default function ShareButton() {
  const [status, setStatus] = useState("");
  async function share() {
    setStatus("");
    const url = new URL("/", window.location.href).href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Los XV de ${event.name}`,
          text: event.date
            ? `Te invito a celebrar mis quince años. ${event.dateLabel}, a las ${event.time} hs, en ${event.venue}.`
            : "Te invito a mis quince. Una noche para recordar.",
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setStatus("Enlace copiado.");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setStatus(
        "No se pudo compartir. Podés copiar la dirección desde tu navegador.",
      );
    }
  }
  return (
    <div className="share-control">
      <button type="button" className="text-link" onClick={share}>
        Compartir invitación <span aria-hidden="true">↗</span>
      </button>
      <p role="status" className="share-status">
        {status}
      </p>
    </div>
  );
}
