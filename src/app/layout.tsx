import type { Metadata, Viewport } from "next";
import { Montserrat, Inter } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({ 
  subsets: ["latin"],
  weight: ["400", "700", "800", "900"],
  variable: '--font-montserrat',
  style: ['normal', 'italic']
});

const inter = Inter({ 
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "Luiz Maurício - 4 Anos!",
  description: "Vem comemorar comigo!",
};

export const viewport: Viewport = {
  themeColor: "#001A55",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${montserrat.variable} font-inter antialiased bg-sonicBlueNavy text-white min-h-screen relative overflow-x-hidden`}>
        {/* Fundo Quadriculado em CSS (Green Hill Checkerboard) */}
        <div className="fixed inset-0 z-[-2] checkerboard-bg opacity-40"></div>
        
        {/* Gradiente para profundidade */}
        <div className="fixed inset-0 z-[-1] bg-gradient-to-b from-sonicBlueMain/80 to-sonicBlueNavy/90 mix-blend-multiply"></div>
        
        {children}
      </body>
    </html>
  );
}
