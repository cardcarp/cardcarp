import { animate } from 'motion-v'
import { createSharedComposable, useEventListener, useMediaQuery } from '@vueuse/core'

export const usePointerEffects = createSharedComposable(() => useMediaQuery('(min-width: 48rem)'))

export function useClickAnimation(containerRef) {

  const enabled = usePointerEffects()

  function handlePointerDown(e) {
    if (!enabled.value) return
    if (!containerRef.value) return
    if (e.button !== 0) return

    const { clientX: x, clientY: y } = e

    const bloom = document.createElement('div')
    bloom.className = 'absolute size-5 rounded-full bg-white opacity-40 pointer-events-none z-9997'
    bloom.style.left = `${x - 10}px`
    bloom.style.top = `${y - 10}px`
    containerRef.value.appendChild(bloom)

    animate(
      bloom,
      { scale: [0.5, 2], opacity: [0.4, 0] },
      { duration: 0.6, ease: 'easeOut' }
    ).finished.then(() => bloom.remove())

    const ring = document.createElement('div')
    ring.className = 'absolute size-10 rounded-full border border-white opacity-60 pointer-events-none z-9997'
    ring.style.left = `${x - 20}px`
    ring.style.top = `${y - 20}px`
    containerRef.value.appendChild(ring)

    animate(
      ring,
      { scale: [0.5, 2], opacity: [0.6, 0] },
      { duration: 0.5, ease: 'easeOut' }
    ).finished.then(() => ring.remove())

    for (let i = 0; i < 8; i++) {
      const spark = document.createElement('div')
      spark.className = 'absolute size-0.5 rounded-full bg-white pointer-events-none z-9997'
      spark.style.left = `${x - 1}px`
      spark.style.top = `${y - 1}px`
      containerRef.value.appendChild(spark)

      const angle = Math.random() * Math.PI * 2
      const distance = 40 + Math.random() * 10
      const dx = Math.cos(angle) * distance
      const dy = Math.sin(angle) * distance

      animate(
        spark,
        { x: dx, y: dy, opacity: [1, 0] },
        { duration: 0.6 + Math.random() * 0.2, ease: 'easeOut' }
      ).finished.then(() => spark.remove())
    }
  }

  useEventListener(window, 'pointerdown', handlePointerDown)
}