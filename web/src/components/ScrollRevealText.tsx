import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface ScrollRevealTextProps {
  children: ReactNode
  className?: string
  delay?: number
}

export function ScrollRevealText({ children, className, delay = 0 }: ScrollRevealTextProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.8,
        delay,
        ease: 'easeOut',
      }}
      viewport={{ once: false, margin: '-50px' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
