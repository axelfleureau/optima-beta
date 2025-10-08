// This script helps create the required Firestore indexes
// Run this to get the exact commands needed

const firebaseConfig = {
  // Your Firebase config here
}

// Make this file a module to avoid global scope conflicts
export {}

console.log(`
🔥 FIRESTORE INDEXES REQUIRED

Per risolvere gli errori degli indici, esegui questi comandi nella Firebase CLI:

1. INSTALLA FIREBASE CLI (se non l'hai già):
   npm install -g firebase-tools

2. LOGIN:
   firebase login

3. INIZIALIZZA IL PROGETTO:
   firebase init firestore

4. CREA GLI INDICI NECESSARI:

   # Indice per campaigns (tenantId + createdAt)
   firebase firestore:indexes

   Oppure crea manualmente questi indici nella console Firebase:

   📋 INDICE 1 - campaigns:
   - Collection: campaigns
   - Fields: 
     * tenantId (Ascending)
     * createdAt (Descending)
     * __name__ (Ascending)

   📋 INDICE 2 - campaigns (con clientId):
   - Collection: campaigns  
   - Fields:
     * tenantId (Ascending)
     * clientId (Ascending)
     * createdAt (Descending)
     * __name__ (Ascending)

   📋 INDICE 3 - chat_sessions:
   - Collection: chat_sessions
   - Fields: 
     * userId (Ascending)
     * lastMessageAt (Descending)
     * __name__ (Ascending)

   📋 INDICE 4 - chat_messages:
   - Collection: chat_messages  
   - Fields:
     * sessionId (Ascending)
     * timestamp (Ascending)
     * __name__ (Ascending)

5. LINKS DIRETTI (clicca per creare automaticamente):
   
   Indice campaigns (tenantId + createdAt):
   https://console.firebase.google.com/v1/r/project/optima-righello/firestore/indexes?create_composite=ClFwcm9qZWN0cy9vcHRpbWEtcmlnaGVsbG8vZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2NhbXBhaWducy9pbmRleGVzL18QARoMCgh0ZW5hbnRJZBABGg0KCWNyZWF0ZWRBdBACGgwKCF9fbmFtZV9fEAI

   Indice campaigns (tenantId + clientId + createdAt):
   https://console.firebase.google.com/v1/r/project/optima-righello/firestore/indexes?create_composite=ClFwcm9qZWN0cy9vcHRpbWEtcmlnaGVsbG8vZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2NhbXBhaWducy9pbmRleGVzL18QARoMCgh0ZW5hbnRJZBABGgwKCGNsaWVudElkEAEaDQoJY3JlYXRlZEF0EAIaDAoIX19uYW1lX18QAg

   Indice chat_sessions:
   https://console.firebase.google.com/v1/r/project/optima-righello/firestore/indexes?create_composite=ClVwcm9qZWN0cy9vcHRpbWEtcmlnaGVsbG8vZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2NoYXRfc2Vzc2lvbnMvaW5kZXhlcy9fEAEaCgoGdXNlcklkEAEaEQoNbGFzdE1lc3NhZ2VBdBACGgwKCF9fbmFtZV9fEAI

   Indice chat_messages:
   https://console.firebase.google.com/v1/r/project/optima-righello/firestore/indexes?create_composite=ClVwcm9qZWN0cy9vcHRpbWEtcmlnaGVsbG8vZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL2NoYXRfbWVzc2FnZXMvaW5kZXhlcy9fEAEaDQoJc2Vzc2lvbklkEAEaDQoJdGltZXN0YW1wEAEaDAoIX19uYW1lX18QAQ

⏱️  Gli indici impiegano 5-10 minuti per essere creati.

🔧 ALTERNATIVA RAPIDA:
Puoi anche creare gli indici direttamente dalla console Firebase:
1. Vai su https://console.firebase.google.com/project/optima-righello/firestore/indexes
2. Clicca "Create Index"
3. Aggiungi i campi come specificato sopra

📝 NOTA: Dopo aver creato gli indici, rimuovi l'orderBy dalle query se continui ad avere problemi.
`)
