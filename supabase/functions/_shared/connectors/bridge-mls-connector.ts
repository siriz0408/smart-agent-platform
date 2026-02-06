/**
 * Bridge Interactive MLS Connector Implementation
 * 
 * Implements the BaseConnector interface for Bridge Interactive MLS integration.
 * Bridge Interactive provides RESO Web API access to multiple MLSs via a single API.
 * 
 * Based on RES-003 research recommendation: Bridge Interactive for Phase 3 IDX integration.
 * 
 * Supported actions:
 * - search_listings: Search MLS listings with filters (price, location, property type, etc.)
 * - get_listing_details: Get detailed information for a specific listing
 * - get_listing_photos: Get photos for a listing
 * - sync_listings: Sync listings from MLS (for scheduled jobs)
 */

import { BaseConnector } from '../base-connector.ts';
import {
  ConnectorCredentials,
  ConnectorActionResult,
  ConnectorAuthError,
} from '../connector-types.ts';

/**
 * RESO Web API Property Listing (simplified)
 * Based on RESO Data Dictionary 2.0/2.1
 */
interface RESOListing {
  ListingKey: string; // MLS ID
  ListPrice?: number;
  StandardStatus?: string; // Active, Pending, Sold, etc.
  PropertyType?: string;
  PropertySubType?: string;
  BedroomsTotal?: number;
  BathroomsTotalInteger?: number;
  LivingArea?: number;
  LotSizeAcres?: number;
  City?: string;
  StateOrProvince?: string;
  PostalCode?: string;
  UnparsedAddress?: string;
  PublicRemarks?: string;
  ListingId?: string;
  ModificationTimestamp?: string;
  OnMarketDate?: string;
  OffMarketDate?: string;
  Media?: RESOMedia[];
  StandardStatusChangeDate?: string;
}

interface RESOMedia {
  MediaKey?: string;
  MediaURL?: string;
  MediaCategory?: string; // Photo, Virtual Tour, etc.
  Order?: number;
  ShortDescription?: string;
}

interface RESOSearchResponse {
  '@odata.count'?: number;
  value: RESOListing[];
  '@odata.nextLink'?: string;
}

interface RESOPropertyResponse {
  value: RESOListing[];
}

export class BridgeMLSConnector extends BaseConnector {
  readonly connectorKey = 'bridge_mls';

  /**
   * Bridge Interactive API base URL
   * In production, this would be configured per MLS or retrieved from Bridge dashboard
   */
  private readonly BRIDGE_API_BASE = Deno.env.get('BRIDGE_API_BASE_URL') || 
    'https://api.bridgeinteractive.com/reso/odata';

  getSupportedActions(): string[] {
    return [
      'search_listings',
      'get_listing_details',
      'get_listing_photos',
      'sync_listings',
    ];
  }

