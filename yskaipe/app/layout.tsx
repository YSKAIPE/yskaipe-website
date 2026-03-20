import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'YSKAIPE — Every Maze Has an Exit',
  description: 'AI-powered navigation through the mazes of Bitcoin, Sustainability, the Garden, and AI. The maze is a puzzle, not a prison.',
  keywords: ['bitcoin', 'DeFi', 'sustainability', 'homesteading', 'AI agents', 'off-grid', 'garden', 'YSKAIPE'],
  openGraph: {
    title: 'YSKAIPE — Every Maze Has an Exit',
    description: 'Navigate the mazes of Bitcoin, Sustainability, the Garden, and AI. AI is your map.',
    url: 'https://yskaipe.com',
    siteName: 'YSKAIPE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'YSKAIPE — Every Maze Has an Exit',
    description: 'Navigate the mazes of Bitcoin, Sustainability, the Garden, and AI.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Lora:ital,wght@0,400;0,600;1,400;1,600&family=JetBrains+Mono:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
