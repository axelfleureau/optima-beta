export const WORKFLOW_PROMPTS = {
  CREATE_WEBSITE: (context: any) => `
Stai creando un sito web per ${context.client?.name || 'il cliente'}.

CONTESTO SETTORE:
${context.sector?.description || 'Settore generico'}

DELIVERABLE STANDARD:
${context.sector?.standardDeliverables?.join(', ') || 'Homepage, pagine di servizio, contatti'}

TIMELINE: ${context.sector?.typicalTimeline || '4-8 settimane'}

Genera task dettagliate seguendo best practice settore.
`,

  CREATE_GRAPHIC_DESIGN: (context: any) => `
Progetto design grafico per ${context.client?.name || 'il cliente'}.

BRAND IDENTITY:
Colori: ${context.client?.brandColors || 'Da definire'}
Stile: ${context.client?.brandStyle || 'Da definire'}

DELIVERABLE:
- Logo design
- Brand guidelines
- Marketing materials

Crea task per sviluppo completo identità visiva.
`,

  CREATE_VIDEO_PRODUCTION: (context: any) => `
Produzione video per ${context.client?.name || 'il cliente'}.

TIPO PROGETTO:
${context.videoType || 'Video corporativo'}

DELIVERABLE:
- Pre-produzione (script, storyboard, location scouting)
- Riprese (regia, fotografia, audio)
- Post-produzione (editing, color grading, sound design)

TIMELINE: ${context.timeline || '6-10 settimane'}

Organizza workflow completo produzione video.
`,

  CREATE_SOFTWARE_DEV: (context: any) => `
Sviluppo software per ${context.client?.name || 'il cliente'}.

TIPO PROGETTO:
${context.projectType || 'Applicazione web'}

TECH STACK:
${context.techStack || 'React, Node.js, PostgreSQL'}

DELIVERABLE:
- Requirements & Design
- Backend API development
- Frontend UI implementation
- Testing & Deployment

Crea task dettagliate seguendo metodologia agile.
`,

  CREATE_CAMPAIGN_PROJECT: (context: any) => `
Campagna marketing completa per ${context.client?.name || 'il cliente'}.

OBIETTIVO:
${context.campaignGoal || 'Aumentare brand awareness e conversioni'}

CANALI:
${context.channels?.join(', ') || 'Social media, email marketing, advertising'}

DELIVERABLE:
- Strategia campagna
- Asset creativi (visual, copy, video)
- Landing page
- Analytics & reporting

DURATA: ${context.duration || '3 mesi'}

Organizza campagna end-to-end con KPI tracciabili.
`,
}

export function getWorkflowPrompt(
  intent: string,
  context: any
): string {
  const templateFn = WORKFLOW_PROMPTS[intent as keyof typeof WORKFLOW_PROMPTS]
  if (!templateFn) return ''
  
  return templateFn(context)
}

export function getContextualPrompt(
  basePrompt: string,
  context: {
    tenant?: {
      name?: string
      sector?: string
      style?: string
    }
    recentActivity?: Array<{
      name: string
      type: string
      completedAt?: Date
    }>
    existingAssets?: Array<{
      url: string
      format: string
    }>
    task?: {
      description?: string
    }
    client?: {
      name?: string
      company?: string
    }
  }
): string {
  const contextualPrefix = `
${context.tenant ? `CONTESTO TENANT:
- Azienda: ${context.tenant.name}
- Settore: ${context.tenant.sector || 'Non specificato'}
- Stile: ${context.tenant.style || 'Standard'}
` : ''}
${context.recentActivity && context.recentActivity.length > 0 ? `
ATTIVITÀ RECENTI:
${context.recentActivity.map(a => `- ${a.name} (${a.type})`).join('\n')}
` : ''}
${context.existingAssets && context.existingAssets.length > 0 ? `
ASSET ESISTENTI:
${context.existingAssets.length} asset già generati
` : ''}
${context.task ? `
TASK CORRENTE:
${context.task.description}
` : ''}
${context.client ? `
CLIENTE:
${context.client.name}${context.client.company ? ` - ${context.client.company}` : ''}
` : ''}
---
`
  
  return contextualPrefix + basePrompt
}
