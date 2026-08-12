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
    const body = await req.json();
    const { id, guest_name, whatsapp, is_sent, sent_status } = body;
    if (!id) {
      return NextResponse.json({ error: 'Missing ticket ID' }, { status: 400 });
    }

    const payload: Record<string, any> = {};
    if (guest_name !== undefined) payload.guest_name = guest_name || null;
    if (whatsapp !== undefined) payload.whatsapp = whatsapp || null;
    if (is_sent !== undefined) payload.is_sent = is_sent;
    if (sent_status !== undefined) payload.sent_status = sent_status;

    let { data, error } = await supabaseAdmin
      .from('tickets')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error && (is_sent !== undefined || sent_status !== undefined)) {
      const fallbackPayload = { ...payload };
      if (error.message?.includes('is_sent')) {
        delete fallbackPayload.is_sent;
        fallbackPayload.sent_status = is_sent ? 'SENT' : 'PENDING';
      } else if (error.message?.includes('sent_status')) {
        delete fallbackPayload.sent_status;
        fallbackPayload.is_sent = Boolean(sent_status === 'SENT' || sent_status === 'ENVIADO');
      }

      const retry = await supabaseAdmin
        .from('tickets')
        .update(fallbackPayload)
        .eq('id', id)
        .select()
        .single();

      if (!retry.error) {
        data = retry.data;
        error = null;
      }
    }

    if (error) throw error;
    return NextResponse.json({ success: true, ticket: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
