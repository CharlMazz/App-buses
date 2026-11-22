/// <reference types="google.maps" />
import {useCallback, useEffect, useRef, useState} from 'react';
import {useMapsLibrary} from '@vis.gl/react-google-maps';
import {BARRANQUILLA_PASSENGER_CENTER} from '../data/barranquillaTransit';
import type {LatLng, PlacePoint} from '../types/transit';

const ATTRIBUTION_IDS = ['gmp_mcp_codeassist_v1_aistudio'];

// Metro Barranquilla bounding box (Barranquilla, Soledad, Puerto Colombia, Malambo, Galapa)
export const BARRANQUILLA_METRO_BOUNDS: google.maps.LatLngBoundsLiteral = {
  south: 10.82,
  west: -74.98,
  north: 11.08,
  east: -74.72,
};

const METRO_RECTANGLE_REST = {
  rectangle: {
    low: {latitude: BARRANQUILLA_METRO_BOUNDS.south, longitude: BARRANQUILLA_METRO_BOUNDS.west},
    high: {latitude: BARRANQUILLA_METRO_BOUNDS.north, longitude: BARRANQUILLA_METRO_BOUNDS.east},
  },
};

export interface PlaceSuggestionItem {
  placeId: string;
  mainText: string;
  secondaryText: string;
  fullText: string;
  sdkSuggestion?: google.maps.places.AutocompleteSuggestion;
}

interface RestPlaceResult {
  id?: string;
  displayName?: {text?: string};
  formattedAddress?: string;
  location?: {latitude?: number; longitude?: number};
}

interface RestAutocompleteResponse {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: {text?: string};
      structuredFormat?: {
        mainText?: {text?: string};
        secondaryText?: {text?: string};
      };
    };
  }>;
  error?: {status?: string; message?: string};
}

function notifyIfQuotaError(err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('OVER_QUERY_LIMIT') ||
    msg.includes('Quota')
  ) {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  }
}

async function fetchJsonSafe<T>(url: string, init?: RequestInit): Promise<{ok: boolean; status: number; data: T}> {
  const res = await fetch(url, init);
  const text = await res.text();
  let data: T = {} as T;
  try {
    data = text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    data = {} as T;
  }
  return {ok: res.ok, status: res.status, data};
}

function mapRestPlace(best: RestPlaceResult | undefined, fallbackName: string): PlacePoint | null {
  const lat = best?.location?.latitude;
  const lng = best?.location?.longitude;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return {
    name: best?.displayName?.text?.trim() || fallbackName,
    address: best?.formattedAddress?.trim() || 'Barranquilla, Atlántico',
    position: {lat, lng},
  };
}

export async function fetchPlaceDetailsById(
  placesLib: google.maps.PlacesLibrary | null,
  placeId: string
): Promise<PlacePoint | null> {
  if (placesLib) {
    try {
      const place = new placesLib.Place({id: placeId});
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location'],
      });
      const loc = place.location;
      if (loc) {
        return {
          name: place.displayName ?? 'Lugar en Barranquilla',
          address: place.formattedAddress ?? 'Barranquilla, Atlántico',
          position: {lat: loc.lat(), lng: loc.lng()},
        };
      }
    } catch (err) {
      notifyIfQuotaError(err);
      console.warn('SDK fetchPlaceDetailsById fallback to server proxy:', err);
    }
  }

  try {
    const {ok, status, data} = await fetchJsonSafe<RestPlaceResult & {error?: {status?: string}}>(
      `/api/places/details?placeId=${encodeURIComponent(placeId)}`
    );
    if (status === 429 || data.error?.status === 'RESOURCE_EXHAUSTED') {
      window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    }
    if (!ok) return null;
    return mapRestPlace(data, 'Lugar en Barranquilla');
  } catch (err) {
    console.error('Proxy fetchPlaceDetailsById error:', err);
    return null;
  }
}

