/**
 * HRManagement - Main HR module component with sub-tabs
 */

import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import {
    listCandidates,
    getCandidate,
    uploadCV,
    CandidateSummary,
    CandidateDetail as CandidateDetailType,
    SkillSearchResult,
    JobMatchResult,
} from '@/api/hr';
import CandidateCard from '@/components/hr/CandidateCard';
import CandidateDetail from '@/components/hr/CandidateDetail';
import SkillSearchBar from '@/components/hr/SkillSearchBar';
import JobDescriptionInput from '@/components/hr/JobDescriptionInput';
import {
    Users, Search, Briefcase, Upload, Loader2,
    RefreshCw, FileUp, Trophy, AlertCircle, CheckCircle, XCircle
} from 'lucide-react';

export default function HRManagement() {
    // Candidates state
    const [candidates, setCandidates] = useState<CandidateSummary[]>([]);
    const [selectedCandidate, setSelectedCandidate] = useState<CandidateDetailType | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Skill search state
    const [skillSearchResults, setSkillSearchResults] = useState<SkillSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Job match state
    const [jobMatchResults, setJobMatchResults] = useState<JobMatchResult | null>(null);

    // Load candidates on mount
    const loadCandidates = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await listCandidates();
            setCandidates(result.candidates);
        } catch (error) {
            toast.error(`Failed to load candidates: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCandidates();
    }, [loadCandidates]);

    // Handle file upload
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['.pdf', '.docx', '.doc'];
        const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
        if (!validTypes.includes(fileExt)) {
            toast.error(`Invalid file type. Allowed: ${validTypes.join(', ')}`);
            return;
        }

        setIsUploading(true);
        try {
            const result = await uploadCV(file);
            toast.success(`CV uploaded: ${result.name}`);
            loadCandidates(); // Refresh list
        } catch (error) {
            toast.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsUploading(false);
            // Reset input
            event.target.value = '';
        }
    };

    // View candidate details
    const handleViewDetails = async (candidateId: string) => {
        try {
            const detail = await getCandidate(candidateId);
            setSelectedCandidate(detail);
            setDetailOpen(true);
        } catch (error) {
            toast.error(`Failed to load candidate: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    // Handle evaluation added
    const handleEvaluationAdded = () => {
        // Refresh candidate detail
        if (selectedCandidate) {
            handleViewDetails(selectedCandidate._id);
        }
        loadCandidates();
    };

    // Get match score color
    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-500';
        if (score >= 60) return 'text-amber-500';
        return 'text-red-500';
    };

    const getScoreIcon = (score: number) => {
        if (score >= 80) return <CheckCircle className="h-4 w-4 text-green-500" />;
        if (score >= 60) return <AlertCircle className="h-4 w-4 text-amber-500" />;
        return <XCircle className="h-4 w-4 text-red-500" />;
    };

    return (
        <div className="h-full flex flex-col p-4">
            <Tabs defaultValue="candidates" className="flex-1 flex flex-col">
                <TabsList className="grid w-full max-w-xl grid-cols-3 mb-4">
                    <TabsTrigger value="candidates" className="gap-2">
                        <Users className="h-4 w-4" />
                        Candidates
                    </TabsTrigger>
                    <TabsTrigger value="skill-search" className="gap-2">
                        <Search className="h-4 w-4" />
                        Skill Search
                    </TabsTrigger>
                    <TabsTrigger value="job-matcher" className="gap-2">
                        <Briefcase className="h-4 w-4" />
                        Job Matcher
                    </TabsTrigger>
                </TabsList>

                {/* Candidates Tab */}
                <TabsContent value="candidates" className="flex-1 overflow-hidden">
                    <div className="h-full flex flex-col gap-4">
                        {/* Actions Bar */}
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <label className="cursor-pointer">
                                    <Input
                                        type="file"
                                        accept=".pdf,.docx,.doc"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        disabled={isUploading}
                                    />
                                    <Button asChild disabled={isUploading}>
                                        <span>
                                            {isUploading ? (
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            ) : (
                                                <FileUp className="h-4 w-4 mr-2" />
                                            )}
                                            Upload CV
                                        </span>
                                    </Button>
                                </label>
                                <Button variant="outline" onClick={loadCandidates} disabled={isLoading}>
                                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                                    Refresh
                                </Button>
                            </div>
                            <Badge variant="secondary" className="text-sm">
                                {candidates.length} candidates
                            </Badge>
                        </div>

                        {/* Candidates Grid */}
                        <ScrollArea className="flex-1">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-40">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : candidates.length === 0 ? (
                                <Card className="border-dashed">
                                    <CardContent className="flex flex-col items-center justify-center py-12">
                                        <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                                        <p className="text-lg font-medium mb-2">No candidates yet</p>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Upload CVs (PDF, DOCX) to get started
                                        </p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
                                    {candidates.map((candidate) => (
                                        <CandidateCard
                                            key={candidate.id}
                                            candidate={candidate}
                                            onViewDetails={handleViewDetails}
                                        />
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </TabsContent>

                {/* Skill Search Tab */}
                <TabsContent value="skill-search" className="flex-1 overflow-hidden">
                    <div className="h-full flex flex-col gap-4">
                        <SkillSearchBar
                            onResultsChange={setSkillSearchResults}
                            onSearching={setIsSearching}
                        />

                        <ScrollArea className="flex-1">
                            {isSearching ? (
                                <div className="flex items-center justify-center h-40">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : skillSearchResults.length === 0 ? (
                                <Card className="border-dashed">
                                    <CardContent className="flex flex-col items-center justify-center py-12">
                                        <Search className="h-12 w-12 text-muted-foreground mb-4" />
                                        <p className="text-lg font-medium mb-2">Search for skills</p>
                                        <p className="text-sm text-muted-foreground">
                                            Enter a skill to find matching candidates
                                        </p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="space-y-3 pb-4">
                                    {skillSearchResults.map((result, i) => (
                                        <Card
                                            key={i}
                                            className="cursor-pointer hover:border-primary/50 transition-colors"
                                            onClick={() => handleViewDetails(result.candidate_id)}
                                        >
                                            <CardContent className="py-4">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-medium">{result.name}</span>
                                                            {result.has_evaluation && (
                                                                <Badge variant="default" className="bg-green-500 text-xs">
                                                                    Evaluated
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        {result.latest_experience && (
                                                            <p className="text-sm text-muted-foreground mb-2">
                                                                {result.latest_experience}
                                                            </p>
                                                        )}
                                                        <div className="flex flex-wrap gap-1">
                                                            {result.all_skills.slice(0, 5).map((skill, j) => (
                                                                <Badge
                                                                    key={j}
                                                                    variant={skill.toLowerCase().includes(result.matched_skill.toLowerCase()) ? 'default' : 'outline'}
                                                                    className="text-xs"
                                                                >
                                                                    {skill}
                                                                </Badge>
                                                            ))}
                                                            {result.all_skills.length > 5 && (
                                                                <Badge variant="secondary" className="text-xs">
                                                                    +{result.all_skills.length - 5}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className={`text-2xl font-bold ${getScoreColor(result.score)}`}>
                                                        {result.score}%
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </TabsContent>

                {/* Job Matcher Tab */}
                <TabsContent value="job-matcher" className="flex-1 overflow-hidden">
                    <div className="h-full flex flex-col gap-4">
                        <JobDescriptionInput onMatchResults={setJobMatchResults} />

                        <ScrollArea className="flex-1">
                            {jobMatchResults && jobMatchResults.matched_candidates.length > 0 ? (
                                <div className="space-y-3 pb-4">
                                    {jobMatchResults.matched_candidates.map((match, i) => (
                                        <Card
                                            key={i}
                                            className="cursor-pointer hover:border-primary/50 transition-colors"
                                            onClick={() => handleViewDetails(match.candidate_id)}
                                        >
                                            <CardContent className="py-4">
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="text-lg font-medium">#{i + 1}</span>
                                                            {getScoreIcon(match.match_score)}
                                                            <span className="font-medium">{match.name}</span>
                                                            {match.has_evaluation && (
                                                                <Badge variant="default" className="bg-green-500 text-xs">
                                                                    Evaluated
                                                                </Badge>
                                                            )}
                                                            <Badge variant="outline" className="text-xs">
                                                                {match.recommendation?.replace('_', ' ')}
                                                            </Badge>
                                                        </div>

                                                        {match.strengths && match.strengths.length > 0 && (
                                                            <div className="mb-2">
                                                                <span className="text-xs text-muted-foreground">Strengths: </span>
                                                                <span className="text-sm text-green-600">
                                                                    {match.strengths.slice(0, 2).join(', ')}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {match.risks && match.risks.length > 0 && (
                                                            <div>
                                                                <span className="text-xs text-muted-foreground">Concerns: </span>
                                                                <span className="text-sm text-orange-500">
                                                                    {match.risks.slice(0, 2).join(', ')}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="text-right">
                                                        <div className={`text-3xl font-bold ${getScoreColor(match.match_score)}`}>
                                                            {match.match_score}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            match score
                                                        </div>
                                                        <Badge
                                                            variant={
                                                                match.hiring_confidence === 'high' ? 'default' :
                                                                    match.hiring_confidence === 'medium' ? 'secondary' :
                                                                        'outline'
                                                            }
                                                            className={match.hiring_confidence === 'high' ? 'bg-green-500 mt-1' : 'mt-1'}
                                                        >
                                                            {match.hiring_confidence} confidence
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : jobMatchResults && jobMatchResults.matched_candidates.length === 0 ? (
                                <Card className="border-dashed">
                                    <CardContent className="flex flex-col items-center justify-center py-12">
                                        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                                        <p className="text-lg font-medium mb-2">No matching candidates</p>
                                        <p className="text-sm text-muted-foreground">
                                            Try adjusting the job requirements or upload more CVs
                                        </p>
                                    </CardContent>
                                </Card>
                            ) : null}
                        </ScrollArea>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Candidate Detail Modal */}
            <CandidateDetail
                candidate={selectedCandidate}
                open={detailOpen}
                onClose={() => setDetailOpen(false)}
                onEvaluationAdded={handleEvaluationAdded}
            />
        </div>
    );
}
