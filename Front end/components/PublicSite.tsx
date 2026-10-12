"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { Listing } from "@/lib/types";

const sampleListings: Listing[] = [
  { id: "C-101", name: "Bajada Commercial Centre", type: "COMMERCIAL", title: "Corner retail space", kind: "Retail", area: "Bajada", city: "Davao City", rent: 28000, size: 65, floor: "Ground floor", availability: "AVAILABLE", publish: true, imageUrl: "/assets/sample-commercial.jpg", imageAlt: "Illustrative corner retail space" },
  { id: "C-102", name: "Bajada Commercial Centre", type: "COMMERCIAL", title: "Flexible office space", kind: "Office", area: "Bajada", city: "Davao City", rent: 22000, size: 48, floor: "Second floor", availability: "AVAILABLE", publish: true, imageUrl: "/assets/sample-interior.jpg", imageAlt: "Illustrative office interior" },
  { id: "R-201", name: "Matina Residences", type: "RESIDENTIAL", title: "Two-bedroom townhouse", kind: "Townhouse", area: "Matina", city: "Davao City", rent: 18000, size: 72, floor: "Two storeys", availability: "AVAILABLE", publish: true, imageUrl: "/assets/sample-residential.jpg", imageAlt: "Illustrative townhouse" },
];

type FormMode = "VIEWING" | "APPLICATION";
type Draft = { name: string; email: string; phone: string; moveIn: string; term: string; details: string; preferredDate: string; preferredTime: string; consent: boolean };
const initialDraft: Draft = { name: "", email: "", phone: "", moveIn: "", term: "", details: "", preferredDate: "", preferredTime: "", consent: false };

function RrcBrand({ light = false }: { light?: boolean }) {
  return <Link className="brand" href="/" aria-label="Rosefood Realty Corporation home"><Image src={light ? "/assets/rrc-logo-white.png" : "/assets/rrc-logo.png"} alt="RRC" width={104} height={70} priority /><span>ROSEFOOD REALTY<br />CORPORATION</span></Link>;
}

