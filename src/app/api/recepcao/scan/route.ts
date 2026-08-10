import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin as supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ status: 'INVALID', message: 'Token não fornecido' }, { status: 400 });
    }

    // In a real DB, we'd hash the token to find the record (since we store token_hash).
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Atomic simulation (in memory it's already sync, but in real DB we would do an UPDATE ... WHERE status = 'AVAILABLE')
    const { data: record, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('token_hash', tokenHash)
      .single();

    if (error || !record) {
      return NextResponse.json({ status: 'INVALID', message: 'QR Code não encontrado.' }, { status: 404 });
    }


    if (record.status === 'USED') {
      return NextResponse.json({ 
        status: 'ALREADY_USED', 
        public_id: record.public_id,
        guest_name: record.guest_name,
        used_at: record.used_at 
      });
    }

    if (record.status === 'CANCELLED') {
      return NextResponse.json({ status: 'INVALID', message: 'Exibível cancelado.' });
    }

    if (record.status === 'AVAILABLE') {
      const now = new Date().toISOString();
      const { data: updatedRecord, error: updateError } = await supabase
        .from('tickets')
        .update({ status: 'USED', used_at: now, checked_in_by: 'user_reception' })
        .eq('id', record.id)
        .eq('status', 'AVAILABLE')
        .select()
        .single();

      if (updateError || !updatedRecord) {
        const { data: latestRecord } = await supabase
          .from('tickets')
          .select('*')
          .eq('id', record.id)
          .single();

        if (latestRecord?.status === 'USED') {
          return NextResponse.json({
            status: 'ALREADY_USED',
            public_id: latestRecord.public_id,
            guest_name: latestRecord.guest_name,
            used_at: latestRecord.used_at,
          });
        }

        return NextResponse.json({ status: 'ERROR', message: 'Erro ao registrar check-in' }, { status: 500 });
      }

      return NextResponse.json({
        status: 'SUCCESS',
        public_id: updatedRecord.public_id,
        quantidade_pessoas: updatedRecord.quantidade_pessoas,
        guest_name: updatedRecord.guest_name,
        used_at: updatedRecord.used_at
      });
    }

    return NextResponse.json({ status: 'INVALID' });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
