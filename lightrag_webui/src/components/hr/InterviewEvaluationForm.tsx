/**
 * InterviewEvaluationForm - Form for adding senior interview evaluations
 */

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { addEvaluation } from '@/api/hr';
import { toast } from 'sonner';
import { Loader2, Send, X, AlertTriangle } from 'lucide-react';

interface InterviewEvaluationFormProps {
    candidateId: string;
    onSuccess: () => void;
    onCancel: () => void;
}

const EVALUATION_TEMPLATE = `Interviewer: [Your Name], [Your Role]

Technical Assessment:
- Problem-solving: [score/10]
- Technical knowledge: [score/10]
- System design: [score/10]
- Notes: [observations]

Soft Skills Assessment:
- Communication: [score/10]
- Teamwork: [score/10]
- Leadership: [score/10]
- Notes: [observations]

Cultural Fit: [score/10]
Notes: [observations]

Overall Recommendation: [strong_hire / hire / weak_hire / no_hire]
Recommended Level: [Junior / Mid / Senior / Lead]

Key Strengths:
- 

Key Concerns:
- 

Follow-up Actions:
- `;

export default function InterviewEvaluationForm({
    candidateId,
    onSuccess,
    onCancel,
}: InterviewEvaluationFormProps) {
    const [content, setContent] = useState(EVALUATION_TEMPLATE);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!content.trim() || content === EVALUATION_TEMPLATE) {
            toast.error('Please fill in the evaluation form');
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await addEvaluation(candidateId, content);
            toast.success(`Evaluation added: ${result.recommendation}`);
            onSuccess();
        } catch (error) {
            toast.error(`Failed to add evaluation: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="border-2 border-primary/20">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Add Interview Evaluation
                </CardTitle>
                <CardDescription>
                    Interview evaluations have <strong className="text-primary">2.5x weight</strong> compared to CV data.
                    This significantly impacts candidate ranking.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Enter interview evaluation..."
                    className="min-h-[300px] font-mono text-sm"
                />

                <div className="flex justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={onCancel}
                        disabled={isSubmitting}
                    >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4 mr-2" />
                        )}
                        Submit Evaluation
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
