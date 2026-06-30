import React, { useEffect, useRef } from 'react'

/**
 * Interactive animated background — "Data Flow Grid"
 * 
 * A futuristic grid with glowing data streams that flow along paths,
 * pulse at intersections, and react to mouse movement.
 * Inspired by circuit boards and real-time data pipelines.
 */
export default function AnimatedBackground() {
  const canvasRef = useRef(null)
  const mouseRef = useRef({ x: -1000, y: -1000 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let animationId
    let time = 0

    // Grid configuration
    const CELL_SIZE = 60
    let cols, rows, gridNodes = [], streams = [], pulses = []

    function resize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      cols = Math.ceil(canvas.width / CELL_SIZE) + 1
      rows = Math.ceil(canvas.height / CELL_SIZE) + 1
      initGrid()
    }

    function initGrid() {
      gridNodes = []
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Only some intersections are "active"
          if (Math.random() > 0.3) continue
          gridNodes.push({
            x: c * CELL_SIZE,
            y: r * CELL_SIZE,
            col: c,
            row: r,
            energy: Math.random(),
            phase: Math.random() * Math.PI * 2,
            size: Math.random() * 2 + 1,
            type: Math.random() > 0.85 ? 'hub' : 'node', // hubs are brighter
          })
        }
      }

      // Create data streams — paths that data flows along
      streams = []
      for (let i = 0; i < 20; i++) {
        streams.push(createStream())
      }
    }

    function createStream() {
      const isHorizontal = Math.random() > 0.4
      const row = Math.floor(Math.random() * rows)
      const col = Math.floor(Math.random() * cols)
      const length = Math.floor(Math.random() * 8) + 4
      const speed = Math.random() * 1.5 + 0.5
      const color = Math.random() > 0.6 
        ? { r: 139, g: 92, b: 246 }   // purple
        : Math.random() > 0.5
        ? { r: 79, g: 94, b: 255 }    // blue
        : { r: 59, g: 200, b: 246 }   // cyan

      return {
        x: col * CELL_SIZE,
        y: row * CELL_SIZE,
        isHorizontal,
        length: length * CELL_SIZE,
        speed,
        progress: Math.random() * 100,
        color,
        width: Math.random() * 1.5 + 0.5,
        life: 0,
        maxLife: 300 + Math.random() * 400,
      }
    }

    function createPulse(x, y) {
      pulses.push({
        x, y,
        radius: 0,
        maxRadius: 40 + Math.random() * 30,
        alpha: 0.6,
        speed: 1 + Math.random(),
      })
    }

    function handleMouseMove(e) {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }

    function handleClick(e) {
      // Create burst of pulses on click
      for (let i = 0; i < 3; i++) {
        setTimeout(() => createPulse(e.clientX, e.clientY), i * 100)
      }
    }

    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('click', handleClick)
    resize()

    function draw() {
      time += 0.016 // ~60fps
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const mouse = mouseRef.current

      // ─── Draw subtle grid lines ────────────────────────────────────────
      ctx.strokeStyle = 'rgba(116, 133, 255, 0.06)'
      ctx.lineWidth = 0.5
      for (let c = 0; c <= cols; c++) {
        ctx.beginPath()
        ctx.moveTo(c * CELL_SIZE, 0)
        ctx.lineTo(c * CELL_SIZE, canvas.height)
        ctx.stroke()
      }
      for (let r = 0; r <= rows; r++) {
        ctx.beginPath()
        ctx.moveTo(0, r * CELL_SIZE)
        ctx.lineTo(canvas.width, r * CELL_SIZE)
        ctx.stroke()
      }

      // ─── Draw grid nodes ───────────────────────────────────────────────
      for (const node of gridNodes) {
        const dx = mouse.x - node.x
        const dy = mouse.y - node.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const mouseInfluence = Math.max(0, 1 - dist / 200)

        const pulse = Math.sin(time * 2 + node.phase) * 0.5 + 0.5
        const baseAlpha = node.type === 'hub' ? 0.6 : 0.25
        const alpha = baseAlpha + pulse * 0.2 + mouseInfluence * 0.5

        const r = node.size + mouseInfluence * 3

        if (node.type === 'hub' || mouseInfluence > 0.3) {
          // Glow
          const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 5)
          gradient.addColorStop(0, `rgba(139, 92, 246, ${alpha * 0.4})`)
          gradient.addColorStop(0.5, `rgba(79, 94, 255, ${alpha * 0.1})`)
          gradient.addColorStop(1, 'rgba(79, 94, 255, 0)')
          ctx.beginPath()
          ctx.arc(node.x, node.y, r * 5, 0, Math.PI * 2)
          ctx.fillStyle = gradient
          ctx.fill()
        }

        // Core dot
        ctx.beginPath()
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2)
        ctx.fillStyle = node.type === 'hub'
          ? `rgba(139, 92, 246, ${alpha})`
          : `rgba(116, 133, 255, ${alpha})`
        ctx.fill()

        // Draw connections to nearby mouse
        if (mouseInfluence > 0.2) {
          ctx.beginPath()
          ctx.moveTo(node.x, node.y)
          ctx.lineTo(mouse.x, mouse.y)
          ctx.strokeStyle = `rgba(139, 92, 246, ${mouseInfluence * 0.15})`
          ctx.lineWidth = 0.5
          ctx.stroke()
        }
      }

      // ─── Draw data streams ─────────────────────────────────────────────
      for (let i = 0; i < streams.length; i++) {
        const s = streams[i]
        s.life++
        s.progress += s.speed

        // Respawn dead streams
        if (s.life > s.maxLife) {
          streams[i] = createStream()
          continue
        }

        const fadeIn = Math.min(s.life / 30, 1)
        const fadeOut = Math.max(0, 1 - (s.life - s.maxLife + 60) / 60)
        const lifeFade = Math.min(fadeIn, fadeOut)

        // Draw the stream as a moving gradient segment
        const segmentLength = 80
        const headPos = s.progress % (s.length + segmentLength * 2) - segmentLength

        for (let j = 0; j < segmentLength; j += 2) {
          const pos = headPos - j
          if (pos < 0 || pos > s.length) continue

          const alpha = (1 - j / segmentLength) * 0.7 * lifeFade
          const px = s.isHorizontal ? s.x + pos : s.x
          const py = s.isHorizontal ? s.y : s.y + pos

          // Check if on screen
          if (px < -10 || px > canvas.width + 10 || py < -10 || py > canvas.height + 10) continue

          ctx.beginPath()
          ctx.arc(px, py, s.width, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${alpha})`
          ctx.fill()
        }

        // Bright head
        const hx = s.isHorizontal ? s.x + (headPos % s.length) : s.x
        const hy = s.isHorizontal ? s.y : s.y + (headPos % s.length)
        if (hx > 0 && hx < canvas.width && hy > 0 && hy < canvas.height) {
          const headGlow = ctx.createRadialGradient(hx, hy, 0, hx, hy, 8)
          headGlow.addColorStop(0, `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${0.8 * lifeFade})`)
          headGlow.addColorStop(1, `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, 0)`)
          ctx.beginPath()
          ctx.arc(hx, hy, 8, 0, Math.PI * 2)
          ctx.fillStyle = headGlow
          ctx.fill()
        }
      }

      // ─── Draw pulses (mouse interaction) ───────────────────────────────
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i]
        p.radius += p.speed
        p.alpha -= 0.012

        if (p.alpha <= 0) {
          pulses.splice(i, 1)
          continue
        }

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(139, 92, 246, ${p.alpha})`
        ctx.lineWidth = 1.5
        ctx.stroke()

        // Inner glow ring
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius * 0.6, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(79, 94, 255, ${p.alpha * 0.5})`
        ctx.lineWidth = 0.8
        ctx.stroke()
      }

      // ─── Ambient floating orbs ─────────────────────────────────────────
      for (let i = 0; i < 5; i++) {
        const x = (Math.sin(time * 0.3 + i * 1.5) * 0.5 + 0.5) * canvas.width
        const y = (Math.cos(time * 0.2 + i * 2.1) * 0.5 + 0.5) * canvas.height
        const r = 80 + Math.sin(time + i) * 25

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, r)
        gradient.addColorStop(0, `rgba(79, 94, 255, ${0.07 + Math.sin(time * 0.5 + i) * 0.03})`)
        gradient.addColorStop(0.7, 'rgba(139, 92, 246, 0.02)')
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()
      }

      animationId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('click', handleClick)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
    />
  )
}
