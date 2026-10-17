import { useEffect, useRef } from 'react'

export function HorseToken3D() {
  const containerDivRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Scroll-based opacity - fade out quickly as you scroll
    const handleScroll = () => {
      if (!containerDivRef.current) return
      const imageHeight = window.innerHeight
      const scrollProgress = Math.max(0, window.scrollY - imageHeight) / window.innerHeight
      const opacity = Math.max(0, 1 - scrollProgress * 3)
      containerDivRef.current.style.opacity = opacity.toString()
    }

    window.addEventListener('scroll', handleScroll)

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <div
      ref={containerDivRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        transition: 'opacity 0.1s ease-out',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 35%, rgba(0,0,0,0.4) 75%, rgba(0,0,0,1) 100%)',
      }}
    >
      <img
        src="/horse-token.png"
        alt="Corredor Horse Token"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          objectPosition: 'center',
        }}
      />
    </div>
  )
}
