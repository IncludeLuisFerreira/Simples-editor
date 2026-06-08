import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { SimplesEditor } from '../components/SimplesEditor'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  const [code, setCode] = useState('')

  return (
    <div className="h-[calc(100vh-80px)]">
      <SimplesEditor value={code} onChange={setCode} />
    </div>
  )
}
