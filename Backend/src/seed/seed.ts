import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { connectDatabase, disconnectDatabase } from "../config/db";
import { env } from "../config/env";
import { User } from "../models/User";
import { Vacation } from "../models/Vacation";
import { Like } from "../models/Like";
import { addDays, startOfTodayUtc } from "../utils/dates";
import { seedUsers, seedVacations } from "./seedData";

const SEED_IMAGES_DIR = path.resolve(process.cwd(), "seed-images");
const SEED_PREFIX = "seed-";

/**
 * Repeatable seed: clears users, vacations and likes, then recreates the demo catalogue.
 * Seed images are copied into the uploads volume with a stable "seed-" prefix.
 */
export async function seedDatabase(options: { log?: boolean } = {}): Promise<void> {
  const log = (message: string) => options.log && console.log(message);

  await Promise.all([User.deleteMany({}), Vacation.deleteMany({}), Like.deleteMany({})]);
  await Promise.all([User.syncIndexes(), Vacation.syncIndexes(), Like.syncIndexes()]);

  fs.mkdirSync(env.UPLOADS_DIR, { recursive: true });
  for (const file of fs.readdirSync(env.UPLOADS_DIR)) {
    if (file.startsWith(SEED_PREFIX)) fs.rmSync(path.join(env.UPLOADS_DIR, file));
  }

  const today = startOfTodayUtc();
  const vacations = [];
  for (const seed of seedVacations) {
    const imageName = `${SEED_PREFIX}${seed.image}`;
    fs.copyFileSync(path.join(SEED_IMAGES_DIR, seed.image), path.join(env.UPLOADS_DIR, imageName));
    const startDate = addDays(today, seed.startOffset);
    vacations.push(
      await Vacation.create({
        destination: seed.destination,
        description: seed.description,
        startDate,
        endDate: addDays(startDate, seed.nights),
        price: seed.price,
        imageName,
      }),
    );
  }
  log(`Seeded ${vacations.length} vacations`);

  const adminPassword = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD || "Admin1234", 10);
  const userPassword = await bcrypt.hash(process.env.SEED_USER_PASSWORD || "User1234", 10);

  let likeCount = 0;
  for (const seedUser of seedUsers) {
    const user = await User.create({
      firstName: seedUser.firstName,
      lastName: seedUser.lastName,
      email: seedUser.email,
      role: seedUser.role,
      password: seedUser.role === "ADMIN" ? adminPassword : userPassword,
    });
    for (const index of seedUser.likes) {
      const vacation = vacations[index];
      if (vacation) {
        await Like.create({ userId: user._id, vacationId: vacation._id });
        likeCount++;
      }
    }
  }
  log(`Seeded ${seedUsers.length} users and ${likeCount} likes`);
}

if (require.main === module) {
  connectDatabase()
    .then(() => seedDatabase({ log: true }))
    .then(() => console.log("Seed complete. Admin: admin@voyage.dev  User: user@voyage.dev (passwords: see README / .env)"))
    .catch((error: unknown) => {
      console.error("Seed failed", error);
      process.exitCode = 1;
    })
    .finally(() => void disconnectDatabase());
}
