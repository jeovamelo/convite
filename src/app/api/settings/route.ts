import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data } = await supabase.from('settings').select('*').eq('id', 1).single();
  return NextResponse.json(data || {});
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { data: updated, error } = await supabase.from('settings').upsert({ id: 1, ...data }).select().single();
    if (error) throw error;
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
