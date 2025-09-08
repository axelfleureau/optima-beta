"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Heart, MessageCircle, Share, Bookmark, MoreHorizontal } from "lucide-react"
import { format } from "date-fns"
import { it } from "date-fns/locale"

interface PostPreviewProps {
  title: string
  content: string
  description?: string
  platform: string
  hashtags?: string[]
  scheduledDate?: string
  scheduledTime?: string
  clientName?: string
}

export function PostPreview({
  title,
  content,
  description,
  platform,
  hashtags = [],
  scheduledDate,
  scheduledTime,
  clientName = "Cliente",
}: PostPreviewProps) {
  const getPreviewComponent = () => {
    switch (platform) {
      case "instagram":
        return <InstagramPreview />
      case "facebook":
        return <FacebookPreview />
      case "linkedin":
        return <LinkedInPreview />
      case "twitter":
      case "x":
        return <TwitterPreview />
      default:
        return <GenericPreview />
    }
  }

  const InstagramPreview = () => (
    <div className="max-w-sm mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center p-3 border-b">
        <Avatar className="w-8 h-8">
          <AvatarImage src="/placeholder.svg" />
          <AvatarFallback>{clientName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="ml-3 flex-1">
          <p className="font-semibold text-sm">{clientName}</p>
          <p className="text-xs text-gray-500">
            {scheduledDate && scheduledTime
              ? format(new Date(`${scheduledDate}T${scheduledTime}`), "d MMM 'alle' HH:mm", { locale: it })
              : "Ora"}
          </p>
        </div>
        <MoreHorizontal className="w-5 h-5 text-gray-400" />
      </div>

      {/* Image placeholder */}
      <div className="aspect-square bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="w-16 h-16 mx-auto mb-2 bg-gray-200 rounded-lg flex items-center justify-center">📸</div>
          <p className="text-sm">Immagine del post</p>
        </div>
      </div>

      {/* Actions */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-4">
            <Heart className="w-6 h-6" />
            <MessageCircle className="w-6 h-6" />
            <Share className="w-6 h-6" />
          </div>
          <Bookmark className="w-6 h-6" />
        </div>

        {/* Caption */}
        <div className="space-y-1">
          <p className="text-sm">
            <span className="font-semibold">{clientName}</span> {content}
          </p>
          {hashtags.length > 0 && <p className="text-sm text-blue-600">{hashtags.map((tag) => `#${tag}`).join(" ")}</p>}
        </div>
      </div>
    </div>
  )

  const FacebookPreview = () => (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-4">
        <div className="flex items-center mb-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src="/placeholder.svg" />
            <AvatarFallback>{clientName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="ml-3">
            <p className="font-semibold">{clientName}</p>
            <p className="text-xs text-gray-500">
              {scheduledDate && scheduledTime
                ? format(new Date(`${scheduledDate}T${scheduledTime}`), "d MMM 'alle' HH:mm", { locale: it })
                : "Ora"}{" "}
              · 🌍
            </p>
          </div>
        </div>
        <p className="text-sm mb-3">{content}</p>
        {hashtags.length > 0 && (
          <p className="text-sm text-blue-600 mb-3">{hashtags.map((tag) => `#${tag}`).join(" ")}</p>
        )}
      </div>

      <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="w-16 h-16 mx-auto mb-2 bg-gray-200 rounded-lg flex items-center justify-center">📸</div>
          <p className="text-sm">Immagine del post</p>
        </div>
      </div>

      <div className="p-3 border-t flex items-center justify-around text-gray-600">
        <Button variant="ghost" size="sm" className="flex-1">
          👍 Mi piace
        </Button>
        <Button variant="ghost" size="sm" className="flex-1">
          💬 Commenta
        </Button>
        <Button variant="ghost" size="sm" className="flex-1">
          📤 Condividi
        </Button>
      </div>
    </div>
  )

  const LinkedInPreview = () => (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-4">
        <div className="flex items-center mb-3">
          <Avatar className="w-12 h-12">
            <AvatarImage src="/placeholder.svg" />
            <AvatarFallback>{clientName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="ml-3">
            <p className="font-semibold">{clientName}</p>
            <p className="text-xs text-gray-500">
              {scheduledDate && scheduledTime
                ? format(new Date(`${scheduledDate}T${scheduledTime}`), "d MMM 'alle' HH:mm", { locale: it })
                : "Ora"}
            </p>
          </div>
        </div>
        <p className="text-sm mb-3 leading-relaxed">{content}</p>
        {hashtags.length > 0 && (
          <p className="text-sm text-blue-600 mb-3">{hashtags.map((tag) => `#${tag}`).join(" ")}</p>
        )}
      </div>

      <div className="aspect-video bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="w-16 h-16 mx-auto mb-2 bg-gray-200 rounded-lg flex items-center justify-center">📸</div>
          <p className="text-sm">Immagine del post</p>
        </div>
      </div>

      <div className="p-3 border-t flex items-center justify-around text-gray-600">
        <Button variant="ghost" size="sm">
          👍 Consiglia
        </Button>
        <Button variant="ghost" size="sm">
          💬 Commenta
        </Button>
        <Button variant="ghost" size="sm">
          📤 Condividi
        </Button>
      </div>
    </div>
  )

  const TwitterPreview = () => (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-4">
        <div className="flex items-start space-x-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src="/placeholder.svg" />
            <AvatarFallback>{clientName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center space-x-1 mb-1">
              <p className="font-semibold">{clientName}</p>
              <p className="text-gray-500 text-sm">@{clientName.toLowerCase().replace(/\s+/g, "")}</p>
              <span className="text-gray-500">·</span>
              <p className="text-gray-500 text-sm">
                {scheduledDate && scheduledTime
                  ? format(new Date(`${scheduledDate}T${scheduledTime}`), "d MMM", { locale: it })
                  : "ora"}
              </p>
            </div>
            <p className="text-sm mb-3">{content}</p>
            {hashtags.length > 0 && (
              <p className="text-sm text-blue-500 mb-3">{hashtags.map((tag) => `#${tag}`).join(" ")}</p>
            )}

            <div className="aspect-video bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg flex items-center justify-center mb-3">
              <div className="text-center text-gray-500">
                <div className="w-12 h-12 mx-auto mb-2 bg-gray-200 rounded-lg flex items-center justify-center">📸</div>
                <p className="text-xs">Immagine</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-gray-500 max-w-md">
              <Button variant="ghost" size="sm" className="p-0">
                💬 12
              </Button>
              <Button variant="ghost" size="sm" className="p-0">
                🔄 5
              </Button>
              <Button variant="ghost" size="sm" className="p-0">
                ❤️ 24
              </Button>
              <Button variant="ghost" size="sm" className="p-0">
                📤
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const GenericPreview = () => (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-4">
        <div className="flex items-center mb-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src="/placeholder.svg" />
            <AvatarFallback>{clientName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="ml-3">
            <p className="font-semibold">{clientName}</p>
            <Badge variant="outline" className="text-xs">
              {platform.toUpperCase()}
            </Badge>
          </div>
        </div>

        <h3 className="font-semibold mb-2">{title}</h3>
        {description && <p className="text-sm text-gray-600 mb-2">{description}</p>}
        <p className="text-sm mb-3">{content}</p>

        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {hashtags.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {scheduledDate && scheduledTime && (
          <p className="text-xs text-gray-500">
            Programmato per:{" "}
            {format(new Date(`${scheduledDate}T${scheduledTime}`), "d MMM yyyy 'alle' HH:mm", { locale: it })}
          </p>
        )}
      </div>
    </div>
  )

  return (
    <Card className="bg-gradient-to-br from-slate-50 to-purple-50 dark:from-slate-800 dark:to-purple-900">
      <CardHeader>
        <h3 className="font-semibold text-center">Anteprima Post</h3>
        <Badge variant="outline" className="w-fit mx-auto">
          {platform.charAt(0).toUpperCase() + platform.slice(1)}
        </Badge>
      </CardHeader>
      <CardContent>{getPreviewComponent()}</CardContent>
    </Card>
  )
}
