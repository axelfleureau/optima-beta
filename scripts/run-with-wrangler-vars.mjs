#!/usr/bin/env node

import { readFileSync } from "node:fs"
import { spawnSync } from "node:child_process"

function stripJsonComments(source) {
  let output = ""
  let inString = false
  let escaped = false
  let inLineComment = false
  let inBlockComment = false

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]
    const next = source[index + 1]

    if (inLineComment) {
      if (char === "\n") {
        inLineComment = false
        output += char
      }
      continue
    }

    if (inBlockComment) {
      if (char === "*" && next === "/") {
        inBlockComment = false
        index += 1
      }
      continue
    }

    if (inString) {
      output += char
      if (escaped) {
        escaped = false
      } else if (char === "\\") {
        escaped = true
      } else if (char === "\"") {
        inString = false
      }
      continue
    }

    if (char === "\"") {
      inString = true
      output += char
      continue
    }

    if (char === "/" && next === "/") {
      inLineComment = true
      index += 1
      continue
    }

    if (char === "/" && next === "*") {
      inBlockComment = true
      index += 1
      continue
    }

    output += char
  }

  return output
}

function readWranglerVars(envName) {
  const config = JSON.parse(stripJsonComments(readFileSync("wrangler.jsonc", "utf8")))
  const baseVars = config.vars && typeof config.vars === "object" ? config.vars : {}
  const envVars =
    envName && config.env?.[envName]?.vars && typeof config.env[envName].vars === "object"
      ? config.env[envName].vars
      : {}

  return { ...baseVars, ...envVars }
}

const args = process.argv.slice(2)
let envName = null
if (args[0] && args[0] !== "--") {
  envName = args.shift()
}
if (args[0] === "--") args.shift()

if (!args.length) {
  console.error("Usage: node scripts/run-with-wrangler-vars.mjs [env] -- <command> [args...]")
  process.exit(1)
}

const vars = readWranglerVars(envName)
const result = spawnSync(args[0], args.slice(1), {
  stdio: "inherit",
  env: { ...process.env, ...vars },
})

if (result.error) {
  console.error(result.error.message)
  process.exit(1)
}

process.exit(result.status ?? 1)
