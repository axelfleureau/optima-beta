export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const width = searchParams.get('width') || '400'
  const height = searchParams.get('height') || '400'
  const text = searchParams.get('text') || 'Placeholder'
  const bg = searchParams.get('bg') || 'e5e7eb' // gray-200
  const color = searchParams.get('color') || '6b7280' // gray-500

  // Create SVG placeholder
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#${bg}" />
      <text 
        x="50%" 
        y="50%" 
        font-family="Arial, sans-serif" 
        font-size="16" 
        fill="#${color}" 
        text-anchor="middle" 
        dominant-baseline="middle"
      >
        ${decodeURIComponent(text)}
      </text>
    </svg>
  `

  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=3600'
    }
  })
}