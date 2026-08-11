import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { supabaseAdmin } from "@/lib/supabase";

const BUCKET_NAME = "event-assets";
const CONFIG_PATH = path.join(process.cwd(), ".data", "site-config.json");

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();
    const file = data.get("image") as File;
    
    if (!file) {
      return NextResponse.json({ error: 'Missing image file' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name?.split('.').pop()?.toLowerCase() || 'png';
    const contentType = file.type || (ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png');
    const fileName = `background-${Date.now()}.${ext}`;

    console.log(`[BG-UPLOAD] Uploading ${fileName} (${buffer.length} bytes, ${contentType})`);

    // 1. Ensure bucket exists (create if needed)
    try {
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      const exists = buckets?.some((b: any) => b.name === BUCKET_NAME);
      if (!exists) {
        console.log(`[BG-UPLOAD] Creating bucket '${BUCKET_NAME}'`);
        await supabaseAdmin.storage.createBucket(BUCKET_NAME, { public: true });
      }
    } catch (bucketErr: any) {
      console.warn("[BG-UPLOAD] Bucket check/create warning:", bucketErr?.message);
      // Continue anyway — bucket might already exist
    }

    // 2. Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType,
        upsert: true,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("[BG-UPLOAD] Storage upload error:", uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    console.log("[BG-UPLOAD] Upload successful:", uploadData?.path);

    // 3. Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    const publicUrl = urlData?.publicUrl;
    console.log("[BG-UPLOAD] Public URL:", publicUrl);

    // 4. Save URL in site-config.json for persistence
    if (publicUrl) {
      try {
        let existing: any = {};
        if (fs.existsSync(CONFIG_PATH)) {
          existing = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
        }
        existing.background_url = publicUrl;
        const dir = path.dirname(CONFIG_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(existing, null, 2));
      } catch (cfgErr) {
        console.warn("[BG-UPLOAD] Config save warning:", cfgErr);
      }
    }

    // 5. Also save local copy as fallback
    try {
      const uploadDir = path.join(process.cwd(), ".data");
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      fs.writeFileSync(path.join(uploadDir, "background.png"), buffer);
    } catch {}

    // 6. Also save to settings table as legacy fallback (but NOT base64 — just the URL)
    try {
      await supabaseAdmin
        .from("settings")
        .upsert({ 
          name: "Padrão (Inicial)", 
          base_image: publicUrl || `data:${contentType};base64,${buffer.toString("base64")}`
        }, {
          onConflict: "name"
        });
    } catch {}
    
    return NextResponse.json({ 
      success: true, 
      url: publicUrl || "/api/bg",
      path: "/api/bg" 
    });
  } catch (error: any) {
    console.error("[BG-UPLOAD] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
