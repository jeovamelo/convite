import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const layoutId = searchParams.get('layout_id');

  let query = supabaseAdmin.from('settings').select('*');
  
  if (layoutId) {
    query = query.eq('id', layoutId).single();
  } else {
    // default to the standard or newest one
    query = query.order('id', { ascending: true }).limit(1).single();
  }

  const { data, error } = await query;
  if (error && error.code !== 'PGRST116') { // Ignore "0 rows" error
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data || {});
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const id = data.id;
    if (!id) {
      return NextResponse.json({ error: 'Missing layout id' }, { status: 400 });
    }

    const { data: updated, error } = await supabaseAdmin.from('settings').upsert(data).select().single();
    if (error) throw error;
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
