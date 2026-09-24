import { ImageResponse } from "next/og";

export const alt = "pytse-client Skill Studio — Tehran Stock Exchange Agent Skill";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          background: "#07090c",
          padding: "72px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="#c9a04e" strokeWidth="1.4">
            <path d="M12 2 L14.2 8.8 H21 L15.6 13.1 L17.8 20 L12 15.8 L6.2 20 L8.4 13.1 L3 8.8 H9.8 Z" />
          </svg>
          <div
            style={{
              fontSize: "26px",
              letterSpacing: "6px",
              color: "#c9a04e",
              display: "flex",
            }}
          >
            AGENT SKILL
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: "84px",
              fontWeight: 700,
              color: "#f3ecdc",
              display: "flex",
              marginBottom: "16px",
            }}
          >
            pytse-client
          </div>
          <div style={{ fontSize: "34px", color: "#8d8578", display: "flex" }}>
            Skill Studio — Tehran Stock Exchange Agent Skill
          </div>
        </div>
        <div
          style={{
            fontSize: "22px",
            color: "#c9a04e",
            letterSpacing: "2px",
            display: "flex",
          }}
        >
          SKILL.MD · 16 TOOLS · SCRIPTS · PLAYGROUND
        </div>
      </div>
    ),
    size,
  );
}
