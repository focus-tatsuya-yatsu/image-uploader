import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Image Viewer App - モダンな画像ビューアー',
  description: '画像をアップロードして美しく表示するモダンなWebアプリケーション',
  keywords: 'image viewer, 画像ビューアー, upload, React, Next.js',
  authors: [{ name: 'Your Name' }],
  openGraph: {
    title: 'Image Viewer App',
    description: '画像をアップロードして美しく表示するモダンなWebアプリケーション',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>{children}</body>
    </html>
  )
}