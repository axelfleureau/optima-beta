"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { UserPlus, Users, Mail, User, Eye, EyeOff, Loader2, Edit, Trash2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { useUsers } from "@/hooks/use-users"
import { useClients } from "@/hooks/use-clients"
import type { UserData } from "@/lib/types"

export default function TeamManagement() {
  const { userData, isAdmin } = useAuth()
  const { toast } = useToast()
  const { users, loading: usersLoading } = useUsers()
  const { clients } = useClients()

  const [showUserDialog, setShowUserDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isCreatingUser, setIsCreatingUser] = useState(false)

  const [userForm, setUserForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    assignedClientIds: [] as string[],
  })

  // Solo admin possono accedere a questa pagina
  if (!isAdmin) {
    return (
      <div className="container mx-auto py-6">
        <Alert>
          <AlertDescription>Non hai i permessi per accedere a questa sezione.</AlertDescription>
        </Alert>
      </div>
    )
  }

  const teamUsers = users.filter((user) => user.role === "user")

  const resetForm = () => {
    setUserForm({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      assignedClientIds: [],
    })
    setEditingUser(null)
  }

  const openEditDialog = (user: UserData) => {
    setEditingUser(user)
    setUserForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: "",
      assignedClientIds: user.assignedClientIds || [],
    })
    setShowUserDialog(true)
  }

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*"
    let password = ""
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setUserForm({ ...userForm, password })
  }

  const handleClientAssignment = (clientId: string, checked: boolean) => {
    if (checked) {
      setUserForm({
        ...userForm,
        assignedClientIds: [...userForm.assignedClientIds, clientId],
      })
    } else {
      setUserForm({
        ...userForm,
        assignedClientIds: userForm.assignedClientIds.filter((id) => id !== clientId),
      })
    }
  }

  const handleCreateOrUpdateUser = async () => {
    if (!userForm.firstName.trim() || !userForm.lastName.trim() || !userForm.email.trim()) {
      toast({
        title: "Errore",
        description: "Nome, cognome e email sono obbligatori",
        variant: "destructive",
      })
      return
    }

    if (!editingUser && !userForm.password.trim()) {
      toast({
        title: "Errore",
        description: "La password è obbligatoria per nuovi utenti",
        variant: "destructive",
      })
      return
    }

    setIsCreatingUser(true)

    try {
      if (editingUser) {
        // Aggiorna utente esistente
        const { db } = await import("@/lib/firebase")
        const { doc, updateDoc } = await import("firebase/firestore")

        const updateData: any = {
          firstName: userForm.firstName,
          lastName: userForm.lastName,
          email: userForm.email,
          assignedClientIds: userForm.assignedClientIds,
          updatedAt: new Date(),
        }

        await updateDoc(doc(db, "users", editingUser.tenantId), updateData)

        toast({
          title: "Successo",
          description: "Utente aggiornato con successo",
        })
      } else {
        // Crea nuovo utente
        const { auth, db } = await import("@/lib/firebase")
        const { createUserWithEmailAndPassword } = await import("firebase/auth")
        const { doc, setDoc } = await import("firebase/firestore")

        const userCredential = await createUserWithEmailAndPassword(auth, userForm.email, userForm.password)
        const newUser = userCredential.user

        await setDoc(doc(db, "users", newUser.uid), {
          firstName: userForm.firstName,
          lastName: userForm.lastName,
          email: userForm.email,
          role: "user",
          tenantId: newUser.uid,
          parentTenantId: userData?.tenantId,
          assignedClientIds: userForm.assignedClientIds,
          aiTokensUsed: 0,
          aiTokensLimit: 50000, // Limite base per utenti team
          createdAt: new Date(),
          updatedAt: new Date(),
        })

        toast({
          title: "Successo",
          description: "Utente del team creato con successo",
        })
      }

      setShowUserDialog(false)
      resetForm()
    } catch (error: any) {
      console.error("Error creating/updating user:", error)
      let errorMessage = "Errore durante l'operazione"

      if (error.code === "auth/email-already-in-use") {
        errorMessage = "Questa email è già in uso"
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Email non valida"
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password troppo debole"
      }

      toast({
        title: "Errore",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsCreatingUser(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo utente? Questa azione non può essere annullata.")) {
      return
    }

    try {
      const { db } = await import("@/lib/firebase")
      const { doc, updateDoc } = await import("firebase/firestore")

      // Invece di eliminare, disattiviamo l'utente
      await updateDoc(doc(db, "users", userId), {
        isSuspended: true,
        updatedAt: new Date(),
      })

      toast({
        title: "Successo",
        description: "Utente disattivato con successo",
      })
    } catch (error) {
      console.error("Error deleting user:", error)
      toast({
        title: "Errore",
        description: "Errore durante l'eliminazione dell'utente",
        variant: "destructive",
      })
    }
  }

  if (usersLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8 text-pink-500" />
            Gestione Team
          </h1>
          <p className="text-gray-600">Gestisci gli utenti interni della tua agenzia</p>
        </div>
        <Button
          onClick={() => {
            resetForm()
            setShowUserDialog(true)
          }}
          className="bg-pink-500 hover:bg-pink-600"
        >
          <UserPlus className="mr-2 h-4 w-4" />
          Aggiungi Utente
        </Button>
      </div>

      {/* Statistiche */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Utenti Team</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamUsers.length}</div>
            <p className="text-xs text-muted-foreground">utenti interni attivi</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Clienti Assegnati</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length}</div>
            <p className="text-xs text-muted-foreground">clienti totali</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Copertura</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clients.length > 0 ? Math.round((teamUsers.length / clients.length) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">rapporto utenti/clienti</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista utenti team */}
      <Card>
        <CardHeader>
          <CardTitle>Utenti del Team ({teamUsers.length})</CardTitle>
          <CardDescription>Gestisci i membri del tuo team e le loro assegnazioni ai clienti</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamUsers.map((user) => {
              const assignedClients = clients.filter((client) => user.assignedClientIds?.includes(client.id))

              return (
                <div key={user.tenantId} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <User className="h-5 w-5 text-gray-500" />
                        <h3 className="font-semibold">
                          {user.firstName} {user.lastName}
                        </h3>
                        {user.isSuspended && <Badge variant="destructive">Disattivato</Badge>}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Email:</span>
                          <br />
                          {user.email}
                        </div>
                        <div>
                          <span className="font-medium">Clienti Assegnati:</span>
                          <br />
                          {assignedClients.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {assignedClients.map((client) => (
                                <Badge key={client.id} variant="secondary" className="text-xs">
                                  {client.name}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">Nessun cliente assegnato</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(user)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUser(user.tenantId)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}

            {teamUsers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="mb-2">Nessun utente del team</p>
                <Button
                  onClick={() => {
                    resetForm()
                    setShowUserDialog(true)
                  }}
                  variant="outline"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Aggiungi primo utente
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog per aggiungere/modificare utente */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Modifica Utente Team" : "Aggiungi Utente Team"}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Modifica i dettagli e le assegnazioni dell'utente"
                : "Crea un nuovo utente interno per la tua agenzia"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nome *</Label>
                <Input
                  id="firstName"
                  value={userForm.firstName}
                  onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                  placeholder="Mario"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Cognome *</Label>
                <Input
                  id="lastName"
                  value={userForm.lastName}
                  onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                  placeholder="Rossi"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="pl-10"
                  placeholder="mario.rossi@agenzia.com"
                  disabled={!!editingUser} // Non modificabile in edit
                />
              </div>
            </div>

            {!editingUser && (
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      placeholder="Password di accesso"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button type="button" variant="outline" onClick={generatePassword}>
                    Genera
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <Label>Clienti Assegnati</Label>
              <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
                {clients.length > 0 ? (
                  <div className="space-y-2">
                    {clients.map((client) => (
                      <div key={client.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`client-${client.id}`}
                          checked={userForm.assignedClientIds.includes(client.id)}
                          onCheckedChange={(checked) => handleClientAssignment(client.id, checked as boolean)}
                        />
                        <Label htmlFor={`client-${client.id}`} className="flex items-center gap-2 cursor-pointer">
                          <div className={`w-3 h-3 rounded-full ${client.color}`}></div>
                          {client.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Nessun cliente disponibile. Aggiungi prima dei clienti.</p>
                )}
              </div>
              <p className="text-xs text-gray-500">
                L'utente potrà vedere e gestire solo i task dei clienti selezionati
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUserDialog(false)
                resetForm()
              }}
              disabled={isCreatingUser}
            >
              Annulla
            </Button>
            <Button
              onClick={handleCreateOrUpdateUser}
              className="bg-pink-500 hover:bg-pink-600"
              disabled={isCreatingUser}
            >
              {isCreatingUser ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {editingUser ? "Aggiornamento..." : "Creazione..."}
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {editingUser ? "Aggiorna Utente" : "Crea Utente"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
