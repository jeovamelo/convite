import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Select all existing columns dynamically so no column mismatch occurs
    const { data: tickets, error } = await supabaseAdmin
      .from('tickets')
      .select('*')
      .order('public_id', { ascending: true });

    if (error) {
      console.error("[GET /api/tickets] Supabase query error:", error);
      throw error;
    }

    return NextResponse.json({ tickets: tickets || [] });
  } catch (error: any) {
    console.error("[GET /api/tickets] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/tickets
 * Atualiza os campos editáveis de um ticket existente.
 * Body: { id: string, guest_name?: string, whatsapp?: string, is_sent?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, guest_name, whatsapp, is_sent } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing ticket ID' }, { status: 400 });
    }

    const payload: Record<string, any> = {};
    if (guest_name !== undefined) payload.guest_name = guest_name || null;
    if (whatsapp !== undefined) payload.whatsapp = whatsapp || null;
    if (is_sent !== undefined) {
      payload.is_sent = Boolean(is_sent);
    }

    // Detect if ID is UUID or public_id (e.g. LM-0001) to prevent UUID syntax error in PostgreSQL
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id));
    const filterCol = isUuid ? 'id' : 'public_id';

    let { data, error } = await supabaseAdmin
      .from('tickets')
      .update(payload)
      .eq(filterCol, id)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error("[POST /api/tickets] Update error:", error);
      // Fallback: se falhar por causa da coluna is_sent, tenta salvar apenas nome e whatsapp
      delete payload.is_sent;
      const retry = await supabaseAdmin
        .from('tickets')
        .update(payload)
        .eq(filterCol, id)
        .select('*')
        .maybeSingle();

      if (retry.error) {
        console.error("[POST /api/tickets] Retry error:", retry.error);
        return NextResponse.json({ error: retry.error.message }, { status: 500 });
      }
      data = retry.data;
    }

    return NextResponse.json({ success: true, ticket: data });
  } catch (error: any) {
    console.error("[POST /api/tickets] Exception:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
