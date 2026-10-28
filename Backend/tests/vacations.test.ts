import fs from "fs";
import path from "path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { env } from "../src/config/env";
import { Like } from "../src/models/Like";
import { Vacation } from "../src/models/Vacation";
import { PNG_BYTES, api, clearDatabase, createUser, createVacation, isoDaysFromToday, startDatabase, stopDatabase } from "./helpers";

beforeAll(startDatabase);
afterAll(stopDatabase);
beforeEach(clearDatabase);

const fields = () => ({
  destination: "Lisbon, Portugal",
  description: "Tiles, trams and sunsets over the Tagus.",
  startDate: isoDaysFromToday(10),
  endDate: isoDaysFromToday(15),
  price: "1999",
});

function postVacation(token: string, body: Record<string, string> = fields(), withImage = true) {
  let req = api().post("/api/vacations").set("Authorization", `Bearer ${token}`);
  for (const [key, value] of Object.entries(body)) req = req.field(key, value);
  if (withImage) req = req.attach("image", PNG_BYTES, { filename: "photo.png", contentType: "image/png" });
  return req;
}

describe("vacation CRUD (admin)", () => {
  it("creates a vacation with an uploaded image that is then served", async () => {
    const { token } = await createUser("ADMIN");
    const res = await postVacation(token);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ destination: "Lisbon, Portugal", price: 1999, likesCount: 0 });
    expect(fs.existsSync(path.join(env.UPLOADS_DIR, res.body.data.imageName))).toBe(true);

    const image = await api().get(res.body.data.imageUrl);
    expect(image.status).toBe(200);
    expect(image.headers["content-type"]).toMatch(/image\/png/);
  });

  it("requires an image on create", async () => {
    const { token } = await createUser("ADMIN");
    const res = await postVacation(token, fields(), false);
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/image is required/i);
  });

  it("rejects a file that only pretends to be an image", async () => {
    const { token } = await createUser("ADMIN");
    const before = fs.existsSync(env.UPLOADS_DIR) ? fs.readdirSync(env.UPLOADS_DIR).length : 0;
    let req = api().post("/api/vacations").set("Authorization", `Bearer ${token}`);
    for (const [key, value] of Object.entries(fields())) req = req.field(key, value);
    const res = await req.attach("image", Buffer.from("not really a png"), { filename: "x.png", contentType: "image/png" });
    expect(res.status).toBe(400);
    expect(fs.readdirSync(env.UPLOADS_DIR).length).toBe(before);
  });

  it.each([
    [{ price: "0" }, /greater than 0/i],
    [{ price: "-5" }, /greater than 0/i],
    [{ price: "10001" }, /cannot exceed 10,000/i],
    [{ destination: "" }, /destination is required/i],
    [{ description: "" }, /description is required/i],
  ])("validates price and required fields %#", async (override, message) => {
    const { token } = await createUser("ADMIN");
    const res = await postVacation(token, { ...fields(), ...override });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(message);
  });

  it("accepts the boundary price of 10,000", async () => {
    const { token } = await createUser("ADMIN");
    expect((await postVacation(token, { ...fields(), price: "10000" })).status).toBe(201);
  });

  it("rejects an end date before the start date, and a start date in the past", async () => {
    const { token } = await createUser("ADMIN");
    const reversed = await postVacation(token, { ...fields(), startDate: isoDaysFromToday(10), endDate: isoDaysFromToday(9) });
    expect(reversed.status).toBe(400);
    expect(reversed.body.error.message).toMatch(/end date cannot be before/i);

    const past = await postVacation(token, { ...fields(), startDate: isoDaysFromToday(-2), endDate: isoDaysFromToday(3) });
    expect(past.status).toBe(400);
    expect(past.body.error.message).toMatch(/past/i);
  });

  it("updates all fields, keeps the image when none is sent, and replaces it when one is", async () => {
    const { token } = await createUser("ADMIN");
    const created = (await postVacation(token)).body.data;

    const update = { ...fields(), destination: "Porto, Portugal", price: "1250", startDate: isoDaysFromToday(-1), endDate: isoDaysFromToday(4) };
    let req = api().put(`/api/vacations/${created.id}`).set("Authorization", `Bearer ${token}`);
    for (const [key, value] of Object.entries(update)) req = req.field(key, value);
    const res = await req;
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ destination: "Porto, Portugal", price: 1250, imageName: created.imageName });

    let replace = api().put(`/api/vacations/${created.id}`).set("Authorization", `Bearer ${token}`);
    for (const [key, value] of Object.entries(update)) replace = replace.field(key, value);
    const replaced = await replace.attach("image", PNG_BYTES, { filename: "new.png", contentType: "image/png" });
    expect(replaced.status).toBe(200);
    expect(replaced.body.data.imageName).not.toBe(created.imageName);
    expect(fs.existsSync(path.join(env.UPLOADS_DIR, created.imageName))).toBe(false);
  });

  it("applies the same validation on update", async () => {
    const { token } = await createUser("ADMIN");
    const vacation = await createVacation();
    let req = api().put(`/api/vacations/${vacation.id}`).set("Authorization", `Bearer ${token}`);
    for (const [key, value] of Object.entries({ ...fields(), price: "20000" })) req = req.field(key, value);
    expect((await req).status).toBe(400);
  });

  it("deletes a vacation together with its likes", async () => {
    const admin = await createUser("ADMIN");
    const user = await createUser("USER");
    const vacation = await createVacation();
    await Like.create({ userId: user.id, vacationId: vacation._id });

    const res = await api().delete(`/api/vacations/${vacation.id}`).set("Authorization", `Bearer ${admin.token}`);
    expect(res.status).toBe(204);
    expect(await Vacation.countDocuments()).toBe(0);
    expect(await Like.countDocuments()).toBe(0);
    expect((await api().delete(`/api/vacations/${vacation.id}`).set("Authorization", `Bearer ${admin.token}`)).status).toBe(404);
  });

  it("returns 404 for an unknown id and 400 for a malformed id", async () => {
    const { token } = await createUser();
    expect((await api().get("/api/vacations/64b7f0f0f0f0f0f0f0f0f0f0").set("Authorization", `Bearer ${token}`)).status).toBe(404);
    expect((await api().get("/api/vacations/not-an-id").set("Authorization", `Bearer ${token}`)).status).toBe(400);
  });
});

describe("vacation authorization", () => {
  it("requires authentication to list vacations", async () => {
    expect((await api().get("/api/vacations")).status).toBe(401);
  });

  it("forbids regular users from creating, editing and deleting", async () => {
    const { token } = await createUser("USER");
    const vacation = await createVacation();
    expect((await postVacation(token)).status).toBe(403);
    expect((await api().put(`/api/vacations/${vacation.id}`).set("Authorization", `Bearer ${token}`).send(fields())).status).toBe(403);
    expect((await api().delete(`/api/vacations/${vacation.id}`).set("Authorization", `Bearer ${token}`)).status).toBe(403);
  });

  it("forbids admins from liking", async () => {
    const { token } = await createUser("ADMIN");
    const vacation = await createVacation();
    expect((await api().post(`/api/vacations/${vacation.id}/likes`).set("Authorization", `Bearer ${token}`)).status).toBe(403);
  });
});
