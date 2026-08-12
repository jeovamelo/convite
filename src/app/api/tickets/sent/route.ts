import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// POST /api/tickets/sent
// Body: { ticket_id: string, is_sent: boolean }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticket_id, is_sent } = body;

    if (!ticket_id) {
      return NextResponse.json({ error: "Missing ticket_id" }, { status: 400 });
    }

    const sentAt = is_sent ? new Date().toISOString() : null;
    const isSentBool = Boolean(is_sent);

    // 1. Direct update on public.tickets table (primary)
    try {
      await supabaseAdmin
        .from("tickets")
        .update({
          is_sent: isSentBool,
          sent_at: sentAt
        })
        .or(`id.eq.${ticket_id},public_id.eq.${ticket_id}`);
    } catch (err) {
      console.warn("[tickets/sent] Direct update on tickets table warning:", err);
    }

    // 2. Also upsert into ticket_sent_status table (secondary fallback)
    try {
      await supabaseAdmin
        .from("ticket_sent_status")
        .upsert(
          {
            ticket_id,
            is_sent: isSentBool,
            sent_at: sentAt,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "ticket_id" }
        );
    } catch (err) {
      console.warn("[tickets/sent] Secondary table ticket_sent_status upsert warning:", err);
    }

    return NextResponse.json({ success: true, is_sent: isSentBool, sent_at: sentAt });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/tickets/sent?ticket_id=xxx  OR  /api/tickets/sent (all)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ticket_id = searchParams.get("ticket_id");

    // Try tickets table
    let query = supabaseAdmin.from("tickets").select("id, public_id, is_sent, sent_at");
    if (ticket_id) query = query.or(`id.eq.${ticket_id},public_id.eq.${ticket_id}`);

    const { data, error } = await query;
    if (!error && data) {
      return NextResponse.json({ data });
    }

    // Fallback: try ticket_sent_status
    let fallbackQuery = supabaseAdmin.from("ticket_sent_status").select("*");
    if (ticket_id) fallbackQuery = fallbackQuery.eq("ticket_id", ticket_id);

    const { data: fallbackData } = await fallbackQuery;
    return NextResponse.json({ data: fallbackData || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
