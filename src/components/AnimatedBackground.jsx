import React, { useEffect, useRef } from 'react'

/**
 * Animated background with floating neural network nodes,
 * connecting lines, and pulsing data points — themed around
 * AI model benchmarking.
 */
export default function AnimatedBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let animationId
    let nodes = []
    let particles = []

    function resize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Create nodes (neural network style)
    const NODE_COUNT = 55
    for (let i = 0; i < NODE_COUNT; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 2.5 + 1.5,
        pulse: Math.random() * Math.PI * 2,
        type: Math.random() > 0.6 ? 'accent' : 'normal', // more accent nodes
      })
    }

    // Create small data particles that travel between nodes
    const PARTICLE_COUNT = 15
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(createParticle())
    }

    function createParticle() {
      const startNode = nodes[Math.floor(Math.random() * nodes.length)]
      const endNode = nodes[Math.floor(Math.random() * nodes.length)]
      return {
        x: startNode.x,
        y: startNode.y,
        targetX: endNode.x,
        targetY: endNode.y,
        progress: 0,
        speed: Math.random() * 0.008 + 0.003,
        startX: startNode.x,
        startY: startNode.y,
      }
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw connections between nearby nodes
      const CONNECTION_DIST = 220
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < CONNECTION_DIST) {
            const opacity = (1 - dist / CONNECTION_DIST) * 0.25
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = nodes[i].type === 'accent' || nodes[j].type === 'accent'
              ? `rgba(139, 92, 246, ${opacity})`
              : `rgba(116, 133, 255, ${opacity})`
            ctx.lineWidth = 0.8
            ctx.stroke()
          }
        }
      }

      // Draw and update nodes
      for (const node of nodes) {
        // Move
        node.x += node.vx
        node.y += node.vy
        node.pulse += 0.02

        // Bounce off edges
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1

        // Draw node
        const pulseScale = 1 + Math.sin(node.pulse) * 0.3
        const r = node.radius * pulseScale

        if (node.type === 'accent') {
          // Accent nodes glow purple/blue — bigger and brighter
          const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 6)
          gradient.addColorStop(0, 'rgba(139, 92, 246, 0.8)')
          gradient.addColorStop(0.3, 'rgba(139, 92, 246, 0.2)')
          gradient.addColorStop(0.6, 'rgba(139, 92, 246, 0.05)')
          gradient.addColorStop(1, 'rgba(139, 92, 246, 0)')
          ctx.beginPath()
          ctx.arc(node.x, node.y, r * 6, 0, Math.PI * 2)
          ctx.fillStyle = gradient
          ctx.fill()
        }

        ctx.beginPath()
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
        ctx.fillStyle = node.type === 'accent'
          ? `rgba(139, 92, 246, ${0.8 + Math.sin(node.pulse) * 0.2})`
          : `rgba(116, 133, 255, ${0.5 + Math.sin(node.pulse) * 0.2})`
        ctx.fill()
      }

      // Draw data particles traveling between nodes
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.progress += p.speed

        if (p.progress >= 1) {
          particles[i] = createParticle()
          continue
        }

        // Lerp position
        p.x = p.startX + (p.targetX - p.startX) * p.progress
        p.y = p.startY + (p.targetY - p.startY) * p.progress

        // Draw particle with trail
        const alpha = Math.sin(p.progress * Math.PI) * 1.0
        ctx.beginPath()
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(79, 94, 255, ${alpha})`
        ctx.fill()

        // Bright glow
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 12)
        glow.addColorStop(0, `rgba(116, 133, 255, ${alpha * 0.6})`)
        glow.addColorStop(0.5, `rgba(116, 133, 255, ${alpha * 0.15})`)
        glow.addColorStop(1, 'rgba(116, 133, 255, 0)')
        ctx.beginPath()
        ctx.arc(p.x, p.y, 12, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.fill()
      }

      animationId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 1 }}
    />
  )
}
