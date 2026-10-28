import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Like } from "../src/models/Like";
import { escapeCsvValue, toCsv } from "../src/utils/csv";
import { api, clearDatabase, createUser, createVacation, startDatabase, stopDatabase } from "./helpers";

beforeAll(startDatabase);
afterAll(stopDatabase);
beforeEach(clearDatabase);

async function seed() {
  const admin = await createUser("ADMIN");
  const u1 = await createUser();
  const u2 = await createUser();
  const rome = await createVacation({ destination: "Rome, Italy", startOffset: 5 });
  await createVacation({ destination: 'Tokyo "Neon", Japan', startOffset: 6 });
  await Like.create([
    { userId: u1.id, vacationId: rome._id },
    { userId: u2.id, vacationId: rome._id },
  ]);
  return admin;
}

describe("reports", () => {
  it("returns like counts for every vacation, including zero likes", async () => {
    const admin = await seed();
    const res = await api().get("/api/reports/likes").set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.map((r: { destination: string; likes: number }) => [r.destination, r.likes])).toEqual([
      ["Rome, Italy", 2],
      ['Tokyo "Neon", Japan', 0],
    ]);
  });

  it("exports a CSV with Destination,Likes columns and correct quoting", async () => {
    const admin = await seed();
    const res = await api().get("/api/reports/likes/csv").set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/csv/);
    expect(res.headers["content-disposition"]).toMatch(/attachment; filename="vacation-likes.csv"/);
    expect(res.text).toBe('﻿Destination,Likes\r\n"Rome, Italy",2\r\n"Tokyo ""Neon"", Japan",0\r\n');
  });

  it("is admin-only", async () => {
    const user = await createUser("USER");
    expect((await api().get("/api/reports/likes").set("Authorization", `Bearer ${user.token}`)).status).toBe(403);
    expect((await api().get("/api/reports/likes/csv").set("Authorization", `Bearer ${user.token}`)).status).toBe(403);
    expect((await api().get("/api/reports/likes")).status).toBe(401);
  });
});

describe("csv utils", () => {
  it("neutralises spreadsheet formulas", () => {
    expect(escapeCsvValue("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(toCsv(["A"], [["x\ny"]])).toBe('A\r\n"x\ny"\r\n');
  });
});
