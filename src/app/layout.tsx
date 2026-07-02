import type { Metadata } from "next";
import { Big_Shoulders, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

/* Kinetra type system
   - Big Shoulders Display: hero + big section titles only
   - Inter: body, nav, buttons
   - IBM Plex Mono: timecodes, labels, captions
*/
const bigShoulders = Big_Shoulders({
  variable: "--font-big-shoulders",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kinetra — Edited for impact.",
  description:
    "Kinetra is a cinematic, story-driven video editing studio for personal brands, influencers, and creators. Short-form, long-form, and motion graphics.",
  keywords: [
    "video editing",
    "cinematic editing",
    "short-form video",
    "motion graphics",
    "VFX",
    "creator editing",
    "Kinetra",
  ],
  authors: [{ name: "Kinetra" }],
  openGraph: {
    title: "Kinetra — Edited for impact.",
    description:
      "Cinematic, story-driven video editing for personal brands and creators.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kinetra — Edited for impact.",
    description:
      "Cinematic, story-driven video editing for personal brands and creators.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${bigShoulders.variable} ${inter.variable} ${plexMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
