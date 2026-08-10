import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();
    const file = data.get("image") as File;
    
    if (!file) {
      return NextResponse.json({ error: 'Missing image file' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = `data:${file.type || "image/png"};base64,${buffer.toString("base64")}`;
    const uploadDir = path.join(process.cwd(), ".data");
    
    // Ensure directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, "background.png");
    
    // Write background file
    fs.writeFileSync(filePath, buffer);

    const { error: dbError } = await supabaseAdmin
      .from("settings")
      .update({ base_image: base64 })
      .eq("name", "Padrão (Inicial)");
    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, path: "/api/bg" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
