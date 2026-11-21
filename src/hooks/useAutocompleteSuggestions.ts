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

export async function fetchPlaceDetailsById(
  placesLib: google.maps.PlacesLibrary,
  placeId: string
): Promise<PlacePoint | null> {
  try {
    const place = new placesLib.Place({id: placeId});
    await place.fetchFields({
      fields: ['displayName', 'formattedAddress', 'location'],
    });
    const loc = place.location;
    if (!loc) return null;
    return {
      name: place.displayName ?? 'Lugar en Barranquilla',
      address: place.formattedAddress ?? 'Barranquilla, Atlántico',
      position: {lat: loc.lat(), lng: loc.lng()},
    };
  } catch (err) {
    notifyIfQuotaError(err);
    console.error('Error fetching place details by ID:', err);
    return null;
  }
}

export async function resolvePlaceFromText(
  placesLib: google.maps.PlacesLibrary,
  queryText: string,
  origin: LatLng = BARRANQUILLA_PASSENGER_CENTER
): Promise<PlacePoint | null> {
  const trimmed = queryText.trim();
  if (trimmed.length < 2) return null;

  // 1. Try AutocompleteSuggestion scoped to Metro Barranquilla first
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
    console.warn('Autocomplete resolve fallback to Text Search:', err);
  }

  // 2. Fallback to Place.searchByText (handles free-form landmarks, intersections, and addresses)
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
    console.error('Place.searchByText error:', err);
  }

  return null;
}

export async function resolveNearbyPlace(
  placesLib: google.maps.PlacesLibrary,
  pos: LatLng
): Promise<PlacePoint | null> {
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
    if (!best) return null;
    const rawAddr = best.formattedAddress ?? 'Barranquilla, Atlántico';
    const cleanedAddr = rawAddr
      .replace(/,\s*Barranquilla,\s*Atlántico,\s*Colombia$/i, '')
      .replace(/,\s*Colombia$/i, '')
      .trim();
    const name = best.displayName ?? (cleanedAddr.split(',')[0]?.trim() || 'Punto en mapa');
    return {
      name,
      address: cleanedAddr || rawAddr,
      position: pos,
    };
  } catch (err) {
    notifyIfQuotaError(err);
    return null;
  }
}

export interface UseAutocompleteSuggestionsReturn {
  suggestions: google.maps.places.AutocompleteSuggestion[];
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

  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompleteSuggestion[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = inputString.trim();
    if (!placesLib || !enabled || trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const {AutocompleteSessionToken, AutocompleteSuggestion} = placesLib;
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new AutocompleteSessionToken();
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    const timer = window.setTimeout(async () => {
      try {
        const currentOrigin = originRef.current;
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

        // If strict metro restriction returns nothing for a broader query, widen with locationBias
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
          setSuggestions(res.suggestions ?? []);
          setIsLoading(false);
        }
      } catch (err) {
        if (cancelled) return;
        notifyIfQuotaError(err);
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
