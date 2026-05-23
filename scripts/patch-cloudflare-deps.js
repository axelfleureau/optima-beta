const fs = require("node:fs")
const path = require("node:path")

const root = process.cwd()
const targets = [
  "node_modules/@protobufjs/inquire",
  "node_modules/protobufjs/node_modules/@protobufjs/inquire",
  "node_modules/@protobufjs/fetch/node_modules/@protobufjs/inquire",
]

const packageJson = JSON.stringify(
  {
    name: "@protobufjs/inquire",
    version: "1.1.0",
    main: "index.js",
  },
  null,
  2,
)

const indexJs = `module.exports = function inquire() {
  return null
}
`

for (const target of targets) {
  const dir = path.join(root, target)
  fs.rmSync(dir, { recursive: true, force: true })
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, "package.json"), `${packageJson}\n`)
  fs.writeFileSync(path.join(dir, "index.js"), indexJs)
}

console.log("Patched @protobufjs/inquire for Cloudflare Workers")
