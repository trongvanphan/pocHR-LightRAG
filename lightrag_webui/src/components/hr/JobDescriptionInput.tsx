/**
 * JobDescriptionInput - Input component for job description with AI matching
 */

import { useState } from 'react';
import Button from '@/components/ui/Button';
import Textarea from '@/components/ui/Textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { matchJob, JobMatchResult } from '@/api/hr';
import { toast } from 'sonner';
import {
    Loader2, Wand2, FileText, Users, Trophy,
    AlertCircle, CheckCircle, XCircle
} from 'lucide-react';

interface JobDescriptionInputProps {
    onMatchResults: (results: JobMatchResult | null) => void;
}

const JOB_TEMPLATE = `Job Title: 

Department: 

Requirements:
- Years of experience: 
- Required skills: 
- Nice to have: 

Responsibilities:
- 

Benefits:
- `;

export default function JobDescriptionInput({ onMatchResults }: JobDescriptionInputProps) {
    const [jobDescription, setJobDescription] = useState('');
    const [isMatching, setIsMatching] = useState(false);
    const [matchResult, setMatchResult] = useState<JobMatchResult | null>(null);

    const handleMatch = async () => {
        if (!jobDescription.trim() || jobDescription.length < 50) {
            toast.error('Please enter a detailed job description (at least 50 characters)');
            return;
        }

        setIsMatching(true);
        try {
            const result = await matchJob(jobDescription, 15);
            setMatchResult(result);
            onMatchResults(result);
            toast.success(`Found ${result.matched_candidates.length} matching candidates`);
        } catch (error) {
            toast.error(`Matching failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setMatchResult(null);
            onMatchResults(null);
        } finally {
            setIsMatching(false);
        }
    };

    const handleClear = () => {
        setJobDescription('');
        setMatchResult(null);
        onMatchResults(null);
    };

    const useTemplate = () => {
        setJobDescription(JOB_TEMPLATE);
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Job Description
                    </CardTitle>
                    <CardDescription>
                        Enter the job description to find matching candidates.
                        The AI will analyze requirements and rank candidates based on skill match and interview evaluations.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2 mb-2">
                        <Button variant="outline" size="sm" onClick={useTemplate}>
                            Use Template
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleClear}>
                            Clear
                        </Button>
                    </div>

                    <Textarea
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        placeholder="Paste the job description here..."
                        className="min-h-[200px]"
                    />

                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                            {jobDescription.length} characters
                        </span>
                        <Button
                            onClick={handleMatch}
                            disabled={isMatching || jobDescription.length < 50}
                            size="lg"
                        >
                            {isMatching ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Wand2 className="h-4 w-4 mr-2" />
                                    Find Matching Candidates
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Match Summary */}
            {matchResult && (
                <Card className="border-primary/30">
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-amber-500" />
                                Match Results: {matchResult.job_title || 'Position'}
                            </div>
                            <Badge variant="outline">
                                <Users className="h-3 w-3 mr-1" />
                                {matchResult.matched_candidates.length} / {matchResult.total_candidates}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Required Skills Summary */}
                        <div className="space-y-2 mb-4">
                            <div>
                                <span className="text-sm font-medium">Must Have:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {matchResult.required_skills?.must_have?.map((skill, i) => (
                                        <Badge key={i} variant="default">{skill}</Badge>
                                    ))}
                                    {(!matchResult.required_skills?.must_have || matchResult.required_skills.must_have.length === 0) && (
                                        <span className="text-sm text-muted-foreground">None specified</span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <span className="text-sm font-medium">Nice to Have:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {matchResult.required_skills?.nice_to_have?.map((skill, i) => (
                                        <Badge key={i} variant="secondary">{skill}</Badge>
                                    ))}
                                    {(!matchResult.required_skills?.nice_to_have || matchResult.required_skills.nice_to_have.length === 0) && (
                                        <span className="text-sm text-muted-foreground">None specified</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="flex gap-4 text-sm text-muted-foreground border-t pt-3">
                            <span className="flex items-center gap-1">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                Strong Match ≥80
                            </span>
                            <span className="flex items-center gap-1">
                                <AlertCircle className="h-4 w-4 text-amber-500" />
                                Good Match 60-79
                            </span>
                            <span className="flex items-center gap-1">
                                <XCircle className="h-4 w-4 text-red-500" />
                                Partial Match &lt;60
                            </span>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
