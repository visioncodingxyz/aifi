import type React from "react"
import type { Metadata } from "next"
import { Poppins } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import "./globals.css"

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
})

export const metadata: Metadata = {
  title: "AiFi - Tokenized AI Agent Platform",
  description:
    "Create, share, and interact with custom AI agents on Solana. Build AI agents with unique personalities powered by advanced language models like Claude, GPT-4, and Gemini.",
  generator: "v0.app",
  keywords: ["AI agents", "Solana", "decentralized AI", "custom AI", "blockchain", "AI platform", "AiFi"],
  authors: [{ name: "AiFi" }],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "AiFi - Tokenized AI Agent Platform",
    description:
      "Create, share, and interact with custom AI agents on Solana. Build AI agents with unique personalities powered by advanced language models.",
    url: "https://genesisai.app",
    siteName: "AiFi",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AiFi - Tokenized AI Agent Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AiFi - Tokenized AI Agent Platform",
    description:
      "Create, share, and interact with custom AI agents on Solana. Build AI agents with unique personalities powered by advanced language models.",
    images: ["/og-image.png"],
    creator: "@TryGenesisAI",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${poppins.style.fontFamily};
  --font-sans: ${poppins.variable};
}
        `}</style>
      </head>
      <body className={poppins.className}>
        <Suspense fallback={null}>{children}</Suspense>
        <Analytics />
      </body>
    </html>
  )
}
