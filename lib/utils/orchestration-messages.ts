import { OrchestrationStep } from '@/lib/stores/orchestration-store'

export const ORCHESTRATION_MESSAGES: Record<OrchestrationStep, string> = {
  idle: '',
  analyzing: 'Sto analizzando la tua richiesta...',
  parsing: 'Interpreto i parametri...',
  executing: 'Eseguo l\'operazione...',
  creating_task: 'Creo il task...',
  creating_calendar: 'Aggiungo l\'evento al calendario...',
  generating_copy: 'Genero il testo con GPT-4...',
  generating_image: 'Creo l\'immagine con DALL-E...',
  generating_video: 'Genero il video con Sora 2...',
  updating_content: 'Salvo i contenuti generati...',
  completed: 'Completato!',
  error: 'Si è verificato un errore'
}

export const ORCHESTRATION_PROGRESS: Record<OrchestrationStep, number> = {
  idle: 0,
  analyzing: 10,
  parsing: 20,
  executing: 40,
  creating_task: 55,
  creating_calendar: 60,
  generating_copy: 70,
  generating_image: 80,
  generating_video: 80,
  updating_content: 90,
  completed: 100,
  error: 0
}

export function getOrchestrationMessage(step: OrchestrationStep, tokenCost?: number): string {
  const base = ORCHESTRATION_MESSAGES[step]
  if (step === 'completed' && tokenCost) {
    return `${base} (${tokenCost} token)`
  }
  return base
}
