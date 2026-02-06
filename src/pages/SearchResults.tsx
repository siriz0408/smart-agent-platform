import { useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, Search as SearchIcon, FileText, User, Home as HomeIcon, Briefcase } from "lucide-react";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import { SearchResultsGroup } from "@/components/search/SearchResultsGroup";
import { DocumentResultCard } from "@/components/search/DocumentResultCard";
import { ContactResultCard } from "@/components/search/ContactResultCard";
import { PropertyResultCard } from "@/components/search/PropertyResultCard";
import { DealResultCard } from "@/components/search/DealResultCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSearchClickTracking, type SearchResultType } from "@/hooks/useSearchClickTracking";

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { trackSearchClick } = useSearchClickTracking();

  const query = searchParams.get("q") || "";
  const selectedFilters = searchParams.get("filters")?.split(",") || [
    "document",
    "contact",
    "property",
    "deal",
  ];

  const { data: results = [], isLoading } = useGlobalSearch({
    query,
    entityTypes: selectedFilters,
    matchCountPerType: 50,
    enabled: query.length >= 2,
  });

  // Group results by entity type
  const groupedResults = useMemo(() => {
    return {
      documents: results.filter((r) => r.entity_type === "document"),
      contacts: results.filter((r) => r.entity_type === "contact"),
      properties: results.filter((r) => r.entity_type === "property"),
      deals: results.filter((r) => r.entity_type === "deal"),
    };
  }, [results]);

  const totalResults =
    groupedResults.documents.length +
    groupedResults.contacts.length +
    groupedResults.properties.length +
    groupedResults.deals.length;

  /**
   * Creates a click-tracking callback for a specific result group.
   * Uses groupOffset so position reflects the overall order on the page
   * (documents first, then contacts, properties, deals).
   */
  const makeTrackingCallback = useCallback(
    (groupOffset: number) =>
      (entityType: string, entityId: string, indexInGroup: number) => {
        trackSearchClick({
          query,
          resultType: entityType as SearchResultType,
          resultId: entityId,
          position: groupOffset + indexInGroup + 1, // 1-indexed
          totalResults,
        });
      },
    [query, totalResults, trackSearchClick]
  );

  // Pre-calculate group offsets for position tracking (documents → contacts → properties → deals)
  const docOffset = 0;
  const contactOffset = groupedResults.documents.length;
  const propertyOffset = contactOffset + groupedResults.contacts.length;
  const dealOffset = propertyOffset + groupedResults.properties.length;

  const handleSearch = (newQuery: string) => {
    setSearchParams({ q: newQuery });
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl">
      {/* Search Header */}
      <div className="mb-8 space-y-4">
        <h1 className="text-3xl font-bold">Search Results</h1>

        {/* Search Input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search documents, contacts, properties..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>

        {/* Results Count */}
        {query && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              {isLoading ? (
                "Searching..."
              ) : (
                <>
                  Found <span className="font-semibold text-foreground">{totalResults}</span>{" "}
                  {totalResults === 1 ? "result" : "results"} for "{query}"
                </>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty State - No Query */}
      {!query && (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <div className="p-4 bg-muted rounded-full">
            <SearchIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-lg font-semibold">Start your search</h3>
            <p className="text-sm text-muted-foreground">
              Search for documents, contacts, properties, and deals
            </p>
          </div>
        </div>
      )}

      {/* Empty State - No Results */}
      {query && !isLoading && totalResults === 0 && (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <div className="p-4 bg-muted rounded-full">
            <SearchIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="text-lg font-semibold">No results found</h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search terms or filters
            </p>
          </div>
        </div>
      )}

      {/* Results Groups */}
      {!isLoading && totalResults > 0 && (
        <div className="space-y-8">
          {/* Documents */}
          {groupedResults.documents.length > 0 && (
            <SearchResultsGroup
              title="Documents"
              icon={FileText}
              count={groupedResults.documents.length}
              results={groupedResults.documents}
              renderCard={(result, index) => {
                const trackClick = makeTrackingCallback(docOffset);
                return (
                  <DocumentResultCard
                    key={result.entity_id}
                    result={result}
                    onBeforeNavigate={(type, id) => trackClick(type, id, index)}
                  />
                );
              }}
            />
          )}

          {/* Contacts */}
          {groupedResults.contacts.length > 0 && (
            <SearchResultsGroup
              title="Contacts"
              icon={User}
              count={groupedResults.contacts.length}
              results={groupedResults.contacts}
              renderCard={(result, index) => {
                const trackClick = makeTrackingCallback(contactOffset);
                return (
                  <ContactResultCard
                    key={result.entity_id}
                    result={result}
                    onBeforeNavigate={(type, id) => trackClick(type, id, index)}
                  />
                );
              }}
            />
          )}

          {/* Properties */}
          {groupedResults.properties.length > 0 && (
            <SearchResultsGroup
              title="Properties"
              icon={HomeIcon}
              count={groupedResults.properties.length}
              results={groupedResults.properties}
              renderCard={(result, index) => {
                const trackClick = makeTrackingCallback(propertyOffset);
                return (
                  <PropertyResultCard
                    key={result.entity_id}
                    result={result}
                    onBeforeNavigate={(type, id) => trackClick(type, id, index)}
                  />
                );
              }}
            />
          )}

          {/* Deals */}
          {groupedResults.deals.length > 0 && (
            <SearchResultsGroup
              title="Deals"
              icon={Briefcase}
              count={groupedResults.deals.length}
              results={groupedResults.deals}
              renderCard={(result, index) => {
                const trackClick = makeTrackingCallback(dealOffset);
                return (
                  <DealResultCard
                    key={result.entity_id}
                    result={result}
                    onBeforeNavigate={(type, id) => trackClick(type, id, index)}
                  />
                );
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
