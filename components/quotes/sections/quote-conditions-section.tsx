"use client"

import { Control } from "react-hook-form"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"

interface QuoteConditionsSectionProps {
  control: Control<any>
}

export function QuoteConditionsSection({ control }: QuoteConditionsSectionProps) {
  return (
    <FormField
      control={control}
      name="terminiCondizioni"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Termini e Condizioni</FormLabel>
          <FormControl>
            <Textarea
              {...field}
              rows={6}
              placeholder="Inserisci i termini e condizioni del preventivo..."
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
