import { useEffect, useState } from "react";

export type SearchSuggestion = {
    label: string;
    detail: string;
    kind: 'dish' | 'restaurant' | 'category' | 'area';
};

const seedSuggestions: SearchSuggestion[] = [
    { label: 'Creamy shrimp soup', detail: 'Popular dish near campus', kind: 'dish' },
    { label: 'Smash burger', detail: 'Fast delivery favorites', kind: 'dish' },
    { label: 'Sushi House', detail: '4.8 rated restaurant', kind: 'restaurant' },
    { label: 'Breakfast', detail: 'Open now before 11:00', kind: 'category' },
    { label: 'Kadikoy', detail: 'Explore nearby restaurants', kind: 'area' },
    { label: 'Pizza', detail: 'Student deals available', kind: 'category' },
];

export function useSearchSuggestions({ query }: { query: string }) {
    const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const normalizedQuery = query.trim().toLowerCase();

        if (!normalizedQuery) {
            setSuggestions([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const timeoutId = window.setTimeout(() => {
            const matchedSuggestions = seedSuggestions.filter((suggestion) =>
                `${suggestion.label} ${suggestion.detail} ${suggestion.kind}`
                    .toLowerCase()
                    .includes(normalizedQuery),
            );

            const querySuggestion: SearchSuggestion = {
                label: query.trim(),
                detail: 'Search all restaurants, dishes, and neighborhoods',
                kind: 'dish',
            };

            setSuggestions([
                querySuggestion,
                ...matchedSuggestions.filter(
                    (suggestion) => suggestion.label.toLowerCase() !== normalizedQuery,
                ),
            ].slice(0, 5));
            setIsLoading(false);
        }, 180);

        return () => window.clearTimeout(timeoutId);
    }, [query]);

    return { suggestions, isLoading };
}
