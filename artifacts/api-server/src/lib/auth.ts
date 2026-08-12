import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";
import { db, adminUsersTable } from "@workspace/db";

const SESSION_COOKIE = "nuestra_historia_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;
const sessions = new Map<string, { userId: number; expiresAt: number }>();

export type AuthenticatedRequest = Request & { storyUserId?: number };

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, expected] = storedHash.split(":");
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");
  return expectedBuffer.length === actual.length && timingSafeEqual(actual, expectedBuffer);
}

function userFromRow(user: typeof adminUsersTable.$inferSelect) {
  return {
    username: user.username,
    displayName: user.displayName,
  };
}

export async function ensureAdminUsers(): Promise<void> {
  const accounts = [
    { username: "solsaldena", displayName: "Sol", password: process.env.SOL_ADMIN_PASSWORD },
    { username: "aarongonzalez", displayName: "Aaron", password: process.env.AARON_ADMIN_PASSWORD },
  ];

  for (const account of accounts) {
    if (!account.password) continue;
    const existing = await db
      .select({ id: adminUsersTable.id })
      .from(adminUsersTable)
      .where(eq(adminUsersTable.username, account.username))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(adminUsersTable).values({
        username: account.username,
        displayName: account.displayName,
        passwordHash: hashPassword(account.password),
      });
    }
  }
}

export async function authenticate(username: string, password: string) {
  const [user] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.username, username))
    .limit(1);
  if (!user || !verifyPassword(password, user.passwordHash)) return null;
  return user;
}

export function createSession(res: Response, userId: number): void {
  const token = randomBytes(32).toString("hex");
  sessions.set(token, { userId, expiresAt: Date.now() + SESSION_TTL_MS });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    maxAge: SESSION_TTL_MS,
    path: "/",
  });
}

export function destroySession(req: Request, res: Response): void {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) sessions.delete(token);
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: "none", path: "/" });
}

export async function getAuthenticatedUser(req: Request) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;
  const session = sessions.get(token);
  if (!session || session.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  const [user] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.id, session.userId))
    .limit(1);
  return user ? { ...userFromRow(user), id: user.id } : null;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.storyUserId = user.id;
  next();
}

export function publicUser(user: typeof adminUsersTable.$inferSelect) {
  return userFromRow(user);
}

export function sessionFingerprint(req: Request): string {
  return createHash("sha256").update(req.ip ?? "unknown").digest("hex").slice(0, 8);
}