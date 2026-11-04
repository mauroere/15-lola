import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { event } from "@/lib/event";
export const runtime = "nodejs";
export const alt =
  "Invitación a los quince de Lola. 7 de febrero de 2027, 21 hs, La Quinta Eventos.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function Image() {
  const [serif, script, roses, logo] = await Promise.all([
    readFile(
      path.join(
        process.cwd(),
        "node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff",
      ),
    ),
    readFile(
      path.join(
        process.cwd(),
        "node_modules/@fontsource/unifrakturmaguntia/files/unifrakturmaguntia-latin-400-normal.woff",
      ),
    ),
    readFile(path.join(process.cwd(), "public/art/burgundy-roses.webp")),
    readFile(path.join(process.cwd(), "public/brand/lola-escudo.svg")),
  ]);
  const floral = `data:image/webp;base64,${roses.toString("base64")}`;
  const crest = `data:image/svg+xml;base64,${logo.toString("base64")}`;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f4e9d8",
        color: "#590d26",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 25,
          border: "1px solid #aaa49d",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 32,
          border: "1px solid #c5bdb2",
          display: "flex",
        }}
      />
      <img
        src={floral}
        width={365}
        height={334}
        style={{ position: "absolute", bottom: -24, left: -25 }}
        alt=""
      />
      <img
        src={floral}
        width={365}
        height={334}
        style={{
          position: "absolute",
          top: -24,
          right: -25,
          transform: "rotate(180deg)",
        }}
        alt=""
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <img
          src={crest}
          width={68}
          height={96}
          alt=""
          style={{ marginBottom: 16 }}
        />
        <span style={{ fontFamily: "Serif", fontSize: 22, letterSpacing: 5 }}>
          TE INVITO A MIS QUINCE
        </span>
        <span style={{ fontFamily: "Medieval", fontSize: 120, marginTop: 10 }}>
          {event.name}
        </span>
        <div
          style={{
            display: "flex",
            height: 1,
            width: 150,
            background: "#aaa49d",
            marginTop: 18,
            marginBottom: 28,
          }}
        />
        <span style={{ fontFamily: "Serif", fontSize: 29, letterSpacing: 1 }}>
          {event.dateLabel}
        </span>
        <span style={{ fontFamily: "Serif", fontSize: 24, marginTop: 12 }}>
          {event.time} hs · {event.venue}
        </span>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Serif", data: serif, weight: 400 },
        { name: "Medieval", data: script, weight: 400 },
      ],
    },
  );
}
