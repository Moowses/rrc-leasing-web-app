export type Listing = {
  id: string;
  name: string;
  type: "COMMERCIAL" | "RESIDENTIAL";
  title: string;
  kind: string;
  area: string;
  city: string;
  rent: number;
  size: number;
  floor: string;
  availability: string;
  publish: boolean;
  status?: "DRAFT" | "PUBLISHED" | "UNPUBLISHED" | "ARCHIVED";
  imageUrl: string;
  imageAlt: string;
  images?: { id?: string; url: string; alt?: string; isCover?: boolean }[];
};

export type ApiFailure = { error?: string };
