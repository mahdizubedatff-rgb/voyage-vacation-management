import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { User } from "../src/models/User";
import { api, clearDatabase, createUser, startDatabase, stopDatabase } from "./helpers";

beforeAll(startDatabase);
afterAll(stopDatabase);
beforeEach(clearDatabase);

const newUser = { firstName: "Noa", lastName: "Levi", email: "Noa@Example.com", password: "abcd" };

describe("POST /api/auth/register", () => {
  it("creates a USER, hashes the password and returns a token without the hash", async () => {
    const res = await api().post("/api/auth/register").send(newUser);
    expect(res.status).toBe(201);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user).toMatchObject({ firstName: "Noa", email: "noa@example.com", role: "USER" });
    expect(res.body.data.user.password).toBeUndefined();

    const stored = await User.findOne({ email: "noa@example.com" }).select("+password");
    expect(stored?.password).not.toBe("abcd");
    expect(stored?.password).toMatch(/^\$2[aby]\$/);
  });

  it("ignores a client-supplied role", async () => {
    const res = await api().post("/api/auth/register").send({ ...newUser, role: "ADMIN" });
    expect(res.body.data.user.role).toBe("USER");
  });

  it("rejects a duplicate email (case-insensitive) with 409", async () => {
    await api().post("/api/auth/register").send(newUser);
    const res = await api().post("/api/auth/register").send({ ...newUser, email: "noa@example.com" });
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/already exists/i);
  });

  it.each([
    [{ ...newUser, firstName: "" }, /first name/i],
    [{ ...newUser, lastName: "" }, /last name/i],
    [{ ...newUser, email: "not-an-email" }, /valid email/i],
    [{ ...newUser, password: "abc" }, /at least 4/i],
    [{ ...newUser, password: "x".repeat(73) }, /at most 72/i],
  ])("validates input %#", async (body, message) => {
    const res = await api().post("/api/auth/register").send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(message);
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await api().post("/api/auth/register").send(newUser);
  });

  it("returns a token for valid credentials", async () => {
    const res = await api().post("/api/auth/login").send({ email: "noa@example.com", password: "abcd" });
    expect(res.status).toBe(200);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user.email).toBe("noa@example.com");
  });

  it("rejects a wrong password and an unknown email with the same 401 message", async () => {
    const wrong = await api().post("/api/auth/login").send({ email: "noa@example.com", password: "nope" });
    const unknown = await api().post("/api/auth/login").send({ email: "ghost@example.com", password: "abcd" });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
  });
});

describe("GET /api/auth/me and authentication middleware", () => {
  it("returns the current user for a valid token", async () => {
    const { token, email } = await createUser("ADMIN");
    const res = await api().get("/api/auth/me").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ email, role: "ADMIN" });
  });

  it("rejects missing and tampered tokens", async () => {
    const { token } = await createUser();
    expect((await api().get("/api/auth/me")).status).toBe(401);
    const tampered = await api().get("/api/auth/me").set("Authorization", `Bearer ${token.slice(0, -2)}xx`);
    expect(tampered.status).toBe(401);
  });

  it("rejects unsigned (alg: none) tokens even for a real user id", async () => {
    const { id } = await createUser("ADMIN");
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const forged = `${encode({ alg: "none", typ: "JWT" })}.${encode({ sub: id, role: "ADMIN" })}.`;
    expect((await api().get("/api/auth/me").set("Authorization", `Bearer ${forged}`)).status).toBe(401);
  });

  it("rejects a token whose user was deleted", async () => {
    const { id, token } = await createUser();
    await User.findByIdAndDelete(id);
    expect((await api().get("/api/auth/me").set("Authorization", `Bearer ${token}`)).status).toBe(401);
  });
});
