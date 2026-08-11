import { File } from "@google-cloud/storage";

export enum ObjectPermission {
  READ = "read",
  WRITE = "write",
}

export interface ObjectAclPolicy {
  owner: string;
  visibility: "public" | "private";
}

export async function setObjectAclPolicy(file: File, policy: ObjectAclPolicy): Promise<void> {
  await file.setMetadata({ metadata: { "custom:aclPolicy": JSON.stringify(policy) } });
}

export async function getObjectAclPolicy(file: File): Promise<ObjectAclPolicy | null> {
  const [metadata] = await file.getMetadata();
  const raw = metadata?.metadata?.["custom:aclPolicy"];
  return raw ? (JSON.parse(raw) as ObjectAclPolicy) : null;
}