import { createInsertSchema } from "drizzle-zod";
import { boolean, date, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const adminUsersTable = pgTable("story_admin_users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
});

export const timelineTable = pgTable("story_timeline", {
  id: serial("id").primaryKey(),
  date: date("date", { mode: "string" }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const albumsTable = pgTable("story_albums", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  coverUrl: text("cover_url"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const mediaTable = pgTable("story_media", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  albumId: integer("album_id"),
  type: text("type").notNull(),
  objectPath: text("object_path").notNull(),
  isPublic: boolean("is_public").notNull().default(false),
});

export const letterTable = pgTable("story_letter", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
});

export const loveNotesTable = pgTable("story_love_notes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const musicTable = pgTable("story_music", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  url: text("url").notNull(),
});

export const messagesTable = pgTable("story_messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  isApproved: boolean("is_approved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTimelineSchema = createInsertSchema(timelineTable).omit({ id: true });
export const insertAlbumSchema = createInsertSchema(albumsTable).omit({ id: true });
export const insertMediaSchema = createInsertSchema(mediaTable).omit({ id: true });
export const insertLetterSchema = createInsertSchema(letterTable).omit({ id: true });
export const insertLoveNoteSchema = createInsertSchema(loveNotesTable).omit({ id: true });
export const insertMusicSchema = createInsertSchema(musicTable).omit({ id: true });
export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, createdAt: true });

export type Timeline = typeof timelineTable.$inferSelect;
export type Album = typeof albumsTable.$inferSelect;
export type Media = typeof mediaTable.$inferSelect;
export type Letter = typeof letterTable.$inferSelect;
export type LoveNote = typeof loveNotesTable.$inferSelect;
export type Music = typeof musicTable.$inferSelect;
export type GuestMessage = typeof messagesTable.$inferSelect;
export type AdminUser = typeof adminUsersTable.$inferSelect;
export type StoryDate = z.infer<typeof insertTimelineSchema>["date"];