function PropertyRequest({ listing, mode, onClose }: { listing: Listing; mode: FormMode; onClose: () => void }) {
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [requestCode, setRequestCode] = useState("");
  const [saved, setSaved] = useState(false);
  const [documents, setDocuments] = useState<File[]>([]);
  const totalSteps = mode === "VIEWING" ? 2 : 4;
  const update = (key: keyof Draft, value: string | boolean) => setDraft((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  useEffect(() => {
    if (mode !== "APPLICATION") return;
    try {
      const raw = sessionStorage.getItem(`rrc-application:${listing.id}`);
      if (raw) { setDraft((current) => ({ ...current, ...JSON.parse(raw) })); setSaved(true); }
    } catch { /* Keep this form usable when browser storage is blocked. */ }
  }, [listing.id, mode]);

  function saveStep() {
    if (mode === "APPLICATION") {
      try { sessionStorage.setItem(`rrc-application:${listing.id}`, JSON.stringify(draft)); setSaved(true); } catch { setSaved(false); }
    }
  }

  function validateCurrentStep() {
    if (step === 0 && mode === "APPLICATION" && (!draft.moveIn || !draft.term)) return "Choose a preferred move-in date and lease term to continue.";
    if (step === (mode === "VIEWING" ? 0 : 1) && (!draft.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email))) return "Enter your name and a valid email address to continue.";
    if (mode === "VIEWING" && step === 0 && (!draft.preferredDate || !draft.preferredTime)) return "Choose a preferred date and time for the viewing.";
    if (mode === "APPLICATION" && step === 2 && (documents.length > 5 || documents.some(file => file.size > 5 * 1024 * 1024) || documents.reduce((total, file) => total + file.size, 0) > 5 * 1024 * 1024)) return "Attachments must be PDF, JPG, or PNG and total 5 MB or less.";
    return "";
  }

  async function encodedDocuments() {
    return Promise.all(documents.map(file => new Promise<{ kind: string; fileName: string; mimeType: string; data: string }>((resolve, reject) => {
      if (!/^(application\/pdf|image\/(jpeg|png))$/.test(file.type)) return reject(new Error("Attach PDF, JPG, or PNG documents only."));
      const reader = new FileReader(); reader.onload = () => resolve({ kind: "Supporting document", fileName: file.name.slice(0, 180), mimeType: file.type, data: String(reader.result).split(",")[1] || "" }); reader.onerror = () => reject(new Error("A selected file could not be read.")); reader.readAsDataURL(file);
    })));
  }

  async function submit() {
    if (!draft.consent) { setError("Please review and accept the contact consent before sending."); return; }
    setBusy(true); setError("");
    const details: Record<string, string | boolean> = mode === "VIEWING"
      ? { preferredDate: draft.preferredDate, preferredTime: draft.preferredTime, notes: draft.details }
      : { preferredMoveIn: draft.moveIn, leaseTerm: draft.term, additionalDetails: draft.details };
    try {
      const uploads = mode === "APPLICATION" ? await encodedDocuments() : [];
      const response = await fetch("/api/public/leasing-requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: mode, propertyReference: listing.id, contactName: draft.name.trim(), email: draft.email.trim(), phone: draft.phone.trim(), notes: draft.details.trim(), details, documents: uploads, consent: true }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The request could not be sent. Please try again.");
      setRequestCode(String(result.requestId || "")); setSubmitted(true);
      try { sessionStorage.removeItem(`rrc-application:${listing.id}`); } catch { /* Optional browser draft. */ }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The request could not be sent."); }
    finally { setBusy(false); }
  }

  function next() {
    const validation = validateCurrentStep();
    if (validation) { setError(validation); return; }
    setError(""); saveStep(); setStep((current) => Math.min(totalSteps - 1, current + 1));
  }

  const change = (key: keyof Draft, type = "text") => ({ type, value: String(draft[key] || ""), onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => update(key, event.target.value) });
  const input = (key: keyof Draft, label: string, type = "text", full = false) => <div className={`field${full ? " full" : ""}`}><label htmlFor={`request-${key}`}>{label}</label><input id={`request-${key}`} autoComplete={key === "name" ? "name" : key === "email" ? "email" : key === "phone" ? "tel" : undefined} required={key === "name" || key === "email"} {...change(key, type)} /></div>;

  return <div className="overlay" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="request-title">
    <header className="modal-header"><div><p className="eyebrow modal-eyebrow">Rosefood Realty Corporation</p><h2 id="request-title">{mode === "VIEWING" ? "Request a viewing" : "Apply to lease"}</h2></div><button type="button" className="icon-button" aria-label="Close request form" onClick={onClose}>×</button></header>
    <div className="modal-body">
      {submitted ? <div className="form-success" role="status"><h3>Thank you. We received your request.</h3><p>{mode === "VIEWING" ? "The leasing team will contact you to confirm a schedule." : "The leasing team will review your application and contact you at the email provided."}</p>{requestCode && <p>Reference: <strong>{requestCode.slice(-8).toUpperCase()}</strong></p>}<button type="button" className="btn btn-primary" onClick={onClose}>Done</button></div> : <>
        <p><strong>{listing.title}</strong><br />{listing.area}, {listing.city} · {listing.id}</p>
        <div className="progress" aria-label={`Step ${step + 1} of ${totalSteps}`}>{Array.from({ length: totalSteps }, (_, index) => <span key={index} data-active={index <= step} />)}</div>
        <p className="step-label">Step {step + 1} of {totalSteps}{saved ? " · Draft saved in this browser" : ""}</p>
        {error && <div className="form-error" role="alert">{error}</div>}
        {mode === "VIEWING" && <div className="form-grid">{step === 0 ? <>{input("name", "Full name *")}{input("email", "Email address *", "email")}{input("phone", "Mobile number (optional)", "tel", true)}{input("preferredDate", "Preferred date *", "date")}
          <div className="field"><label htmlFor="request-preferredTime">Preferred time (Philippine time) *</label><select id="request-preferredTime" value={draft.preferredTime} onChange={(event) => update("preferredTime", event.target.value)}><option value="">Select a time</option>{["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"].map((value) => <option key={value} value={value}>{value}</option>)}</select></div><div className="field full"><label htmlFor="request-details">Anything we should know? (optional)</label><textarea id="request-details" value={draft.details} onChange={(event) => update("details", event.target.value)} /></div></> : <div className="field full"><p>We’ll send your request to the RRC leasing team. Your preferred time is not confirmed until the team replies.</p><div className="check-row"><input id="request-consent" type="checkbox" checked={draft.consent} onChange={(event) => update("consent", event.target.checked)} /><label htmlFor="request-consent">I agree that RRC may use these details to arrange this viewing and contact me about it.</label></div></div>}</div>}
        {mode === "APPLICATION" && <>{step === 0 && <div className="form-grid"><div className="field"><label htmlFor="request-moveIn">Preferred move-in date *</label><input id="request-moveIn" required {...change("moveIn", "date")} /></div><div className="field"><label htmlFor="request-term">Requested lease term *</label><select id="request-term" required value={draft.term} onChange={(event) => update("term", event.target.value)}><option value="">Choose a term</option>{[6, 12, 24, 36, 60].map((months) => <option key={months} value={`${months} months`}>{months} months</option>)}</select></div></div>}
          {step === 1 && <div className="form-grid">{input("name", "Full name *")}{input("email", "Email address *", "email")}{input("phone", "Mobile number", "tel", true)}<div className="field full"><label htmlFor="request-details">Tell us about your intended use / household</label><textarea id="request-details" value={draft.details} onChange={(event) => update("details", event.target.value)} /></div></div>}
          {step === 2 && <div className="form-grid"><div className="field full"><h3>Supporting documents</h3><p>Attach any documents you want the leasing team to review now. You can also submit the application without files; if anything is missing, RRC will email a secure upload link.</p><label htmlFor="application-documents">PDF, JPG, or PNG · up to 5 MB total</label><input id="application-documents" type="file" accept="application/pdf,image/jpeg,image/png" multiple onChange={(event) => setDocuments(current => [...current, ...Array.from(event.target.files || [])].slice(0, 5))} /><ul className="document-list">{documents.map((file, index) => <li key={`${file.name}-${file.lastModified}-${index}`}><span>{file.name}<small>{(file.size / 1024).toFixed(0)} KB</small></span><button type="button" className="action-button" onClick={() => setDocuments(current => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${file.name}`}>Remove</button></li>)}</ul><p>{documents.length} file{documents.length === 1 ? "" : "s"} selected · {(documents.reduce((total, file) => total + file.size, 0) / (1024 * 1024)).toFixed(2)} MB</p></div></div>}
          {step === 3 && <div><h3>Review before sending</h3><dl className="review-list"><div><dt>Listing</dt><dd>{listing.title} · {listing.id}</dd></div><div><dt>Move-in date</dt><dd>{draft.moveIn}</dd></div><div><dt>Lease term</dt><dd>{draft.term}</dd></div><div><dt>Applicant</dt><dd>{draft.name} · {draft.email} · {draft.phone || "No mobile number"}</dd></div><div><dt>Details</dt><dd>{draft.details || "None provided"}</dd></div><div><dt>Documents</dt><dd>{documents.length ? documents.map(file => file.name).join(", ") : "None attached"}</dd></div></dl><div className="check-row"><input id="request-consent" type="checkbox" checked={draft.consent} onChange={(event) => update("consent", event.target.checked)} /><label htmlFor="request-consent">I confirm these details are accurate and consent to RRC using them to review my application and contact me.</label></div></div>}
        </>}
        <div className="form-actions">{step > 0 ? <button type="button" className="btn btn-secondary" onClick={() => { setError(""); setStep((current) => current - 1); }}>Back</button> : <button type="button" className="btn btn-quiet" onClick={onClose}>Cancel</button>}{(mode === "VIEWING" && step === 0) || (mode === "APPLICATION" && step < 3) ? <button type="button" className="btn btn-primary" onClick={next}>Continue</button> : <button type="button" className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? "Sending…" : mode === "VIEWING" ? "Send viewing request" : "Submit application"}</button>}</div>
      </>}
    </div>
  </section></div>;
}

export default function PublicSite() {
  const [listings, setListings] = useState<Listing[]>(sampleListings);
  const [filter, setFilter] = useState("ALL");
  const [selected, setSelected] = useState<{ listing: Listing; mode: FormMode } | null>(null);
  const [live, setLive] = useState(false);
  const formOpen = selected !== null;
  const filtered = useMemo(() => listings.filter((item) => filter === "ALL" || item.type === filter), [listings, filter]);

  useEffect(() => {
    // Leave the catalogue and form untouched until the applicant closes the form.
    if (formOpen) return;
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/public/properties", { cache: "no-store" });
        if (!response.ok) return;
        const items = await response.json();
        if (active && Array.isArray(items)) {
          setListings(current => JSON.stringify(current) === JSON.stringify(items) ? current : items);
          setLive(true);
        }
      } catch { /* Keep the clearly marked sample catalogue available during local setup. */ }
    };
    void load();
    const timer = window.setInterval(load, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, [formOpen]);

  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    {!live && <div className="preview-bar">Leasing preview <span>Sample listings and illustrative images. Requests are not connected until the platform API is configured.</span></div>}
    <header className="site-header"><div className="nav-wrap"><RrcBrand /><nav className="site-nav" aria-label="Main navigation"><a href="#properties">Commercial</a><a href="#properties">Residential</a><a href="#how-to-apply">How to apply</a><a href="#careers">Careers</a><a className="btn btn-primary" href="#properties">Apply to lease ↗</a><Link href="/admin">Staff access</Link></nav></div></header>
    <main id="main">
      <section className="wrap hero"><div><p className="eyebrow">Commercial and residential spaces</p><h1>Your next space starts here.</h1><p>Explore RRC spaces in Davao City and connect directly with our leasing team.</p><a className="btn btn-primary" href="#properties">Explore available spaces <span aria-hidden="true">↓</span></a></div><aside className="hero-panel"><p className="eyebrow">Rosefood Realty Corporation</p><strong>Find the right place to grow, live, or begin your next chapter.</strong><p className="hero-panel-copy">Browse the current listings, request a viewing, or start a lease application online.</p></aside></section>
      <section className="section section-tint" id="properties"><div className="wrap"><div className="property-toolbar"><div><p className="eyebrow">Available spaces</p><h2>Explore RRC listings</h2><p className="catalogue-count">{live ? `${listings.length} published spaces` : "Illustrative sample spaces"}</p></div><div className="filter-row" aria-label="Filter property type">{[["ALL", "All spaces"], ["COMMERCIAL", "Commercial"], ["RESIDENTIAL", "Residential"]].map(([value, label]) => <button type="button" className="filter-chip" aria-pressed={filter === value} key={value} onClick={() => setFilter(value)}>{label}</button>)}</div></div>
        <div className="property-grid">{filtered.map((listing) => <article className="property-card" key={listing.id}><div className="property-image">{listing.imageUrl ? <img src={listing.imageUrl} alt={listing.imageAlt || listing.title} loading="lazy" /> : <div aria-hidden="true" />}{!live && <span className="sample-tag">Illustrative sample</span>}</div><div className="property-body"><div className="property-meta"><span className="pill">{listing.type === "COMMERCIAL" ? "Commercial" : "Residential"}</span><small>{listing.id}</small></div><h3>{listing.title}</h3><p className="location">{listing.area}, {listing.city}</p><div className="property-specs"><span>{listing.kind}</span><span>{listing.size} m²</span><span>{listing.floor}</span></div><p className="property-price">₱{Number(listing.rent).toLocaleString("en-PH")} <small>/ month</small></p><div className="property-actions"><button className="btn btn-secondary" type="button" onClick={() => setSelected({ listing, mode: "VIEWING" })}>Request a viewing</button><button className="btn btn-primary" type="button" disabled={!live} title={!live ? "Applications activate when the platform API is connected." : "Apply to lease"} onClick={() => setSelected({ listing, mode: "APPLICATION" })}>Apply to lease</button></div></div></article>)}</div>
      </div></section>
      <section className="wrap section" id="how-to-apply"><p className="eyebrow">A straightforward process</p><h2>Leasing with RRC</h2><div className="process-grid"><article><span>01</span><h3>Choose a space</h3><p>Review the available details and select a listing that fits your needs.</p></article><article><span>02</span><h3>Send your request</h3><p>Provide your contact details and requested move-in or viewing information.</p></article><article><span>03</span><h3>Hear from our team</h3><p>RRC will review your request and follow up by email or phone.</p></article></div></section>
      <section className="section section-tint" id="careers"><div className="wrap"><div className="career-callout"><div><p className="eyebrow">Work with RRC</p><h2>Careers at RRC</h2><p>Explore current opportunities and apply directly to our HR team.</p></div><a className="btn btn-secondary" href="mailto:recruitment@rosefoodrealtycorp.com?subject=Career%20opportunities">Contact recruitment</a></div><CareerOpenings /></div></section>
    </main>
    <footer className="site-footer"><div className="wrap"><div className="footer-grid"><div><Image className="footer-logo" src="/assets/rrc-logo-white.png" alt="RRC" width={112} height={76} /><h3>Rosefood Realty Corporation</h3><p>Commercial and residential spaces.<br />Directly with RRC.</p></div><div><h3>Find your space</h3><a href="#properties">Commercial spaces</a><a href="#properties">Residential spaces</a></div><div><h3>Leasing with RRC</h3><a href="#how-to-apply">How to apply</a><a href="#careers">Careers at RRC</a><a href="mailto:leasing@rosefoodrealtycorp.com">leasing@rosefoodrealtycorp.com</a></div></div><div className="footer-bottom"><span>© 2026 Rosefood Realty Corporation</span><span>Philippines · Prices in PHP · Areas in m²</span></div></div></footer>
    {selected && <PropertyRequest listing={selected.listing} mode={selected.mode} onClose={() => setSelected(null)} />}
  </>;
}

type CareerJob = { reference: string; title: string; department: string; employmentType: string; location: string; description: string; requirements: string };

function CareerOpenings() {
  const [jobs, setJobs] = useState<CareerJob[]>([]); const [selected, setSelected] = useState(""); const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [phone, setPhone] = useState(""); const [note, setNote] = useState(""); const [resume, setResume] = useState<File | null>(null); const [consent, setConsent] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(""); const [error, setError] = useState("");
  useEffect(() => { fetch("/api/platform/api/public/jobs", { cache: "no-store" }).then(response => response.ok ? response.json() : []).then(data => { if (Array.isArray(data)) setJobs(data); }).catch(() => undefined); }, []);
  async function apply(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!consent) { setError("Please agree to the recruitment privacy notice before submitting."); return; } setBusy(true); setError(""); setMessage(""); try { let encodedResume; if (resume) { if (!/^(application\/pdf|image\/(jpeg|png))$/.test(resume.type) || resume.size > 5 * 1024 * 1024) throw new Error("Resume must be a PDF, JPG, or PNG no larger than 5 MB."); encodedResume = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(",")[1] || ""); reader.onerror = () => reject(new Error("Could not read the resume.")); reader.readAsDataURL(resume); }); } const job = jobs.find(item => item.reference === selected); if (!job) throw new Error("Select an open position."); const response = await fetch("/api/platform/api/public/career-applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobReference: selected, fullName: name, email, phone, coverNote: note, consent: true, ...(resume ? { resume: { kind: "Resume", fileName: resume.name, mimeType: resume.type, data: encodedResume } } : {}) }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Your application could not be submitted."); setMessage("Thank you. HR received your application and will follow up by email."); setName(""); setEmail(""); setPhone(""); setNote(""); setResume(null); setConsent(false); } catch (cause) { setError(cause instanceof Error ? cause.message : "Your application could not be submitted."); } finally { setBusy(false); } }
  return <div className="career-openings"><div><p className="eyebrow">Open positions</p><h3>Join our team</h3>{jobs.length ? jobs.map(job => <article className="job-card" key={job.reference}><div className="job-heading"><div><h4>{job.title}</h4><p>{job.department} · {job.employmentType} · {job.location}</p></div><button type="button" className="btn btn-secondary" onClick={() => { setSelected(job.reference); setError(""); setMessage(""); document.getElementById("career-application-form")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>Apply</button></div><p>{job.description}</p><details><summary>Requirements</summary><p>{job.requirements}</p></details></article>) : <p>There are no published openings right now. Please check back later.</p>}</div><form className="career-form" id="career-application-form" onSubmit={apply}><h3>Career application</h3><div className="form-grid"><div className="field full"><label htmlFor="career-position">Position *</label><select id="career-position" required value={selected} onChange={event => setSelected(event.target.value)}><option value="">Select a position</option>{jobs.map(job => <option key={job.reference} value={job.reference}>{job.title} · {job.reference}</option>)}</select></div><div className="field"><label htmlFor="career-name">Full name *</label><input id="career-name" required minLength={2} autoComplete="name" value={name} onChange={event => setName(event.target.value)} /></div><div className="field"><label htmlFor="career-email">Email *</label><input id="career-email" type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} /></div><div className="field"><label htmlFor="career-phone">Mobile number</label><input id="career-phone" autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)} /></div><div className="field"><label htmlFor="career-resume">Resume (optional)</label><input id="career-resume" type="file" accept="application/pdf,image/jpeg,image/png" onChange={event => setResume(event.target.files?.[0] || null)} /><small>PDF, JPG, PNG · max 5 MB</small></div><div className="field full"><label htmlFor="career-note">Cover note</label><textarea id="career-note" value={note} onChange={event => setNote(event.target.value)} /></div></div><label className="check-row"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /><span>I consent to RRC HR using my details to assess this job application and contact me.</span></label>{error && <div className="form-error" role="alert">{error}</div>}{message && <div className="form-success" role="status">{message}</div>}<button className="btn btn-primary" disabled={busy || !jobs.length}>{busy ? "Sending…" : "Submit application"}</button></form></div>;
}
