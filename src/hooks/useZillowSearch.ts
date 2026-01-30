// This file is deprecated - use usePropertySearch.ts instead
// Re-exporting for backwards compatibility

export {
  usePropertySearch as useZillowSearch,
  usePropertyDetail as useZillowPropertyDetail,
  useSaveProperty as useSaveExternalProperty,
  type CommercialProperty as ZillowProperty,
  type PropertySearchParams as ZillowSearchParams,
  type PropertySearchResult as ZillowSearchResult,
  type PropertyDetail as ZillowPropertyDetail,
} from "./usePropertySearch";
