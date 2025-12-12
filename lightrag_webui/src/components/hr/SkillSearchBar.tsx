/**
 * SkillSearchBar - Search bar component with autocomplete for skills
 */

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { listSkills, searchBySkill, SkillSearchResult } from '@/api/hr';
import { toast } from 'sonner';
import { Search, Loader2, X, Sparkles } from 'lucide-react';

interface SkillSearchBarProps {
    onResultsChange: (results: SkillSearchResult[]) => void;
    onSearching: (isSearching: boolean) => void;
}

export default function SkillSearchBar({ onResultsChange, onSearching }: SkillSearchBarProps) {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [allSkills, setAllSkills] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);

    // Load all skills on mount
    useEffect(() => {
        const loadSkills = async () => {
            try {
                const result = await listSkills();
                setAllSkills(result.skills);
            } catch (error) {
                console.error('Failed to load skills:', error);
            }
        };
        loadSkills();

        // Load recent searches from localStorage
        const saved = localStorage.getItem('hr-recent-skill-searches');
        if (saved) {
            setRecentSearches(JSON.parse(saved).slice(0, 5));
        }
    }, []);

    // Filter suggestions based on query
    useEffect(() => {
        if (query.length >= 1) {
            const filtered = allSkills
                .filter(skill => skill.toLowerCase().includes(query.toLowerCase()))
                .slice(0, 8);
            setSuggestions(filtered);
            setShowSuggestions(filtered.length > 0);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    }, [query, allSkills]);

    const saveRecentSearch = (skill: string) => {
        const updated = [skill, ...recentSearches.filter(s => s !== skill)].slice(0, 5);
        setRecentSearches(updated);
        localStorage.setItem('hr-recent-skill-searches', JSON.stringify(updated));
    };

    const handleSearch = useCallback(async (skill: string) => {
        if (!skill.trim()) return;

        setIsSearching(true);
        onSearching(true);
        setShowSuggestions(false);

        try {
            const result = await searchBySkill(skill.trim(), 20);
            onResultsChange(result.candidates);
            saveRecentSearch(skill.trim());

            if (result.candidates.length === 0) {
                toast.info(`No candidates found with skill: ${skill}`);
            } else {
                toast.success(`Found ${result.candidates.length} candidates`);
            }
        } catch (error) {
            toast.error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            onResultsChange([]);
        } finally {
            setIsSearching(false);
            onSearching(false);
        }
    }, [onResultsChange, onSearching, recentSearches]);

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch(query);
        }
    };

    const clearSearch = () => {
        setQuery('');
        onResultsChange([]);
        setShowSuggestions(false);
    };

    return (
        <div className="space-y-3">
            {/* Search Input */}
            <div className="relative">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyPress={handleKeyPress}
                            onFocus={() => query.length >= 1 && setShowSuggestions(true)}
                            placeholder="Search candidates by skill (e.g., Python, React, AWS)..."
                            className="pl-10 pr-10"
                        />
                        {query && (
                            <button
                                onClick={clearSearch}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    <Button
                        onClick={() => handleSearch(query)}
                        disabled={isSearching || !query.trim()}
                    >
                        {isSearching ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <>
                                <Search className="h-4 w-4 mr-2" />
                                Search
                            </>
                        )}
                    </Button>
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-64 overflow-auto">
                        {suggestions.map((skill, i) => (
                            <button
                                key={i}
                                className="w-full px-4 py-2 text-left hover:bg-accent flex items-center gap-2"
                                onClick={() => {
                                    setQuery(skill);
                                    handleSearch(skill);
                                }}
                            >
                                <Sparkles className="h-3 w-3 text-primary" />
                                {skill}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Recent Searches */}
            {recentSearches.length > 0 && !query && (
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">Recent:</span>
                    {recentSearches.map((skill, i) => (
                        <Badge
                            key={i}
                            variant="outline"
                            className="cursor-pointer hover:bg-accent"
                            onClick={() => {
                                setQuery(skill);
                                handleSearch(skill);
                            }}
                        >
                            {skill}
                        </Badge>
                    ))}
                </div>
            )}

            {/* Popular Skills Quick Access */}
            {allSkills.length > 0 && !query && recentSearches.length === 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">Popular:</span>
                    {allSkills.slice(0, 8).map((skill, i) => (
                        <Badge
                            key={i}
                            variant="secondary"
                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                            onClick={() => {
                                setQuery(skill);
                                handleSearch(skill);
                            }}
                        >
                            {skill}
                        </Badge>
                    ))}
                </div>
            )}
        </div>
    );
}
