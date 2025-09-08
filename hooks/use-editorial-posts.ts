"use client"

import { useState, useEffect } from "react"
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/lib/auth-context"
import type { EditorialPost, EditorialPostStatus } from "@/lib/types"

export function useEditorialPosts(clientId?: string | null) {
  const [posts, setPosts] = useState<EditorialPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { userData } = useAuth()

  useEffect(() => {
    if (!userData?.tenantId) {
      setLoading(false)
      return
    }

    try {
      let q = query(collection(db, "editorialPosts"), where("tenantId", "==", userData.tenantId))

      if (clientId) {
        q = query(q, where("clientId", "==", clientId))
      }

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const postsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as EditorialPost[]

          setPosts(postsData)
          setLoading(false)
        },
        (err) => {
          console.error("Error fetching editorial posts:", err)
          setError(err.message)
          setLoading(false)
        },
      )

      return unsubscribe
    } catch (err: any) {
      console.error("Error setting up editorial posts listener:", err)
      setError(err.message)
      setLoading(false)
    }
  }, [userData?.tenantId, clientId])

  const addPost = async (
    postData: Omit<EditorialPost, "id" | "createdAt" | "updatedAt" | "tenantId" | "createdBy">,
  ) => {
    if (!userData?.tenantId || !userData?.id) {
      throw new Error("User not authenticated")
    }

    const newPost = {
      ...postData,
      tenantId: userData.tenantId,
      createdBy: userData.id,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }

    await addDoc(collection(db, "editorialPosts"), newPost)
  }

  const updatePost = async (postId: string, updates: Partial<EditorialPost>) => {
    console.log("[v0] Attempting to update post:", { postId, updates })

    try {
      const postRef = doc(db, "editorialPosts", postId)
      await updateDoc(postRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      })
      console.log("[v0] Post updated successfully:", postId)
    } catch (error: any) {
      console.error("[v0] Error updating post:", { postId, error: error.message })

      if (error.code === "not-found") {
        throw new Error(`No document to update: ${postId}`)
      }
      throw error
    }
  }

  const deletePost = async (postId: string) => {
    const postRef = doc(db, "editorialPosts", postId)
    await deleteDoc(postRef)
  }

  const updatePostStatus = async (postId: string, status: EditorialPostStatus) => {
    console.log("[v0] Updating post status:", { postId, status })

    const postExists = posts.find((p) => p.id === postId)
    if (!postExists) {
      console.error("[v0] Post not found in local state:", postId)
      throw new Error(`Post non trovato nella lista locale: ${postId}`)
    }

    if (postId.startsWith("post_") && postId.includes(Date.now().toString().slice(0, 10))) {
      console.error("[v0] Attempting to update with temporary ID:", postId)
      throw new Error("Impossibile aggiornare: ID temporaneo rilevato. Ricarica la pagina.")
    }

    await updatePost(postId, { status })
  }

  return {
    posts,
    loading,
    error,
    addPost,
    updatePost,
    deletePost,
    updatePostStatus,
  }
}
