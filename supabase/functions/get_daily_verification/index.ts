import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RED_PALETTE = [
  { hex: "#FF3B30", name: "VERMILLION" },
  { hex: "#DC143C", name: "CRIMSON" },
  { hex: "#FF2400", name: "SCARLET" },
  { hex: "#FF7F50", name: "CORAL" },
  { hex: "#FF007F", name: "ROSE" },
  { hex: "#DE3163", name: "CHERRY" },
  { hex: "#C41E3A", name: "CARDINAL" },
  { hex: "#E0115F", name: "RUBY" },
  { hex: "#733635", name: "GARNET" },
  { hex: "#CB4154", name: "BRICK" },
  { hex: "#E34234", name: "CINNABAR" },
  { hex: "#800000", name: "MAROON" },
  { hex: "#960018", name: "CARMINE" },
  { hex: "#800020", name: "BURGUNDY" },
  { hex: "#FF6347", name: "TOMATO" },
  { hex: "#E25822", name: "FIRE" },
  { hex: "#660000", name: "BLOOD" },
  { hex: "#EC5800", name: "PERSIMMON" },
  { hex: "#FA8072", name: "SALMON" },
  { hex: "#F94E5E", name: "PUNCH" },
];

const SECRET = Deno.env.get("VERIFICATION_SECRET") || "vouchertap-secret-2026";

async function hashString(input: string): Promise<number> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  return (hashArray[0] << 8) | hashArray[1];
}

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const today = new Date().toISOString().split("T")[0];
  const seed = await hashString(today + SECRET);
  const colorIndex = seed % RED_PALETTE.length;
  const color = RED_PALETTE[colorIndex];

  return new Response(
    JSON.stringify({
      current_server_time: new Date().toISOString(),
      todays_color_hex: color.hex,
      todays_color_name: color.name,
    }),
    {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    }
  );
});
