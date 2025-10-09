"use client"

import { Control, useFieldArray } from "react-hook-form"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { LiquidButton } from "@/components/ui/liquid-button"
import { Plus, X } from "lucide-react"

interface QuoteItemsSectionProps {
  control: Control<any>
}

export function QuoteItemsSection({ control }: QuoteItemsSectionProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "voci",
  })
  
  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <div key={field.id} className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg">
          <FormField
            control={control}
            name={`voci.${index}.descrizione`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrizione</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Es: Design homepage" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={control}
            name={`voci.${index}.quantita`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantità</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={control}
            name={`voci.${index}.prezzoUnitario`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prezzo (€)</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
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
        </div>
      ))}
      
      <LiquidButton
        type="button"
        variant="outline"
        size="sm"
        onClick={() => append({ descrizione: "", quantita: 1, prezzoUnitario: 0 })}
      >
        <Plus className="h-4 w-4 mr-2" />
        Aggiungi Voce
      </LiquidButton>
    </div>
  )
}
