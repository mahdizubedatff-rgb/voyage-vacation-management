import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Like } from "../src/models/Like";
import { api, clearDatabase, createUser, createVacation, startDatabase, stopDatabase } from "./helpers";

beforeAll(startDatabase);
afterAll(stopDatabase);
beforeEach(clearDatabase);

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe("likes", () => {
  it("likes, rejects a duplicate like, and unlikes", async () => {
    const { token, id: userId } = await createUser();
    const vacation = await createVacation();

    const liked = await api().post(`/api/vacations/${vacation.id}/likes`).set(auth(token));
    expect(liked.status).toBe(201);
    expect(liked.body.data).toEqual({ vacationId: vacation.id, isLiked: true, likesCount: 1 });

    const duplicate = await api().post(`/api/vacations/${vacation.id}/likes`).set(auth(token));
    expect(duplicate.status).toBe(409);
    expect(await Like.countDocuments({ userId, vacationId: vacation._id })).toBe(1);

    const unliked = await api().delete(`/api/vacations/${vacation.id}/likes`).set(auth(token));
    expect(unliked.status).toBe(200);
    expect(unliked.body.data).toEqual({ vacationId: vacation.id, isLiked: false, likesCount: 0 });

    expect((await api().delete(`/api/vacations/${vacation.id}/likes`).set(auth(token))).status).toBe(404);
  });

  it("stores likes per user and reflects them in the listing", async () => {
    const alice = await createUser();
    const bob = await createUser();
    const vacation = await createVacation();
    await api().post(`/api/vacations/${vacation.id}/likes`).set(auth(alice.token));
    await api().post(`/api/vacations/${vacation.id}/likes`).set(auth(bob.token));
    await api().delete(`/api/vacations/${vacation.id}/likes`).set(auth(bob.token));

    const forAlice = await api().get("/api/vacations").set(auth(alice.token));
    const forBob = await api().get("/api/vacations").set(auth(bob.token));
    expect(forAlice.body.data.items[0]).toMatchObject({ likesCount: 1, isLiked: true });
    expect(forBob.body.data.items[0]).toMatchObject({ likesCount: 1, isLiked: false });
  });

  it("returns 404 when liking a vacation that does not exist", async () => {
    const { token } = await createUser();
    expect((await api().post("/api/vacations/64b7f0f0f0f0f0f0f0f0f0f0/likes").set(auth(token))).status).toBe(404);
  });
});

describe("listing, sorting, filtering and pagination", () => {
  async function seedMix() {
    const past = await createVacation({ destination: "Past", startOffset: -20, nights: 5 });
    const activeToday = await createVacation({ destination: "Ends today", startOffset: -4, nights: 4 });
    const active = await createVacation({ destination: "Active", startOffset: -2, nights: 6 });
    const later = await createVacation({ destination: "Later", startOffset: 30 });
    const soon = await createVacation({ destination: "Soon", startOffset: 3 });
    return { past, activeToday, active, later, soon };
  }

  it("sorts by ascending start date", async () => {
    const { token } = await createUser();
    await seedMix();
    const res = await api().get("/api/vacations").set(auth(token));
    expect(res.body.data.items.map((v: { destination: string }) => v.destination)).toEqual(["Past", "Ends today", "Active", "Soon", "Later"]);
  });

  it("filters upcoming (not started) vacations", async () => {
    const { token } = await createUser();
    await seedMix();
    const res = await api().get("/api/vacations?filter=upcoming").set(auth(token));
    expect(res.body.data.items.map((v: { destination: string }) => v.destination)).toEqual(["Soon", "Later"]);
  });

  it("filters active vacations, including one whose last day is today", async () => {
    const { token } = await createUser();
    await seedMix();
    const res = await api().get("/api/vacations?filter=active").set(auth(token));
    expect(res.body.data.items.map((v: { destination: string }) => v.destination)).toEqual(["Ends today", "Active"]);
  });

  it("filters the user's liked vacations only", async () => {
    const me = await createUser();
    const other = await createUser();
    const { soon, past } = await seedMix();
    await api().post(`/api/vacations/${soon.id}/likes`).set(auth(me.token));
    await api().post(`/api/vacations/${past.id}/likes`).set(auth(other.token));
    const res = await api().get("/api/vacations?filter=liked").set(auth(me.token));
    expect(res.body.data.items.map((v: { destination: string }) => v.destination)).toEqual(["Soon"]);
    expect(res.body.data.total).toBe(1);
  });

  it("paginates 9 per page by default", async () => {
    const { token } = await createUser();
    for (let i = 0; i < 14; i++) await createVacation({ destination: `Trip ${String(i).padStart(2, "0")}`, startOffset: i + 1 });
    const page1 = await api().get("/api/vacations").set(auth(token));
    const page2 = await api().get("/api/vacations?page=2").set(auth(token));
    expect(page1.body.data).toMatchObject({ page: 1, limit: 9, total: 14, totalPages: 2 });
    expect(page1.body.data.items).toHaveLength(9);
    expect(page2.body.data.items).toHaveLength(5);
    expect(page2.body.data.items[0].destination).toBe("Trip 09");
  });

  it("filters before paginating", async () => {
    const { token } = await createUser();
    for (let i = 0; i < 12; i++) await createVacation({ destination: `Past ${i}`, startOffset: -40 + i, nights: 1 });
    for (let i = 0; i < 10; i++) await createVacation({ destination: `Upcoming ${i}`, startOffset: 5 + i });
    const res = await api().get("/api/vacations?filter=upcoming&page=2").set(auth(token));
    expect(res.body.data).toMatchObject({ total: 10, totalPages: 2, page: 2 });
    expect(res.body.data.items.map((v: { destination: string }) => v.destination)).toEqual(["Upcoming 9"]);
  });

  it("rejects invalid filter and page values", async () => {
    const { token } = await createUser();
    expect((await api().get("/api/vacations?filter=bogus").set(auth(token))).status).toBe(400);
    expect((await api().get("/api/vacations?page=0").set(auth(token))).status).toBe(400);
  });
});
