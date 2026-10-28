import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { createApp } from "../src/app";
import { signToken } from "../src/middleware/auth";
import { User, type Role } from "../src/models/User";
import { Vacation } from "../src/models/Vacation";
import { Like } from "../src/models/Like";
import { addDays, startOfTodayUtc, formatIsoDate } from "../src/utils/dates";

let mongo: MongoMemoryServer | undefined;

export const app = createApp();
export const api = () => request(app);

/**
 * Uses MONGO_TEST_URI (e.g. a Docker mongo) when set, otherwise an in-memory MongoDB.
 * Each test file gets its own throw-away database.
 */
export async function startDatabase(): Promise<void> {
  const external = process.env.MONGO_TEST_URI;
  const dbName = `voyage_test_${process.pid}_${Math.random().toString(36).slice(2, 8)}`;
  if (external) {
    await mongoose.connect(external, { dbName });
  } else {
    mongo = await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri(), { dbName });
  }
  await Promise.all([User.syncIndexes(), Vacation.syncIndexes(), Like.syncIndexes()]);
}

export async function stopDatabase(): Promise<void> {
  await mongoose.connection.dropDatabase().catch(() => undefined);
  await mongoose.disconnect();
  await mongo?.stop();
}

export async function clearDatabase(): Promise<void> {
  await Promise.all([User.deleteMany({}), Vacation.deleteMany({}), Like.deleteMany({})]);
}

let userCounter = 0;
export async function createUser(role: Role = "USER") {
  userCounter++;
  const user = await User.create({
    firstName: role === "ADMIN" ? "Ada" : "Tom",
    lastName: `Tester${userCounter}`,
    email: `${role.toLowerCase()}${userCounter}@test.dev`,
    password: await bcrypt.hash("pass1234", 4),
    role,
  });
  const id = String(user._id);
  return { id, token: signToken({ id, role }), email: user.email };
}

export const today = () => startOfTodayUtc();
export const isoDaysFromToday = (days: number) => formatIsoDate(addDays(today(), days));

export async function createVacation(overrides: Partial<{ destination: string; startOffset: number; nights: number; price: number }> = {}) {
  const startDate = addDays(today(), overrides.startOffset ?? 10);
  return Vacation.create({
    destination: overrides.destination ?? "Lisbon, Portugal",
    description: "Pastel de nata and tram rides.",
    startDate,
    endDate: addDays(startDate, overrides.nights ?? 5),
    price: overrides.price ?? 1500,
    imageName: "test.png",
  });
}

/** A valid 1x1 PNG. */
export const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);
