import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { File, Storage } from "@google-cloud/storage";
import { getObjectAclPolicy, setObjectAclPolicy, type ObjectAclPolicy } from "./objectAcl";

const SIDECAR = "http://127.0.0.1:1106";

export const objectStorageClient = new Storage({
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

export class ObjectNotFoundError extends Error {}

function parseObjectPath(path: string): { bucketName: string; objectName: string } {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const parts = normalized.split("/");
  if (parts.length < 3) throw new Error("Invalid object path");
  return { bucketName: parts[1], objectName: parts.slice(2).join("/") };
}

async function signObjectUrl(bucketName: string, objectName: string): Promise<string> {
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
  return body.signed_url;
}

export class ObjectStorageService {
  private privateDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR;
    if (!dir) throw new Error("PRIVATE_OBJECT_DIR is not configured");
    return dir.replace(/\/$/, "");
  }

  async getUploadUrl(): Promise<{ uploadURL: string; objectPath: string }> {
    const fullPath = `${this.privateDir()}/uploads/${randomUUID()}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);
    return { uploadURL: await signObjectUrl(bucketName, objectName), objectPath: `/objects/${objectName.replace(/^uploads\//, "uploads/")}` };
  }

  async getFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();
    const { bucketName, objectName } = parseObjectPath(`${this.privateDir()}/${objectPath.slice("/objects/".length)}`);
    const file = objectStorageClient.bucket(bucketName).file(objectName);
    const [exists] = await file.exists();
    if (!exists) throw new ObjectNotFoundError();
    return file;
  }

  async download(file: File, cacheTtlSec = 3600): Promise<Response> {
    const [metadata] = await file.getMetadata();
    const acl = await getObjectAclPolicy(file);
    const stream = Readable.toWeb(file.createReadStream()) as ReadableStream;
    return new Response(stream, {
      headers: {
        "Content-Type": metadata.contentType ?? "application/octet-stream",
        "Cache-Control": `${acl?.visibility === "public" ? "public" : "private"}, max-age=${cacheTtlSec}`,
        ...(metadata.size ? { "Content-Length": String(metadata.size) } : {}),
      },
    });
  }

  async setPolicy(path: string, policy: ObjectAclPolicy): Promise<void> {
    await setObjectAclPolicy(await this.getFile(path), policy);
  }
}