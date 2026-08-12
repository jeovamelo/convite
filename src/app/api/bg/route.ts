import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { supabaseAdmin } from "@/lib/supabase";
import { resolveImageUrl } from "@/lib/imageUrl";

export const dynamic = "force-dynamic";

const CONFIG_PATH = path.join(process.cwd(), ".data", "site-config.json");

/**
 * Fetches a remote image and returns it as a proxied response.
 * This avoids 302 redirect issues with CSS backgroundImage and CORS.
 */
async function proxyImage(url: string): Promise<Response | null> {
  try {
    const resolved = resolveImageUrl(url);
    const upstream = await fetch(resolved, { cache: "no-store" });
    if (!upstream.ok) return null;

    const buffer = Buffer.from(await upstream.arrayBuffer());
    const contentType = upstream.headers.get("content-type") || "image/jpeg";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    });
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    // Priority 1: Check for Supabase Storage URL in site-config.json
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
        if (cfg.background_url && cfg.background_url.startsWith("http")) {
          const proxied = await proxyImage(cfg.background_url);
          if (proxied) return proxied;
        }
      }
    } catch {}

    // Priority 2: Check settings table for a URL (non-base64)
    const { data } = await supabaseAdmin
      .from("settings")
      .select("base_image")
      .eq("name", "Padrão (Inicial)")
      .maybeSingle();

    if (data?.base_image) {
      // If it's a URL, proxy it
      if (data.base_image.startsWith("http")) {
        const proxied = await proxyImage(data.base_image);
        if (proxied) return proxied;
      }
      // Legacy: if it's base64, decode and serve
      if (data.base_image.startsWith("data:image/")) {
        const match = data.base_image.match(/^data:(image\/[^;]+);base64,([\s\S]*)$/);
        if (match) {
          return new NextResponse(Buffer.from(match[2], "base64"), {
            headers: { "Content-Type": match[1], "Cache-Control": "no-store" },
          });
        }
      }
    }

    // Priority 3: Local file fallback
    const candidates = [
      "/app/.data/background.png",
      "/app/.data/background.jpg",
      path.join(process.cwd(), ".data", "background.png"),
      path.join(process.cwd(), ".data", "background.jpg"),
      path.join(process.cwd(), "public", "background.jpg"),
      path.join(process.cwd(), "public", "background.png"),
      process.env.BG_IMAGE_PATH,
    ].filter(Boolean) as string[];

    for (const filePath of candidates) {
      if (!fs.existsSync(filePath)) continue;
      const fileBuffer = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const contentType = ext === ".png" ? "image/png" : "image/jpeg";
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    // Priority 4: Default gradient SVG
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1600"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#002A7A"/><stop offset="100%" stop-color="#001A55"/></linearGradient></defs><rect width="1200" height="1600" fill="url(#g)"/><g fill="#ffffff" fill-opacity="0.09"><circle cx="150" cy="180" r="80"/><circle cx="1030" cy="320" r="120"/><circle cx="250" cy="1180" r="140"/><circle cx="980" cy="1280" r="90"/></g></svg>`;
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Image not found" }, { status: 404 });
  }
}
