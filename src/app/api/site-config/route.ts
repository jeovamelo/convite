import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const configPath = path.join(process.cwd(), ".data", "site-config.json");

export async function GET() {
  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, "utf-8");
      return NextResponse.json(JSON.parse(raw));
    }
  } catch (e) {}

  // Fallback defaults
  return NextResponse.json({
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
    fs.writeFileSync(configPath, JSON.stringify(body, null, 2));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