  validateAction(
    actionType: string,
    params: Record<string, unknown>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (actionType) {
      case 'search_listings':
        {
          // Optional filters - validate types if provided
          if (params.min_price !== undefined && typeof params.min_price !== 'number') {
            errors.push('min_price must be a number');
          }
          if (params.max_price !== undefined && typeof params.max_price !== 'number') {
            errors.push('max_price must be a number');
          }
          if (params.city && typeof params.city !== 'string') {
            errors.push('city must be a string');
          }
          if (params.state && typeof params.state !== 'string') {
            errors.push('state must be a string');
          }
          if (params.postal_code && typeof params.postal_code !== 'string') {
            errors.push('postal_code must be a string');
          }
          if (params.property_type && typeof params.property_type !== 'string') {
            errors.push('property_type must be a string');
          }
          if (params.bedrooms_min !== undefined && typeof params.bedrooms_min !== 'number') {
            errors.push('bedrooms_min must be a number');
          }
          if (params.bathrooms_min !== undefined && typeof params.bathrooms_min !== 'number') {
            errors.push('bathrooms_min must be a number');
          }
          if (params.status && typeof params.status !== 'string') {
            errors.push('status must be a string');
          }
          if (params.limit !== undefined && typeof params.limit !== 'number') {
            errors.push('limit must be a number');
          }
          if (params.skip !== undefined && typeof params.skip !== 'number') {
            errors.push('skip must be a number');
          }
        }
        break;

      case 'get_listing_details':
        {
          const required = ['listing_key'];
          const requiredCheck = this.validateRequiredParams(params, required);
          errors.push(...requiredCheck.errors);

          if (params.listing_key && typeof params.listing_key !== 'string') {
            errors.push('listing_key must be a string');
          }
        }
        break;

      case 'get_listing_photos':
        {
          const required = ['listing_key'];
          const requiredCheck = this.validateRequiredParams(params, required);
          errors.push(...requiredCheck.errors);

          if (params.listing_key && typeof params.listing_key !== 'string') {
            errors.push('listing_key must be a string');
          }
        }
        break;

      case 'sync_listings':
        {
          // Optional parameters
          if (params.mls_source && typeof params.mls_source !== 'string') {
            errors.push('mls_source must be a string');
          }
          if (params.since && typeof params.since !== 'string') {
            errors.push('since must be an ISO date string');
          }
        }
        break;

      default:
        errors.push(`Unknown action type: ${actionType}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async execute(
    actionType: string,
    params: Record<string, unknown>,
    credentials: ConnectorCredentials
  ): Promise<ConnectorActionResult> {
    // Validate action
    const validation = this.validateAction(actionType, params);
    if (!validation.valid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(', ')}`,
        error_code: 'VALIDATION_ERROR',
      };
    }

    try {
      switch (actionType) {
        case 'search_listings':
          return await this.searchListings(params, credentials);
        case 'get_listing_details':
          return await this.getListingDetails(params, credentials);
        case 'get_listing_photos':
          return await this.getListingPhotos(params, credentials);
        case 'sync_listings':
          return await this.syncListings(params, credentials);
        default:
          return {
            success: false,
            error: `Unsupported action type: ${actionType}`,
            error_code: 'UNSUPPORTED_ACTION',
          };
      }
    } catch (error) {
      return this.createErrorResult(error, actionType);
    }
  }

  /**
   * Search MLS listings with filters
   * Uses RESO Web API OData query syntax
   */
  private async searchListings(
    params: Record<string, unknown>,
    credentials: ConnectorCredentials
  ): Promise<ConnectorActionResult> {
    // Build OData filter query
    const filters: string[] = [];

    // StandardStatus filter (default to Active if not specified)
    const status = (params.status as string) || 'Active';
    filters.push(`StandardStatus eq '${status}'`);

    // Price filters
    if (params.min_price !== undefined) {
      filters.push(`ListPrice ge ${params.min_price}`);
    }
    if (params.max_price !== undefined) {
      filters.push(`ListPrice le ${params.max_price}`);
    }

    // Location filters
    if (params.city) {
      filters.push(`City eq '${this.escapeODataString(params.city as string)}'`);
    }
    if (params.state) {
      filters.push(`StateOrProvince eq '${params.state}'`);
    }
    if (params.postal_code) {
      filters.push(`PostalCode eq '${params.postal_code}'`);
    }

    // Property type filter
    if (params.property_type) {
      filters.push(`PropertyType eq '${params.property_type}'`);
    }

    // Bedrooms filter
    if (params.bedrooms_min !== undefined) {
      filters.push(`BedroomsTotal ge ${params.bedrooms_min}`);
    }

    // Bathrooms filter
    if (params.bathrooms_min !== undefined) {
      filters.push(`BathroomsTotalInteger ge ${params.bathrooms_min}`);
    }

    // Build OData query URL
    const filterQuery = filters.length > 0 ? `$filter=${filters.join(' and ')}` : '';
    const selectFields = '$select=ListingKey,ListPrice,StandardStatus,PropertyType,PropertySubType,BedroomsTotal,BathroomsTotalInteger,LivingArea,City,StateOrProvince,PostalCode,UnparsedAddress,PublicRemarks,OnMarketDate,ModificationTimestamp';
    const orderBy = '$orderby=ModificationTimestamp desc';
    const top = params.limit ? `$top=${Math.min(params.limit as number, 100)}` : '$top=50';
    const skip = params.skip ? `$skip=${params.skip}` : '';

    const queryParts = [filterQuery, selectFields, orderBy, top, skip].filter(Boolean);
    const url = `${this.BRIDGE_API_BASE}/Property?${queryParts.join('&')}`;

    const response = await this.makeRequest(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    }, credentials);

