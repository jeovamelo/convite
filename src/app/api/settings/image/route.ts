import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const layoutId = searchParams.get('layout_id');

  let query = supabaseAdmin.from('settings').select('base_image');
  
  if (layoutId) {
    query = query.eq('id', layoutId).single();
  } else {
    query = query.order('id', { ascending: true }).limit(1).single();
  }

  const { data, error } = await query;
  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (data?.base_image) {
    return NextResponse.json({ image: data.base_image });
  }
  return NextResponse.json({ image: null });
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();
    const file = data.get("image") as File;
    const layoutId = data.get("layout_id") as string;
    
    if (!layoutId) {
      return NextResponse.json({ error: 'Missing layout id' }, { status: 400 });
    }

    let relativeUrl = null;
    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      
      // Ensure directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const fileName = `${layoutId}.png`;
      const filePath = path.join(uploadDir, fileName);
      
      // Write file
      fs.writeFileSync(filePath, buffer);
      relativeUrl = `/uploads/${fileName}`;
    }
    
    const { error } = await supabaseAdmin
      .from('settings')
      .update({ base_image: relativeUrl })
      .eq('id', layoutId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, image: relativeUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
