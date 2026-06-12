import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { SimplesEditor } from '../components/SimplesEditor'
import { NasmViewer } from '../components/NasmViewer'
import { useSplitter } from '../hooks/useSplitter'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const [code, setCode] = useState('')
  const [asm] = useState('')
  const { ratio, collapsed, onMouseDown, onDoubleClick, containerRef } = useSplitter()

  return (
    <div ref={containerRef} className="flex flex-1 min-h-0">
      <div style={{ width: `${ratio * 100}%` }} className="min-w-0 flex flex-col">
        <SimplesEditor value={code} onChange={setCode} />
      </div>
      {!collapsed && (
        <>
          <div
            className="w-[4px] cursor-col-resize bg-[#0f3460] hover:bg-[#1a4a80] shrink-0 transition-colors"
            onMouseDown={onMouseDown}
            onDoubleClick={onDoubleClick}
          />
          <div style={{ width: `${(1 - ratio) * 100}%` }} className="min-w-0 flex flex-col">
            <NasmViewer asm={asm} />
          </div>
        </>
      )}
    </div>
  )
}
