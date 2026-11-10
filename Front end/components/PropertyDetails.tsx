"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Listing } from "@/lib/types";
import PropertyPhoto from "./PropertyPhoto";
import { PropertyRequest, RrcBrand } from "./PublicSite";

export default function PropertyDetails({ listing }: { listing: Listing }) {
  const [active, setActive] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const gallery = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<"VIEWING" | "APPLICATION" | null>(null);
  const saved = listing.images || [];
  const cover = saved.find(photo => photo.isCover) ?? saved[0];
  const photos = cover ? [cover, ...saved.filter(photo => photo.id !== cover.id)]
    : listing.imageUrl ? [{ id: "cover", url: listing.imageUrl, alt: listing.imageAlt, isCover: true }] : [];
  const index = Math.min(active, Math.max(0, photos.length - 1));
  const current = photos[index];
  const category = listing.type === "COMMERCIAL" ? "Commercial" : "Residential";
  const location = [listing.area, listing.city].filter(Boolean).join(", ");
  const movePhoto = (direction: number) => setActive(previous => (previous + direction + photos.length) % photos.length);
  const openPhotos = (photoIndex: number) => { setActive(photoIndex); setGalleryOpen(true); };

  useEffect(() => {
    if (!galleryOpen) return;
    const dialog = gallery.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.showModal();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [galleryOpen]);

  return <>
    <a className="skip-link" href="#main">Skip to property details</a>
    <header className="site-header"><div className="nav-wrap property-detail-nav">
      <RrcBrand />
      <button className="btn btn-secondary property-menu-toggle" type="button" aria-controls="property-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>Menu <span aria-hidden="true">{menuOpen ? "−" : "+"}</span></button>
      <nav className="property-navigation" id="property-navigation" aria-label="Main navigation" data-open={menuOpen} onClick={() => setMenuOpen(false)}>
        <Link href="/#properties">Commercial</Link><Link href="/#properties">Residential</Link><Link href="/#how-to-apply">How to apply</Link><Link href="/#careers">Careers</Link>
        <button className="btn btn-primary" type="button" onClick={() => setMode("APPLICATION")}>Apply to lease <span aria-hidden="true">↗</span></button>
      </nav>
    </div></header>
    <main className="wrap property-detail" id="main">
      <header className="property-detail-head">
        <nav className="property-breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><Link href="/#properties">{category} spaces</Link><span aria-hidden="true">/</span><span aria-current="page">{listing.id}</span></nav>
        <div className="property-detail-meta"><span className="property-kind">{listing.kind || category}</span><span className="property-availability">Available for lease</span></div>
        <h1>{listing.title}</h1>
        <p>{listing.name !== listing.title && <>{listing.name} <span aria-hidden="true">·</span> </>}{location}</p>
      </header>
      <section className="property-detail-gallery" aria-label="Property photos">
        {photos.length ? <div className={`property-photo-grid property-photo-grid-${Math.min(photos.length, 3)}`}>
          {photos.slice(0, 3).map((photo, i) => <button key={photo.id} type="button" onClick={() => openPhotos(i)} aria-label={`Open photo ${i + 1} of ${photos.length}${photo.isCover ? ", cover" : ""}`}>
            <PropertyPhoto src={photo.url} alt={photo.alt || `${listing.title} · photo ${i + 1}`} eager={i === 0} />
          </button>)}
        </div> : <div className="property-gallery-empty"><PropertyPhoto alt={listing.title} /></div>}
        <div className="property-gallery-actions"><Link className="property-back" href="/#properties">← Back to listings</Link>{photos.length > 0 && <button className="btn btn-secondary" type="button" onClick={() => openPhotos(0)}>View {photos.length === 1 ? "photo" : `all ${photos.length} photos`} <span aria-hidden="true">↗</span></button>}</div>
      </section>
      <div className="property-detail-layout">
        <section className="property-detail-main" aria-labelledby="space-title">
          <h2 id="space-title">About this space</h2>
          <p>{listing.kind || category} space{listing.name !== listing.title ? ` at ${listing.name}` : ""} in {location}. Explore the photos and arrange a viewing with the RRC leasing team.</p>
          <dl className="property-facts">
            <div><dt>Floor area</dt><dd>{listing.size ? `${listing.size} m²` : "To be confirmed"}</dd></div>
            <div><dt>Space type</dt><dd>{listing.kind || category}</dd></div>
            <div><dt>Floor</dt><dd>{listing.floor || "To be confirmed"}</dd></div>
          </dl>
          <h2>Location</h2><p>{location}, Philippines. Contact the leasing team for directions and to confirm a viewing schedule.</p>
          <h2>Before you apply</h2><p>RRC will confirm availability, permitted use, rent, deposits, utilities and lease conditions for the selected unit. Your application is subject to review.</p>
          <Link className="property-application-guide" href="/#how-to-apply">How to apply with RRC <span aria-hidden="true">↗</span></Link>
        </section>
        <aside className="property-detail-summary" aria-labelledby="leasing-title">
          <h2 id="leasing-title">Monthly rent</h2>
          <p className="property-price">₱{Number(listing.rent).toLocaleString("en-PH")} <small>/ month</small></p>
          <p className="property-leasing-note">Final rent, taxes and other charges must be confirmed by RRC.</p>
          <div className="property-detail-actions">
            <button className="btn btn-primary" type="button" onClick={() => setMode("APPLICATION")}>Apply online <span aria-hidden="true">↗</span></button>
            <button className="btn btn-secondary" type="button" onClick={() => setMode("VIEWING")}>Request a viewing</button>
          </div>
          <div className="property-leasing-contact"><h3>Leasing directly with RRC</h3><p>Explore the space, share your requirements and start your tenant application.</p><a href="mailto:leasing@rosefoodrealtycorp.com">leasing@rosefoodrealtycorp.com</a><p className="property-reference">Property reference: <strong>{listing.id}</strong></p></div>
        </aside>
      </div>
    </main>
    <footer className="site-footer property-footer">
      <div className="wrap">
        <div className="property-footer-intro"><h2>Your next space starts here.</h2><Link href="/#properties">Explore RRC properties <span aria-hidden="true">↗</span></Link></div>
        <div className="property-footer-columns">
          <div><Link className="property-footer-brand" href="/"><Image src="/assets/rrc-logo-white.png" alt="RRC" width={112} height={76} /><span>Rosefood Realty Corporation</span></Link><p>Commercial and residential spaces.<br />Directly with RRC.</p></div>
          <div><h3>Find your space</h3><Link href="/#properties">Commercial spaces</Link><Link href="/#properties">Residential spaces</Link></div>
          <div><h3>Leasing with RRC</h3><Link href="/#how-to-apply">How to apply</Link><Link href="/#careers">Careers at RRC</Link><Link href="/admin">Staff access</Link></div>
        </div>
        <div className="property-footer-contacts"><div><span>Leasing enquiries</span><a href="mailto:leasing@rosefoodrealtycorp.com">leasing@rosefoodrealtycorp.com</a></div><div><span>Careers & recruitment</span><a href="mailto:recruitment@rosefoodrealtycorp.com">recruitment@rosefoodrealtycorp.com</a></div></div>
        <div className="footer-bottom"><span>© 2026 Rosefood Realty Corporation</span><span>Philippines · Prices in PHP · Areas in m²</span></div>
      </div>
    </footer>
    <dialog ref={gallery} className="property-photo-dialog" aria-labelledby="gallery-title" onClose={() => setGalleryOpen(false)} onKeyDown={event => {
      if (photos.length > 1 && (event.key === "ArrowLeft" || event.key === "ArrowRight")) { event.preventDefault(); movePhoto(event.key === "ArrowLeft" ? -1 : 1); }
    }}>
      <div className="property-photo-dialog-head"><div><h2 id="gallery-title">{listing.title}</h2><p>{location} · {listing.id}</p></div><button className="icon-button" type="button" aria-label="Close photo gallery" autoFocus onClick={() => gallery.current?.close()}>×</button></div>
      {galleryOpen && <>
        <div className="property-photo-stage"><PropertyPhoto key={current?.id} src={current?.url} alt={current?.alt || `${listing.title} · photo ${index + 1}`} eager /></div>
        <div className="property-gallery-controls"><p role="status">Photo {index + 1} of {photos.length}{current?.isCover ? " · Cover" : ""}</p>{photos.length > 1 && <div className="property-gallery-buttons"><button className="btn btn-secondary" type="button" aria-label="Previous photo" onClick={() => movePhoto(-1)}>← Previous</button><button className="btn btn-secondary" type="button" aria-label="Next photo" onClick={() => movePhoto(1)}>Next →</button></div>}</div>
        {photos.length > 1 && <div className="property-gallery-thumbs" role="group" aria-label="Choose a property photo">{photos.map((photo, i) => <button key={photo.id} type="button" aria-pressed={i === index} aria-label={`Show photo ${i + 1}${photo.isCover ? ", cover" : ""}`} onClick={() => setActive(i)}><PropertyPhoto src={photo.url} alt="" /></button>)}</div>}
      </>}
    </dialog>
    {mode && <PropertyRequest listing={listing} mode={mode} onClose={() => setMode(null)} />}
  </>;
}
