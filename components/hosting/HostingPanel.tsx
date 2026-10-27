"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Globe,
  Server,
  Plus,
  ArrowLeft,
  ExternalLink,
  Loader2,
  Upload,
  ShieldCheck,
  Archive,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { req } from "@/lib/api/core";
import { API_URL } from "@/lib/config";
import {
  hostingRequest,
  hostingFiles,
  type HostingCatalog,
  type HostingDetail,
  type HostingProject,
  type HostingRelease,
} from "@/lib/hosting";
import styles from "./HostingPanel.module.css";

type Agent = { id: string; name: string };
type Confirmation = {
  title: string;
  description: string;
  action: () => Promise<void>;
  destructive?: boolean;
  name?: string;
};
export function HostingPanel() {
  const [catalog, setCatalog] = useState<HostingCatalog | null>(null),
    [projects, setProjects] = useState<HostingProject[]>([]),
    [detail, setDetail] = useState<HostingDetail | null>(null);
  const [selected, setSelected] = useState<string | null>(null),
    [agents, setAgents] = useState<Agent[]>([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false),
    [name, setName] = useState(""),
    [plan, setPlan] = useState("sites"),
    [domain, setDomain] = useState(""),
    [agent, setAgent] = useState(""),
    [role, setRole] = useState("staging");
  const [exportId, setExportId] = useState<string | null>(null),
    [exportPassword, setExportPassword] = useState("");
  const [secrets, setSecrets] = useState(""),
    [accountPassword, setAccountPassword] = useState(""),
    [credentials, setCredentials] = useState<{
      username: string;
      password: string;
    } | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null),
    [typedName, setTypedName] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const requestVersion = useRef(0);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const version = ++requestVersion.current;
      const cat = await hostingRequest<HostingCatalog>(
        "/catalog",
        undefined,
        "GET",
        signal,
      );
      if (version !== requestVersion.current) return;
      setCatalog(cat);
      if (!cat.enabled) {
        setLoading(false);
        return;
      }
      const [list, current] = await Promise.all([
        hostingRequest<{ projects: HostingProject[] }>(
          "/projects",
          undefined,
          "GET",
          signal,
        ),
        selected
          ? hostingRequest<HostingDetail>(
              "/projects/" + selected,
              undefined,
              "GET",
              signal,
            )
          : Promise.resolve(null),
      ]);
      if (version !== requestVersion.current) return;
      setProjects(list.projects);
      setDetail(current);
      setLoading(false);
    },
    [selected],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal).catch((e) => {
      if (!controller.signal.aborted) {
        setError(e.message);
        setLoading(false);
      }
    });
    const timer = setInterval(() => {
      if (!document.hidden) void load(controller.signal).catch(() => {});
    }, 10_000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [load]);
  useEffect(() => {
    void req<{ agents: Agent[] }>("/agents").then((result) => {
      if (result.success) setAgents(result.data.agents || []);
    });
    const project = new URLSearchParams(window.location.search).get("project");
    if (project) setSelected(project);
    const linkedAgent = new URLSearchParams(window.location.search).get(
      "agent",
    );
    if (linkedAgent) {
      setAgent(linkedAgent);
      setCreating(true);
    }
  }, []);
  useEffect(() => {
    if (confirmation) {
      setTypedName("");
      dialog.current?.showModal();
    } else dialog.current?.close();
  }, [confirmation]);
  async function perform(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function job(action: string, extra: Record<string, string> = {}) {
    if (!selected) return;
    await hostingRequest("/projects/" + selected + "/" + action, {
      key: crypto.randomUUID(),
      ...extra,
    });
    setNotice("Operation queued. Its result will appear below.");
  }
  async function create() {
    const project = await hostingRequest<HostingProject>("/projects", {
      name,
      plan,
    });
    setCreating(false);
    setName("");
    setSelected(project.id);
    setNotice(
      "Project created. Activate hosting and prepare your first release.",
    );
  }
  async function checkout() {
    if (!selected) return;
    const result = await hostingRequest<{ url: string }>(
      "/projects/" + selected + "/checkout",
      { key: crypto.randomUUID() },
    );
    const url = new URL(result.url);
    if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com")
      throw new Error("Unexpected checkout address");
    window.location.assign(url.href);
  }
  async function upload(files: FileList | null) {
    if (!files?.length || !selected) return;
    const artifact =
      files.length === 1 && files[0].name.endsWith(".json")
        ? JSON.parse(await files[0].text())
        : await hostingFiles(files);
    await hostingRequest("/projects/" + selected + "/releases", artifact);
    setNotice("Release uploaded. Review it before publishing.");
  }
  async function exportRelease(release: HostingRelease) {
    const data = await hostingRequest(
      "/projects/" + selected + "/releases/" + release.id + "/export",
    );
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hatcher-release-" + release.id + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  useEffect(() => {
    setCredentials(null);
    setAccountPassword("");
    setSecrets("");
    setExportId(null);
    setExportPassword("");
  }, [selected]);
  const project = detail?.project;
  const chosen = catalog?.plans.find((p) => p.id === project?.plan);
  const active =
    !!project?.paidUntil && Date.parse(project.paidUntil) > Date.now();
  const working = detail?.jobs.some((j) =>
    ["queued", "running"].includes(j.status),
  );
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>HATCHER HOSTING</p>
          <h1>Sites & apps</h1>
          <p>Publish your work. Keep it online independently of your agents.</p>
        </div>
        <button
          disabled={!catalog?.enabled || busy}
          onClick={() => setCreating(true)}
        >
          <Plus size={16} />
          New project
        </button>
      </header>
      {error && (
        <div role="alert" className={styles.error}>
          {error}
          <button onClick={() => setError("")} aria-label="Dismiss error">
            ×
          </button>
        </div>
      )}
      {notice && (
        <p role="status" className={styles.notice}>
          {notice}
        </p>
      )}
      {loading ? (
        <p className={styles.loading}>
          <Loader2 className={styles.spin} />
          Loading hosting…
        </p>
      ) : !catalog?.enabled ? (
        <section className={styles.empty}>
          <Server size={32} />
          <h2>Hosting is being prepared</h2>
          <p>
            Application hosting is not open yet. Your existing agents are
            unaffected.
          </p>
        </section>
      ) : (
        <>
          {creating && (
            <form
              className={styles.card}
              onSubmit={(e) => {
                e.preventDefault();
                void perform(create);
              }}
            >
              <div className={styles.row}>
                <h2>Create a project</h2>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => setCreating(false)}
                >
                  Cancel
                </button>
              </div>
              <label>
                Project name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={80}
                  placeholder="My website"
                />
              </label>
              <div className={styles.plans}>
                {catalog.plans.map((item) => (
                  <label
                    key={item.id}
                    className={
                      plan === item.id ? styles.selectedPlan : styles.plan
                    }
                  >
                    <input
                      type="radio"
                      name="plan"
                      checked={plan === item.id}
                      onChange={() => setPlan(item.id)}
                    />
                    <strong>{item.name}</strong>
                    <span>${(item.usdCents / 100).toFixed(2)} / month</span>
                    <small>
                      {item.memoryMb} MiB RAM · {item.diskGb} GiB storage
                    </small>
                    <small>{item.transferGb} GiB monthly transfer</small>
                  </label>
                ))}
              </div>
              <p className={styles.muted}>
                Creating a project is free. Hosting activates after payment. AI
                usage is billed separately.
              </p>
              <button disabled={busy || !name.trim()}>
                {busy ? "Creating…" : "Create project"}
              </button>
            </form>
          )}
          {!selected ? (
            <section className={styles.projects}>
              {projects.length ? (
                projects.map((item) => (
                  <button
                    key={item.id}
                    className={styles.project}
                    onClick={() => {
                      setDetail(null);
                      setSelected(item.id);
                    }}
                  >
                    <Globe size={22} />
                    <strong>{item.name}</strong>
                    <span>
                      {item.kind} · {item.status}
                    </span>
                    <small>
                      {item.health === "healthy"
                        ? "Healthy"
                        : item.health === "unknown"
                          ? "Not deployed"
                          : item.health}
                    </small>
                  </button>
                ))
              ) : (
                <div className={styles.empty}>
                  <Globe size={32} />
                  <h2>A home for what you build</h2>
                  <p>
                    Create a website, WordPress installation or Node
                    application. Connect an agent when you want help maintaining
                    it.
                  </p>
                  <button onClick={() => setCreating(true)}>
                    Create your first project
                  </button>
                </div>
              )}
            </section>
          ) : !project ? (
            <p>Loading project…</p>
          ) : (
            <>
              <button
                className={styles.textButton}
                onClick={() => {
                  setSelected(null);
                  setDetail(null);
                }}
              >
                <ArrowLeft size={16} />
                All projects
              </button>
              <div className={styles.row}>
                <div>
                  <h2>{project.name}</h2>
                  <p className={styles.muted}>
                    {chosen?.name} · {project.status} · {project.health}
                  </p>
                </div>
                {detail.domains
                  .filter((d) => d.status === "ready")
                  .slice(0, 1)
                  .map((d) => (
                    <a
                      className={styles.link}
                      key={d.hostname}
                      href={"https://" + d.hostname}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open site
                      <ExternalLink size={14} />
                    </a>
                  ))}
              </div>
              <div className={styles.summary}>
                <div>
                  <small>Hosting</small>
                  <strong>{active ? "Active" : "Inactive"}</strong>
                  <span>
                    {project.paidUntil
                      ? "Paid until " +
                        new Date(project.paidUntil).toLocaleDateString()
                      : "Awaiting activation"}
                  </span>
                </div>
                <div>
                  <small>Resources</small>
                  <strong>{chosen?.memoryMb} MiB RAM</strong>
                  <span>{chosen?.diskGb} GiB persistent disk</span>
                </div>
                <div>
                  <small>Monthly price</small>
                  <strong>${((chosen?.usdCents || 0) / 100).toFixed(2)}</strong>
                  <span>
                    {project.cancelAtPeriodEnd
                      ? "Renewal canceled"
                      : "AI usage separate"}
                  </span>
                </div>
              </div>
              {!active && (
                <div className={styles.card}>
                  <h3>Activate hosting</h3>
                  <p>
                    Your project and releases are saved. Activate a plan to
                    publish.
                  </p>
                  <button
                    disabled={busy || !catalog.salesEnabled}
                    onClick={() => void perform(checkout)}
                  >
                    {catalog.salesEnabled
                      ? "Continue to secure checkout"
                      : "Checkout is not open yet"}
                  </button>
                </div>
              )}
              {project.subscriptionId && (
                <button
                  className={styles.secondary}
                  disabled={busy}
                  onClick={() =>
                    void perform(async () => {
                      const result = await hostingRequest<{ url: string }>(
                        "/projects/" + selected + "/billing-portal",
                        {},
                      );
                      window.location.assign(result.url);
                    })
                  }
                >
                  Update payment method
                </button>
              )}
              <div className={styles.columns}>
                <section className={styles.card}>
                  <div className={styles.row}>
                    <h3>Releases</h3>
                    {project.kind !== "wordpress" && (
                      <div className={styles.actions}>
                        <label className={styles.upload}>
                          <Upload size={15} />
                          Upload files
                          <input
                            type="file"
                            multiple
                            disabled={busy || !active}
                            onChange={(e) =>
                              void perform(() => upload(e.target.files))
                            }
                          />
                        </label>
                        <label className={styles.upload}>
                          Upload folder
                          <input
                            type="file"
                            multiple
                            {...({ webkitdirectory: "" } as Record<
                              string,
                              string
                            >)}
                            disabled={busy || !active}
                            onChange={(e) =>
                              void perform(() => upload(e.target.files))
                            }
                          />
                        </label>
                      </div>
                    )}
                  </div>
                  {project.kind === "wordpress" ? (
                    <>
                      <p>
                        Managed WordPress with its own database and persistent
                        uploads. Verify a domain before the first installation.
                      </p>
                      <button
                        disabled={
                          busy ||
                          working ||
                          !active ||
                          project.status === "ready"
                        }
                        onClick={() =>
                          setConfirmation({
                            title: "Install WordPress",
                            description:
                              "Create a managed WordPress installation on this project.",
                            action: () => job("deploy"),
                          })
                        }
                      >
                        Install WordPress
                      </button>
                    </>
                  ) : (
                    <>
                      <p className={styles.muted}>
                        {project.kind === "site"
                          ? "Upload index.html and your site assets."
                          : "Upload server.js and prepared Node application files. Listen on port 8080; store persistent files in /data."}{" "}
                        Up to 20 MiB per release.
                      </p>
                      {!detail.releases.length && (
                        <p>No releases yet. Upload your first version.</p>
                      )}
                      {detail.releases.map((release) => (
                        <article className={styles.release} key={release.id}>
                          <div>
                            <strong>
                              {release.id.slice(0, 8)}{" "}
                              {project.activeReleaseId === release.id && (
                                <span className={styles.badge}>Live</span>
                              )}
                            </strong>
                            <small>
                              {new Date(release.createdAt).toLocaleString()} ·{" "}
                              {(release.bytes / 1024).toFixed(0)} KiB
                            </small>
                            <code title={release.sha256}>
                              SHA256 {release.sha256.slice(0, 16)}…
                            </code>
                          </div>
                          <div className={styles.actions}>
                            <button
                              disabled={
                                busy ||
                                working ||
                                !active ||
                                release.id === project.activeReleaseId
                              }
                              onClick={() =>
                                setConfirmation({
                                  title: "Publish this release?",
                                  description:
                                    "Traffic will switch only after the application passes its health check. Release " +
                                    release.id,
                                  action: () =>
                                    job("deploy", { releaseId: release.id }),
                                })
                              }
                            >
                              Publish
                            </button>
                            <button
                              className={styles.secondary}
                              disabled={busy}
                              onClick={() =>
                                void perform(() => exportRelease(release))
                              }
                            >
                              Export
                            </button>
                            <button
                              className={styles.textButton}
                              aria-label="Delete release"
                              disabled={
                                busy ||
                                working ||
                                release.id === project.activeReleaseId
                              }
                              onClick={() =>
                                setConfirmation({
                                  title: "Delete release?",
                                  description:
                                    "This removes the saved release files.",
                                  destructive: true,
                                  action: async () => {
                                    await hostingRequest(
                                      "/projects/" +
                                        selected +
                                        "/releases/" +
                                        release.id,
                                      undefined,
                                      "DELETE",
                                    );
                                  },
                                })
                              }
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </article>
                      ))}
                    </>
                  )}
                </section>
                <section className={styles.card}>
                  <h3>Domains & HTTPS</h3>
                  <p className={styles.muted}>
                    Keep your DNS provider. Add the ownership TXT record and
                    point your hostname at the hosting address.
                  </p>
                  <p className={styles.muted}>
                    A / AAAA destination:{" "}
                    <code>
                      {catalog.dnsAddresses?.join(" · ") ||
                        "Hosting address not configured"}
                    </code>
                    Use DNS-only mode while verifying and issuing HTTPS.
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void perform(async () => {
                        await hostingRequest(
                          "/projects/" + selected + "/domains",
                          { hostname: domain },
                        );
                        setDomain("");
                      });
                    }}
                  >
                    <label>
                      Hostname
                      <input
                        placeholder="www.example.com"
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        required
                      />
                    </label>
                    <button disabled={busy}>Add domain</button>
                  </form>
                  {detail.domains.map((d) => (
                    <div className={styles.domain} key={d.hostname}>
                      <div className={styles.row}>
                        <strong>{d.hostname}</strong>
                        <span className={styles.badge}>{d.status}</span>
                      </div>
                      <small>TXT record: _hatcher.{d.hostname}</small>
                      <code>hatcher={d.challenge}</code>
                      <div className={styles.actions}>
                        <button
                          disabled={busy || working || !active}
                          className={styles.secondary}
                          onClick={() =>
                            void perform(async () => {
                              await hostingRequest(
                                "/projects/" +
                                  selected +
                                  "/domains/" +
                                  encodeURIComponent(d.hostname) +
                                  "/verify",
                                { key: crypto.randomUUID() },
                              );
                              setNotice(
                                "Domain verification accepted. HTTPS setup is queued.",
                              );
                            })
                          }
                        >
                          Verify & enable HTTPS
                        </button>
                        <button
                          className={styles.textButton}
                          disabled={busy || working}
                          onClick={() =>
                            setConfirmation({
                              title: "Remove domain?",
                              description:
                                d.hostname + " will stop serving this project.",
                              destructive: true,
                              action: async () => {
                                await hostingRequest(
                                  "/projects/" +
                                    selected +
                                    "/domains/" +
                                    encodeURIComponent(d.hostname),
                                  { key: crypto.randomUUID() },
                                  "DELETE",
                                );
                              },
                            })
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </section>
              </div>
              <div className={styles.columns}>
                <section className={styles.card}>
                  <h3>
                    <ShieldCheck size={18} />
                    Connected agents
                  </h3>
                  <p className={styles.muted}>
                    Agents see the current hosting plan and only the projects
                    you grant them access to. Prepare changes requires your
                    approval to publish.
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void perform(async () => {
                        await hostingRequest(
                          "/projects/" + selected + "/agents/" + agent,
                          { role },
                          "PUT",
                        );
                        setAgent("");
                      });
                    }}
                  >
                    <label>
                      Agent
                      <select
                        aria-label="Agent"
                        value={agent}
                        onChange={(e) => setAgent(e.target.value)}
                        required
                      >
                        <option value="">Choose an agent</option>
                        {agents.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Permission
                      <select
                        aria-label="Permission"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                      >
                        <option value="read">View only</option>
                        <option value="staging">Prepare changes</option>
                        <option value="publish">Publish changes</option>
                      </select>
                    </label>
                    <button disabled={busy || !agent}>Connect agent</button>
                  </form>
                  {detail.grants.map((g) => (
                    <div className={styles.row} key={g.agentId}>
                      <span>
                        {agents.find((a) => a.id === g.agentId)?.name ||
                          g.agentId}
                        <small>{g.role}</small>
                      </span>
                      <button
                        className={styles.secondary}
                        disabled={busy}
                        onClick={() =>
                          void perform(async () => {
                            await hostingRequest(
                              "/projects/" + selected + "/agents/" + g.agentId,
                              undefined,
                              "DELETE",
                            );
                          })
                        }
                      >
                        Revoke
                      </button>
                    </div>
                  ))}
                </section>
                <section className={styles.card}>
                  <h3>
                    <Archive size={18} />
                    Backup & recovery
                  </h3>
                  <p className={styles.muted}>
                    A backup briefly stops the application for a consistent
                    snapshot.{" "}
                    {catalog.offsiteBackups
                      ? "One encrypted snapshot is retained locally and copied to private external storage. The external copy is marked verified after an integrity check. Keep your own exports too."
                      : "One encrypted snapshot is retained on this server; it does not protect against loss of the server."}
                  </p>
                  <label>
                    <input
                      type="checkbox"
                      checked={project.backupEnabled}
                      disabled={busy}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        setDetail((current) =>
                          current
                            ? {
                                ...current,
                                project: {
                                  ...current.project,
                                  backupEnabled: enabled,
                                },
                              }
                            : current,
                        );
                        void perform(async () => {
                          await hostingRequest(
                            "/projects/" + selected + "/backup-schedule",
                            { enabled },
                            "PUT",
                          );
                        });
                      }}
                    />
                    Enable daily backups (brief downtime during each snapshot)
                  </label>
                  <button
                    disabled={
                      busy ||
                      working ||
                      (!project.activeReleaseId && project.kind !== "wordpress")
                    }
                    onClick={() =>
                      setConfirmation({
                        title: "Create backup?",
                        description:
                          "The application will pause while its disk is backed up. This replaces the previous snapshot.",
                        action: () => job("backup"),
                      })
                    }
                  >
                    Create backup
                  </button>
                  {exportId && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void perform(async () => {
                          const ticket = await hostingRequest<{ path: string }>(
                            "/projects/" +
                              selected +
                              "/backups/" +
                              exportId +
                              "/export",
                            {
                              accountPassword,
                              archivePassword: exportPassword,
                            },
                          );
                          const a = document.createElement("a");
                          a.href = API_URL + ticket.path;
                          a.rel = "noreferrer";
                          a.download = "hosting-" + exportId + ".hhost";
                          a.click();
                          setExportId(null);
                          setExportPassword("");
                          setAccountPassword("");
                        });
                      }}
                    >
                      <label>
                        Hatcher account password
                        <input
                          type="password"
                          value={accountPassword}
                          onChange={(e) => setAccountPassword(e.target.value)}
                          autoComplete="current-password"
                          required
                        />
                      </label>
                      <label>
                        Export encryption password (at least 12 characters)
                        <input
                          type="password"
                          minLength={12}
                          value={exportPassword}
                          onChange={(e) => setExportPassword(e.target.value)}
                          autoComplete="new-password"
                          required
                        />
                      </label>
                      <p className={styles.muted}>
                        Keep this password separately. You need it to decrypt
                        the portable disk image outside Hatcher.
                      </p>
                      <button disabled={busy}>Download encrypted export</button>
                    </form>
                  )}
                  {detail.backups.map((b) => (
                    <div className={styles.release} key={b.id}>
                      <span>
                        {new Date(b.createdAt).toLocaleString()}
                        <small>
                          {b.status} · {(b.bytes / 1024 / 1024).toFixed(1)} MiB
                          {b.status === "ready" &&
                            (b.offsiteVerifiedAt
                              ? " · External copy verified"
                              : catalog.offsiteBackups
                                ? " · External copy pending"
                                : " · Local only")}
                        </small>
                      </span>
                      <button
                        className={styles.secondary}
                        disabled={busy || b.status !== "ready"}
                        onClick={() => setExportId(b.id)}
                      >
                        Export
                      </button>
                      <button
                        className={styles.secondary}
                        disabled={
                          busy || working || !active || b.status !== "ready"
                        }
                        onClick={() =>
                          setConfirmation({
                            title: "Restore this backup?",
                            description:
                              "Current files and database will be replaced by this snapshot. The previous disk is preserved until recovery succeeds.",
                            destructive: true,
                            action: () => job("restore", { backupId: b.id }),
                          })
                        }
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </section>
              </div>

              {project.kind === "app" && (
                <section className={styles.card}>
                  <h3>Environment variables</h3>
                  <p className={styles.muted}>
                    Store connection strings and API keys securely. Values are
                    encrypted and never returned here. Saving replaces this
                    project's variables; upload a new release to apply them.
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void perform(async () => {
                        await hostingRequest(
                          "/projects/" + selected + "/secrets",
                          { variables: JSON.parse(secrets) },
                          "PUT",
                        );
                        setSecrets("");
                        setNotice(
                          "Variables saved. Stage a new release to apply them.",
                        );
                      });
                    }}
                  >
                    <label>
                      Variables as JSON
                      <textarea
                        value={secrets}
                        onChange={(e) => setSecrets(e.target.value)}
                        placeholder={'{"API_KEY":"your-key"}'}
                        rows={4}
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </label>
                    <button disabled={busy || !secrets.trim()}>
                      Save variables
                    </button>
                  </form>
                </section>
              )}
              {project.kind === "wordpress" && project.status === "ready" && (
                <section className={styles.card}>
                  <h3>WordPress administration</h3>
                  <p className={styles.muted}>
                    Confirm your Hatcher account password to reveal the initial
                    WordPress administrator credentials. If you change the
                    password inside WordPress, this initial password will no
                    longer work.
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void perform(async () => {
                        setCredentials(
                          await hostingRequest(
                            "/projects/" + selected + "/wordpress-credentials",
                            { accountPassword },
                          ),
                        );
                        setAccountPassword("");
                      });
                    }}
                  >
                    <label>
                      Hatcher account password
                      <input
                        type="password"
                        autoComplete="current-password"
                        value={accountPassword}
                        onChange={(e) => setAccountPassword(e.target.value)}
                        required
                      />
                    </label>
                    <button disabled={busy || !accountPassword}>
                      Reveal administrator credentials
                    </button>
                  </form>
                  {credentials && (
                    <div>
                      <p>
                        Username: <code>{credentials.username}</code>Password:{" "}
                        <code>{credentials.password}</code>
                      </p>
                      <button
                        className={styles.secondary}
                        onClick={() => setCredentials(null)}
                      >
                        Hide credentials
                      </button>
                    </div>
                  )}
                </section>
              )}
              <section className={styles.card}>
                <div className={styles.row}>
                  <h3>Operations</h3>
                  <button
                    className={styles.textButton}
                    aria-label="Refresh project"
                    onClick={() => void perform(async () => {})}
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
                {detail.jobs.length ? (
                  detail.jobs.map((j) => (
                    <div className={styles.operation} key={j.id}>
                      <span>
                        <strong>{j.action}</strong>
                        <small>{new Date(j.createdAt).toLocaleString()}</small>
                      </span>
                      <span>
                        {j.status} · {j.phase}
                      </span>
                      {j.error && (
                        <p className={styles.error}>
                          {j.error} Reference: {j.id}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className={styles.muted}>No operations yet.</p>
                )}
              </section>
              <section className={styles.card}>
                <h3>Project controls</h3>
                <div className={styles.actions}>
                  <button
                    className={styles.secondary}
                    disabled={busy || working || !active}
                    onClick={() =>
                      setConfirmation({
                        title:
                          project.status === "stopped"
                            ? "Resume project?"
                            : "Stop project?",
                        description:
                          "Your files will remain saved. Hosting billing continues until you cancel renewal.",
                        action: () =>
                          job(project.status === "stopped" ? "resume" : "stop"),
                      })
                    }
                  >
                    {project.status === "stopped" ? "Resume" : "Stop"} project
                  </button>
                  <button
                    className={styles.secondary}
                    disabled={
                      busy ||
                      !project.subscriptionId ||
                      project.cancelAtPeriodEnd
                    }
                    onClick={() =>
                      setConfirmation({
                        title: "Cancel hosting renewal?",
                        description:
                          "Hosting stays active until the end of the paid period.",
                        action: async () => {
                          await hostingRequest(
                            "/projects/" + selected + "/cancel-subscription",
                            {},
                          );
                        },
                      })
                    }
                  >
                    Cancel renewal
                  </button>
                  <button
                    className={styles.danger}
                    disabled={busy || working}
                    onClick={() =>
                      setConfirmation({
                        title: "Delete project?",
                        description:
                          "The application and domains will be removed from service. Data is retained for 14 days. Cancel renewal first.",
                        destructive: true,
                        name: project.name,
                        action: async () => {
                          await job("delete", { confirmName: project.name });
                        },
                      })
                    }
                  >
                    Delete project
                  </button>
                </div>
              </section>
            </>
          )}
          <p className={styles.footnote}>
            Always-on hosting on one server. No high-availability SLA is
            included. Hosting and AI usage are billed separately.
          </p>
        </>
      )}
      <dialog
        ref={dialog}
        className={styles.dialog}
        onCancel={() => !busy && setConfirmation(null)}
      >
        <h2>{confirmation?.title}</h2>
        <p>{confirmation?.description}</p>
        {confirmation?.name && (
          <label>
            Type {confirmation.name} to confirm
            <input
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
            />
          </label>
        )}
        <div className={styles.actions}>
          <button
            className={styles.secondary}
            disabled={busy}
            onClick={() => setConfirmation(null)}
          >
            Cancel
          </button>
          <button
            className={confirmation?.destructive ? styles.danger : ""}
            disabled={
              busy || (!!confirmation?.name && typedName !== confirmation.name)
            }
            onClick={() => {
              if (confirmation)
                void perform(async () => {
                  await confirmation.action();
                  setConfirmation(null);
                });
            }}
          >
            {busy ? "Working…" : "Confirm"}
          </button>
        </div>
      </dialog>
    </main>
  );
}
