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

/**
 * POST /api/tickets
 * Atualiza APENAS os campos editáveis de um ticket existente.
 * Nunca deleta, nunca re-cria. O public_id (LM-XXXX) é imutável.
 *
 * Body: { id: uuid, guest_name?: string, whatsapp?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, guest_name, whatsapp } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing ticket ID' }, { status: 400 });
    }

    // Build payload with only the fields that were provided
    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (guest_name !== undefined) payload.guest_name = guest_name || null;
    if (whatsapp !== undefined) payload.whatsapp = whatsapp || null;

    // Try to update by UUID primary key
    const { data, error } = await supabaseAdmin
      .from('tickets')
      .update(payload)
      .eq('id', id)
      .select('id, public_id, guest_name, whatsapp, status, people_per_invite')
      .single();

    if (error) {
      // If updated_at column doesn't exist, retry without it
      if (error.message?.includes('updated_at')) {
        delete payload.updated_at;
        const retry = await supabaseAdmin
          .from('tickets')
          .update(payload)
          .eq('id', id)
          .select('id, public_id, guest_name, whatsapp, status, people_per_invite')
          .single();
        if (retry.error) throw retry.error;
        return NextResponse.json({ success: true, ticket: retry.data });
      }
      throw error;
    }

    return NextResponse.json({ success: true, ticket: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
