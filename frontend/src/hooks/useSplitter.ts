import { useCallback, useEffect, useRef, useState } from 'react'

interface UseSplitterOptions {
  initialRatio?: number
  minRatio?: number
  storageKey?: string
}

interface UseSplitterReturn {
  ratio: number
  collapsed: boolean
  onMouseDown: (e: React.MouseEvent) => void
  onDoubleClick: () => void
  containerRef: React.RefObject<HTMLDivElement | null>
}

interface StoredState {
  ratio: number
  collapsed: boolean
}

const DEFAULT_INITIAL_RATIO = 0.6
const DEFAULT_MIN_RATIO = 0.2
const DEFAULT_STORAGE_KEY = 'nasm-splitter'

function loadState(key: string): StoredState | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as StoredState
  } catch {
    return null
  }
}

function saveState(key: string, state: StoredState): void {
  try {
    localStorage.setItem(key, JSON.stringify(state))
  } catch {
    // localStorage may be full or unavailable
  }
}

export function useSplitter(options: UseSplitterOptions = {}): UseSplitterReturn {
  const {
    initialRatio = DEFAULT_INITIAL_RATIO,
    minRatio = DEFAULT_MIN_RATIO,
    storageKey = DEFAULT_STORAGE_KEY,
  } = options

  const stored = loadState(storageKey)
  const [ratio, setRatio] = useState(stored?.ratio ?? initialRatio)
  const [collapsed, setCollapsed] = useState(stored?.collapsed ?? false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const dragging = useRef(false)
  const lastRatio = useRef(ratio)

  const persist = useCallback(
    (r: number, c: boolean) => {
      saveState(storageKey, { ratio: r, collapsed: c })
    },
    [storageKey],
  )

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragging.current = true
      const startX = e.clientX
      const startRatio = ratio
      const container = containerRef.current
      if (!container) return

      const onMouseMove = (moveEvent: MouseEvent) => {
        if (!dragging.current) return
        const dx = moveEvent.clientX - startX
        const containerWidth = container.getBoundingClientRect().width
        if (containerWidth === 0) return
        let newRatio = startRatio + dx / containerWidth
        newRatio = Math.max(minRatio, Math.min(1 - minRatio, newRatio))
        setRatio(newRatio)
        lastRatio.current = newRatio
      }

      const onMouseUp = () => {
        dragging.current = false
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        persist(lastRatio.current, collapsed)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [ratio, minRatio, collapsed, persist],
  )

  const onDoubleClick = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      if (next) {
        lastRatio.current = ratio
        persist(ratio, true)
      } else {
        const restoreRatio = lastRatio.current
        setRatio(restoreRatio)
        persist(restoreRatio, false)
      }
      return next
    })
  }, [ratio, persist])

  useEffect(() => {
    return () => {
      dragging.current = false
    }
  }, [])

  return {
    ratio,
    collapsed,
    onMouseDown,
    onDoubleClick,
    containerRef,
  }
}