export async function resolveSuggestionToPlace(
  placesLib: google.maps.PlacesLibrary | null,
  item: PlaceSuggestionItem
): Promise<PlacePoint | null> {
  if (placesLib && item.sdkSuggestion?.placePrediction) {
    try {
      const pred = item.sdkSuggestion.placePrediction;
      const place = pred.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location'],
      });
      const loc = place.location;
      if (loc) {
        return {
          name: place.displayName ?? item.mainText ?? item.fullText,
          address: place.formattedAddress ?? item.secondaryText ?? 'Barranquilla, Atlántico',
          position: {lat: loc.lat(), lng: loc.lng()},
        };
      }
    } catch (err) {
      notifyIfQuotaError(err);
      console.warn('SDK suggestion fetchFields fallback to server proxy:', err);
    }
  }

  if (item.placeId) {
    const byId = await fetchPlaceDetailsById(null, item.placeId);
    if (byId) return byId;
  }

  return resolvePlaceFromText(null, item.fullText || item.mainText);
}

export async function resolvePlaceFromText(
  placesLib: google.maps.PlacesLibrary | null,
  queryText: string,
  origin: LatLng = BARRANQUILLA_PASSENGER_CENTER
): Promise<PlacePoint | null> {
  const trimmed = queryText.trim();
  if (trimmed.length < 2) return null;

  if (placesLib) {
    // 1. Try SDK AutocompleteSuggestion scoped to Metro Barranquilla first
    try {
      const res = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: trimmed,
        includedRegionCodes: ['co'],
        language: 'es',
        region: 'co',
        origin,
        locationRestriction: BARRANQUILLA_METRO_BOUNDS,
        internalUsageAttributionIds: ATTRIBUTION_IDS,
      });
      const firstPred = res.suggestions?.[0]?.placePrediction;
      if (firstPred) {
        const place = firstPred.toPlace();
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location'],
        });
        const loc = place.location;
        if (loc) {
          return {
            name: place.displayName ?? firstPred.mainText?.text ?? firstPred.text.text,
            address:
              place.formattedAddress ?? firstPred.secondaryText?.text ?? 'Barranquilla, Atlántico',
            position: {lat: loc.lat(), lng: loc.lng()},
          };
        }
      }
    } catch (err) {
      notifyIfQuotaError(err);
      console.warn('SDK Autocomplete resolve fallback to Text Search:', err);
    }

    // 2. Fallback to SDK Place.searchByText
    try {
      const hasMetroCity = /barranquilla|soledad|puerto colombia|malambo|galapa/i.test(trimmed);
      const {places} = await placesLib.Place.searchByText({
        textQuery: hasMetroCity ? trimmed : `${trimmed}, Barranquilla`,
        fields: ['displayName', 'formattedAddress', 'location'],
        locationRestriction: BARRANQUILLA_METRO_BOUNDS,
        maxResultCount: 3,
        language: 'es',
        region: 'co',
        internalUsageAttributionIds: ATTRIBUTION_IDS,
      });
      const best = places?.[0];
      if (best?.location) {
        return {
          name: best.displayName ?? trimmed,
          address: best.formattedAddress ?? 'Barranquilla, Atlántico',
          position: {lat: best.location.lat(), lng: best.location.lng()},
        };
      }
    } catch (err) {
      notifyIfQuotaError(err);
      console.warn('SDK Place.searchByText fallback to server proxy:', err);
    }
  }

  // 3. Server-side Places API (New) proxy fallback (resilient against Brave Shields / browser referrer issues)
  try {
    const hasMetroCity = /barranquilla|soledad|puerto colombia|malambo|galapa/i.test(trimmed);
    const {ok, status, data} = await fetchJsonSafe<{
      places?: RestPlaceResult[];
      error?: {status?: string};
    }>('/api/places/search-text', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        textQuery: hasMetroCity ? trimmed : `${trimmed}, Barranquilla`,
        locationRestriction: METRO_RECTANGLE_REST,
        maxResultCount: 3,
      }),
    });
    if (status === 429 || data.error?.status === 'RESOURCE_EXHAUSTED') {
      window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    }
    if (ok && data.places?.[0]) {
      const mapped = mapRestPlace(data.places[0], trimmed);
      if (mapped) return mapped;
    }
  } catch (err) {
    console.error('Proxy search-text error:', err);
  }

  return null;
}