    const data: RESOSearchResponse = await this.parseJsonResponse<RESOSearchResponse>(response);

    // Transform RESO listings to Smart Agent format
    const listings = (data.value || []).map(listing => this.transformListing(listing));

    return this.createSuccessResult({
      listings,
      total_count: data['@odata.count'] || listings.length,
      has_more: !!data['@odata.nextLink'],
    });
  }

  /**
   * Get detailed information for a specific listing
   */
  private async getListingDetails(
    params: Record<string, unknown>,
    credentials: ConnectorCredentials
  ): Promise<ConnectorActionResult> {
    const listingKey = params.listing_key as string;

    // RESO Web API: Get property by ListingKey
    const url = `${this.BRIDGE_API_BASE}/Property?$filter=ListingKey eq '${listingKey}'&$expand=Media`;

    const response = await this.makeRequest(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    }, credentials);

    const data: RESOPropertyResponse = await this.parseJsonResponse<RESOPropertyResponse>(response);

    if (!data.value || data.value.length === 0) {
      return {
        success: false,
        error: `Listing not found: ${listingKey}`,
        error_code: 'NOT_FOUND',
      };
    }

    const listing = this.transformListing(data.value[0], true);

    return this.createSuccessResult({
      listing,
    });
  }

  /**
   * Get photos for a listing
   */
  private async getListingPhotos(
    params: Record<string, unknown>,
    credentials: ConnectorCredentials
  ): Promise<ConnectorActionResult> {
    const listingKey = params.listing_key as string;

    // Get listing with Media expanded
    const url = `${this.BRIDGE_API_BASE}/Property?$filter=ListingKey eq '${listingKey}'&$select=ListingKey,Media&$expand=Media`;

    const response = await this.makeRequest(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    }, credentials);

    const data: RESOPropertyResponse = await this.parseJsonResponse<RESOPropertyResponse>(response);

    if (!data.value || data.value.length === 0) {
      return {
        success: false,
        error: `Listing not found: ${listingKey}`,
        error_code: 'NOT_FOUND',
      };
    }

    const listing = data.value[0];
    const photos = (listing.Media || [])
      .filter(media => media.MediaCategory === 'Photo' || !media.MediaCategory)
      .map(media => ({
        url: media.MediaURL || '',
        order: media.Order || 0,
        description: media.ShortDescription || '',
        media_key: media.MediaKey || '',
      }))
      .sort((a, b) => a.order - b.order);

    return this.createSuccessResult({
      listing_key: listingKey,
      photos,
      photo_count: photos.length,
    });
  }

  /**
   * Sync listings from MLS (for scheduled sync jobs)
   * Supports incremental sync via 'since' parameter
   */
  private async syncListings(
    params: Record<string, unknown>,
    credentials: ConnectorCredentials
  ): Promise<ConnectorActionResult> {
    const filters: string[] = [];

    // Incremental sync: only get listings modified since a date
    if (params.since) {
      const sinceDate = new Date(params.since as string).toISOString();
      filters.push(`ModificationTimestamp ge ${sinceDate}`);
    }

    // Filter by MLS source if specified
    if (params.mls_source) {
      // Note: MLS source filtering may require additional RESO fields
      // This is a placeholder for future implementation
    }

    const filterQuery = filters.length > 0 ? `$filter=${filters.join(' and ')}` : '';
    const selectFields = '$select=ListingKey,ListPrice,StandardStatus,PropertyType,PropertySubType,BedroomsTotal,BathroomsTotalInteger,LivingArea,City,StateOrProvince,PostalCode,UnparsedAddress,PublicRemarks,OnMarketDate,OffMarketDate,ModificationTimestamp,StandardStatusChangeDate';
    const orderBy = '$orderby=ModificationTimestamp desc';
    const top = '$top=1000'; // Batch size for sync

    const queryParts = [filterQuery, selectFields, orderBy, top].filter(Boolean);
    const url = `${this.BRIDGE_API_BASE}/Property?${queryParts.join('&')}`;

    const response = await this.makeRequest(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    }, credentials);

    const data: RESOSearchResponse = await this.parseJsonResponse<RESOSearchResponse>(response);

    const listings = (data.value || []).map(listing => this.transformListing(listing));

    return this.createSuccessResult({
      listings,
      total_count: data['@odata.count'] || listings.length,
      has_more: !!data['@odata.nextLink'],
      sync_timestamp: new Date().toISOString(),
    });
  }

  /**
   * Transform RESO listing to Smart Agent format
   */
  private transformListing(listing: RESOListing, includeDetails = false): Record<string, unknown> {
    const transformed: Record<string, unknown> = {
      mls_id: listing.ListingKey,
      mls_source: 'bridge_interactive', // Could be made dynamic per MLS
      price: listing.ListPrice || null,
      status: listing.StandardStatus || null,
      property_type: listing.PropertyType || null,
      property_sub_type: listing.PropertySubType || null,
      bedrooms: listing.BedroomsTotal || null,
      bathrooms: listing.BathroomsTotalInteger || null,
      square_feet: listing.LivingArea || null,
      lot_size_acres: listing.LotSizeAcres || null,
      address: listing.UnparsedAddress || null,
      city: listing.City || null,
      state: listing.StateOrProvince || null,
      postal_code: listing.PostalCode || null,
      description: listing.PublicRemarks || null,
      on_market_date: listing.OnMarketDate || null,
      off_market_date: listing.OffMarketDate || null,
      last_modified: listing.ModificationTimestamp || null,
      status_change_date: listing.StandardStatusChangeDate || null,
    };

    // Include photos if available
    if (listing.Media && listing.Media.length > 0) {
      transformed.photos = listing.Media
        .filter(media => media.MediaCategory === 'Photo' || !media.MediaCategory)
        .map(media => ({
          url: media.MediaURL || '',
          order: media.Order || 0,
          description: media.ShortDescription || '',
        }))
        .sort((a, b) => (a.order as number) - (b.order as number));
    }

    // Include raw MLS data for compliance and future reference
    if (includeDetails) {
      transformed.mls_raw_data = listing;
    }

    return transformed;
  }

  /**
   * Escape string for OData filter queries
   */
  private escapeODataString(str: string): string {
    // OData string escaping: single quotes must be doubled
    return str.replace(/'/g, "''");
  }

  /**
   * Refresh OAuth token for Bridge Interactive
   * Bridge uses OAuth 2.0 - implement token refresh logic
   */
  async refreshToken(
    credentials: ConnectorCredentials
  ): Promise<ConnectorCredentials> {
    if (!credentials.refresh_token) {
      throw new ConnectorAuthError(
        'No refresh token available for Bridge MLS connector',
        this.connectorKey
      );
    }

    // Bridge Interactive token endpoint
    const tokenUrl = Deno.env.get('BRIDGE_TOKEN_URL') || 
      'https://api.bridgeinteractive.com/oauth/token';

    const clientId = Deno.env.get('BRIDGE_CLIENT_ID');
    const clientSecret = Deno.env.get('BRIDGE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new ConnectorAuthError(
        'Bridge Interactive OAuth credentials not configured',
        this.connectorKey
      );
    }

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: credentials.refresh_token,
      }),
    });

    if (!response.ok) {
      throw new ConnectorAuthError(
        `Token refresh failed: ${response.statusText}`,
        this.connectorKey
      );
    }

    const tokenData = await response.json();

    // Return updated credentials
    return {
      ...credentials,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || credentials.refresh_token,
      token_expires_at: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : credentials.token_expires_at,
      token_type: tokenData.token_type || 'Bearer',
      scope: tokenData.scope || credentials.scope,
      last_refreshed_at: new Date().toISOString(),
    };
  }
}
