"""
HR-specific prompts for CV extraction, interview evaluation, and job matching.
These prompts are designed to work with both Vietnamese and English CVs.
"""

# CV/Resume Extraction Prompt
CV_EXTRACTION_PROMPT = '''You are an HR assistant specialized in extracting structured information from resumes/CVs.
Extract the following information from the CV content provided. Support both Vietnamese and English.

IMPORTANT NORMALIZATION RULES:
1. ALL SKILLS must be in LOWERCASE (e.g., "python", ".net core", "react", "typescript")
   This ensures proper linking in Knowledge Graph.
2. Keep proper names (candidate names, company names, institutions) with normal capitalization.
3. Normalize common variations: ".NET Core" → "dotnet core", "C#" → "csharp", "Node.JS" → "nodejs"

Output MUST be valid JSON with this exact structure:
{{
    "personal_info": {{
        "name": "Full name (capitalize properly)",
        "email": "Email address or null",
        "phone": "Phone number or null",
        "location": "City/Country or null",
        "linkedin": "LinkedIn URL or null",
        "github": "GitHub URL or null"
    }},
    "summary": "Brief professional summary if available",
    "skills": {{
        "technical": ["lowercase skill1", "lowercase skill2"],
        "soft": ["lowercase soft skill1", "lowercase soft skill2"],
        "languages": ["List of spoken languages with proficiency"]
    }},
    "experience": [
        {{
            "company": "Company Name (capitalize properly)",
            "role": "Job title",
            "duration": "Start - End dates",
            "responsibilities": ["Key responsibilities"],
            "achievements": ["Quantifiable achievements if any"]
        }}
    ],
    "education": [
        {{
            "institution": "School/University Name (capitalize properly)",
            "degree": "Degree type",
            "field": "Field of study",
            "graduation_year": "Year or expected year"
        }}
    ],
    "certifications": [
        {{
            "name": "Certification name",
            "issuer": "Issuing organization",
            "year": "Year obtained",
            "expiry": "Expiry date if applicable"
        }}
    ],
    "projects": [
        {{
            "name": "Project name",
            "description": "Brief description",
            "technologies": ["lowercase tech1", "lowercase tech2"]
        }}
    ]
}}

CV Content:
{cv_content}

Extract and return ONLY the JSON object, no additional text.'''

# Interview Evaluation Prompt
INTERVIEW_EVALUATION_PROMPT = '''You are an HR assistant processing senior interview evaluations.
Parse the interview feedback and extract structured assessment data.

The evaluation has HIGHER WEIGHT (2.5x) than information extracted from CV.
This means interview assessments override CV claims when there's a conflict.

Output MUST be valid JSON with this exact structure:
{{
    "interviewer": {{
        "name": "Interviewer name if provided",
        "role": "Interviewer role/position"
    }},
    "technical_assessment": {{
        "score": 7,  // 1-10 scale
        "strengths": ["Technical strengths observed"],
        "weaknesses": ["Areas for improvement"],
        "notes": "Additional technical notes"
    }},
    "soft_skills_assessment": {{
        "communication": 8,  // 1-10
        "teamwork": 7,
        "problem_solving": 8,
        "leadership": 6,
        "adaptability": 7,
        "notes": "Soft skills observations"
    }},
    "cultural_fit": {{
        "score": 8,  // 1-10
        "notes": "Cultural fit assessment"
    }},
    "overall_recommendation": "strong_hire",  // strong_hire, hire, weak_hire, no_hire
    "recommended_level": "Senior",  // Junior, Mid, Senior, Lead, etc.
    "salary_range_suggestion": "Suggested salary range if discussed",
    "key_concerns": ["Any red flags or concerns"],
    "follow_up_actions": ["Recommended next steps"]
}}

Interview Feedback:
{evaluation_content}

Extract and return ONLY the JSON object, no additional text.'''

# Job Description Analysis Prompt
JOB_ANALYSIS_PROMPT = '''You are an HR assistant analyzing job descriptions to extract requirements.
Extract structured requirements that can be matched against candidate profiles.

Output MUST be valid JSON with this exact structure:
{{
    "job_title": "Position title",
    "department": "Department if specified",
    "level": "Junior/Mid/Senior/Lead/Manager",
    "required_skills": {{
        "must_have": ["Essential skills - deal breakers if missing"],
        "nice_to_have": ["Preferred but not required skills"]
    }},
    "experience": {{
        "min_years": 3,
        "max_years": 7,  // null if no upper limit
        "required_domains": ["Specific industry/domain experience needed"]
    }},
    "education": {{
        "min_level": "Bachelor's/Master's/etc",
        "preferred_fields": ["Relevant fields of study"]
    }},
    "certifications": ["Required or preferred certifications"],
    "responsibilities": ["Key job responsibilities"],
    "benefits": ["Listed benefits if any"],
    "culture_keywords": ["Keywords indicating company culture"]
}}

Job Description:
{job_content}

Extract and return ONLY the JSON object, no additional text.'''

# Candidate-Job Matching Prompt
CANDIDATE_MATCHING_PROMPT = '''You are an HR assistant evaluating candidate-job fit.
Compare the candidate profile with job requirements and provide a detailed match analysis.

IMPORTANT: Interview evaluations have 2.5x weight compared to CV-extracted information.
If interview data is available, prioritize it over CV claims.

Output MUST be valid JSON with this exact structure:
{{
    "match_score": 85,  // 0-100 overall fit score
    "skill_match": {{
        "score": 80,
        "matched_must_have": ["Skills that match required"],
        "missing_must_have": ["Required skills not found"],
        "matched_nice_to_have": ["Bonus skills matched"],
        "extra_relevant": ["Additional skills that add value"]
    }},
    "experience_match": {{
        "score": 90,
        "years_relevant": 5,
        "domain_match": ["Matching domain experience"],
        "gaps": ["Experience gaps if any"]
    }},
    "education_match": {{
        "score": 85,
        "meets_minimum": true,
        "relevant_degree": true,
        "notes": "Education fit notes"
    }},
    "interview_assessment": {{
        "weighted_score": 88,  // Only if interview data available
        "technical_validated": true,
        "soft_skills_validated": true,
        "concerns_addressed": ["How interview addressed any concerns"]
    }},
    "overall_recommendation": "strong_match",  // strong_match, good_match, partial_match, weak_match
    "hiring_confidence": "high",  // high, medium, low
    "strengths": ["Top reasons to hire"],
    "risks": ["Potential concerns"],
    "suggested_salary_range": "Based on experience and market",
    "interview_focus_areas": ["What to explore in next interview round"]
}}

Candidate Profile:
{candidate_profile}

Job Requirements:
{job_requirements}

Interview Data (if available):
{interview_data}

Analyze and return ONLY the JSON object, no additional text.'''

# Skill Search Enhancement Prompt
SKILL_SEARCH_PROMPT = '''Given the skill search query: "{query}"

Identify related skills and synonyms to expand the search:
1. Direct matches
2. Related technologies/skills
3. Common abbreviations
4. Vietnamese equivalents if applicable
5. Parent/child skill relationships

Return a JSON array of search terms:
["skill1", "skill2", "related_skill", ...]'''
