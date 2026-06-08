import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { SimplesEditor } from '../components/SimplesEditor'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const [code, setCode] = useState('')

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <SimplesEditor value={code} onChange={setCode} />
    </div>
  )
}
