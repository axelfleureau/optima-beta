import { decodeProtectedHeader, importPKCS8, importX509, jwtVerify, SignJWT } from "jose"
import { FieldValue, isFieldOperation, Timestamp } from "@/lib/firebase-admin-firestore"

const PROJECT_ID = "optima-righello"
const DATABASE_ID = "(default)"
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`
const TOKEN_URL = "https://oauth2.googleapis.com/token"
const FIREBASE_CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"

type FirestoreValue = Record<string, any>
type DecodedFirebaseToken = Record<string, unknown> & {
  uid: string
  sub?: string
  user_id?: string
}

class RestDocumentSnapshot {
  id: string
  exists: boolean
  private value: Record<string, any> | null

  constructor(id: string, value: Record<string, any> | null) {
    this.id = id
    this.exists = value !== null
    this.value = value
  }

  data() {
    return this.value
  }
}

class RestQuerySnapshot {
  docs: RestDocumentSnapshot[]

  constructor(docs: RestDocumentSnapshot[]) {
    this.docs = docs
  }

  get empty() {
    return this.docs.length === 0
  }

  forEach(callback: (doc: RestDocumentSnapshot) => void) {
    this.docs.forEach(callback)
  }
}

type WhereClause = {
  field: string
  op: string
  value: unknown
}

type OrderClause = {
  field: string
  direction?: "asc" | "desc"
}

class RestCollectionReference {
  private path: string
  private wheres: WhereClause[]
  private orders: OrderClause[]
  private resultLimit?: number

  constructor(path: string, wheres: WhereClause[] = [], orders: OrderClause[] = [], resultLimit?: number) {
    this.path = path
    this.wheres = wheres
    this.orders = orders
    this.resultLimit = resultLimit
  }

  doc(id = crypto.randomUUID()) {
    return new RestDocumentReference(`${this.path}/${id}`)
  }

  where(field: string, op: string, value: unknown) {
    return new RestCollectionReference(this.path, [...this.wheres, { field, op, value }], this.orders, this.resultLimit)
  }

  orderBy(field: string, direction?: "asc" | "desc") {
    return new RestCollectionReference(this.path, this.wheres, [...this.orders, { field, direction }], this.resultLimit)
  }

  limit(count: number) {
    return new RestCollectionReference(this.path, this.wheres, this.orders, count)
  }

  async add(data: Record<string, any>) {
    const ref = this.doc()
    await ref.set(data)
    return ref
  }

  async get() {
    const response = await firestoreFetch(":runQuery", {
      method: "POST",
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: this.path.split("/").pop() }],
          where: buildStructuredWhere(this.wheres),
          orderBy: this.orders.map((order) => ({
            field: { fieldPath: order.field },
            direction: order.direction === "desc" ? "DESCENDING" : "ASCENDING",
          })),
          limit: this.resultLimit,
        },
      }),
    })

    const results = await response.json()
    const docs = Array.isArray(results)
      ? results
          .map((item) => item.document)
          .filter(Boolean)
          .map((document) => documentToSnapshot(document))
      : []

    return new RestQuerySnapshot(docs)
  }
}

class RestDocumentReference {
  path: string
  id: string

  constructor(path: string) {
    this.path = path
    this.id = path.split("/").pop() || path
  }

  async get() {
    const response = await firestoreFetch(`/${this.path}`)

    if (response.status === 404) {
      return new RestDocumentSnapshot(this.id, null)
    }

    const document = await response.json()
    return documentToSnapshot(document)
  }

  async set(data: Record<string, any>) {
    const normalized = normalizeFieldOperations(data)
    await firestoreFetch(`/${this.path}`, {
      method: "PATCH",
      body: JSON.stringify({ fields: encodeFields(normalized) }),
    })
  }

  async update(data: Record<string, any>) {
    const current = await this.get()
    if (!current.exists) {
      throw new Error(`Document ${this.path} not found`)
    }

    const currentData = current.data() || {}
    const normalized = normalizeFieldOperations(data, currentData)
    const merged = { ...currentData, ...normalized }
    const mask = Object.keys(normalized)
      .map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`)
      .join("&")

    await firestoreFetch(`/${this.path}${mask ? `?${mask}` : ""}`, {
      method: "PATCH",
      body: JSON.stringify({ fields: encodeFields(merged) }),
    })
  }

  async delete() {
    await firestoreFetch(`/${this.path}`, { method: "DELETE" })
  }
}

export const adminDb: any = {
  collection(path: string) {
    return new RestCollectionReference(path)
  },
}

export const adminAuth: any = {
  verifyIdToken: verifyFirebaseToken,
  async createUser() {
    throw new Error("Firebase Auth user creation is not implemented on the Cloudflare REST adapter")
  },
  async updateUser() {
    throw new Error("Firebase Auth user update is not implemented on the Cloudflare REST adapter")
  },
  async deleteUser() {
    throw new Error("Firebase Auth user deletion is not implemented on the Cloudflare REST adapter")
  },
  async generatePasswordResetLink() {
    throw new Error("Firebase Auth password reset links are not implemented on the Cloudflare REST adapter")
  },
}

export async function verifyFirebaseToken(token: string): Promise<DecodedFirebaseToken> {
  const header = decodeProtectedHeader(token)
  if (!header.kid) {
    throw new Error("Invalid token header")
  }

  const certs = await getFirebaseCerts()
  const cert = certs[header.kid]
  if (!cert) {
    throw new Error("Unknown token certificate")
  }

  const key = await importX509(cert, "RS256")
  const { payload } = await jwtVerify(token, key, {
    audience: PROJECT_ID,
    issuer: `https://securetoken.google.com/${PROJECT_ID}`,
  })

  const uid = payload.user_id || payload.sub
  if (typeof uid !== "string") {
    throw new Error("Firebase token does not contain a uid")
  }

  return { ...payload, uid } as DecodedFirebaseToken
}

