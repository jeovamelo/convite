import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('tickets')
      .select('*')
      .order('public_id', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ tickets: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { id, guest_name, whatsapp } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Missing ticket ID' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('tickets')
      .update({ guest_name: guest_name || null, whatsapp: whatsapp || null })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, ticket: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
