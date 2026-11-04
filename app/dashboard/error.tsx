"use client";
export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <main className="admin-page">
      <h1>No se pudo cargar el panel.</h1>
      <p>Volvé a intentar. Las respuestas guardadas se conservan.</p>
      <button className="button button-wine" type="button" onClick={reset}>
        Reintentar
      </button>
    </main>
  );
}
