"""
HR API Routes - FastAPI router for HR CV Management operations.
"""

import os
import tempfile
import shutil
from pathlib import Path
from typing import Optional, List

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Query, Depends
from pydantic import BaseModel, Field

from lightrag.utils import logger
from lightrag.api.utils_api import get_combined_auth_dependency


router = APIRouter(
    prefix="/hr",
    tags=["hr"],
)


# ============ Request/Response Models ============

class CandidateUploadResponse(BaseModel):
    """Response after uploading and parsing a CV."""
    status: str
    candidate_id: str
    name: str
    markdown_length: int
    message: str

    class Config:
        json_schema_extra = {
            "example": {
                "status": "success",
                "candidate_id": "abc12345",
                "name": "Nguyen Van A",
                "markdown_length": 2500,
                "message": "CV uploaded and extracted successfully",
            }
        }


class EvaluationRequest(BaseModel):
    """Request to add an interview evaluation."""
    evaluation_content: str = Field(
        ...,
        min_length=10,
        description="Interview evaluation notes/feedback from senior interviewer",
    )

    class Config:
        json_schema_extra = {
            "example": {
                "evaluation_content": """
                Interviewer: John Doe, Senior Engineer
                
                Technical Assessment:
                - Strong problem-solving skills, solved the coding challenge efficiently
                - Good understanding of system design principles
                - Score: 8/10
                
                Soft Skills:
                - Communication: Clear and concise
                - Teamwork: Collaborative attitude
                
                Overall: Strong hire recommendation
                """
            }
        }


class SkillSearchRequest(BaseModel):
    """Request for skill-based candidate search."""
    skill: str = Field(..., min_length=1, description="Skill to search for")
    top_k: int = Field(default=10, ge=1, le=50, description="Number of results")


class JobMatchRequest(BaseModel):
    """Request for matching candidates to a job."""
    job_description: str = Field(
        ...,
        min_length=50,
        description="Full job description text",
    )
    top_k: int = Field(default=10, ge=1, le=50, description="Number of candidates")

    class Config:
        json_schema_extra = {
            "example": {
                "job_description": """
                Senior Python Developer
                
                Requirements:
                - 5+ years of Python experience
                - Strong knowledge of FastAPI or Django
                - Experience with PostgreSQL and Redis
                - Familiarity with Docker and Kubernetes
                
                Nice to have:
                - Experience with AI/ML
                - Knowledge of LLMs and RAG systems
                """,
                "top_k": 10,
            }
        }


# ============ Helper Functions ============

def get_hr_service(rag):
    """Create or get HR service instance."""
    from lightrag.hr_service import HRService

    if not hasattr(rag, "_hr_service"):
        working_dir = getattr(rag, "working_dir", os.getcwd())
        rag._hr_service = HRService(rag, working_dir)
    return rag._hr_service


# ============ Factory Function ============

