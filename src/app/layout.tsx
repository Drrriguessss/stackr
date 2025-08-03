import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Stackr - Your Universal Library',
  description: 'Track games, movies, music, and books all in one place',
  manifest: '/manifest.json',
  themeColor: '#1a1a1a',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Stackr'
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [
      { url: '/icons/icon-180.png', sizes: '180x180', type: 'image/png' }
    ]
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-touch-fullscreen': 'yes'
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-gray-900 min-h-screen antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}