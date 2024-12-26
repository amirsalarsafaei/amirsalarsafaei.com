import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Amirsalar Safaei - Interactive 3D Playground',
  description: 'Welcome to my creative portfolio! Explore an interactive 3D environment showcasing my software engineering projects and skills.',
  keywords: [
    'Software Engineering',
		'Golang',
		'Rust',
    'Interactive 3D',
    'Web Development',
    'Three.js',
    'React',
    'Next.js',
    'Portfolio',
    'Software Architecture'
  ],
  openGraph: {
    title: 'Amirsalar Safaei - Interactive 3D Playground',
    description: 'Explore my interactive 3D portfolio environment',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Interactive 3D Portfolio Playground'
      }
    ]
  },
  robots: {
    index: true,
    follow: true
  },
  authors: [{ name: 'Amirsalar Safaei' }],
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function PlaygroundLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <section className="playground-container">
      {/* This div will be used as the container for your Three.js canvas */}
      <div className="playground-canvas-container">
        {children}
      </div>
    </section>
  )
}

