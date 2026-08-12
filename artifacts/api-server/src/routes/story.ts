import { and, asc, desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  AdminStory,
  AlbumInput,
  AlbumUpdate,
  CreateAlbumBody,
  CreateAlbumResponse,
  CreateLoveNoteBody,
  CreateLoveNoteResponse,
  CreateMediaBody,
  CreateMediaResponse,
  CreateMessageBody,
  CreateMessageResponse,
  CreateMusicBody,
  CreateMusicResponse,
  CreateTimelineBody,
  CreateTimelineResponse,
  DeleteAlbumParams,
  DeleteLoveNoteParams,
  DeleteMediaParams,
  DeleteMessageParams,
  DeleteMusicParams,
  DeleteTimelineParams,
  GetAdminStoryResponse,
  GetCurrentUserResponse,
  GetLetterResponse,
  GetPublicStoryResponse,
  ListAlbumsResponse,
  ListAlbumsResponseItem,
  ListLoveNotesResponse,
  ListLoveNotesResponseItem,
  ListMediaResponse,
  ListMediaResponseItem,
  ListMessagesResponse,
  ListMessagesResponseItem,
  ListMusicResponse,
  ListMusicResponseItem,
  ListTimelineResponse,
  ListTimelineResponseItem,
  LoginBody,
  LoginResponse,
  MessageUpdate,
  MusicInput,
  SaveLetterBody,
  SaveLetterResponse,
  TimelineUpdate,
  UpdateAlbumBody,
  UpdateAlbumParams,
  UpdateAlbumResponse,
  UpdateLoveNoteBody,
  UpdateLoveNoteParams,
  UpdateLoveNoteResponse,
  UpdateMediaBody,
  UpdateMediaParams,
  UpdateMediaResponse,
  UpdateMessageBody,
  UpdateMessageParams,
  UpdateMessageResponse,
  UpdateTimelineBody,
  UpdateTimelineParams,
  UpdateTimelineResponse,
} from "@workspace/api-zod";
import {
  albumsTable,
  db,
  letterTable,
  loveNotesTable,
  mediaTable,
  messagesTable,
  musicTable,
  timelineTable,
} from "@workspace/db";
import {
  authenticate,
  createSession,
  destroySession,
  getAuthenticatedUser,
  requireAuth,
  type AuthenticatedRequest,
} from "../lib/auth";

const router: IRouter = Router();

function idFromParams(req: AuthenticatedRequest): number | null {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = Number(raw);
  return Number.isInteger(id) ? id : null;
}

async function getStory(publicOnly: boolean) {
  const [timeline, albums, media, letterRows, loveNotes, music, messages] =
    await Promise.all([
      db.select().from(timelineTable).orderBy(asc(timelineTable.sortOrder), asc(timelineTable.date)),
      db.select().from(albumsTable).orderBy(asc(albumsTable.sortOrder), asc(albumsTable.id)),
      db.select().from(mediaTable).orderBy(desc(mediaTable.date), desc(mediaTable.id)),
      db.select().from(letterTable).orderBy(asc(letterTable.id)).limit(1),
      db.select().from(loveNotesTable).orderBy(asc(loveNotesTable.sortOrder), asc(loveNotesTable.id)),
      db.select().from(musicTable).orderBy(desc(musicTable.id)),
      db.select().from(messagesTable).orderBy(desc(messagesTable.createdAt)),
    ]);

  return {
    timeline,
    albums,
    media: publicOnly ? media.filter((item) => item.isPublic) : media,
    letter: letterRows[0] ?? { id: 0, title: "Para Sol", content: "" },
    loveNotes,
    music,
    messages: publicOnly ? messages.filter((message) => message.isApproved) : messages,
  };
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = await authenticate(parsed.data.username, parsed.data.password);
  if (!user) {
    res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    return;
  }
  createSession(res, user.id);
  res.json(LoginResponse.parse({ user: { username: user.username, displayName: user.displayName } }));
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  destroySession(req, res);
  res.sendStatus(204);
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json(GetCurrentUserResponse.parse({ username: user.username, displayName: user.displayName }));
});

router.get("/story/public", async (_req, res): Promise<void> => {
  res.json(GetPublicStoryResponse.parse(await getStory(true)));
});

router.get("/story/admin", requireAuth, async (_req, res): Promise<void> => {
  res.json(GetAdminStoryResponse.parse(await getStory(false)));
});