export async function resolveNearbyPlace(
  placesLib: google.maps.PlacesLibrary | null,
  pos: LatLng
): Promise<PlacePoint | null> {
  const formatNearby = (nameRaw: string | undefined, addrRaw: string | undefined): PlacePoint => {
    const rawAddr = addrRaw ?? 'Barranquilla, Atlántico';
    const cleanedAddr = rawAddr
      .replace(/,\s*Barranquilla,\s*Atlántico,\s*Colombia$/i, '')
      .replace(/,\s*Colombia$/i, '')
      .trim();
    const name = nameRaw ?? (cleanedAddr.split(',')[0]?.trim() || 'Punto en mapa');
    return {
      name,
      address: cleanedAddr || rawAddr,
      position: pos,
    };
  };

  if (placesLib) {
    try {
      const {places} = await placesLib.Place.searchNearby({
        fields: ['displayName', 'formattedAddress', 'location'],
        locationRestriction: {center: pos, radius: 140},
        maxResultCount: 1,
        rankPreference: 'DISTANCE',
        language: 'es',
        region: 'co',
        internalUsageAttributionIds: ATTRIBUTION_IDS,
      });
      const best = places?.[0];
      if (best) {
        return formatNearby(best.displayName ?? undefined, best.formattedAddress ?? undefined);
      }
    } catch (err) {
      notifyIfQuotaError(err);
      console.warn('SDK searchNearby fallback to server proxy:', err);
    }
  }

  try {
    const {ok, status, data} = await fetchJsonSafe<{
      places?: RestPlaceResult[];
      error?: {status?: string};
    }>('/api/places/search-nearby', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({center: pos, radius: 140}),
    });
    if (status === 429 || data.error?.status === 'RESOURCE_EXHAUSTED') {
      window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    }
    if (ok && data.places?.[0]) {
      const best = data.places[0];
      return formatNearby(best.displayName?.text, best.formattedAddress);
    }
  } catch {
    // Let caller fall back to local Barranquilla transit catalog
  }

  return null;
}

export interface UseAutocompleteSuggestionsReturn {
  suggestions: PlaceSuggestionItem[];
  isLoading: boolean;
  error: string | null;
  resetSession: () => void;
}

