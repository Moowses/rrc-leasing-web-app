"use client";

import Link from "next/link";

export default function PropertyError({ reset }: { reset: () => void }) {
  return <main className="wrap section"><p className="eyebrow">RRC listings</p><h1>Couldn’t load this property</h1><p>The property service may be temporarily unavailable.</p><div className="property-detail-actions"><button type="button" className="btn btn-primary" onClick={reset}>Try again</button><Link className="btn btn-secondary" href="/#properties">Back to listings</Link></div></main>;
}
