import { randomUUID } from "node:crypto";
import { createReadStream, existsSync, mkdirSync, statSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { Readable } from "node:stream";
import { getObjectAclPolicy, setObjectAclPolicy, type ObjectAclPolicy } from "./objectAcl";

const SIDECAR = "http://127.0.0.1:1106";
const USE_GCS = process.env.USE_GCS === "true" || process.env.REPL_ID !== undefined;

let objectStorageClient: any = null;

async function getGCSClient() {
  if (objectStorageClient) return objectStorageClient;
  try {
    const { Storage } = await import("@google-cloud/storage");
    objectStorageClient = new Storage({
      credentials: {
        audience: "replit",
        subject_token_type: "access_token",
        token_url: `${SIDECAR}/token`,
        type: "external_account",
        credential_source: { url: `${SIDECAR}/credential`, format: { type: "json", subject_token_field_name: "access_token" } },
        universe_domain: "googleapis.com",
      },
      projectId: "",
    });
    return objectStorageClient;
  } catch {
    return null;
  }
}

export class ObjectNotFoundError extends Error {}

function getLocalDir(): string {
  const dir = process.env.PRIVATE_OBJECT_DIR || "/tmp/uploads";
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

function getPublicDir(): string {
  const dir = process.env.PUBLIC_OBJECT_DIR || "/tmp/public";
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

export class ObjectStorageService {
  async getUploadUrl(): Promise<{ uploadURL: string; objectPath: string }> {
    const id = randomUUID();

    if (USE_GCS) {
      const SIDECAR = "http://127.0.0.1:1106";
      const privateDir = process.env.PRIVATE_OBJECT_DIR || "";
      const fullPath = `${privateDir}/uploads/${id}`;
      const normalized = fullPath.startsWith("/") ? fullPath : `/${fullPath}`;
      const parts = normalized.split("/");
      const bucketName = parts[1];
      const objectName = parts.slice(2).join("/");
      const response = await fetch(`${SIDECAR}/object-storage/signed-object-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucket_name: bucketName,
          object_name: objectName,
          method: "PUT",
          expires_at: new Date(Date.now() + 900_000).toISOString(),
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) throw new Error(`Failed to sign object URL (${response.status})`);
      const body = (await response.json()) as { signed_url: string };
      return { uploadURL: body.signed_url, objectPath: `/objects/uploads/${id}` };
    }

    const localDir = join(getLocalDir(), "uploads");
    if (!existsSync(localDir)) mkdirSync(localDir, { recursive: true });
    const objectPath = `/objects/uploads/${id}`;
    const uploadURL = `/api/storage/local-upload/${id}`;
    return { uploadURL, objectPath };
  }

  async getFile(objectPath: string): Promise<{ buffer: Buffer; contentType: string } | null> {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();

    if (USE_GCS) {
      const client = await getGCSClient();
      if (!client) throw new ObjectNotFoundError();
      const privateDir = process.env.PRIVATE_OBJECT_DIR || "";
      const relativePath = objectPath.slice("/objects/".length);
      const fullPath = `${privateDir}/${relativePath}`;
      const normalized = fullPath.startsWith("/") ? fullPath : `/${fullPath}`;
      const parts = normalized.split("/");
      const bucketName = parts[1];
      const objectName = parts.slice(2).join("/");
      const file = client.bucket(bucketName).file(objectName);
      const [exists] = await file.exists();
      if (!exists) throw new ObjectNotFoundError();
      const [metadata] = await file.getMetadata();
      const stream = file.createReadStream();
      const chunks: Buffer[] = [];
      for await (const chunk of stream) chunks.push(Buffer.from(chunk));
      return { buffer: Buffer.concat(chunks), contentType: metadata.contentType || "application/octet-stream" };
    }

    const relativePath = objectPath.slice("/objects/".length);
    const localPath = join(getLocalDir(), relativePath);
    if (!existsSync(localPath)) throw new ObjectNotFoundError();
    const buffer = await readFile(localPath);
    const ext = localPath.split(".").pop()?.toLowerCase() || "";
    const contentTypes: Record<string, string> = {
      jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
      webp: "image/webp", svg: "image/svg+xml", mp4: "video/mp4", mp3: "audio/mpeg",
      pdf: "application/pdf",
    };
    return { buffer, contentType: contentTypes[ext] || "application/octet-stream" };
  }

  async download(file: { buffer: Buffer; contentType: string }, cacheTtlSec = 3600): Promise<Response> {
    return new Response(Readable.toWeb(Readable.from(file.buffer)) as ReadableStream, {
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": `public, max-age=${cacheTtlSec}`,
        "Content-Length": String(file.buffer.length),
      },
    });
  }

  async setPolicy(_path: string, _policy: ObjectAclPolicy): Promise<void> {
    // Local storage doesn't need ACL policies
  }
}
