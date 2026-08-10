import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data: tickets, error } = await supabase.from('tickets').select('*');
    if (error) throw error;

    const ticketsList = tickets || [];

    const convidadosPrevistos = ticketsList.reduce((acc, curr) => acc + curr.quantidade_pessoas, 0);
    const pessoasPresentes = ticketsList
      .filter(r => r.status === 'USED')
      .reduce((acc, curr) => acc + curr.quantidade_pessoas, 0);
      
    const exibiveisUtilizados = ticketsList.filter(r => r.status === 'USED').length;
    const exibiveisDisponiveis = ticketsList.filter(r => r.status === 'AVAILABLE').length;
    const exibiveisCancelados = ticketsList.filter(r => r.status === 'CANCELLED').length;
    const totalGerados = ticketsList.length;

    const ultimasEntradas = ticketsList
      .filter(r => r.status === 'USED' && r.used_at !== null)
      .sort((a, b) => new Date(b.used_at!).getTime() - new Date(a.used_at!).getTime())
      .slice(0, 10);

    return NextResponse.json({
      convidadosPrevistos,
      pessoasPresentes,
      exibiveisUtilizados,
      exibiveisDisponiveis,
      exibiveisCancelados,
      totalGerados,
      ultimasEntradas
    });
  } catch(e) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
