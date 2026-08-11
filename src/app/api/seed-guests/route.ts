import { NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const updates = [
  { code: "LM-0001", name: "Luiz Maurício" },
  { code: "LM-0002", name: "Rosa" },
  { code: "LM-0003", name: "Júnior" },
  { code: "LM-0004", name: "Rodrigo" },
  { code: "LM-0005", name: "Mateus" },
  { code: "LM-0006", name: "Rozimar" },
  { code: "LM-0007", name: "Emília" },
  { code: "LM-0008", name: "Noah" },
  { code: "LM-0009", name: "Alef" },
  { code: "LM-0010", name: "Cássia" },
  { code: "LM-0011", name: "Vitor" },
  { code: "LM-0012", name: "Júlia" },
  { code: "LM-0013", name: "Jefferson" },
  { code: "LM-0014", name: "Lene" },
  { code: "LM-0015", name: "Celenita" },
  { code: "LM-0016", name: "Socorro" },
  { code: "LM-0017", name: "Dulce" },
  { code: "LM-0018", name: "Bibi" },
  { code: "LM-0019", name: "Albinha" },
  { code: "LM-0020", name: "Emily" },
  { code: "LM-0021", name: "Maria Eduarda" },
  { code: "LM-0022", name: "Carlinhos" },
  { code: "LM-0023", name: "Barbara" },
  { code: "LM-0024", name: "Davi" },
  { code: "LM-0025", name: "Bia" },
  { code: "LM-0026", name: "Yasse" },
  { code: "LM-0027", name: "Ciro" },
  { code: "LM-0028", name: "Lorena" },
  { code: "LM-0029", name: "Lorena - Sogra" },
  { code: "LM-0030", name: "Lorena - Sobrinha" },
  { code: "LM-0031", name: "Viviane" },
  { code: "LM-0032", name: "Kassius" },
  { code: "LM-0033", name: "Kassius - Filha" },
  { code: "LM-0034", name: "Terezinha" },
  { code: "LM-0035", name: "Lia" },
  { code: "LM-0036", name: "Elizangela" },
  { code: "LM-0037", name: "Otacilio" },
  { code: "LM-0038", name: "Stela" },
  { code: "LM-0039", name: "Mara" },
  { code: "LM-0040", name: "Juan" },
  { code: "LM-0041", name: "Juan - Marido" },
  { code: "LM-0042", name: "Juliana" },
  { code: "LM-0043", name: "Juliana - Marido" },
  { code: "LM-0044", name: "Beatriz" },
  { code: "LM-0045", name: "Mariana" },
  { code: "LM-0046", name: "Mariana - Marido" },
  { code: "LM-0047", name: "Tia Liduina" },
  { code: "LM-0048", name: "Tia Liduina - Cuidadora" },
  { code: "LM-0049", name: "Dona Marlene" },
  { code: "LM-0050", name: "Carol" },
  { code: "LM-0051", name: "Carol - Filha" },
  { code: "LM-0052", name: "Carol - Marido" },
  { code: "LM-0053", name: "Paulo Cesar" },
  { code: "LM-0054", name: "Micheline" },
  { code: "LM-0055", name: "Micheline - Filho" },
  { code: "LM-0056", name: "Paulo Mauricio" },
  { code: "LM-0057", name: "Renata" },
  { code: "LM-0058", name: "Renata - Filho" },
  { code: "LM-0059", name: "Renata - Filha" },
  { code: "LM-0060", name: "Cilinha" },
  { code: "LM-0061", name: "Cilinha - Nora" },
  { code: "LM-0062", name: "Cilinha - Neta" },
  { code: "LM-0063", name: "Cilinha - Neto" },
  { code: "LM-0064", name: "Mauricinho" },
  { code: "LM-0065", name: "Mauricinho - Esposa" },
  { code: "LM-0066", name: "Mauricinho - Filho" },
  { code: "LM-0067", name: "Mauricinho - Filha" },
  { code: "LM-0068", name: "Aline" },
  { code: "LM-0069", name: "Aline - Marido" },
  { code: "LM-0070", name: "Aline - Filho" },
  { code: "LM-0071", name: "Aline - Filha" },
  { code: "LM-0072", name: "Kamila" },
  { code: "LM-0073", name: "Bruno" },
  { code: "LM-0074", name: "Yasmim" },
  { code: "LM-0075", name: "Kercia" },
  { code: "LM-0076", name: "Kercia - Mãe" },
  { code: "LM-0077", name: "Kercia - Sobrinha" },
  { code: "LM-0078", name: "Amelia" },
  { code: "LM-0079", name: "Cris" },
  { code: "LM-0080", name: "Cris - Filho" },
  { code: "LM-0081", name: "Cris - Filha" },
  { code: "LM-0082", name: "Eli Vale" },
  { code: "LM-0083", name: "Aurora" },
  { code: "LM-0084", name: "Fábio" },
  { code: "LM-0085", name: "Nataly" },
  { code: "LM-0086", name: "Nataly - Filho" },
  { code: "LM-0087", name: "Nataly - Marido" },
  { code: "LM-0088", name: "Samia" },
  { code: "LM-0089", name: "Samia - Filha 1" },
  { code: "LM-0090", name: "Samia - Filha 2" },
  { code: "LM-0091", name: "Monteiro" },
  { code: "LM-0092", name: "Consuela" },
  { code: "LM-0093", name: "Ivoneide" },
  { code: "LM-0094", name: "Taciana" },
  { code: "LM-0095", name: "Taciana - Filho 1" },
  { code: "LM-0096", name: "Taciana - Filho 2" },
  { code: "LM-0097", name: "Sofia" },
  { code: "LM-0098", name: "Alyson" },
  { code: "LM-0099", name: "Bia" },
  { code: "LM-0100", name: "Bia - Filha" },
  { code: "LM-0101", name: "Emily" },
  { code: "LM-0102", name: "Tata" },
  { code: "LM-0103", name: "Licia" },
  { code: "LM-0104", name: "Licia - Filha" },
  { code: "LM-0105", name: "Karine" },
  { code: "LM-0106", name: "Karine - Filho" },
  { code: "LM-0107", name: "Karine - Filha" },
  { code: "LM-0108", name: "Ana Paula" },
  { code: "LM-0109", name: "Ana Paula - Filha" },
  { code: "LM-0110", name: "Aline" },
  { code: "LM-0111", name: "Paula Isabele" },
  { code: "LM-0112", name: "Val" },
  { code: "LM-0113", name: "Val - Filha" },
  { code: "LM-0114", name: "Ju" },
  { code: "LM-0115", name: "Ju - Filha" }
];

export async function GET() {
  try {
    let updatedCount = 0;
    let errors: any[] = [];

    for (const item of updates) {
      const { error } = await supabase
        .from("tickets")
        .update({ guest_name: item.name })
        .eq("public_id", item.code);

      if (error) {
        errors.push({ code: item.code, error: error.message });
      } else {
        updatedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      totalRequested: updates.length,
      updatedCount,
      errorsCount: errors.length,
      errors
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
