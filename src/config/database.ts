import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

// Database configuration interface
interface DatabaseConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: any;
  max?: number;
  min?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  keepAlive?: boolean;
  keepAliveInitialDelayMillis?: number;
}

// Get Neon database configuration
const getNeonConfig = (): DatabaseConfig => ({
  connectionString: process.env.DATABASE_URL_NEON || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  min: 1,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 30000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Get local database configuration
const getLocalConfig = (): DatabaseConfig => ({
  connectionString: process.env.DATABASE_URL_LOCAL,
  host: process.env.DB_HOST_LOCAL || "localhost",
  port: parseInt(process.env.DB_PORT_LOCAL || "5432"),
  database: process.env.DB_NAME_LOCAL || "government_feedback",
  user: process.env.DB_USER_LOCAL || "postgres",
  password: process.env.DB_PASSWORD_LOCAL || "postgres",
  ssl: false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Test database connection
async function testDatabaseConnection(
  config: DatabaseConfig,
  dbName: string
): Promise<boolean> {
  const testPool = new Pool(config);
  try {
    const client = await testPool.connect();
    await client.query("SELECT 1");
    client.release();
    await testPool.end();
    console.log(`✅ ${dbName} database connection successful`);
    return true;
  } catch (error: any) {
    await testPool.end();
    console.log(`❌ ${dbName} database connection failed: ${error.message}`);
    return false;
  }
}

// Create database connection pool with fallback system
const createPoolWithFallback = async () => {
  const dbPrimary = process.env.DB_PRIMARY || "auto";

  console.log("🔄 Initializing dual database system...");
  console.log(`📋 Primary database preference: ${dbPrimary}`);

  // Get configurations
  const neonConfig = getNeonConfig();
  const localConfig = getLocalConfig();

  let activeConfig: DatabaseConfig;
  let activeDatabaseName: string;

  switch (dbPrimary.toLowerCase()) {
    case "neon":
      console.log("🌐 Attempting to connect to Neon database...");
      if (await testDatabaseConnection(neonConfig, "Neon")) {
        activeConfig = neonConfig;
        activeDatabaseName = "Neon Cloud Database";
      } else {
        throw new Error(
          "Neon database connection failed and no fallback allowed"
        );
      }
      break;

    case "local":
      console.log("🏠 Attempting to connect to Local database...");
      if (await testDatabaseConnection(localConfig, "Local")) {
        activeConfig = localConfig;
        activeDatabaseName = "Local PostgreSQL Database";
      } else {
        throw new Error(
          "Local database connection failed and no fallback allowed"
        );
      }
      break;

    case "auto":
    default:
      console.log("🔄 Auto-detecting best database connection...");

      // Try Neon first
      console.log("🌐 Testing Neon database...");
      if (await testDatabaseConnection(neonConfig, "Neon")) {
        activeConfig = neonConfig;
        activeDatabaseName = "Neon Cloud Database (Primary)";
        console.log("✅ Using Neon as primary database");
      } else {
        // Fallback to local
        console.log("🏠 Falling back to Local database...");
        if (await testDatabaseConnection(localConfig, "Local")) {
          activeConfig = localConfig;
          activeDatabaseName = "Local PostgreSQL Database (Fallback)";
          console.log("✅ Using Local as fallback database");
        } else {
          throw new Error("Both Neon and Local database connections failed");
        }
      }
      break;
  }

  console.log(`🎯 Active Database: ${activeDatabaseName}`);
  return new Pool(activeConfig);
};

// Initialize the pool
let pool: Pool;
let poolInitialized = false;

const initializePool = async () => {
  if (!poolInitialized) {
    try {
      pool = await createPoolWithFallback();
      poolInitialized = true;
    } catch (error: any) {
      console.error("💥 Database initialization failed:", error.message);
      throw error;
    }
  }
  return pool;
};

// Get database pool (lazy initialization)
const getPool = async (): Promise<Pool> => {
  if (!poolInitialized) {
    await initializePool();
  }
  return pool;
};

// Export a proxy object that initializes the pool when needed
const databaseProxy = {
  async connect() {
    const activePool = await getPool();
    return activePool.connect();
  },

  async query(text: string, params?: any[]) {
    const activePool = await getPool();
    return activePool.query(text, params);
  },

  async end() {
    if (poolInitialized && pool) {
      await pool.end();
      poolInitialized = false;
    }
  },

  // Get current database info
  async getDatabaseInfo() {
    const activePool = await getPool();
    const client = await activePool.connect();
    try {
      const result = await client.query(`
        SELECT
          current_database() as database_name,
          current_user as user_name,
          version() as version,
          inet_server_addr() as server_ip
      `);
      return result.rows[0];
    } finally {
      client.release();
    }
  },

  // Test both databases and return status
  async testBothDatabases() {
    const neonConfig = getNeonConfig();
    const localConfig = getLocalConfig();

    const neonStatus = await testDatabaseConnection(neonConfig, "Neon");
    const localStatus = await testDatabaseConnection(localConfig, "Local");

    return {
      neon: neonStatus,
      local: localStatus,
      active: poolInitialized ? "initialized" : "not_initialized",
    };
  },
};

// Initialize the database connection
initializePool().catch((error) => {
  console.error("💥 Failed to initialize database:", error.message);
  console.log("🔧 Please check your database configuration and try again");
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("🔄 Closing database connection pool...");
  await databaseProxy.end();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("🔄 Closing database connection pool...");
  await databaseProxy.end();
  process.exit(0);
});

export default databaseProxy;
