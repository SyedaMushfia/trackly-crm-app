import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { NextAuthSessionProvider } from "@/components/session-provider";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Trackly CRM App",
  description: "Sales Lead Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning prevents React mismatch warning when
    // ThemeProvider adds/removes the "dark" class on the client
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark")document.documentElement.classList.add("dark");}catch(e){}})();`,
          }}
        />
      </head>
      <body className={inter.className}>
        <NextAuthSessionProvider>
          <ThemeProvider>
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                style: { color: "#111827" },
                success: {
                  iconTheme: { primary: "#18cb96", secondary: "#ffffff" },
                },
                error: {
                  iconTheme: { primary: "#ef4444", secondary: "#ffffff" },
                },
              }}
            />
          </ThemeProvider>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}