import React, { useEffect, useId, useRef, useState } from "react";
import { GooglePlacesOption } from "./types";

interface AddressAutocompleteProps {
  apiKey: string;
  error?: string;
  onSelect: (option: GooglePlacesOption | null) => void;
  value: string;
}

let placesLibraryPromise: Promise<google.maps.PlacesLibrary> | null = null;

function loadPlacesLibrary(apiKey: string): Promise<google.maps.PlacesLibrary> {
  if (!placesLibraryPromise) {
    placesLibraryPromise = import("@googlemaps/js-api-loader").then(
      ({ importLibrary, setOptions }) => {
        setOptions({ key: apiKey, v: "weekly" });
        return importLibrary("places");
      }
    );
  }

  return placesLibraryPromise;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  apiKey,
  error,
  onSelect,
  value,
}) => {
  const listboxId = useId();
  const requestSequence = useRef(0);
  const sessionToken = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<google.maps.places.PlacePrediction[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [placesLibrary, setPlacesLibrary] = useState<google.maps.PlacesLibrary | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => setInputValue(value), [value]);

  useEffect(() => {
    let isMounted = true;

    if (!apiKey) {
      setLoadError("Address search is currently unavailable.");
      return () => {
        isMounted = false;
      };
    }

    loadPlacesLibrary(apiKey)
      .then((library) => {
        if (!isMounted) return;
        sessionToken.current = new library.AutocompleteSessionToken();
        setPlacesLibrary(library);
      })
      .catch((error) => {
        console.error("Google Maps initialization failed:", error);
        if (isMounted) setLoadError("Address search is currently unavailable.");
      });

    return () => {
      isMounted = false;
    };
  }, [apiKey]);

  useEffect(() => {
    if (!placesLibrary || inputValue.trim().length < 3 || inputValue === value) {
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }

    const sequence = ++requestSequence.current;
    const timer = window.setTimeout(async () => {
      try {
        const { suggestions: results } =
          await placesLibrary.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: inputValue,
            includedPrimaryTypes: ["street_address", "premise", "subpremise", "route"],
            sessionToken: sessionToken.current || undefined,
          });

        if (sequence !== requestSequence.current) return;
        setSuggestions(
          results
            .map((suggestion) => suggestion.placePrediction)
            .filter((prediction): prediction is google.maps.places.PlacePrediction => !!prediction)
        );
        setActiveIndex(-1);
      } catch (requestError) {
        console.error("Address autocomplete failed:", requestError);
        if (sequence === requestSequence.current) setSuggestions([]);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [inputValue, placesLibrary, value]);

  const selectPrediction = async (prediction: google.maps.places.PlacePrediction) => {
    try {
      const place = prediction.toPlace();
      await place.fetchFields({ fields: ["formattedAddress", "location"] });
      if (!place.location) throw new Error("The selected place has no coordinates.");

      const label = place.formattedAddress || prediction.text.toString();
      setInputValue(label);
      setSuggestions([]);
      setActiveIndex(-1);
      onSelect({
        label,
        latitude: place.location.lat(),
        longitude: place.location.lng(),
        value: {
          place_id: prediction.placeId,
          structured_formatting: {
            main_text: prediction.mainText?.toString() || label,
            secondary_text: prediction.secondaryText?.toString() || "",
          },
        },
      });
      if (placesLibrary) {
        sessionToken.current = new placesLibrary.AutocompleteSessionToken();
      }
    } catch (selectionError) {
      console.error("Address selection failed:", selectionError);
      onSelect(null);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!suggestions.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      void selectPrediction(suggestions[activeIndex]);
    } else if (event.key === "Escape") {
      setSuggestions([]);
      setActiveIndex(-1);
    }
  };

  const describedBy = [error ? "address-error" : "", loadError ? "address-load-error" : ""]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className="relative mt-1">
      <input
        id="address"
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-controls={suggestions.length ? listboxId : undefined}
        aria-expanded={suggestions.length > 0}
        aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
        aria-describedby={describedBy}
        aria-invalid={!!error}
        aria-required="true"
        autoComplete="off"
        value={inputValue}
        onChange={(event) => {
          setInputValue(event.target.value);
          onSelect(null);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placesLibrary ? "Start typing your address..." : "Loading address search..."}
        className={`w-full rounded-lg border px-4 py-3 text-base transition-colors focus:ring-2 focus:ring-offset-1 ${
          error
            ? "border-red-400 focus:border-red-400 focus:ring-red-200"
            : "border-gray-300 focus:border-gray-400 focus:ring-blue-200"
        }`}
      />

      {suggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-[1000] mt-1 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          {suggestions.map((prediction, index) => (
            <li
              id={`${listboxId}-${index}`}
              key={prediction.placeId}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => void selectPrediction(prediction)}
              className={`cursor-pointer px-3 py-2 text-sm text-gray-700 ${
                index === activeIndex ? "bg-blue-50" : "hover:bg-gray-100"
              }`}
            >
              <span className="block font-medium">
                {prediction.mainText?.toString() || prediction.text.toString()}
              </span>
              {prediction.secondaryText && (
                <span className="block text-xs text-gray-500">
                  {prediction.secondaryText.toString()}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {loadError && (
        <p id="address-load-error" role="alert" className="mt-1.5 text-sm font-medium text-red-600">
          {loadError}
        </p>
      )}
    </div>
  );
};

export default AddressAutocomplete;
