import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;

async function initDatabase() {
  const dbName = process.env.DB_NAME || 'adaptvr_db';
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || '049024';
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || '5432', 10);

  console.log(`\n======================================================`);
  console.log(` 🚀 AdaptVR PostgreSQL Database Initializer`);
  console.log(`======================================================`);
  console.log(`Connecting to PostgreSQL host=${dbHost}:${dbPort} as user='${dbUser}'...`);

  // Step 1: Maintenance Pool to check/create target database
  const maintenancePool = new Pool({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: 'postgres',
  });

  try {
    const res = await maintenancePool.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );

    if (res.rowCount === 0) {
      console.log(`[+] Database '${dbName}' does not exist. Creating...`);
      await maintenancePool.query(`CREATE DATABASE "${dbName}"`);
      console.log(`[✓] Database '${dbName}' created successfully.`);
    } else {
      console.log(`[✓] Database '${dbName}' already exists.`);
    }
  } catch (err) {
    console.error(`[X] Error checking/creating database:`, err.message);
    await maintenancePool.end();
    process.exit(1);
  } finally {
    await maintenancePool.end();
  }

  // Step 2: Connect to 'adaptvr_db'
  const targetPool = new Pool({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbName,
  });

  try {
    console.log(`\n[+] Reading schema.sql and seed.sql...`);
    const schemaPath = path.join(__dirname, 'schema.sql');
    const seedPath = path.join(__dirname, 'seed.sql');

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    const seedSql = fs.readFileSync(seedPath, 'utf8');

    console.log(`[+] Executing schema.sql (tables, indexes, triggers)...`);
    await targetPool.query(schemaSql);
    console.log(`[✓] All 8 tables and indexes created successfully.`);

    console.log(`[+] Executing seed.sql (sample data)...`);
    await targetPool.query(seedSql);
    console.log(`[✓] Sample records inserted successfully.`);

    // Record verification
    const teacherRes = await targetPool.query('SELECT COUNT(*) FROM TEACHER');
    const studentRes = await targetPool.query('SELECT COUNT(*) FROM STUDENT');
    const moduleRes = await targetPool.query('SELECT COUNT(*) FROM LEARNING_MODULE');
    const teacherModuleRes = await targetPool.query('SELECT COUNT(*) FROM TEACHER_MODULE');
    const sessionRes = await targetPool.query('SELECT COUNT(*) FROM SESSION');
    const eventRes = await targetPool.query('SELECT COUNT(*) FROM INTERACTION_EVENT');
    const predictionRes = await targetPool.query('SELECT COUNT(*) FROM ML_PREDICTION');
    const adaptationRes = await targetPool.query('SELECT COUNT(*) FROM ADAPTATION_EVENT');

    console.log(`\n======================================================`);
    console.log(` 🎉 AdaptVR Database Ready! Summary of Tables & Records:`);
    console.log(` ----------------------------------------------------`);
    console.log(`  1. TEACHER:           ${teacherRes.rows[0].count} records`);
    console.log(`  2. STUDENT:           ${studentRes.rows[0].count} records`);
    console.log(`  3. LEARNING_MODULE:   ${moduleRes.rows[0].count} records`);
    console.log(`  4. TEACHER_MODULE:    ${teacherModuleRes.rows[0].count} records`);
    console.log(`  5. SESSION:           ${sessionRes.rows[0].count} records`);
    console.log(`  6. INTERACTION_EVENT: ${eventRes.rows[0].count} records`);
    console.log(`  7. ML_PREDICTION:     ${predictionRes.rows[0].count} records`);
    console.log(`  8. ADAPTATION_EVENT:  ${adaptationRes.rows[0].count} records`);
    console.log(`======================================================\n`);

  } catch (err) {
    console.error(`[X] Error during schema execution or seeding:`, err.message);
    await targetPool.end();
    process.exit(1);
  } finally {
    await targetPool.end();
  }
}

initDatabase();