export function useAutocompleteSuggestions(
  inputString: string,
  enabled: boolean = true,
  origin: LatLng = BARRANQUILLA_PASSENGER_CENTER
): UseAutocompleteSuggestionsReturn {
  const placesLib = useMapsLibrary('places');
  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const originRef = useRef<LatLng>(origin);
  originRef.current = origin;

  const [suggestions, setSuggestions] = useState<PlaceSuggestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = inputString.trim();
    if (!enabled || trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const timer = window.setTimeout(async () => {
      const currentOrigin = originRef.current;

      // 1. Try browser Google Maps JS SDK first
      if (placesLib) {
        try {
          const {AutocompleteSessionToken, AutocompleteSuggestion} = placesLib;
          if (!sessionTokenRef.current) {
            sessionTokenRef.current = new AutocompleteSessionToken();
          }

          const baseRequest: google.maps.places.AutocompleteRequest = {
            input: trimmed,
            sessionToken: sessionTokenRef.current ?? undefined,
            includedRegionCodes: ['co'],
            language: 'es',
            region: 'co',
            origin: currentOrigin,
            locationRestriction: BARRANQUILLA_METRO_BOUNDS,
            internalUsageAttributionIds: ATTRIBUTION_IDS,
          };

          let res = await AutocompleteSuggestion.fetchAutocompleteSuggestions(baseRequest);

          if ((!res.suggestions || res.suggestions.length === 0) && trimmed.length >= 3) {
            res = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
              input: trimmed,
              sessionToken: sessionTokenRef.current ?? undefined,
              includedRegionCodes: ['co'],
              language: 'es',
              region: 'co',
              origin: currentOrigin,
              locationBias: {
                center: currentOrigin,
                radius: 30000,
              },
              internalUsageAttributionIds: ATTRIBUTION_IDS,
            });
          }

          if (!cancelled) {
            const mapped: PlaceSuggestionItem[] = (res.suggestions ?? [])
              .filter((s) => Boolean(s.placePrediction))
              .map((s, idx) => {
                const pred = s.placePrediction!;
                return {
                  placeId: pred.placeId ?? `sdk-${idx}`,
                  mainText: pred.mainText?.text ?? pred.text.text,
                  secondaryText: pred.secondaryText?.text ?? '',
                  fullText: pred.text.text,
                  sdkSuggestion: s,
                };
              });
            setSuggestions(mapped);
            setIsLoading(false);
          }
          return;
        } catch (err) {
          notifyIfQuotaError(err);
          console.warn('SDK Autocomplete failed, trying server proxy:', err);
        }
      }

      // 2. Fallback to server-side Places API (New) proxy
      try {
        let proxyRes = await fetchJsonSafe<RestAutocompleteResponse>('/api/places/autocomplete', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            input: trimmed,
            origin: currentOrigin,
            locationRestriction: METRO_RECTANGLE_REST,
          }),
        });

        if (
          proxyRes.ok &&
          (!proxyRes.data.suggestions || proxyRes.data.suggestions.length === 0) &&
          trimmed.length >= 3
        ) {
          proxyRes = await fetchJsonSafe<RestAutocompleteResponse>('/api/places/autocomplete', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              input: trimmed,
              origin: currentOrigin,
              locationBias: {
                circle: {
                  center: {latitude: currentOrigin.lat, longitude: currentOrigin.lng},
                  radius: 30000,
                },
              },
            }),
          });
        }

        if (cancelled) return;

        if (
          proxyRes.status === 429 ||
          proxyRes.data.error?.status === 'RESOURCE_EXHAUSTED'
        ) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }

        if (!proxyRes.ok) {
          const errStatus = proxyRes.data.error?.status ?? '';
          const errMsg = proxyRes.data.error?.message ?? '';
          setSuggestions([]);
          if (errStatus === 'MISSING_MAPS_API_KEY') {
            setError('Google Places no tiene configurada la clave de Maps en este entorno.');
          } else if (
            proxyRes.status === 403 ||
            errStatus === 'PERMISSION_DENIED' ||
            errMsg.includes('API_KEY_SERVICE_BLOCKED') ||
            errMsg.includes('has not been used')
          ) {
            setError(
              'Google Places API (New) no está habilitada para la clave de este proyecto.'
            );
          } else {
            setError('No se pudieron cargar sugerencias de Google Places en este momento.');
          }
          setIsLoading(false);
          return;
        }

        const mapped: PlaceSuggestionItem[] = (proxyRes.data.suggestions ?? [])
          .filter((s) => Boolean(s.placePrediction))
          .map((s, idx) => {
            const p = s.placePrediction!;
            const fullText = p.text?.text ?? '';
            return {
              placeId: p.placeId ?? `proxy-${idx}`,
              mainText: p.structuredFormat?.mainText?.text ?? fullText,
              secondaryText: p.structuredFormat?.secondaryText?.text ?? '',
              fullText,
            };
          });
        setSuggestions(mapped);
        setIsLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error('Google Places autocomplete error:', err);
        setSuggestions([]);
        setError('No se pudieron cargar sugerencias de Google Places.');
        setIsLoading(false);
      }
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [placesLib, inputString, enabled]);

  const resetSession = useCallback(() => {
    sessionTokenRef.current = null;
    setSuggestions([]);
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    resetSession,
  };
}
