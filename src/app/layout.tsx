import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/react'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Stackr - Your Universal Library',
  description: 'Track games, movies, music, and books all in one place',
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