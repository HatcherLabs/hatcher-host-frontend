import { req } from "./api/core";
export type HostingPlan = {
  id: string;
  kind: string;
  name: string;
  usdCents: number;
  memoryMb: number;
  cpu: number;
  diskGb: number;
  transferGb: number;
};
export type HostingProject = {
  id: string;
  name: string;
  kind: string;
  plan: string;
  status: string;
  paidUntil: string | null;
  subscriptionId: string | null;
  cancelAtPeriodEnd: boolean;
  backupEnabled: boolean;
  activeReleaseId: string | null;
  health: string;
  error: string | null;
};
export type HostingDomain = {
  hostname: string;
  status: string;
  challenge: string;
};
export type HostingRelease = {
  id: string;
  sha256: string;
  bytes: number;
  createdAt: string;
  actor: string;
  approvedAt: string | null;
};
export type HostingJob = {
  id: string;
  action: string;
  status: string;
  phase: string;
  error: string | null;
  createdAt: string;
};
export type HostingDetail = {
  project: HostingProject;
  domains: HostingDomain[];
  releases: HostingRelease[];
  grants: { agentId: string; role: string }[];
  jobs: HostingJob[];
  events: { id: string; action: string; createdAt: string }[];
  backups: {
    id: string;
    status: string;
    bytes: number;
    createdAt: string;
    offsiteVerifiedAt: string | null;
  }[];
};
export type HostingCatalog = {
  enabled: boolean;
  salesEnabled: boolean;
  plans: HostingPlan[];
  availability: string;
  sla: null;
  retentionDays: number;
  dnsAddresses: string[];
};
export async function hostingRequest<T>(
  path: string,
  body?: unknown,
  method = body === undefined ? "GET" : "POST",
  signal?: AbortSignal,
): Promise<T> {
  const result = await req<T>("/hosting" + path, {
    method,
    signal,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  if (!result.success) throw new Error(result.error);
  return result.data;
}
export async function hostingFiles(files: FileList | File[]) {
  let bytes = 0;
  const output = [];
  if (files.length > 1000) throw new Error("Choose up to 1,000 files.");
  for (const file of Array.from(files)) {
    bytes += file.size;
    if (bytes > 20 * 1024 * 1024)
      throw new Error("A release can contain up to 20 MiB.");
    const raw = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    for (let offset = 0; offset < raw.length; offset += 8192)
      binary += String.fromCharCode(...raw.subarray(offset, offset + 8192));
    const relative = file.webkitRelativePath;
    const name = relative ? relative.split("/").slice(1).join("/") : file.name;
    output.push({ path: name, content: btoa(binary), encoding: "base64" });
  }
  return { files: output };
}
