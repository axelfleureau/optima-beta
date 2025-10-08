"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Wand2, Copy, Check } from "lucide-react"
import { useAIFeedback } from "@/hooks/use-ai-feedback"

interface TemplateField {
  name: string
  label: string
  type: "text" | "textarea" | "select"
  options?: string[]
}

interface Template {
  id: string
  name: string
  description: string
  fields: TemplateField[]
}

interface AITemplateFormProps {
  template: Template
  userId: string
}

export function AITemplateForm({ template, userId }: AITemplateFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState("")
  const [isCopied, setIsCopied] = useState(false)
  const feedback = useAIFeedback()

  const handleInputChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const generateContent = async () => {
    if (!userId) {
      console.log("No userId provided for template generation")
      return
    }

    // Check if all required fields are filled
    const missingFields = template.fields.filter((field) => !formData[field.name]?.trim())
    if (missingFields.length > 0) {
      feedback.error(
        'Validazione',
        `Compila tutti i campi: ${missingFields.map((f) => f.label).join(", ")}`,
        'Tutti i campi sono obbligatori'
      )
      return
    }

    setIsGenerating(true)
    setGeneratedContent("")

    try {
      console.log("Generating template content for user:", userId)

      const response = await fetch("/api/ai/template", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateId: template.id,
          formData,
          userId: userId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      if (!response.body) {
        throw new Error("No response body")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      let buffer = ""
      let content = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.error) {
                throw new Error(data.error)
              }

              if (data.content) {
                content += data.content
                setGeneratedContent(content)
              }

              if (data.done) {
                console.log("Template generation completed")
              }
            } catch (parseError) {
              console.error("Error parsing SSE data:", parseError)
            }
          }
        }
      }
    } catch (error) {
      console.error("Error generating content:", error)
      feedback.error(
        'Generazione contenuto',
        error instanceof Error ? error.message : 'Errore sconosciuto',
        'Verifica i dati e riprova'
      )
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent)
      setIsCopied(true)
      feedback.success('Contenuto copiato negli appunti')
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      feedback.error('Copia contenuto', 'Impossibile copiare il contenuto', 'Verifica i permessi del browser')
    }
  }

  return (
    <div className="space-y-4">
      {/* Form Fields */}
      <div className="space-y-3">
        {template.fields.map((field) => (
          <div key={field.name} className="space-y-1">
            <Label htmlFor={field.name} className="text-sm font-medium">
              {field.label}
            </Label>
            {field.type === "text" && (
              <Input
                id={field.name}
                value={formData[field.name] || ""}
                onChange={(e) => handleInputChange(field.name, e.target.value)}
                placeholder={`Inserisci ${field.label.toLowerCase()}`}
              />
            )}
            {field.type === "textarea" && (
              <Textarea
                id={field.name}
                value={formData[field.name] || ""}
                onChange={(e) => handleInputChange(field.name, e.target.value)}
                placeholder={`Inserisci ${field.label.toLowerCase()}`}
                rows={3}
              />
            )}
            {field.type === "select" && field.options && (
              <Select
                value={formData[field.name] || ""}
                onValueChange={(value) => handleInputChange(field.name, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Seleziona ${field.label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        ))}
      </div>

      {/* Generate Button */}
      <Button onClick={generateContent} disabled={isGenerating} className="w-full">
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generazione in corso...
          </>
        ) : (
          <>
            <Wand2 className="mr-2 h-4 w-4" />
            Genera Contenuto
          </>
        )}
      </Button>

      {/* Generated Content */}
      {(generatedContent || isGenerating) && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Contenuto Generato</h4>
              {generatedContent && (
                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                  {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              )}
            </div>
            <ScrollArea className="h-64 w-full rounded border p-3">
              {isGenerating && !generatedContent ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-sm">{generatedContent}</div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
