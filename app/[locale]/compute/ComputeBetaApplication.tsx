"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Send, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api";
import type {
  ComputeBetaApplicationInput,
  ComputeBetaParticipation,
  ComputeBetaPlatform,
  ComputeBetaVramClass,
} from "@/lib/api/types";
import { Link } from "@/i18n/routing";
import styles from "./page.module.css";

const PLATFORMS: ComputeBetaPlatform[] = ["windows", "macos", "linux"];
const VRAM_CLASSES: ComputeBetaVramClass[] = [
  "cpu_integrated",
  "under_4gb",
  "4_8gb",
  "8_16gb",
  "16_24gb",
  "24gb_plus",
  "multi_gpu",
];

const INITIAL_FORM: ComputeBetaApplicationInput = {
  email: "",
  name: "",
  company: "",
  participation: "provider",
  platforms: [],
  gpuModel: "",
  vramClass: "4_8gb",
  availabilityHours: 8,
  useCase: "",
  updatesOptIn: false,
  consent: true,
  website: "",
};

export function ComputeBetaApplication() {
  const t = useTranslations("compute.beta");
  const [form, setForm] = useState<ComputeBetaApplicationInput>(INITIAL_FORM);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<{ duplicate: boolean } | null>(null);
  const isProvider = form.participation !== "builder";

  function setParticipation(value: ComputeBetaParticipation) {
    setForm((current) => ({
      ...current,
      participation: value,
      vramClass: value === "builder" ? "not_applicable" : current.vramClass === "not_applicable" ? "4_8gb" : current.vramClass,
    }));
  }

  function togglePlatform(platform: ComputeBetaPlatform) {
    setForm((current) => ({
      ...current,
      platforms: current.platforms.includes(platform)
        ? current.platforms.filter((item) => item !== platform)
        : [...current.platforms, platform],
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (isProvider && form.platforms.length === 0) {
      setError(t("errors.platform"));
      return;
    }
    if (!consent) {
      setError(t("errors.consent"));
      return;
    }
    setSubmitting(true);
    const result = await api.applyToComputeBeta({ ...form, consent: true });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setSubmitted({ duplicate: result.data.alreadyApplied });
  }

  return (
    <section id="compute-beta" className={styles.betaSection} aria-labelledby="beta-title">
      <div className={styles.betaIntro}>
        <span className={styles.betaEyebrow}>{t("eyebrow")}</span>
        <h2 id="beta-title">{t("title")}</h2>
        <p>{t("body")}</p>
        <ul>
          <li><CheckCircle2 aria-hidden="true" />{t("benefits.localDemo")}</li>
          <li><CheckCircle2 aria-hidden="true" />{t("benefits.cohorts")}</li>
          <li><CheckCircle2 aria-hidden="true" />{t("benefits.feedback")}</li>
        </ul>
        <div className={styles.betaSafety}>
          <ShieldCheck aria-hidden="true" />
          <p><strong>{t("safetyTitle")}</strong>{t("safetyBody")}</p>
        </div>
      </div>

      {submitted ? (
        <div className={styles.betaSuccess} role="status">
          <span><CheckCircle2 aria-hidden="true" /></span>
          <h3>{t(submitted.duplicate ? "successDuplicateTitle" : "successTitle")}</h3>
          <p>{t(submitted.duplicate ? "successDuplicateBody" : "successBody")}</p>
        </div>
      ) : (
        <form className={styles.betaForm} onSubmit={submit}>
          <div className={styles.formHeader}>
            <h3>{t("formTitle")}</h3>
            <p>{t("formRequired")}</p>
          </div>

          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>{t("fields.name")}</span>
              <input required minLength={2} maxLength={100} autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
            <label className={styles.field}>
              <span>{t("fields.email")}</span>
              <input required type="email" maxLength={320} autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </label>
            <label className={styles.field}>
              <span>{t("fields.company")}</span>
              <input maxLength={120} autoComplete="organization" value={form.company ?? ""} onChange={(event) => setForm({ ...form, company: event.target.value })} />
            </label>
            <label className={styles.field}>
              <span>{t("fields.participation")}</span>
              <select value={form.participation} onChange={(event) => setParticipation(event.target.value as ComputeBetaParticipation)}>
                <option value="provider">{t("participation.provider")}</option>
                <option value="builder">{t("participation.builder")}</option>
                <option value="both">{t("participation.both")}</option>
              </select>
            </label>
          </div>

          {isProvider && (
            <fieldset className={styles.formFieldset}>
              <legend>{t("fields.platforms")}</legend>
              <div className={styles.checkGrid}>
                {PLATFORMS.map((platform) => (
                  <label key={platform}>
                    <input type="checkbox" checked={form.platforms.includes(platform)} onChange={() => togglePlatform(platform)} />
                    <span>{t(`platforms.${platform}`)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {isProvider && (
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>{t("fields.gpu")}</span>
                <input maxLength={160} placeholder={t("fields.gpuPlaceholder")} value={form.gpuModel ?? ""} onChange={(event) => setForm({ ...form, gpuModel: event.target.value })} />
              </label>
              <label className={styles.field}>
                <span>{t("fields.vram")}</span>
                <select value={form.vramClass} onChange={(event) => setForm({ ...form, vramClass: event.target.value as ComputeBetaVramClass })}>
                  {VRAM_CLASSES.map((value) => <option key={value} value={value}>{t(`vram.${value}`)}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                <span>{t("fields.availability")}</span>
                <input type="number" min={1} max={24} value={form.availabilityHours ?? ""} onChange={(event) => setForm({ ...form, availabilityHours: event.target.value ? Number(event.target.value) : null })} />
              </label>
            </div>
          )}

          <label className={`${styles.field} ${styles.fullField}`}>
            <span>{t("fields.useCase")}</span>
            <textarea required minLength={20} maxLength={2000} rows={5} placeholder={t("fields.useCasePlaceholder")} value={form.useCase} onChange={(event) => setForm({ ...form, useCase: event.target.value })} />
            <small>{form.useCase.length}/2000</small>
          </label>

          <label className={styles.consentRow}>
            <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
            <span>{t("consent")} <Link href="/privacy">{t("privacy")}</Link></span>
          </label>
          <label className={styles.consentRow}>
            <input type="checkbox" checked={form.updatesOptIn} onChange={(event) => setForm({ ...form, updatesOptIn: event.target.checked })} />
            <span>{t("updates")}</span>
          </label>
          <label className={styles.honeypot} aria-hidden="true">
            Website
            <input tabIndex={-1} autoComplete="off" value={form.website ?? ""} onChange={(event) => setForm({ ...form, website: event.target.value })} />
          </label>

          {error && <p className={styles.formError} role="alert">{error}</p>}
          <button className={styles.betaSubmit} type="submit" disabled={submitting}>
            {submitting ? <Loader2 className={styles.spinner} aria-hidden="true" /> : <Send aria-hidden="true" />}
            {t(submitting ? "submitting" : "submit")}
          </button>
          <p className={styles.formFootnote}>{t("footnote")}</p>
        </form>
      )}
    </section>
  );
}
