"use client";

import { useEffect, useRef, useState } from "react";

const START_AT = 45;
const playbackError =
  "No se pudo reproducir la música. Podés volver a intentar.";

export default function BackgroundMusic({
  src,
  title,
}: {
  src: string;
  title: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const startRef = useRef<(retry?: boolean) => void>(() => {});
  const cancelRef = useRef<() => void>(() => {});
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    let active = true,
      request = 0,
      started = false,
      automatic = true,
      pending = false,
      scrollAttempted = false;
    audio.volume = 0.25;
    setPlaying(false);
    setLoading(false);
    setError("");
    setBlocked(false);
    // Before metadata, setting currentTime queues the initial playback position.
    // Retry at loadedmetadata for browsers that require a known seekable range.
    const position = () => {
      if (!started) {
        try {
          audio.currentTime = Number.isFinite(audio.duration)
            ? Math.min(START_AT, Math.max(0, audio.duration - 0.1))
            : START_AT;
        } catch {
          /* loadedmetadata retries the seek before playback. */
        }
      }
    };
    const start = (retry = false, fromGesture = false) => {
      // A valid touch must be able to retry a still-pending automatic request.
      if (!active || (pending && (!fromGesture || !audio.paused))) return;
      pending = true;
      const id = ++request;
      if (retry && audio.error) audio.load();
      position();
      setError("");
      setLoading(true);
      // Keep play() synchronous with a trusted gesture when autoplay was blocked.
      void audio
        .play()
        .then(() => {
          if (!active || id !== request) return;
          pending = false;
          setBlocked(false);
          started = true;
          automatic = false;
          setPlaying(true);
          setLoading(false);
        })
        .catch((cause: unknown) => {
          if (!active || id !== request) return;
          pending = false;
          setPlaying(false);
          setLoading(false);
          if (
            cause &&
            typeof cause === "object" &&
            "name" in cause &&
            cause.name === "NotAllowedError"
          ) {
            // Normal browser policy: wait for a click/tap/key, without an error alert.
            automatic = true;
            setBlocked(true);
          } else {
            setBlocked(false);
            automatic = false;
            setError(playbackError);
          }
        });
    };
    const gesture = (event: Event) => {
      if (!automatic || !event.isTrusted) return;
      if (
        event.target instanceof Element &&
        event.target.closest(".background-music")
      )
        return;
      if (
        event instanceof KeyboardEvent &&
        (event.repeat ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          ["Escape", "Shift", "Control", "Alt", "Meta"].includes(event.key))
      )
        return;
      if (
        typeof PointerEvent !== "undefined" &&
        event instanceof PointerEvent &&
        ((event.type === "pointerdown" && event.pointerType !== "mouse") ||
          (event.type === "pointerup" && event.pointerType === "mouse"))
      )
        return;
      start(false, true);
    };
    const scroll = (event: Event) => {
      if (!automatic || !event.isTrusted || scrollAttempted || pending) return;
      scrollAttempted = true;
      start();
    };
    const fail = () => {
      pending = false;
      request++;
      automatic = false;
      setPlaying(false);
      setLoading(false);
      setBlocked(false);
      setError(playbackError);
    };
    const pause = () => {
      if (active) setPlaying(false);
    };
    startRef.current = start;
    cancelRef.current = () => {
      pending = false;
      request++;
      automatic = false;
      setBlocked(false);
      audio.pause();
      setPlaying(false);
      setLoading(false);
    };
    audio.addEventListener("loadedmetadata", position);
    audio.addEventListener("error", fail);
    audio.addEventListener("pause", pause);
    window.addEventListener("scroll", scroll, { passive: true });
    document.addEventListener("pointerdown", gesture, true);
    document.addEventListener("pointerup", gesture, true);
    document.addEventListener("touchend", gesture, true);
    document.addEventListener("click", gesture, true);
    document.addEventListener("keydown", gesture, true);
    start();
    return () => {
      active = false;
      request++;
      automatic = false;
      audio.removeEventListener("loadedmetadata", position);
      audio.removeEventListener("error", fail);
      audio.removeEventListener("pause", pause);
      window.removeEventListener("scroll", scroll);
      document.removeEventListener("pointerdown", gesture, true);
      document.removeEventListener("pointerup", gesture, true);
      document.removeEventListener("touchend", gesture, true);
      document.removeEventListener("click", gesture, true);
      document.removeEventListener("keydown", gesture, true);
      audio.pause();
    };
  }, [src]);

  if (!src) return null;
  const action = loading
    ? "Cancelar carga de música"
    : playing
      ? "Pausar música"
      : error
        ? "Reintentar música"
        : blocked
          ? "Activar música"
          : "Escuchar música";
  return (
    <aside className="background-music" aria-label="Música de fondo">
      <audio
        ref={audioRef}
        src={src}
        loop
        preload="metadata"
        aria-label={title}
      />
      <button
        type="button"
        onClick={() => {
          if (
            playing ||
            loading ||
            (audioRef.current && !audioRef.current.paused)
          )
            cancelRef.current();
          else startRef.current(Boolean(error));
        }}
        aria-pressed={playing}
        title={title}
      >
        <span className="music-symbol" aria-hidden="true">
          {playing ? "Ⅱ" : "♪"}
        </span>
        <span className="music-copy">
          <span>{action}</span> <small>{title}</small>
        </span>
      </button>
      {blocked && !loading && (
        <p className="music-policy" role="status">
          Tu navegador necesita un toque para activar el sonido.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
    </aside>
  );
}
