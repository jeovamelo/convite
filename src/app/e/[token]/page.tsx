import { redirect } from "next/navigation";

// Legado: QR codes antigos apontavam para /e/{token}.
// A URL final do hotsite é /evento/{token}.
export default function LegacyExibivelRedirect({ params }: { params: { token: string } }) {
  redirect(`/evento/${params.token}`);
}
