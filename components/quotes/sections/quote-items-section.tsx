"use client"

import { Control, useFieldArray, useWatch } from "react-hook-form"
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
  
  // Single useWatch for entire array (moved outside map to avoid multiple subscriptions)
  const voci = useWatch({
    control,
    name: "voci",
    defaultValue: [],
  })
  
  const formatCurrency = (value: number) => {
    // Guard against NaN
    if (isNaN(value) || !isFinite(value)) {
      return new Intl.NumberFormat('it-IT', {
        style: 'currency',
        currency: 'EUR',
      }).format(0)
    }
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value)
  }
  
  return (
    <div className="space-y-4">
      {fields.map((field, index) => {
        // Access values from watched array
        const voce = voci?.[index] || {}
        const quantita = parseFloat(voce.quantita) || 0
        const prezzoUnitario = parseFloat(voce.prezzoUnitario) || 0
        const totale = quantita * prezzoUnitario
        
        return (
          <div key={field.id} className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg">
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
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0
                        field.onChange(value)
                      }}
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
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0
                        field.onChange(value)
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-2">
              <FormLabel>Totale</FormLabel>
              <div className="flex gap-2 items-start">
                <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-md px-3 py-2 text-sm font-medium">
                  {formatCurrency(totale)}
                </div>
                <LiquidButton
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => remove(index)}
                >
                  <X className="h-4 w-4" />
                </LiquidButton>
              </div>
            </div>
          </div>
        )
      })}
      
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
