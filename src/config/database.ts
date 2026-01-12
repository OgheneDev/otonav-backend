import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../models/schema.js";
import dotenv from "dotenv";

// Load environment variables HERE
dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in environment variables");
}

console.log("🔌 Attempting to connect to database...");
console.log(
  "📡 Connection string:",
  connectionString.replace(/:[^:@]*@/, ":****@")
); // Hide password

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased timeout
});

// Event listeners
pool.on("connect", () => {
  console.log("✅ New PostgreSQL client connected to the pool");
});

pool.on("error", (err) => {
  console.error("❌ Unexpected error on idle PostgreSQL client:", err.message);
});

// Test connection IMMEDIATELY
(async () => {
  try {
    const client = await pool.connect();
    console.log("✅ Database handshake successful: Connection established.");

    // Optional: Test a simple query
    const result = await client.query("SELECT NOW()");
    console.log("⏰ Database time:", result.rows[0].now);

    // Check if our tables exist
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log("📊 Existing tables:", tables.rows.length);
    if (tables.rows.length > 0) {
      console.log("   ", tables.rows.map((row) => row.table_name).join(", "));
    } else {
      console.log("   No tables found - you may need to push your schema");
    }

    client.release();
  } catch (err) {
    console.error(
      "🚫 Database connection failed:",
      err instanceof Error ? err.message : String(err)
    );
    console.log("\n🔧 Troubleshooting tips:");
    console.log("1. Check if your Neon database is active");
    console.log("2. Verify the connection string in Neon Console");
    console.log("3. Check if your IP is whitelisted in Neon");
    console.log("4. Try the connection string directly in a PostgreSQL client");
  }
})();

// Test connection function for use elsewhere
export async function testConnection() {
  try {
    const client = await pool.connect();
    client.release();
    return true;
  } catch (err) {
    return false;
  }
}

export const db = drizzle(pool, { schema });

// Export pool for manual queries if needed
export { pool };
