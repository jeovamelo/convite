import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Priority 1: Try selecting with is_sent and sent_at directly from tickets table
    const { data: primaryData, error: primaryError } = await supabaseAdmin
      .from('tickets')
      .select('id, public_id, guest_name, whatsapp, quantidade_pessoas, status, token_hash, is_sent, sent_at')
      .order('public_id', { ascending: true });

    if (!primaryError && primaryData) {
      return NextResponse.json({ tickets: primaryData });
    }

    // Priority 2: Fallback if is_sent column does not exist on tickets table yet
    const { data: fallbackTickets, error: fallbackError } = await supabaseAdmin
      .from('tickets')
      .select('id, public_id, guest_name, whatsapp, quantidade_pessoas, status, token_hash')
      .order('public_id', { ascending: true });

    if (fallbackError) throw fallbackError;

    let tickets = fallbackTickets || [];

    // Check if ticket_sent_status table exists and merge
    try {
      const { data: sentData } = await supabaseAdmin.from('ticket_sent_status').select('ticket_id, is_sent, sent_at');
      if (sentData && sentData.length > 0) {
        const sentMap = new Map(sentData.map((s: any) => [s.ticket_id, s]));
        tickets = tickets.map((t: any) => {
          const sentInfo: any = sentMap.get(t.id) || sentMap.get(t.public_id);
          return {
            ...t,
            is_sent: sentInfo ? Boolean(sentInfo.is_sent) : false,
            sent_at: sentInfo ? sentInfo.sent_at : null
          };
        });
      }
    } catch {}

    return NextResponse.json({ tickets });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/tickets
 * Atualiza APENAS os campos editáveis de um ticket existente.
 * Nunca deleta, nunca re-cria. O public_id (LM-XXXX) é imutável.
 *
 * Body: { id: uuid, guest_name?: string, whatsapp?: string, is_sent?: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, guest_name, whatsapp, is_sent } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing ticket ID' }, { status: 400 });
    }

    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (guest_name !== undefined) payload.guest_name = guest_name || null;
    if (whatsapp !== undefined) payload.whatsapp = whatsapp || null;
    if (is_sent !== undefined) {
      payload.is_sent = Boolean(is_sent);
      payload.sent_at = is_sent ? new Date().toISOString() : null;
    }

    // Try update by id or public_id
    let { data, error } = await supabaseAdmin
      .from('tickets')
      .update(payload)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (!data) {
      const byPublicId = await supabaseAdmin
        .from('tickets')
        .update(payload)
        .eq('public_id', id)
        .select()
        .maybeSingle();
      data = byPublicId.data;
      error = byPublicId.error;
    }

    if (error) {
      // Retry without updated_at or is_sent if column missing
      delete payload.updated_at;
      delete payload.is_sent;
      delete payload.sent_at;
      const retry = await supabaseAdmin
        .from('tickets')
        .update(payload)
        .eq('id', id)
        .select('id, public_id, guest_name, whatsapp, status, quantidade_pessoas, token_hash')
        .single();
      if (retry.error) throw retry.error;
      return NextResponse.json({ success: true, ticket: retry.data });
    }

    return NextResponse.json({ success: true, ticket: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
