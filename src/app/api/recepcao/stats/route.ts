import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('id, public_id, status, quantidade_pessoas, guest_name, used_at')
      .order('used_at', { ascending: false });

    if (error) {
      console.error('[STATS] Supabase error:', error);
      throw error;
    }

    const ticketsList = tickets || [];

    // Convidados totais previstos = soma das pessoas por exibível
    const convidadosPrevistos = ticketsList.reduce((acc, curr) => acc + (curr.quantidade_pessoas ?? 1), 0);

    // Pessoas presentes = soma das pessoas nos exibíveis já utilizados
    const pessoasPresentes = ticketsList
      .filter(r => r.status === 'USED')
      .reduce((acc, curr) => acc + (curr.quantidade_pessoas ?? 1), 0);
      
    const exibiveisUtilizados = ticketsList.filter(r => r.status === 'USED').length;
    const exibiveisDisponiveis = ticketsList.filter(r => r.status === 'AVAILABLE').length;
    const exibiveisCancelados = ticketsList.filter(r => r.status === 'CANCELLED').length;
    const totalGerados = ticketsList.length;

    // Últimas 10 entradas (já ordenadas por used_at desc pelo Supabase)
    const ultimasEntradas = ticketsList
      .filter(r => r.status === 'USED' && r.used_at !== null)
      .slice(0, 10);

    console.log(`[STATS] presentes=${pessoasPresentes} | utilizados=${exibiveisUtilizados} | total=${totalGerados}`);

    return NextResponse.json({
      convidadosPrevistos,
      pessoasPresentes,
      exibiveisUtilizados,
      exibiveisDisponiveis,
      exibiveisCancelados,
      totalGerados,
      ultimasEntradas
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
      }
    });
  } catch(e: any) {
    console.error('[STATS] Internal error:', e?.message);
    return NextResponse.json({ error: "Internal Error", detail: e?.message }, { status: 500 });
  }
}
