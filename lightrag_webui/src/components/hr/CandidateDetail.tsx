/**
 * CandidateDetail - Modal/Panel component for detailed candidate information
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { CandidateDetail as CandidateDetailType } from '@/api/hr';
import InterviewEvaluationForm from './InterviewEvaluationForm';
import {
    User, Mail, Phone, MapPin, Linkedin, Github,
    Briefcase, GraduationCap, Award, FolderKanban,
    Star, MessageSquarePlus
} from 'lucide-react';

interface CandidateDetailProps {
    candidate: CandidateDetailType | null;
    open: boolean;
    onClose: () => void;
    onEvaluationAdded?: () => void;
}

export default function CandidateDetail({
    candidate,
    open,
    onClose,
    onEvaluationAdded
}: CandidateDetailProps) {
    const [showEvaluationForm, setShowEvaluationForm] = useState(false);

    if (!candidate) return null;

    const personal = candidate.personal_info || {};
    const skills = candidate.skills || { technical: [], soft: [] };

    const handleEvaluationSuccess = () => {
        setShowEvaluationForm(false);
        onEvaluationAdded?.();
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-xl">
                        <User className="h-6 w-6" />
                        {personal.name || 'Unknown Candidate'}
                        {candidate.evaluations && candidate.evaluations.length > 0 && (
                            <Badge variant="default" className="bg-green-500">
                                <Star className="h-3 w-3 mr-1" />
                                {candidate.evaluations.length} Evaluation(s)
                            </Badge>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <ScrollArea className="max-h-[calc(90vh-120px)]">
                    {/* Contact Info */}
                    <div className="flex flex-wrap gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
                        {personal.email && (
                            <div className="flex items-center gap-2 text-sm">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <a href={`mailto:${personal.email}`} className="text-primary hover:underline">
                                    {personal.email}
                                </a>
                            </div>
                        )}
                        {personal.phone && (
                            <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                {personal.phone}
                            </div>
                        )}
                        {personal.location && (
                            <div className="flex items-center gap-2 text-sm">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                {personal.location}
                            </div>
                        )}
                        {personal.linkedin && (
                            <a href={personal.linkedin} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-primary hover:underline">
                                <Linkedin className="h-4 w-4" />
                                LinkedIn
                            </a>
                        )}
                        {personal.github && (
                            <a href={personal.github} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-primary hover:underline">
                                <Github className="h-4 w-4" />
                                GitHub
                            </a>
                        )}
                    </div>

                    {/* Summary */}
                    {candidate.summary && (
                        <div className="mb-6">
                            <h3 className="font-semibold mb-2">Summary</h3>
                            <p className="text-sm text-muted-foreground">{candidate.summary}</p>
                        </div>
                    )}

                    <Tabs defaultValue="skills" className="w-full">
                        <TabsList className="grid w-full grid-cols-5">
                            <TabsTrigger value="skills">Skills</TabsTrigger>
                            <TabsTrigger value="experience">Experience</TabsTrigger>
                            <TabsTrigger value="education">Education</TabsTrigger>
                            <TabsTrigger value="certifications">Certs</TabsTrigger>
                            <TabsTrigger value="evaluations">Evaluations</TabsTrigger>
                        </TabsList>

                        {/* Skills Tab */}
                        <TabsContent value="skills" className="space-y-4 pt-4">
                            <div>
                                <h4 className="font-medium mb-2">Technical Skills</h4>
                                <div className="flex flex-wrap gap-2">
                                    {skills.technical?.map((skill, i) => (
                                        <Badge key={i} variant="default">{skill}</Badge>
                                    ))}
                                    {(!skills.technical || skills.technical.length === 0) && (
                                        <span className="text-sm text-muted-foreground">No technical skills listed</span>
                                    )}
                                </div>
                            </div>
                            <div>
                                <h4 className="font-medium mb-2">Soft Skills</h4>
                                <div className="flex flex-wrap gap-2">
                                    {skills.soft?.map((skill, i) => (
                                        <Badge key={i} variant="secondary">{skill}</Badge>
                                    ))}
                                    {(!skills.soft || skills.soft.length === 0) && (
                                        <span className="text-sm text-muted-foreground">No soft skills listed</span>
                                    )}
                                </div>
                            </div>
                            {skills.languages && skills.languages.length > 0 && (
                                <div>
                                    <h4 className="font-medium mb-2">Languages</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {skills.languages.map((lang, i) => (
                                            <Badge key={i} variant="outline">{lang}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        {/* Experience Tab */}
                        <TabsContent value="experience" className="space-y-4 pt-4">
                            {candidate.experience?.map((exp, i) => (
                                <div key={i} className="p-4 border rounded-lg">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h4 className="font-medium flex items-center gap-2">
                                                <Briefcase className="h-4 w-4" />
                                                {exp.role}
                                            </h4>
                                            <p className="text-sm text-muted-foreground">{exp.company}</p>
                                        </div>
                                        <Badge variant="outline">{exp.duration}</Badge>
                                    </div>
                                    {exp.responsibilities && exp.responsibilities.length > 0 && (
                                        <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                                            {exp.responsibilities.map((r, j) => (
                                                <li key={j}>{r}</li>
                                            ))}
                                        </ul>
                                    )}
                                    {exp.achievements && exp.achievements.length > 0 && (
                                        <div className="mt-2">
                                            <p className="text-sm font-medium text-green-600">Achievements:</p>
                                            <ul className="list-disc list-inside text-sm">
                                                {exp.achievements.map((a, j) => (
                                                    <li key={j}>{a}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {(!candidate.experience || candidate.experience.length === 0) && (
                                <p className="text-sm text-muted-foreground">No experience listed</p>
                            )}
                        </TabsContent>

                        {/* Education Tab */}
                        <TabsContent value="education" className="space-y-4 pt-4">
                            {candidate.education?.map((edu, i) => (
                                <div key={i} className="p-4 border rounded-lg flex items-start gap-4">
                                    <GraduationCap className="h-5 w-5 text-muted-foreground mt-1" />
                                    <div>
                                        <h4 className="font-medium">{edu.degree} in {edu.field}</h4>
                                        <p className="text-sm text-muted-foreground">{edu.institution}</p>
                                        <p className="text-sm text-muted-foreground">{edu.graduation_year}</p>
                                    </div>
                                </div>
                            ))}
                            {(!candidate.education || candidate.education.length === 0) && (
                                <p className="text-sm text-muted-foreground">No education listed</p>
                            )}
                        </TabsContent>

                        {/* Certifications Tab */}
                        <TabsContent value="certifications" className="space-y-4 pt-4">
                            {candidate.certifications?.map((cert, i) => (
                                <div key={i} className="p-4 border rounded-lg flex items-start gap-4">
                                    <Award className="h-5 w-5 text-muted-foreground mt-1" />
                                    <div>
                                        <h4 className="font-medium">{cert.name}</h4>
                                        <p className="text-sm text-muted-foreground">{cert.issuer}</p>
                                        {cert.year && <p className="text-sm text-muted-foreground">{cert.year}</p>}
                                    </div>
                                </div>
                            ))}
                            {(!candidate.certifications || candidate.certifications.length === 0) && (
                                <p className="text-sm text-muted-foreground">No certifications listed</p>
                            )}
                        </TabsContent>

                        {/* Evaluations Tab */}
                        <TabsContent value="evaluations" className="space-y-4 pt-4">
                            <div className="flex justify-between items-center mb-4">
                                <h4 className="font-medium">Interview Evaluations</h4>
                                <Button
                                    size="sm"
                                    onClick={() => setShowEvaluationForm(true)}
                                    className="gap-2"
                                >
                                    <MessageSquarePlus className="h-4 w-4" />
                                    Add Evaluation
                                </Button>
                            </div>

                            {showEvaluationForm && (
                                <InterviewEvaluationForm
                                    candidateId={candidate._id}
                                    onSuccess={handleEvaluationSuccess}
                                    onCancel={() => setShowEvaluationForm(false)}
                                />
                            )}

                            {candidate._evaluations_detail?.map((eval_, i) => (
                                <div key={i} className="p-4 border rounded-lg space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            {eval_.interviewer?.name && (
                                                <p className="font-medium">{eval_.interviewer.name}</p>
                                            )}
                                            {eval_.interviewer?.role && (
                                                <p className="text-sm text-muted-foreground">{eval_.interviewer.role}</p>
                                            )}
                                        </div>
                                        <Badge
                                            variant={
                                                eval_.overall_recommendation === 'strong_hire' ? 'default' :
                                                    eval_.overall_recommendation === 'hire' ? 'secondary' :
                                                        'destructive'
                                            }
                                            className={
                                                eval_.overall_recommendation === 'strong_hire' ? 'bg-green-500' :
                                                    eval_.overall_recommendation === 'hire' ? 'bg-blue-500' :
                                                        ''
                                            }
                                        >
                                            {eval_.overall_recommendation?.replace('_', ' ').toUpperCase()}
                                        </Badge>
                                    </div>

                                    {eval_.technical_assessment && (
                                        <div>
                                            <p className="text-sm font-medium">Technical: {eval_.technical_assessment.score}/10</p>
                                            {eval_.technical_assessment.notes && (
                                                <p className="text-sm text-muted-foreground">{eval_.technical_assessment.notes}</p>
                                            )}
                                        </div>
                                    )}

                                    {eval_.key_concerns && eval_.key_concerns.length > 0 && (
                                        <div>
                                            <p className="text-sm font-medium text-orange-500">Concerns:</p>
                                            <ul className="list-disc list-inside text-sm">
                                                {eval_.key_concerns.map((c, j) => (
                                                    <li key={j}>{c}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <p className="text-xs text-muted-foreground">
                                        {new Date(eval_._evaluated_at).toLocaleString('vi-VN')}
                                    </p>
                                </div>
                            ))}

                            {(!candidate._evaluations_detail || candidate._evaluations_detail.length === 0) && !showEvaluationForm && (
                                <p className="text-sm text-muted-foreground">No evaluations yet. Add one to improve candidate ranking!</p>
                            )}
                        </TabsContent>
                    </Tabs>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
