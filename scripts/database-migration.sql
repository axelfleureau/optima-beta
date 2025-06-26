-- Script per aggiornare la struttura del database esistente
-- Questo script corregge eventuali inconsistenze nei dati esistenti

-- 1. Verifica la struttura delle tasks
-- Le tasks devono avere:
-- - clientId: ID del documento nella collection clients (o "tenant" per task interne)
-- - tenantId: ID dell'agenzia proprietaria
-- - columnId: stato della task

-- 2. Verifica la struttura degli users
-- Gli users devono avere:
-- - tenantId: proprio tenant ID
-- - parentTenantId: (solo per client) ID dell'agenzia
-- - role: "admin" o "client"

-- 3. Verifica la struttura dei clients
-- I clients devono avere:
-- - tenantId: ID dell'agenzia proprietaria
-- - clientTenantId: tenant ID del client user

-- Nota: Questo è uno script di riferimento per la struttura.
-- Le modifiche effettive devono essere fatte tramite Firebase Admin SDK
-- o manualmente nella console Firebase.

-- Struttura corretta per tasks:
/*
{
  "id": "document_id",
  "title": "string",
  "description": "string",
  "columnId": "string", // stato della task
  "clientId": "string", // ID documento clients o "tenant"
  "clientName": "string", // nome del cliente per display
  "tenantId": "string", // ID agenzia proprietaria
  "priority": "low|medium|high",
  "dueDate": "timestamp",
  "assignee": "string",
  "tags": ["array"],
  "comments": "number",
  "attachments": ["array"],
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
*/

-- Struttura corretta per users:
/*
{
  "id": "user_uid",
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "companyName": "string",
  "tenantId": "string", // proprio tenant
  "parentTenantId": "string", // solo per client: agenzia
  "role": "admin|client",
  "plan": "string",
  "aiTokensUsed": "number",
  "aiTokensLimit": "number",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
*/

-- Struttura corretta per clients:
/*
{
  "id": "document_id",
  "name": "string",
  "industry": "string",
  "contactEmail": "string",
  "contactPhone": "string",
  "address": "string",
  "color": "string",
  "tenantId": "string", // agenzia proprietaria
  "clientTenantId": "string", // tenant del client user
  "status": "active|inactive",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
*/
