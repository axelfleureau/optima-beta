"use client"

import { useState } from 'react'

export type AIActionPhase = 
  | 'idle'
  | 'collectingContext'
  | 'callingAI'
  | 'applyingResult'
  | 'error'

export function useAIActionState(actionId: string) {
  const [phase, setPhase] = useState<AIActionPhase>('idle')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  
  const start = (msg: string) => {
    setPhase('collectingContext')
    setMessage(msg)
  }
  
  const callAI = (msg: string) => {
    setPhase('callingAI')
    setMessage(msg)
  }
  
  const apply = (msg: string) => {
    setPhase('applyingResult')
    setMessage(msg)
  }
  
  const complete = () => {
    setPhase('idle')
    setMessage('')
  }
  
  const error = (msg: string) => {
    setPhase('error')
    setMessage(msg)
  }
  
  return {
    phase,
    message,
    progress,
    start,
    callAI,
    apply,
    complete,
    error,
    isLoading: phase !== 'idle' && phase !== 'error'
  }
}
