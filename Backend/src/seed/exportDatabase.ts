import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { connectDatabase, disconnectDatabase } from "../config/db";

const COLLECTIONS = ["users", "vacations", "likes"];

/**
 * Exports each collection as a Canonical Extended JSON array, importable with:
 *   mongoimport --db voyage --collection <name> --jsonArray --file <name>.json
 */
async function exportDatabase(outDir: string): Promise<void> {
  await connectDatabase();
  fs.mkdirSync(outDir, { recursive: true });
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database connection is not ready");

  for (const name of COLLECTIONS) {
    const docs = await db.collection(name).find({}).toArray();
    fs.writeFileSync(path.join(outDir, `${name}.json`), mongoose.mongo.BSON.EJSON.stringify(docs, undefined, 2, { relaxed: false }));
    console.log(`Exported ${docs.length} ${name}`);
  }
}

const outDir = path.resolve(process.argv[2] ?? path.join(process.cwd(), "..", "Database", "export"));
exportDatabase(outDir)
  .catch((error: unknown) => {
    console.error("Export failed", error);
    process.exitCode = 1;
  })
  .finally(() => void disconnectDatabase());
