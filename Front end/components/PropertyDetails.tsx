"use client";

import Link from "next/link";
import { useState } from "react";
import type { Listing } from "@/lib/types";
import PropertyPhoto from "./PropertyPhoto";
import { PropertyRequest, RrcBrand } from "./PublicSite";

export default function PropertyDetails({ listing }: { listing: Listing }) {
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState<"VIEWING" | "APPLICATION" | null>(null);
  const saved = listing.images || [];
  const cover = saved.find(photo => photo.isCover) ?? saved[0];
  const photos = cover ? [cover, ...saved.filter(photo => photo.id !== cover.id)]
    : listing.imageUrl ? [{ id: "cover", url: listing.imageUrl, alt: listing.imageAlt, isCover: true }] : [];
  const index = Math.min(active, Math.max(0, photos.length - 1));
  const current = photos[index];
  const category = listing.type === "COMMERCIAL" ? "Commercial" : "Residential";
  return <>
    <a className="skip-link" href="#main">Skip to property details</a>
    <header className="site-header"><div className="nav-wrap property-detail-nav"><RrcBrand /><nav aria-label="Main navigation"><Link className="btn btn-secondary" href="/#properties">Browse listings</Link></nav></div></header>
    <main className="wrap property-detail" id="main">
      <Link className="property-back" href="/#properties">← Back to listings</Link>
      <div className="property-detail-head">
        <p className="eyebrow">{category} · {listing.id}</p>
        <h1>{listing.title}</h1>
        <p>{listing.area}, {listing.city}{listing.name !== listing.title ? ` · ${listing.name}` : ""}</p>
      </div>
      <div className="property-detail-layout">
        <section className="property-detail-gallery" aria-labelledby="photos-title">
          <h2 id="photos-title">Property photos</h2>
          <div className="property-gallery-main"><PropertyPhoto key={current?.id} src={current?.url} alt={current?.alt || `${listing.title} · photo ${index + 1}`} eager /></div>
          {photos.length > 0 && <div className="property-gallery-controls">
            <p role="status">Photo {index + 1} of {photos.length}{current?.isCover ? " · Cover" : ""}</p>
            {photos.length > 1 && <div className="property-gallery-buttons">
              <button type="button" className="btn btn-secondary" onClick={() => setActive((index + photos.length - 1) % photos.length)} aria-label="Previous photo">Previous</button>
              <button type="button" className="btn btn-secondary" onClick={() => setActive((index + 1) % photos.length)} aria-label="Next photo">Next</button>
            </div>}
          </div>}
          {photos.length > 1 && <div className="property-gallery-thumbs" role="group" aria-label="Choose a property photo">
            {photos.map((photo, i) => <button key={photo.id} type="button" aria-pressed={i === index} aria-label={`Show photo ${i + 1}${photo.isCover ? ", cover" : ""}`} onClick={() => setActive(i)}>
              <PropertyPhoto src={photo.url} alt="" />
            </button>)}
          </div>}
        </section>
        <aside className="property-detail-summary" aria-labelledby="space-title">
          <h2 id="space-title">About this space</h2>
          <p className="property-price">₱{Number(listing.rent).toLocaleString("en-PH")} <small>/ month</small></p>
          <dl className="property-facts">
            <div><dt>Space type</dt><dd>{listing.kind}</dd></div>
            <div><dt>Floor area</dt><dd>{listing.size ? `${listing.size} m²` : "To be confirmed"}</dd></div>
            <div><dt>Floor</dt><dd>{listing.floor}</dd></div>
            <div><dt>Reference</dt><dd>{listing.id}</dd></div>
          </dl>
          <div className="property-detail-actions">
            <button className="btn btn-primary" type="button" onClick={() => setMode("APPLICATION")}>Apply to lease</button>
            <button className="btn btn-secondary" type="button" onClick={() => setMode("VIEWING")}>Request a viewing</button>
          </div>
        </aside>
      </div>
    </main>
    {mode && <PropertyRequest listing={listing} mode={mode} onClose={() => setMode(null)} />}
  </>;
}
