/**
 * Database type aliases for simplified imports
 * Centralizes Supabase table types for better developer experience
 */
import type { Tables } from "@/integrations/supabase/types";

// Table row types
export type ImageJob = Tables<"image_jobs">;
export type Profile = Tables<"profiles">;

// Utility type for image job with computed fields
export type ImageJobWithMetadata = ImageJob & {
  formattedSize?: string;
  formattedDate?: string;
};
