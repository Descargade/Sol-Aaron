import { Readable } from "node:stream";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Router, type IRouter } from "express";
import { RequestUploadUrlBody, RequestUploadUrlResponse } from "@workspace/api-zod";
import { mediaTable, albumsTable } from "@workspace/db";
import { db } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { getAuthenticatedUser, requireAuth } from "../lib/auth";
import { ObjectNotFoundError, ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const storage = new ObjectStorageService();

router.post("/storage/uploads/request-url", requireAuth, async (req, res): Promise<void> => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const result = await storage.getUploadUrl();
  res.json(RequestUploadUrlResponse.parse(result));
});

router.put("/storage/local-upload/:id", requireAuth, async (req, res): Promise<void> => {
  const { id } = req.params;
  const privateDir = process.env.PRIVATE_OBJECT_DIR || "/tmp/uploads";
  const localDir = join(privateDir, "uploads");
  if (!existsSync(localDir)) mkdirSync(localDir, { recursive: true });
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const buffer = Buffer.concat(chunks);
  writeFileSync(join(localDir, id), buffer);
  res.json({ ok: true });
});

router.get("/storage/objects/*path", async (req, res): Promise<void> => {
  const raw = req.params.path;
  const objectPath = `/objects/${Array.isArray(raw) ? raw.join("/") : raw}`;
  try {
    const [media] = await db.select({ isPublic: mediaTable.isPublic }).from(mediaTable).where(eq(mediaTable.objectPath, objectPath)).limit(1);
    const [album] = await db.select({ coverUrl: albumsTable.coverUrl }).from(albumsTable).where(eq(albumsTable.coverUrl, objectPath)).limit(1);
    const user = await getAuthenticatedUser(req);
    const isPublicMedia = media?.isPublic;
    const isAlbumCover = !!album;
    if (!isPublicMedia && !isAlbumCover && !user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const file = await storage.getFile(objectPath);
    if (!file) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    const response = await storage.download(file);
    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    if (response.body) Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res);
    else res.end();
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving story object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;