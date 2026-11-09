import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PropertyDetails from "@/components/PropertyDetails";
import { fetchPublicListings, publicListing } from "@/lib/public-listings";

export const metadata: Metadata = { title: "Property details | Rosefood Realty Corporation" };

export default async function PropertyPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  if (!/^[A-Z]-\d{3}$/.test(reference)) notFound();
  const response = await fetchPublicListings(reference);
  if (response.status === 404) notFound();
  if (!response.ok) throw new Error("Could not load the property.");
  return <PropertyDetails listing={publicListing(await response.json())} />;
}
