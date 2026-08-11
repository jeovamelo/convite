import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin as supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ status: 'INVALID', message: 'Token não fornecido' }, { status: 400 });
    }

    console.log('[SCAN] Token recebido bruto:', token);

    // Limpa e normaliza o token
    let cleanToken = token.trim();

    // Se for URL completa, extrai apenas o último segmento do path
    if (cleanToken.startsWith('http://') || cleanToken.startsWith('https://')) {
      try {
        const urlObj = new URL(cleanToken);
        const segments = urlObj.pathname.split('/').filter(Boolean);
        cleanToken = segments[segments.length - 1] ?? cleanToken;
        console.log('[SCAN] URL detectada. Token extraído:', cleanToken);
      } catch {
        console.warn('[SCAN] Falha ao parsear URL, usando token bruto:', cleanToken);
      }
    }

    console.log('[SCAN] Token processado:', cleanToken);

    // Busca 1: pelo hash do token seguro (tokens gerados pelo /api/generate)
    const tokenHash = crypto.createHash('sha256').update(cleanToken).digest('hex');
    console.log('[SCAN] Buscando por token_hash:', tokenHash);

    let { data: record, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (error) {
      console.error('[SCAN] Erro na busca por token_hash:', error);
    }

    // Busca 2 (fallback): pelo public_id amigável (ex: "LM-0001")
    if (!record) {
      console.log('[SCAN] token_hash não encontrado. Tentando por public_id:', cleanToken.toUpperCase());
      const { data: byPublicId, error: pubError } = await supabase
        .from('tickets')
        .select('*')
        .eq('public_id', cleanToken.toUpperCase())
        .maybeSingle();

      if (pubError) {
        console.error('[SCAN] Erro na busca por public_id:', pubError);
      }

      if (byPublicId) {
        record = byPublicId;
        console.log('[SCAN] Encontrado por public_id:', record.public_id);
      }
    }

    if (!record) {
      console.warn('[SCAN] Registro não encontrado para token:', cleanToken);
      return NextResponse.json({ status: 'INVALID', message: 'QR Code não encontrado.' }, { status: 404 });
    }

    console.log('[SCAN] Registro encontrado:', record.public_id, '| Status:', record.status);

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
      
      // Atomic update: só atualiza se ainda estiver AVAILABLE (evita dupla entrada)
      const { data: updatedRecord, error: updateError } = await supabase
        .from('tickets')
        .update({ status: 'USED', used_at: now, checked_in_by: 'user_reception' })
        .eq('id', record.id)
        .eq('status', 'AVAILABLE')
        .select()
        .single();

      if (updateError || !updatedRecord) {
        console.error('[SCAN] Erro ao fazer update atômico:', updateError);
        // Verifica se outra requisição concorrente já fez o check-in
        const { data: latestRecord } = await supabase
          .from('tickets')
          .select('*')
          .eq('id', record.id)
          .single();

        if (latestRecord?.status === 'USED') {
          console.log('[SCAN] Concorrência detectada, exibível já foi marcado USED por outra requisição.');
          return NextResponse.json({
            status: 'ALREADY_USED',
            public_id: latestRecord.public_id,
            guest_name: latestRecord.guest_name,
            used_at: latestRecord.used_at,
          });
        }

        return NextResponse.json({ status: 'ERROR', message: 'Erro ao registrar check-in' }, { status: 500 });
      }

      console.log('[SCAN] Check-in registrado com sucesso:', updatedRecord.public_id, '| Pessoas:', updatedRecord.quantidade_pessoas);

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
    console.error('[SCAN] Exceção não tratada:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
