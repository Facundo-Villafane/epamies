import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Los Epamies - Premios de la Oficina",
  description: "Vota por tus compañeros favoritos en Los Epamies, los premios anuales de la oficina donde reconocemos a los mejores en diferentes categorías.",
  icons: {
    icon: [
      { url: '/favicon_io/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon_io/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon_io/favicon.ico' }
    ],
    apple: '/favicon_io/apple-touch-icon.png',
  },
  openGraph: {
    title: "Los Epamies - Premios de la Oficina",
    description: "Vota por tus compañeros favoritos en Los Epamies, los premios anuales de la oficina donde reconocemos a los mejores en diferentes categorías.",
    images: [
      {
        url: '/ChatGPT Image Dec 27, 2025, 12_59_32 PM.png',
        width: 1200,
        height: 630,
        alt: 'Los Epamies - Premios de la Oficina',
      }
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Los Epamies - Premios de la Oficina",
    description: "Vota por tus compañeros favoritos en Los Epamies, los premios anuales de la oficina donde reconocemos a los mejores en diferentes categorías.",
    images: ['/ChatGPT Image Dec 27, 2025, 12_59_32 PM.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
