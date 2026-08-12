/**
 * Normalizador de URLs de imagem.
 *
 * URLs gravadas no banco/config podem apontar para hosts inacessíveis ao
 * navegador: `localhost`, `127.0.0.1` (geradas em dev) ou o hostname
 * interno do Docker (`convite-supabase-kong-1`, usado pelo cliente
 * server-side). Este helper reescreve a origem para a URL pública do
 * Supabase (`NEXT_PUBLIC_SUPABASE_URL`) antes de renderizar.
 *
 * Seguro para uso em Server e Client Components.
 */

const INTERNAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "convite-supabase-kong-1",
  "kong",
]);

export function resolveImageUrl(urlOrPath: string | null | undefined): string {
  if (!urlOrPath) return "/placeholder.png";

  // data URLs e caminhos relativos já são utilizáveis pelo navegador
  if (urlOrPath.startsWith("data:")) return urlOrPath;
  if (!urlOrPath.startsWith("http")) return urlOrPath;

  const publicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  if (!publicSupabaseUrl) return urlOrPath;

  try {
    const parsed = new URL(urlOrPath);
    if (INTERNAL_HOSTS.has(parsed.hostname)) {
      const target = new URL(publicSupabaseUrl);
      parsed.protocol = target.protocol;
      parsed.hostname = target.hostname;
      parsed.port = target.port;
      return parsed.toString();
    }
  } catch {
    // URL malformada: devolve como veio
  }

  return urlOrPath;
}