export async function getUserData(uid: string) {
  const userDoc = await adminDb.collection("users").doc(uid).get()
  if (!userDoc.exists) {
    throw new Error("User not found")
  }

  return userDoc.data()
}

let accessTokenCache: { token: string; expiresAt: number } | null = null
let certCache: { certs: Record<string, string>; expiresAt: number } | null = null

async function getAccessToken() {
  if (accessTokenCache && accessTokenCache.expiresAt > Date.now() + 60_000) {
    return accessTokenCache.token
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")
  if (!clientEmail || !privateKey) {
    throw new Error("Firebase service account environment variables are missing")
  }

  const now = Math.floor(Date.now() / 1000)
  const signingKey = await importPKCS8(privateKey, "RS256")
  const assertion = await new SignJWT({
    scope: "https://www.googleapis.com/auth/datastore",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(clientEmail)
    .setSubject(clientEmail)
    .setAudience(TOKEN_URL)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(signingKey)

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  })

  if (!response.ok) {
    throw new Error(`Firebase access token request failed: ${response.status}`)
  }

  const payload = await response.json()
  accessTokenCache = {
    token: payload.access_token,
    expiresAt: Date.now() + Number(payload.expires_in || 3600) * 1000,
  }

  return accessTokenCache.token
}

async function getFirebaseCerts() {
  if (certCache && certCache.expiresAt > Date.now()) {
    return certCache.certs
  }

  const response = await fetch(FIREBASE_CERTS_URL)
  if (!response.ok) {
    throw new Error(`Firebase cert request failed: ${response.status}`)
  }

  const cacheControl = response.headers.get("cache-control") || ""
  const maxAge = Number(cacheControl.match(/max-age=(\d+)/)?.[1] || 3600)
  certCache = {
    certs: await response.json(),
    expiresAt: Date.now() + maxAge * 1000,
  }

  return certCache.certs
}

async function firestoreFetch(path: string, init: RequestInit = {}) {
  const token = await getAccessToken()
  const response = await fetch(`${FIRESTORE_BASE_URL}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...init.headers,
    },
  })

  if (!response.ok && response.status !== 404) {
    const detail = await response.text()
    throw new Error(`Firestore REST request failed: ${response.status} ${detail}`)
  }

  return response
}

function buildStructuredWhere(wheres: WhereClause[]) {
  if (wheres.length === 0) {
    return undefined
  }

  const filters = wheres.map((where) => ({
    fieldFilter: {
      field: { fieldPath: where.field },
      op: mapWhereOperator(where.op),
      value: encodeValue(where.value),
    },
  }))

  return filters.length === 1
    ? filters[0]
    : {
        compositeFilter: {
          op: "AND",
          filters,
        },
      }
}

function mapWhereOperator(op: string) {
  switch (op) {
    case "==":
      return "EQUAL"
    case "!=":
      return "NOT_EQUAL"
    case "<":
      return "LESS_THAN"
    case "<=":
      return "LESS_THAN_OR_EQUAL"
    case ">":
      return "GREATER_THAN"
    case ">=":
      return "GREATER_THAN_OR_EQUAL"
    case "array-contains":
      return "ARRAY_CONTAINS"
    case "in":
      return "IN"
    case "array-contains-any":
      return "ARRAY_CONTAINS_ANY"
    default:
      throw new Error(`Unsupported Firestore where operator: ${op}`)
  }
}

function documentToSnapshot(document: any) {
  const name = String(document.name || "")
  const id = name.split("/").pop() || name
  return new RestDocumentSnapshot(id, decodeFields(document.fields || {}))
}

function normalizeFieldOperations(data: Record<string, any>, currentData: Record<string, any> = {}) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      if (isFieldOperation(value)) {
        if (value.__op === "serverTimestamp") {
          return [key, Timestamp.now()]
        }
        if (value.__op === "arrayUnion") {
          const current = Array.isArray(currentData[key]) ? currentData[key] : []
          return [key, [...current, ...value.values]]
        }
      }

      return [key, value]
    })
  )
}

function encodeFields(data: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, encodeValue(value)])
  )
}

function encodeValue(value: any): FirestoreValue {
  if (value === null) return { nullValue: null }
  if (value instanceof Timestamp) return { timestampValue: value.toDate().toISOString() }
  if (value instanceof Date) return { timestampValue: value.toISOString() }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } }
  if (typeof value === "boolean") return { booleanValue: value }
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  }
  if (typeof value === "object") {
    return { mapValue: { fields: encodeFields(value) } }
  }
  return { stringValue: String(value) }
}

function decodeFields(fields: Record<string, FirestoreValue>) {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]))
}

function decodeValue(value: FirestoreValue): any {
  if ("nullValue" in value) return null
  if ("stringValue" in value) return value.stringValue
  if ("booleanValue" in value) return value.booleanValue
  if ("integerValue" in value) return Number(value.integerValue)
  if ("doubleValue" in value) return Number(value.doubleValue)
  if ("timestampValue" in value) return Timestamp.fromDate(new Date(value.timestampValue))
  if ("arrayValue" in value) return (value.arrayValue?.values || []).map(decodeValue)
  if ("mapValue" in value) return decodeFields(value.mapValue?.fields || {})
  if ("referenceValue" in value) return value.referenceValue
  return undefined
}

export { FieldValue, Timestamp }
