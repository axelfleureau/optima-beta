"use client"

import { Control, useFieldArray } from "react-hook-form"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { LiquidButton } from "@/components/ui/liquid-button"
import { Plus, X } from "lucide-react"

interface QuoteActivitiesSectionProps {
  control: Control<any>
}

export function QuoteActivitiesSection({ control }: QuoteActivitiesSectionProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "attivita",
  })
  
  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <FormField
          key={field.id}
          control={control}
          name={`attivita.${index}`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Attività {index + 1}</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input {...field} placeholder="Es: Creazione logo e brand identity" />
                </FormControl>
                <LiquidButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => remove(index)}
                >
                  <X className="h-4 w-4" />
                </LiquidButton>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      ))}
      
      <LiquidButton
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append("")}
      >
        <Plus className="h-4 w-4 mr-2" />
        Aggiungi Attività
      </LiquidButton>
    </div>
  )
}
