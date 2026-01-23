import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Mono, Oswald, JetBrains_Mono } from "next/font/google";
import { UserProvider } from "@/contexts/UserContext";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
  display: 'swap',
});

const oswald = Oswald({
  subsets: ['latin'],
  variable: '--font-oswald',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Party Games",
  description: "Play party games with friends",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${plusJakarta.variable} ${spaceMono.variable} ${oswald.variable} ${jetbrainsMono.variable}`}>
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
}
