// =====================================================================
// Root Layout - Vehicle Service & Maintenance Platform
// =====================================================================

import type { Metadata } from 'node_modules/next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Apex Auto Care - Vehicle Service & Maintenance Platform',
  description: 'Professional vehicle service booking and fleet management platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  )
}
