import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  try {
    const { data } = await supabaseAdmin
      .from("settings")
      .select("base_image")
      .eq("name", "Padrão (Inicial)")
      .single();
    if (data?.base_image?.startsWith("data:image/")) {
      const match = data.base_image.match(/^data:(image\/[^;]+);base64,([\s\S]*)$/);
      if (match) {
        return new NextResponse(Buffer.from(match[2], "base64"), {
          headers: { "Content-Type": match[1], "Cache-Control": "no-store" },
        });
      }
    }

    const candidates = [
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
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      });
    }

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
