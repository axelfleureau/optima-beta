import { AlertCircle, Edit3, Eye, Users, CheckCircle2, Clock, Zap, Target } from "lucide-react"
import { EditorialPostStatus as PostStatusEnum } from "@/lib/types"

export const statusConfig = {
  [PostStatusEnum.IDEA]: {
    label: "Idea",
    icon: AlertCircle,
    color: "bg-amber-500",
    lightColor: "bg-amber-50 text-amber-700 border-amber-200",
    darkColor: "bg-amber-900/20 text-amber-400 border-amber-800",
  },
  [PostStatusEnum.BOZZA]: {
    label: "Bozza",
    icon: Edit3,
    color: "bg-blue-500",
    lightColor: "bg-blue-50 text-blue-700 border-blue-200",
    darkColor: "bg-blue-900/20 text-blue-400 border-blue-800",
  },
  [PostStatusEnum.REVISIONE_INTERNA]: {
    label: "Revisione Interna",
    icon: Eye,
    color: "bg-purple-500",
    lightColor: "bg-purple-50 text-purple-700 border-purple-200",
    darkColor: "bg-purple-900/20 text-purple-400 border-purple-800",
  },
  [PostStatusEnum.REVISIONE_CLIENTE]: {
    label: "Revisione Cliente",
    icon: Users,
    color: "bg-pink-500",
    lightColor: "bg-pink-50 text-pink-700 border-pink-200",
    darkColor: "bg-pink-900/20 text-pink-400 border-pink-800",
  },
  [PostStatusEnum.APPROVATO]: {
    label: "Approvato",
    icon: CheckCircle2,
    color: "bg-emerald-500",
    lightColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    darkColor: "bg-emerald-900/20 text-emerald-400 border-emerald-800",
  },
  [PostStatusEnum.PROGRAMMATO]: {
    label: "Programmato",
    icon: Clock,
    color: "bg-teal-500",
    lightColor: "bg-teal-50 text-teal-700 border-teal-200",
    darkColor: "bg-teal-900/20 text-teal-400 border-teal-800",
  },
  [PostStatusEnum.PUBBLICATO]: {
    label: "Pubblicato",
    icon: Zap,
    color: "bg-green-600",
    lightColor: "bg-green-50 text-green-700 border-green-200",
    darkColor: "bg-green-900/20 text-green-400 border-green-800",
  },
  [PostStatusEnum.RIFIUTATO]: {
    label: "Rifiutato",
    icon: AlertCircle,
    color: "bg-red-500",
    lightColor: "bg-red-50 text-red-700 border-red-200",
    darkColor: "bg-red-900/20 text-red-400 border-red-800",
  },
  [PostStatusEnum.ARCHIVIATO]: {
    label: "Archiviato",
    icon: Target,
    color: "bg-gray-500",
    lightColor: "bg-gray-50 text-gray-700 border-gray-200",
    darkColor: "bg-gray-900/20 text-gray-400 border-gray-800",
  },
}

export const statusOrder = Object.values(PostStatusEnum)
