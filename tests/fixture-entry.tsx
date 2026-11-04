import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import GuestForms from "../components/GuestForms";
import AdminPanel from "../components/AdminPanel";
import BackgroundMusic from "../components/BackgroundMusic";
import "../app/globals.css";
import "@fontsource/unifrakturmaguntia/latin-400.css";
import "@fontsource/cormorant-garamond/latin-400.css";
import "@fontsource/cinzel-decorative/latin-400.css";
import "@fontsource/montserrat/latin-400.css";
function Fixture() {
  const screen = new URLSearchParams(location.search).get("screen");
  const [data, setData] = useState({ rsvps: [], songs: [] });
  useEffect(() => {
    const load = () =>
      void fetch("/__data")
        .then((response) => response.json())
        .then(setData);
    load();
    window.addEventListener("fixture-refresh", load);
    return () => window.removeEventListener("fixture-refresh", load);
  }, []);
  return screen === "admin" ? (
    <AdminPanel {...data} />
  ) : screen === "music" ? (
    <main>
      <h1>Audio aislado</h1>
      <BackgroundMusic src="/__audio.wav" title="Audio de prueba local" />
    </main>
  ) : (
    <main>
      <h1 className="sr-only">Invitación de prueba local</h1>
      <GuestForms enabled />
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
