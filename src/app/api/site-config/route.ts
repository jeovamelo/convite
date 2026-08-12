import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { resolveImageUrl } from "@/lib/imageUrl";

export const dynamic = "force-dynamic";

const configPath = path.join(process.cwd(), ".data", "site-config.json");

const generateReceptionToken = () => {
  return `sec_scan_${crypto.randomBytes(6).toString("hex")}`;
};

export async function GET() {
  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, "utf-8");
      const saved = JSON.parse(raw);
      let updated = false;

      if (!saved.event_token) {
        saved.event_token = crypto.randomBytes(12).toString("hex");
        updated = true;
      }

      if (!saved.reception_token) {
        saved.reception_token = generateReceptionToken();
        updated = true;
      }

      if (updated) {
        fs.writeFileSync(configPath, JSON.stringify(saved, null, 2));
      }

      if (saved.background_url) {
        saved.background_url = resolveImageUrl(saved.background_url);
      }

      return NextResponse.json({ configured: true, ...saved });
    }
  } catch (e) {}

  // Fallback defaults with a generated token if file didn't exist
  const defaultToken = generateReceptionToken();
  const defaultConfig = {
    configured: false,
    event_token: null,
    reception_token: defaultToken,
    day: "19/08/2026",
    time: "19 HORAS",
    place_name: "MAGIC BOOM",
    address_line1: "RUA CARLOS VASCONCELOS, 655",
    address_line2: "MEIRELES, FORTALEZA - CE"
  };

  try {
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  } catch (e) {}

  return NextResponse.json(defaultConfig);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Preserve existing fields (like event_token & reception_token)
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
    if (!merged.reception_token) {
      merged.reception_token = generateReceptionToken();
    }

    fs.writeFileSync(configPath, JSON.stringify(merged, null, 2));
    return NextResponse.json({ 
      success: true, 
      event_token: merged.event_token, 
      reception_token: merged.reception_token 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
