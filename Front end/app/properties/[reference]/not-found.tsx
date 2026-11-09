import Link from "next/link";

export default function PropertyNotFound() {
  return <main className="wrap section"><p className="eyebrow">RRC listings</p><h1>Property not available</h1><p>This property could not be found or is no longer listed.</p><Link className="btn btn-primary" href="/#properties">Browse available spaces</Link></main>;
}
