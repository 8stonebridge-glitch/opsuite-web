// app/api/ads/promo/route.tsx
import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
export const runtime = 'edge'
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  // Dynamic parameters
  const headline = searchParams.get('headline') ?? 'Your App Name'
  const subtitle = searchParams.get('subtitle') ?? 'The smarter way to get things done'
  const cta = searchParams.get('cta') ?? 'Download Now'
  const theme = searchParams.get('theme') ?? 'dark'
  const size = searchParams.get('size') ?? 'square' // square | landscape | story
  // Dimensions
  const dimensions: Record<string, { width: number; height: number }> = {
    square: { width: 1080, height: 1080 },       // Instagram post
    landscape: { width: 1200, height: 628 },      // Facebook/Twitter
    story: { width: 1080, height: 1920 },         // Instagram/WhatsApp story
  }
  const { width, height } = dimensions[size] ?? dimensions.square
  // Theme colors
  const themes: Record<string, { bg: string; accent: string; text: string; subtext: string; ctaBg: string; ctaText: string }> = {
    dark: {
      bg: '#0f172a',
      accent: '#3b82f6',
      text: '#ffffff',
      subtext: '#94a3b8',
      ctaBg: '#3b82f6',
      ctaText: '#ffffff',
    },
    light: {
      bg: '#ffffff',
      accent: '#3b82f6',
      text: '#0f172a',
      subtext: '#64748b',
      ctaBg: '#0f172a',
      ctaText: '#ffffff',
    },
    gradient: {
      bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      accent: '#f59e0b',
      text: '#ffffff',
      subtext: '#e2e8f0',
      ctaBg: '#f59e0b',
      ctaText: '#0f172a',
    },
    green: {
      bg: 'linear-gradient(135deg, #059669 0%, #0f172a 100%)',
      accent: '#34d399',
      text: '#ffffff',
      subtext: '#a7f3d0',
      ctaBg: '#34d399',
      ctaText: '#0f172a',
    },
  }
  const colors = themes[theme] ?? themes.dark
  const isGradient = colors.bg.includes('gradient')
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
          ...(isGradient
            ? { backgroundImage: colors.bg }
            : { backgroundColor: colors.bg }),
        }}
      >
        {/* Decorative accent circle */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            backgroundColor: colors.accent,
            opacity: 0.1,
            display: 'flex',
          }}
        />
        {/* Headline */}
        <div
          style={{
            fontSize: size === 'story' ? 72 : size === 'landscape' ? 48 : 64,
            fontWeight: 800,
            color: colors.text,
            textAlign: 'center',
            lineHeight: 1.2,
            marginBottom: '20px',
            display: 'flex',
          }}
        >
          {headline}
        </div>
        {/* Subtitle */}
        <div
          style={{
            fontSize: size === 'story' ? 36 : size === 'landscape' ? 22 : 28,
            color: colors.subtext,
            textAlign: 'center',
            lineHeight: 1.5,
            marginBottom: '40px',
            maxWidth: '80%',
            display: 'flex',
          }}
        >
          {subtitle}
        </div>
        {/* CTA Button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.ctaBg,
            color: colors.ctaText,
            fontSize: size === 'story' ? 32 : 24,
            fontWeight: 700,
            padding: '16px 48px',
            borderRadius: '50px',
          }}
        >
          {cta}
        </div>
        {/* Bottom accent line */}
        <div
          style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            width: '100%',
            height: '6px',
            backgroundColor: colors.accent,
            display: 'flex',
          }}
        />
      </div>
    ),
    { width, height }
  )
}
