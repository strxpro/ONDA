import { ImageResponse } from "next/og";
import { getSiteData } from "@/lib/data";
import { t, type Locale } from "@/lib/types";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Gelateria Onda — Santa Teresa Gallura";

/** Social preview: the day's flavors as a stack of colored scoops + the shop name. */
export default async function OgImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const { settings: s, flavors } = await getSiteData();
  const colors = flavors.filter((f) => f.is_available_today).slice(0, 4).map((f) => f.color_primary);
  const scoops = colors.length ? colors : ["#A8DB7A", "#FF8FB8", "#FFE066"];

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "linear-gradient(135deg, #FFD6E5 0%, #FFF4BD 50%, #D2F8EE 100%)", fontFamily: "sans-serif", position: "relative" }}>
        {/* waves */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 110, background: "#6FE0C4", borderTopLeftRadius: "50% 60px", borderTopRightRadius: "50% 60px", display: "flex" }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 80px", flex: 1, zIndex: 1 }}>
          <div style={{ fontSize: 150, fontWeight: 800, color: "#4B2A20", letterSpacing: -4, lineHeight: 1 }}>Onda</div>
          <div style={{ fontSize: 40, fontWeight: 700, color: "#4B2A20", marginTop: 12 }}>{t(s.tagline, locale as Locale)}</div>
          <div style={{ fontSize: 30, color: "#7A5246", marginTop: 8 }}>Santa Teresa Gallura · Sardegna</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column-reverse", alignItems: "center", width: 360, paddingBottom: 40, zIndex: 1 }}>
          {/* cone */}
          <div style={{ width: 0, height: 0, borderLeft: "90px solid transparent", borderRight: "90px solid transparent", borderTop: "230px solid #EAA65C", display: "flex" }} />
          {scoops.map((c, i) => (
            <div key={i} style={{ width: 210, height: 170, borderRadius: "50% 50% 44% 44%", background: c, marginBottom: i === 0 ? -40 : -60, boxShadow: "inset -18px -22px 0 rgba(0,0,0,0.08), inset 22px 26px 0 rgba(255,255,255,0.35)", display: "flex" }} />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
