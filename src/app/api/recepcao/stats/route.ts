import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    // Tenta com quantidade_pessoas primeiro; se falhar, cai para people_per_invite
    let tickets: any[] | null = null;
    let usePeoplePerInvite = false;

    const primary = await supabase
      .from('tickets')
      .select('id, public_id, status, quantidade_pessoas, guest_name, used_at')
      .order('used_at', { ascending: false });

    if (primary.error) {
      const msg = primary.error.message ?? '';
      const code = primary.error.code ?? '';
      const isColumnMissing =
        msg.includes('quantidade_pessoas') ||
        msg.includes('column') ||
        code === '42703';

      if (isColumnMissing) {
        // Fallback para people_per_invite
        console.warn('[STATS] quantidade_pessoas não encontrado, tentando people_per_invite');
        usePeoplePerInvite = true;

        const fallback = await supabase
          .from('tickets')
          .select('id, public_id, status, people_per_invite, guest_name, used_at')
          .order('used_at', { ascending: false });

        if (fallback.error) {
          // Último fallback: sem coluna de pessoas
          console.warn('[STATS] people_per_invite também não existe, buscando sem coluna de pessoas');
          const minimal = await supabase
            .from('tickets')
            .select('id, public_id, status, guest_name, used_at')
            .order('used_at', { ascending: false });

          if (minimal.error) throw minimal.error;
          tickets = minimal.data;
        } else {
          tickets = fallback.data;
        }
      } else {
        console.error('[STATS] Supabase error:', primary.error);
        throw primary.error;
      }
    } else {
      tickets = primary.data;
    }

    const ticketsList = tickets || [];

    // Função de acesso à coluna de pessoas (tolerante a ambos os nomes)
    const getPeople = (r: any): number => {
      if (r.quantidade_pessoas != null) return r.quantidade_pessoas;
      if (r.people_per_invite != null) return r.people_per_invite;
      return 1;
    };

    const convidadosPrevistos = ticketsList.reduce((acc, curr) => acc + getPeople(curr), 0);
    const pessoasPresentes = ticketsList
      .filter(r => r.status === 'USED')
      .reduce((acc, curr) => acc + getPeople(curr), 0);

    const exibiveisUtilizados = ticketsList.filter(r => r.status === 'USED').length;
    const exibiveisDisponiveis = ticketsList.filter(r => r.status === 'AVAILABLE').length;
    const exibiveisCancelados = ticketsList.filter(r => r.status === 'CANCELLED').length;
    const totalGerados = ticketsList.length;

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
