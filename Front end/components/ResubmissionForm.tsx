"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type Packet = { property: { reference: string; title: string; area: string }; applicant: { name: string }; requiredDocuments: string[]; documents: { kind: string; fileName: string; submittedAt: string }[]; expiresAt: string };

export default function ResubmissionForm() {
  const [token, setToken] = useState("");
  const [packet, setPacket] = useState<Packet | null>(null);
  const [files, setFiles] = useState<Record<string, File>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { const raw = window.location.hash.slice(1); if (!/^[A-Za-z0-9_-]{32,100}$/.test(raw)) { setError("This private document link is invalid or incomplete."); return; } setToken(raw); void fetch("/api/platform/api/public/application-resubmission", { headers: { "x-rrc-upload-token": raw }, cache: "no-store" }).then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "This private link is no longer available."); setPacket(data); }).catch(cause => setError(cause instanceof Error ? cause.message : "Could not load this upload link.")); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!packet) return;
    const missing = packet.requiredDocuments.filter(kind => !packet.documents.some(file => file.kind === kind) && !files[kind]);
    if (missing.length) { setError(`Choose a file for: ${missing.join(", ")}.`); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      for (const kind of packet.requiredDocuments) {
        const file = files[kind]; if (!file) continue;
        if (!/^(application\/pdf|image\/(jpeg|png))$/.test(file.type) || file.size > 5 * 1024 * 1024) throw new Error("Each upload must be a PDF, JPG, or PNG no larger than 5 MB.");
        const encoded = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1] || ""); reader.onerror = () => reject(new Error("Could not read the selected document.")); reader.readAsDataURL(file); });
        const response = await fetch("/api/platform/api/public/application-resubmission/documents", { method: "POST", headers: { "Content-Type": "application/json", "x-rrc-upload-token": token }, body: JSON.stringify({ kind, fileName: file.name, mimeType: file.type, data: encoded }) });
        const result = await response.json(); if (!response.ok) throw new Error(result.error || `Could not upload ${kind}.`);
      }
      const response = await fetch("/api/platform/api/public/application-resubmission", { headers: { "x-rrc-upload-token": token }, cache: "no-store" }); const updated = await response.json(); if (response.ok) setPacket(updated);
      setFiles({}); setMessage("Your documents were sent securely to RRC. The leasing team will continue reviewing your application.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The documents could not be sent."); }
    finally { setBusy(false); }
  }

  return <main className="resubmit-page"><header className="resubmit-brand"><Link href="/" aria-label="Rosefood Realty Corporation"><Image src="/assets/rrc-logo.png" alt="Rosefood Realty Corporation" width={260} height={165} priority /></Link></header><div className="resubmit-shell">{error && !packet ? <section className="resubmit-card" role="alert"><p className="eyebrow">Private document request</p><h1>Upload link unavailable</h1><p>{error}</p><p>For help, contact the RRC leasing team using the email in your original application confirmation.</p></section> : packet ? <div className="resubmit-card"><aside className="resubmit-summary"><p className="eyebrow">RRC leasing</p><h2>{packet.property.title}</h2><p>{packet.property.area} · {packet.property.reference}</p><p>This private link is for the requested application documents only.</p><p>Link expires {new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" }).format(new Date(packet.expiresAt))}.</p></aside><section className="resubmit-content"><p className="eyebrow">Document request</p><h1>Complete your application documents</h1><p>Hello {packet.applicant.name}. Your application details remain on file. Upload each requested item below.</p>{error && <div className="form-error" role="alert">{error}</div>}{message && <div className="form-success" role="status">{message}</div>}<h2>Documents requested</h2><form onSubmit={submit}><div className="resubmit-files">{packet.requiredDocuments.map(kind => { const existing = packet.documents.find(file => file.kind === kind); return <div className="resubmit-file" key={kind}><div><strong>{kind}</strong><small>{existing ? `Received: ${existing.fileName}` : "Required · PDF, JPG, or PNG · max 5 MB"}</small></div>{!existing && <input aria-label={`Upload ${kind}`} type="file" accept="application/pdf,image/jpeg,image/png" required={!existing} onChange={event => { const file = event.target.files?.[0]; if (file) setFiles(current => ({ ...current, [kind]: file })); }} />}{files[kind] && <small>Selected: {files[kind].name}</small>}</div>; })}</div><p className="privacy-note">Only upload documents requested by RRC. This page is encrypted in transit; use your private link and do not forward it.</p><button className="btn btn-primary" disabled={busy || packet.requiredDocuments.every(kind => packet.documents.some(file => file.kind === kind))}>{busy ? "Uploading securely…" : "Submit requested documents"}</button></form></section></div> : <section className="resubmit-card" role="status"><p>Loading your private upload request…</p></section>}</div></main>;
}
