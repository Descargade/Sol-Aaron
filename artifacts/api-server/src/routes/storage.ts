import { Readable } from "node:stream";
import { Router, type IRouter } from "express";
import { RequestUploadUrlBody, RequestUploadUrlResponse } from "@workspace/api-zod";
import { mediaTable } from "@workspace/db";
import { db } from "@workspace/db";
import { eq } from "drizzle-orm";
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

router.get("/storage/objects/*path", async (req, res): Promise<void> => {
  const raw = req.params.path;
  const objectPath = `/objects/${Array.isArray(raw) ? raw.join("/") : raw}`;
  try {
    const [media] = await db.select({ isPublic: mediaTable.isPublic }).from(mediaTable).where(eq(mediaTable.objectPath, objectPath)).limit(1);
    const user = await getAuthenticatedUser(req);
    if (!media?.isPublic && !user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const response = await storage.download(await storage.getFile(objectPath));
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