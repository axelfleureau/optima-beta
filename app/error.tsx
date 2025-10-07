'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { GlassCard } from '@/components/ui/glass-card'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error caught:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 p-4">
      <GlassCard className="max-w-md w-full text-center p-8">
        <h2 className="text-2xl font-bold text-white mb-4">
          Si è verificato un errore
        </h2>
        <p className="text-gray-400 mb-6">
          Ci scusiamo per l'inconveniente. Riprova o contatta il supporto se il problema persiste.
        </p>
        <Button onClick={() => reset()} variant="default">
          Riprova
        </Button>
      </GlassCard>
    </div>
  )
}
