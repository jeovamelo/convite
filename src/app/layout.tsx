import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Luiz Mauricio - 4 Anos!",
  description: "Vem comemorar comigo!",
};

export const viewport: Viewport = {
  themeColor: "#001A55",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased bg-sonicBlueNavy text-white min-h-screen relative overflow-x-hidden">
        <div className="fixed inset-0 z-[-2] checkerboard-bg opacity-40" />
        <div className="fixed inset-0 z-[-1] bg-gradient-to-b from-sonicBlueMain/80 to-sonicBlueNavy/90 mix-blend-multiply" />
        {children}
      </body>
    </html>
  );
}