def create_hr_routes(rag, api_key: Optional[str] = None):
    """
    Create HR routes with the given RAG instance.

    Args:
        rag: LightRAG instance
        api_key: Optional API key for authentication
    """
    auth = get_combined_auth_dependency(api_key)

    @router.post(
        "/candidates/upload",
        response_model=CandidateUploadResponse,
        summary="Upload and process CV",
        description="Upload a CV (PDF/DOCX) file, parse it with MarkItDown, and extract candidate information.",
    )
    async def upload_cv(
        file: UploadFile = File(..., description="CV file (PDF, DOCX)"),
        _=Depends(auth),
    ):
        """
        Upload CV file and extract candidate information.

        - Accepts PDF, DOCX, DOC files
        - Uses Microsoft MarkItDown for parsing
        - Extracts structured info using LLM
        - Indexes to Knowledge Graph
        """
        # Validate file type
        allowed_extensions = {".pdf", ".docx", ".doc"}
        file_ext = Path(file.filename).suffix.lower()

        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file_ext}. Allowed: {allowed_extensions}",
            )

        hr_service = get_hr_service(rag)

        # Save uploaded file temporarily
        temp_dir = tempfile.mkdtemp()
        temp_file = Path(temp_dir) / file.filename

        try:
            # Write uploaded content
            content = await file.read()
            temp_file.write_bytes(content)

            # Parse CV to markdown
            markdown_content, metadata = await hr_service.parse_cv_to_markdown(
                str(temp_file)
            )

            # Extract candidate info
            candidate_data = await hr_service.extract_candidate_info(
                markdown_content, source_file=file.filename
            )

            return CandidateUploadResponse(
                status="success",
                candidate_id=candidate_data.get("_id", "unknown"),
                name=candidate_data.get("personal_info", {}).get("name", "Unknown"),
                markdown_length=len(markdown_content),
                message="CV uploaded and extracted successfully",
            )

        except Exception as e:
            logger.error(f"Error processing CV upload: {e}")
            raise HTTPException(status_code=500, detail=str(e))

        finally:
            # Cleanup temp file
            shutil.rmtree(temp_dir, ignore_errors=True)

    @router.get(
        "/candidates",
        summary="List all candidates",
        description="Get list of all extracted candidates.",
    )
    async def list_candidates(_=Depends(auth)):
        """Get all candidates from local storage."""
        hr_service = get_hr_service(rag)
        candidates = await hr_service.get_all_candidates()

        # Return summary list
        return {
            "total": len(candidates),
            "candidates": [
                {
                    "id": c.get("_id"),
                    "name": c.get("personal_info", {}).get("name"),
                    "email": c.get("personal_info", {}).get("email"),
                    "skills_count": len(c.get("skills", {}).get("technical", []))
                    + len(c.get("skills", {}).get("soft", [])),
                    "experience_count": len(c.get("experience", [])),
                    "has_evaluation": bool(c.get("evaluations")),
                    "extracted_at": c.get("_extracted_at"),
                }
                for c in candidates
            ],
        }

    @router.get(
        "/candidates/{candidate_id}",
        summary="Get candidate details",
        description="Get full details of a specific candidate including evaluations.",
    )
    async def get_candidate(candidate_id: str, _=Depends(auth)):
        """Get detailed candidate information."""
        hr_service = get_hr_service(rag)
        candidate = await hr_service.get_candidate(candidate_id)

        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")

        return candidate

    @router.post(
        "/candidates/{candidate_id}/evaluation",
        summary="Add interview evaluation",
        description="Add senior interview evaluation for a candidate. Evaluations have 2.5x weight.",
    )
    async def add_evaluation(
        candidate_id: str,
        request: EvaluationRequest,
        _=Depends(auth),
    ):
        """
        Add interview evaluation for a candidate.

        Evaluations from senior interviewers have 2.5x weight compared to CV data.
        This means interview assessments override CV claims when there's a conflict.
        """
        hr_service = get_hr_service(rag)

        try:
            evaluation = await hr_service.add_interview_evaluation(
                candidate_id, request.evaluation_content
            )
            return {
                "status": "success",
                "evaluation_id": evaluation.get("_id"),
                "recommendation": evaluation.get("overall_recommendation"),
                "weighted_score": hr_service._calculate_weighted_score(evaluation),
                "message": "Interview evaluation added successfully",
            }
        except ValueError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except Exception as e:
            logger.error(f"Error adding evaluation: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @router.get(
        "/skills/search",
        summary="Search candidates by skill",
        description="Search for candidates with a specific skill using hybrid search (Knowledge Graph + Vector).",
    )
    async def search_by_skill(
        skill: str = Query(..., min_length=1, description="Skill to search for"),
        top_k: int = Query(10, ge=1, le=50, description="Number of results"),
        _=Depends(auth),
    ):
        """
        Search candidates by skill.

        Uses hybrid search combining:
        - Knowledge Graph search for entity relationships
        - Vector similarity for semantic matching
        - Weighted scoring based on interview evaluations
        """
        hr_service = get_hr_service(rag)
        candidates = await hr_service.search_by_skill(skill, top_k)

        return {
            "skill": skill,
            "total_matches": len(candidates),
            "candidates": candidates,
        }

    @router.post(
        "/jobs/match",
        summary="Match candidates to job",
        description="Analyze job description and find matching candidates with ranking.",
    )
    async def match_job(request: JobMatchRequest, _=Depends(auth)):
        """
        Match candidates to a job description.

        - Analyzes job requirements
        - Compares with candidate profiles
        - Weights interview evaluations 2.5x higher than CV data
        - Returns ranked list of candidates
        """
        hr_service = get_hr_service(rag)

        try:
            result = await hr_service.match_job(
                request.job_description, request.top_k
            )
            return result
        except Exception as e:
            logger.error(f"Error matching job: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @router.get(
        "/skills",
        summary="List all skills",
        description="Get list of all unique skills from all candidates.",
    )
    async def list_skills(_=Depends(auth)):
        """Get all unique skills from knowledge base."""
        hr_service = get_hr_service(rag)
        skills = await hr_service.get_all_skills()

        return {
            "total": len(skills),
            "skills": skills,
        }

    return router
