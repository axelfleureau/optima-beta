const { execSync } = require("child_process")

console.log("🔥 Initializing Firebase database...")

try {
  execSync("npx tsx scripts/init-firebase.ts", { stdio: "inherit" })
  console.log("✅ Database initialization completed!")
} catch (error) {
  console.error("❌ Error running initialization:", error)
  process.exit(1)
}