router.get("/timeline", requireAuth, async (_req, res): Promise<void> => {
  res.json(ListTimelineResponse.parse(await db.select().from(timelineTable).orderBy(asc(timelineTable.sortOrder), asc(timelineTable.date))));
});

router.post("/timeline", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateTimelineBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [item] = await db.insert(timelineTable).values({
    ...parsed.data,
    sortOrder: parsed.data.sortOrder ?? 0,
    imageUrl: parsed.data.imageUrl ?? null,
  }).returning();
  res.status(201).json(CreateTimelineResponse.parse(item));
});

router.patch("/timeline/:id", requireAuth, async (req, res): Promise<void> => {
  const id = idFromParams(req);
  const parsed = UpdateTimelineBody.safeParse(req.body);
  if (id === null || !parsed.success) {
    res.status(400).json({ error: parsed.success ? "Invalid id" : parsed.error.message });
    return;
  }
  const [item] = await db.update(timelineTable).set(parsed.data).where(eq(timelineTable.id, id)).returning();
  if (!item) {
    res.status(404).json({ error: "Timeline memory not found" });
    return;
  }
  res.json(UpdateTimelineResponse.parse(item));
});

router.delete("/timeline/:id", requireAuth, async (req, res): Promise<void> => {
  const id = idFromParams(req);
  if (id === null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [item] = await db.delete(timelineTable).where(eq(timelineTable.id, id)).returning();
  if (!item) {
    res.status(404).json({ error: "Timeline memory not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/albums", requireAuth, async (_req, res): Promise<void> => {
  res.json(ListAlbumsResponse.parse(await db.select().from(albumsTable).orderBy(asc(albumsTable.sortOrder), asc(albumsTable.id))));
});

router.post("/albums", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateAlbumBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [item] = await db.insert(albumsTable).values({
    ...parsed.data,
    sortOrder: parsed.data.sortOrder ?? 0,
    coverUrl: parsed.data.coverUrl ?? null,
  }).returning();
  res.status(201).json(CreateAlbumResponse.parse(item));
});

router.patch("/albums/:id", requireAuth, async (req, res): Promise<void> => {
  const id = idFromParams(req);
  const parsed = UpdateAlbumBody.safeParse(req.body);
  if (id === null || !parsed.success) {
    res.status(400).json({ error: parsed.success ? "Invalid id" : parsed.error.message });
    return;
  }
  const [item] = await db.update(albumsTable).set(parsed.data).where(eq(albumsTable.id, id)).returning();
  if (!item) {
    res.status(404).json({ error: "Album not found" });
    return;
  }
  res.json(UpdateAlbumResponse.parse(item));
});

router.delete("/albums/:id", requireAuth, async (req, res): Promise<void> => {
  const id = idFromParams(req);
  if (id === null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [item] = await db.delete(albumsTable).where(eq(albumsTable.id, id)).returning();
  if (!item) {
    res.status(404).json({ error: "Album not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/media", requireAuth, async (_req, res): Promise<void> => {
  res.json(ListMediaResponse.parse(await db.select().from(mediaTable).orderBy(desc(mediaTable.date), desc(mediaTable.id))));
});

router.post("/media", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateMediaBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const objectPath = `/objects/${Date.now().toString(36)}${Math.random().toString(36).substr(2, 8)}`;
  const [item] = await db.insert(mediaTable).values({
    ...parsed.data,
    albumId: parsed.data.albumId ?? null,
    isPublic: parsed.data.isPublic ?? false,
    objectPath,
  }).returning();
  res.status(201).json(CreateMediaResponse.parse(item));
});

router.patch("/media/:id", requireAuth, async (req, res): Promise<void> => {
  const id = idFromParams(req);
  const parsed = UpdateMediaBody.safeParse(req.body);
  if (id === null || !parsed.success) {
    res.status(400).json({ error: parsed.success ? "Invalid id" : parsed.error.message });
    return;
  }
  const [item] = await db.update(mediaTable).set(parsed.data).where(eq(mediaTable.id, id)).returning();
  if (!item) {
    res.status(404).json({ error: "Media item not found" });
    return;
  }
  res.json(UpdateMediaResponse.parse(item));
});

router.delete("/media/:id", requireAuth, async (req, res): Promise<void> => {
  const id = idFromParams(req);
  if (id === null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [item] = await db.delete(mediaTable).where(eq(mediaTable.id, id)).returning();
  if (!item) {
    res.status(404).json({ error: "Media item not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/letter", requireAuth, async (_req, res): Promise<void> => {
  const [letter] = await db.select().from(letterTable).orderBy(asc(letterTable.id)).limit(1);
  res.json(GetLetterResponse.parse(letter ?? { id: 0, title: "Para Sol", content: "" }));
});

router.put("/letter", requireAuth, async (req, res): Promise<void> => {
  const parsed = SaveLetterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db.select().from(letterTable).orderBy(asc(letterTable.id)).limit(1);
  const [letter] = existing
    ? await db.update(letterTable).set(parsed.data).where(eq(letterTable.id, existing.id)).returning()
    : await db.insert(letterTable).values(parsed.data).returning();
  res.json(SaveLetterResponse.parse(letter));
});

router.get("/love-notes", requireAuth, async (_req, res): Promise<void> => {
  res.json(ListLoveNotesResponse.parse(await db.select().from(loveNotesTable).orderBy(asc(loveNotesTable.sortOrder), asc(loveNotesTable.id))));
});

router.post("/love-notes", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateLoveNoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [note] = await db.insert(loveNotesTable).values({
    ...parsed.data,
    sortOrder: parsed.data.sortOrder ?? 0,
  }).returning();
  res.status(201).json(CreateLoveNoteResponse.parse(note));
});

router.patch("/love-notes/:id", requireAuth, async (req, res): Promise<void> => {
  const id = idFromParams(req);
  const parsed = UpdateLoveNoteBody.safeParse(req.body);
  if (id === null || !parsed.success) {
    res.status(400).json({ error: parsed.success ? "Invalid id" : parsed.error.message });
    return;
  }
  const [note] = await db.update(loveNotesTable).set(parsed.data).where(eq(loveNotesTable.id, id)).returning();
  if (!note) {
    res.status(404).json({ error: "Love note not found" });
    return;
  }
  res.json(UpdateLoveNoteResponse.parse(note));
});

router.delete("/love-notes/:id", requireAuth, async (req, res): Promise<void> => {
  const id = idFromParams(req);
  if (id === null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [note] = await db.delete(loveNotesTable).where(eq(loveNotesTable.id, id)).returning();
  if (!note) {
    res.status(404).json({ error: "Love note not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/music", requireAuth, async (_req, res): Promise<void> => {
  res.json(ListMusicResponse.parse(await db.select().from(musicTable).orderBy(desc(musicTable.id))));
});

router.post("/music", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateMusicBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [song] = await db.insert(musicTable).values(parsed.data).returning();
  res.status(201).json(CreateMusicResponse.parse(song));
});

router.delete("/music/:id", requireAuth, async (req, res): Promise<void> => {
  const id = idFromParams(req);
  if (id === null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [song] = await db.delete(musicTable).where(eq(musicTable.id, id)).returning();
  if (!song) {
    res.status(404).json({ error: "Song not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/messages", requireAuth, async (_req, res): Promise<void> => {
  res.json(ListMessagesResponse.parse(await db.select().from(messagesTable).orderBy(desc(messagesTable.createdAt))));
});

router.post("/messages", async (req, res): Promise<void> => {
  const parsed = CreateMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [message] = await db.insert(messagesTable).values({
    ...parsed.data,
    isApproved: false,
  }).returning();
  res.status(201).json(CreateMessageResponse.parse(message));
});

router.patch("/messages/:id", requireAuth, async (req, res): Promise<void> => {
  const id = idFromParams(req);
  const parsed = UpdateMessageBody.safeParse(req.body);
  if (id === null || !parsed.success) {
    res.status(400).json({ error: parsed.success ? "Invalid id" : parsed.error.message });
    return;
  }
  const [message] = await db.update(messagesTable).set(parsed.data).where(eq(messagesTable.id, id)).returning();
  if (!message) {
    res.status(404).json({ error: "Message not found" });
    return;
  }
  res.json(UpdateMessageResponse.parse(message));
});

router.delete("/messages/:id", requireAuth, async (req, res): Promise<void> => {
  const id = idFromParams(req);
  if (id === null) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [message] = await db.delete(messagesTable).where(eq(messagesTable.id, id)).returning();
  if (!message) {
    res.status(404).json({ error: "Message not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;