import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const configPath = path.join(process.cwd(), ".data", "site-config.json");

export async function GET() {
  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, "utf-8");
      const saved = JSON.parse(raw);
      if (!saved.event_token) {
        saved.event_token = crypto.randomBytes(12).toString("hex");
        fs.writeFileSync(configPath, JSON.stringify(saved, null, 2));
      }
      return NextResponse.json({ configured: true, ...saved });
    }
  } catch (e) {}

  // Fallback defaults
  return NextResponse.json({
    configured: false,
    event_token: null,
    day: "19/08/2026",
    time: "19 HORAS",
    place_name: "MAGIC BOOM",
    address_line1: "RUA CARLOS VASCONCELOS, 655",
    address_line2: "MEIRELES, FORTALEZA - CE"
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Preserve existing fields (like event_token) that may not be in the payload
    let existing: any = {};
    try {
      if (fs.existsSync(configPath)) {
        existing = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      }
    } catch {}

    const merged = { ...existing, ...body };
    if (!merged.event_token) {
      merged.event_token = crypto.randomBytes(12).toString("hex");
    }

    fs.writeFileSync(configPath, JSON.stringify(merged, null, 2));
    return NextResponse.json({ success: true, event_token: merged.event_token });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
