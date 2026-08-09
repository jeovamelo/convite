import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data } = await supabase.from('settings').select('base_image').eq('id', 1).single();
  if (data?.base_image) {
    return NextResponse.json({ image: data.base_image });
  }
  return NextResponse.json({ image: null });
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();
    const file = data.get("image") as File;
    
    let base64 = null;
    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      base64 = `data:${file.type};base64,${buffer.toString('base64')}`;
    }
    
    await supabase.from('settings').upsert({ id: 1, base_image: base64 });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
