import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../lib/AuthContext";
import { Navbar } from "../components/Navbar";
import { AuthModal } from "../components/AuthModal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Universidad Nacional Rosario Castellanos — Control Escolar Inteligente",
  description: "Plataforma oficial de control de accesos, credenciales digitales con QR, gestión docente y consola de administración de base de datos para la Universidad Nacional Rosario Castellanos.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#04060C] text-[#f3f4f6] font-sans selection:bg-emerald-500 selection:text-black">
        <AuthProvider>
          {/* Global Navbar */}
          <Navbar />

          {/* Background Ambient Glow */}
          <div className="fixed inset-0 cyber-grid pointer-events-none z-[-1] opacity-50"></div>
          <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-600/5 rounded-full blur-[140px] pointer-events-none z-[-1]"></div>
          <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-amber-500/5 rounded-full blur-[140px] pointer-events-none z-[-1]"></div>

          {/* Main Content */}
          <main className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 relative">
            {children}
          </main>

          {/* Auth Modal Dialog */}
          <AuthModal />

          {/* Footer */}
          <footer className="border-t border-white/5 py-8 bg-black/40 backdrop-blur-md text-center text-xs text-gray-500">
            <div className="max-w-7xl mx-auto px-4 space-y-2">
              <p className="font-semibold text-gray-400">
                UNIVERSIDAD NACIONAL ROSARIO CASTELLANOS — GOBIERNO DE LA CIUDAD DE MÉXICO
              </p>
              <p className="text-gray-600">
                © {new Date().getFullYear()} UNRC. Sistema Multirrol con Autenticación Gmail & Consola PostgreSQL.
              </p>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
