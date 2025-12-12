/**
 * CandidateCard - Summary card component for displaying candidate info
 */

import Badge from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { CandidateSummary } from '@/api/hr';
import { User, Mail, Briefcase, Star, Calendar } from 'lucide-react';

interface CandidateCardProps {
    candidate: CandidateSummary;
    onViewDetails: (candidateId: string) => void;
    isSelected?: boolean;
}

export default function CandidateCard({
    candidate,
    onViewDetails,
    isSelected = false
}: CandidateCardProps) {
    const formattedDate = candidate.extracted_at
        ? new Date(candidate.extracted_at).toLocaleDateString('vi-VN')
        : 'N/A';

    return (
        <Card
            className={`cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 ${isSelected ? 'border-primary shadow-md' : ''
                }`}
            onClick={() => onViewDetails(candidate.id)}
        >
            <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-5 w-5 text-muted-foreground" />
                        {candidate.name || 'Unknown'}
                    </CardTitle>
                    {candidate.has_evaluation && (
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                            <Star className="h-3 w-3 mr-1" />
                            Evaluated
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {candidate.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{candidate.email}</span>
                    </div>
                )}

                <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                        <Briefcase className="h-3 w-3 mr-1" />
                        {candidate.experience_count} exp
                    </Badge>
                    <Badge variant="outline">
                        {candidate.skills_count} skills
                    </Badge>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formattedDate}
                    </span>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                            e.stopPropagation();
                            onViewDetails(candidate.id);
                        }}
                    >
                        View Details
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
