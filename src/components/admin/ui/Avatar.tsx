import React from 'react'

type AvatarProps = {
  name?: string | null
  src?: string | null
  size?: number
  className?: string
  alt?: string
}

const COLORS = ['#ef4444','#f97316','#f59e0b','#eab308','#84cc16','#10b981','#06b6d4','#3b82f6','#8b5cf6','#ec4899']

function pickColor(name?: string | null) {
  if (!name) return COLORS[7]
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = (h << 5) - h + name.charCodeAt(i)
    h |= 0
  }
  return COLORS[Math.abs(h) % COLORS.length]
}

export default function Avatar({ name, src, size = 24, className = '', alt }: AvatarProps) {
  const initial = name ? String(name).trim().charAt(0).toUpperCase() : ''
  const bg = pickColor(name)
  const style: React.CSSProperties = { width: size, height: size, borderRadius: '9999px' }

  if (src) {
    return (
      // eslint-disable-next-line jsx-a11y/alt-text
      <img src={src} alt={alt || name || 'Avatar'} style={style} className={`object-cover rounded-full ${className}`} />
    )
  }

  return (
    <div style={{ ...style, backgroundColor: bg }} className={`flex items-center justify-center text-white font-medium ${className}`}>
      <span style={{ lineHeight: 1 }}>{initial || '👤'}</span>
    </div>
  )
}
