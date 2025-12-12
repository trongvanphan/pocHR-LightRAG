/**
 * HR API Client - Frontend API calls for HR CV Management
 */

import { backendBaseUrl } from '@/lib/constants';

const HR_API_PREFIX = '/hr';

export interface CandidateSummary {
    id: string;
    name: string;
    email?: string;
    skills_count: number;
    experience_count: number;
    has_evaluation: boolean;
    extracted_at: string;
}

export interface CandidateDetail {
    _id: string;
    personal_info: {
        name: string;
        email?: string;
        phone?: string;
        location?: string;
        linkedin?: string;
        github?: string;
    };
    summary?: string;
    skills: {
        technical: string[];
        soft: string[];
        languages?: string[];
    };
    experience: Array<{
        company: string;
        role: string;
        duration: string;
        responsibilities: string[];
        achievements?: string[];
    }>;
    education: Array<{
        institution: string;
        degree: string;
        field: string;
        graduation_year: string;
    }>;
    certifications: Array<{
        name: string;
        issuer: string;
        year?: string;
    }>;
    projects?: Array<{
        name: string;
        description: string;
        technologies: string[];
    }>;
    evaluations?: Array<{
        evaluation_id: string;
        overall_recommendation: string;
        weighted_score: number;
        evaluated_at: string;
    }>;
    _evaluations_detail?: EvaluationDetail[];
}

export interface EvaluationDetail {
    _id: string;
    interviewer?: {
        name?: string;
        role?: string;
    };
    technical_assessment?: {
        score: number;
        strengths: string[];
        weaknesses: string[];
        notes?: string;
    };
    soft_skills_assessment?: {
        communication?: number;
        teamwork?: number;
        problem_solving?: number;
        leadership?: number;
        adaptability?: number;
        notes?: string;
    };
    cultural_fit?: {
        score: number;
        notes?: string;
    };
    overall_recommendation: string;
    recommended_level?: string;
    key_concerns?: string[];
    _evaluated_at: string;
}

export interface SkillSearchResult {
    candidate_id: string;
    name: string;
    matched_skill: string;
    all_skills: string[];
    score: number;
    has_evaluation: boolean;
    latest_experience?: string;
}

export interface JobMatchResult {
    job_title: string;
    job_level?: string;
    required_skills: {
        must_have: string[];
        nice_to_have: string[];
    };
    matched_candidates: Array<{
        candidate_id: string;
        name: string;
        match_score: number;
        recommendation: string;
        hiring_confidence: string;
        strengths: string[];
        risks: string[];
        has_evaluation: boolean;
    }>;
    total_candidates: number;
}

// Helper function for authenticated requests
async function hrFetch<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${backendBaseUrl}${HR_API_PREFIX}${endpoint}`;
    const headers: HeadersInit = {
        ...options.headers,
        'Content-Type': 'application/json',
    };

    // Add auth token if available
    const token = localStorage.getItem('LIGHTRAG-API-TOKEN');
    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
}

/**
 * Upload a CV file and extract candidate information
 */
export async function uploadCV(file: File): Promise<{
    status: string;
    candidate_id: string;
    name: string;
    markdown_length: number;
    message: string;
}> {
    const formData = new FormData();
    formData.append('file', file);

    const url = `${backendBaseUrl}${HR_API_PREFIX}/candidates/upload`;
    const headers: HeadersInit = {};

    const token = localStorage.getItem('LIGHTRAG-API-TOKEN');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(error.detail || `HTTP ${response.status}`);
    }

    return response.json();
}

/**
 * Get list of all candidates
 */
export async function listCandidates(): Promise<{
    total: number;
    candidates: CandidateSummary[];
}> {
    return hrFetch('/candidates');
}

/**
 * Get detailed information for a specific candidate
 */
export async function getCandidate(candidateId: string): Promise<CandidateDetail> {
    return hrFetch(`/candidates/${candidateId}`);
}

/**
 * Add interview evaluation for a candidate
 */
export async function addEvaluation(
    candidateId: string,
    evaluationContent: string
): Promise<{
    status: string;
    evaluation_id: string;
    recommendation: string;
    weighted_score: number;
    message: string;
}> {
    return hrFetch(`/candidates/${candidateId}/evaluation`, {
        method: 'POST',
        body: JSON.stringify({ evaluation_content: evaluationContent }),
    });
}

/**
 * Search candidates by skill
 */
export async function searchBySkill(
    skill: string,
    topK: number = 10
): Promise<{
    skill: string;
    total_matches: number;
    candidates: SkillSearchResult[];
}> {
    const params = new URLSearchParams({
        skill,
        top_k: topK.toString(),
    });
    return hrFetch(`/skills/search?${params}`);
}

/**
 * Match candidates to a job description
 */
export async function matchJob(
    jobDescription: string,
    topK: number = 10
): Promise<JobMatchResult> {
    return hrFetch('/jobs/match', {
        method: 'POST',
        body: JSON.stringify({
            job_description: jobDescription,
            top_k: topK,
        }),
    });
}

/**
 * Get list of all skills
 */
export async function listSkills(): Promise<{
    total: number;
    skills: string[];
}> {
    return hrFetch('/skills');
}
