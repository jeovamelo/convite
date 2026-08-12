import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const layoutId = searchParams.get('layout_id');

  const baseQuery = supabaseAdmin.from('settings').select('*');

  // default to the standard or newest one when no layout is specified
  const { data, error } = layoutId
    ? await baseQuery.eq('id', layoutId).single()
    : await baseQuery.order('id', { ascending: true }).limit(1).single();
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

    // Sanitize integer fields to avoid float errors in Postgres
    const integerFields = ['qr_x', 'qr_y', 'qr_size', 'id_x', 'id_y', 'id_width', 'id_height', 'id_fontSize', 'quantity', 'peoplePerInvite', 'title_size'];
    const payload = { ...data };
    
    for (const field of integerFields) {
      if (payload[field] !== undefined && payload[field] !== null) {
        const parsed = Math.round(Number(payload[field]));
        if (!isNaN(parsed)) {
          payload[field] = parsed;
        }
      }
    }

    // Check if setting row exists for this ID
    const { data: existing } = await supabaseAdmin.from('settings').select('id, name').eq('id', id).maybeSingle();

    if (existing) {
      // If row exists and payload name is a generic fallback, keep existing name
      if (payload.name === "Padrão" && existing.name && existing.name !== "Padrão") {
        payload.name = existing.name;
      }

      let { data: updated, error } = await supabaseAdmin
        .from('settings')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error && error.message?.includes('settings_name_key')) {
        delete payload.name;
        const retry = await supabaseAdmin
          .from('settings')
          .update(payload)
          .eq('id', id)
          .select()
          .single();

        if (!retry.error) {
          updated = retry.data;
          error = null;
        }
      }

      if (error) throw error;
      return NextResponse.json({ success: true, data: updated });
    } else {
      // If inserting a new layout, ensure name is not duplicate
      const { data: created, error } = await supabaseAdmin
        .from('settings')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data: created });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
