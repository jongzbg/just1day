import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Nexus Social',
  description: 'Real-time tech-literate intelligence.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-black text-text-primary antialiased">
        {children}
      </body>
    </html>
  )
}