"""
HR Service Layer - Core business logic for HR CV Management.
Handles CV parsing, extraction, evaluation, and candidate matching.
"""

import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional, Any
import hashlib

from markitdown import MarkItDown

from lightrag.utils import logger
from lightrag.hr_prompts import (
    CV_EXTRACTION_PROMPT,
    INTERVIEW_EVALUATION_PROMPT,
    JOB_ANALYSIS_PROMPT,
    CANDIDATE_MATCHING_PROMPT,
    SKILL_SEARCH_PROMPT,
)


class HRService:
    """
    Service layer for HR operations.
    Handles CV parsing, candidate extraction, evaluations, and job matching.
    """

    # Weight for interview evaluations vs CV data
    INTERVIEW_WEIGHT = 2.5
    CV_WEIGHT = 1.0

    def __init__(self, rag_instance, working_dir: str = None):
        """
        Initialize HR Service.

        Args:
            rag_instance: LightRAG instance for knowledge graph operations
            working_dir: Directory for storing HR data
        """
        self.rag = rag_instance
        self.md_converter = MarkItDown()
        self.working_dir = Path(working_dir or os.getcwd()) / "hr_data"
        self.working_dir.mkdir(parents=True, exist_ok=True)

        # Initialize storage paths
        self.candidates_dir = self.working_dir / "candidates"
        self.candidates_dir.mkdir(exist_ok=True)

        self.evaluations_dir = self.working_dir / "evaluations"
        self.evaluations_dir.mkdir(exist_ok=True)

        self.cv_cache_dir = self.working_dir / "cv_cache"
        self.cv_cache_dir.mkdir(exist_ok=True)

        logger.info(f"HR Service initialized with working dir: {self.working_dir}")

    async def parse_cv_to_markdown(self, file_path: str) -> tuple[str, dict]:
        """
        Parse CV file (PDF/DOCX) to markdown using Microsoft MarkItDown.

        Args:
            file_path: Path to the CV file

        Returns:
            Tuple of (markdown_content, metadata)
        """
        try:
            file_path = Path(file_path)
            if not file_path.exists():
                raise FileNotFoundError(f"CV file not found: {file_path}")

            # Convert to markdown
            result = self.md_converter.convert(str(file_path))

            metadata = {
                "original_file": file_path.name,
                "file_type": file_path.suffix.lower(),
                "parsed_at": datetime.now().isoformat(),
                "content_length": len(result.text_content),
            }

            # Cache the markdown
            cache_id = hashlib.md5(file_path.name.encode()).hexdigest()[:12]
            cache_file = self.cv_cache_dir / f"{cache_id}.md"
            cache_file.write_text(result.text_content, encoding="utf-8")
            metadata["cache_file"] = str(cache_file)

            logger.info(f"Parsed CV: {file_path.name} -> {len(result.text_content)} chars")
            return result.text_content, metadata

        except Exception as e:
            logger.error(f"Error parsing CV {file_path}: {e}")
            raise

    async def extract_candidate_info(
        self, markdown_content: str, source_file: str = None
    ) -> dict:
        """
        Extract structured candidate information from CV markdown using LLM.

        Args:
            markdown_content: CV content in markdown format
            source_file: Original file name for reference

        Returns:
            Structured candidate information dict
        """
        try:
            # Prepare prompt
            prompt = CV_EXTRACTION_PROMPT.format(cv_content=markdown_content)

            # Call LLM through RAG instance
            response = await self.rag.llm_model_func(
                prompt,
                system_prompt="You are an expert HR assistant that extracts structured information from CVs. Always return valid JSON.",
            )

            # Parse JSON response
            candidate_data = self._parse_json_response(response)

            # Normalize skills to lowercase for consistent KG linking
            candidate_data = self._normalize_skills(candidate_data)

            # Generate candidate ID
            candidate_id = str(uuid.uuid4())[:8]
            name = candidate_data.get("personal_info", {}).get("name", "Unknown")
            candidate_data["_id"] = candidate_id
            candidate_data["_source_file"] = source_file
            candidate_data["_extracted_at"] = datetime.now().isoformat()
            candidate_data["_data_source"] = "cv"
            candidate_data["_weight"] = self.CV_WEIGHT

            # Save candidate data
            candidate_file = self.candidates_dir / f"{candidate_id}.json"
            candidate_file.write_text(
                json.dumps(candidate_data, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )

            # Index in Knowledge Graph
            await self._index_candidate_to_kg(candidate_data)

            logger.info(f"Extracted candidate: {name} (ID: {candidate_id})")
            return candidate_data

        except Exception as e:
            logger.error(f"Error extracting candidate info: {e}")
            raise

    def _normalize_skills(self, candidate_data: dict) -> dict:
        """
        Normalize skills to lowercase for consistent Knowledge Graph linking.
        
        Common variations like ".NET Core", ".net core", "DotNet Core" will all
        become "dotnet core" so they link to the same entity in KG.
        
        Args:
            candidate_data: Raw candidate data from LLM extraction
            
        Returns:
            Candidate data with normalized skills
        """
        # Mapping of common variations to normalized form
        skill_mappings = {
            ".net": "dotnet",
            ".net core": "dotnet core",
            ".net framework": "dotnet framework",
            "c#": "csharp",
            "c++": "cpp",
            "node.js": "nodejs",
            "react.js": "reactjs",
            "vue.js": "vuejs",
            "next.js": "nextjs",
            "express.js": "expressjs",
            "angular.js": "angularjs",
            "f#": "fsharp",
        }
        
        def normalize_skill(skill: str) -> str:
            if not skill:
                return skill
            # Convert to lowercase
            normalized = skill.lower().strip()
            # Apply specific mappings
            for old, new in skill_mappings.items():
                if normalized == old or normalized.startswith(old + " "):
                    normalized = normalized.replace(old, new)
            return normalized
        
        # Normalize technical skills
        skills = candidate_data.get("skills", {})
        if skills.get("technical"):
            skills["technical"] = [
                normalize_skill(s) for s in skills["technical"] if s
            ]
        
        # Normalize soft skills
        if skills.get("soft"):
            skills["soft"] = [
                normalize_skill(s) for s in skills["soft"] if s
            ]
        
        # Normalize project technologies
        projects = candidate_data.get("projects", [])
        for project in projects:
            if project.get("technologies"):
                project["technologies"] = [
                    normalize_skill(t) for t in project["technologies"] if t
                ]
        
        candidate_data["skills"] = skills
        candidate_data["projects"] = projects
        
        return candidate_data

    async def _index_candidate_to_kg(self, candidate_data: dict):
        """Index candidate data into Knowledge Graph with proper entities and relationships."""
        try:
            candidate_id = candidate_data.get("_id")
            name = candidate_data.get("personal_info", {}).get("name", "Unknown")

            # Build document for RAG indexing
            doc_parts = []

            # Personal info
            personal = candidate_data.get("personal_info", {})
            doc_parts.append(f"Candidate: {name}")
            if personal.get("email"):
                doc_parts.append(f"Email: {personal['email']}")
            if personal.get("location"):
                doc_parts.append(f"Location: {personal['location']}")

            # Summary
            if candidate_data.get("summary"):
                doc_parts.append(f"Summary: {candidate_data['summary']}")

            # Skills - filter None values
            skills = candidate_data.get("skills", {})
            tech_skills = [s for s in skills.get("technical", []) if s]
            soft_skills = [s for s in skills.get("soft", []) if s]
            if tech_skills:
                doc_parts.append(f"Technical Skills: {', '.join(tech_skills)}")
            if soft_skills:
                doc_parts.append(f"Soft Skills: {', '.join(soft_skills)}")

            # Experience
            for exp in candidate_data.get("experience", []):
                exp_text = f"Experience at {exp.get('company', 'Unknown')}: {exp.get('role', '')} ({exp.get('duration', '')})"
                doc_parts.append(exp_text)

            # Education
            for edu in candidate_data.get("education", []):
                edu_text = f"Education: {edu.get('degree', '')} in {edu.get('field', '')} from {edu.get('institution', '')}"
                doc_parts.append(edu_text)

            # Certifications
            for cert in candidate_data.get("certifications", []):
                cert_text = f"Certification: {cert.get('name', '')} by {cert.get('issuer', '')}"
                doc_parts.append(cert_text)

            # Insert into RAG
            document = "\n".join(doc_parts)
            await self.rag.ainsert(document)

            logger.debug(f"Indexed candidate {candidate_id} to Knowledge Graph")

        except Exception as e:
            logger.error(f"Error indexing candidate to KG: {e}")
            # Don't raise - indexing failure shouldn't block extraction

    async def add_interview_evaluation(
        self, candidate_id: str, evaluation_content: str
    ) -> dict:
        """
        Add senior interview evaluation for a candidate.
        Evaluations have 2.5x weight compared to CV data.

        Args:
            candidate_id: ID of the candidate
            evaluation_content: Raw evaluation text/notes

        Returns:
            Structured evaluation data
        """
        try:
            # Load existing candidate
            candidate_file = self.candidates_dir / f"{candidate_id}.json"
            if not candidate_file.exists():
                raise ValueError(f"Candidate not found: {candidate_id}")

            candidate_data = json.loads(candidate_file.read_text(encoding="utf-8"))

            # Extract structured evaluation using LLM
            prompt = INTERVIEW_EVALUATION_PROMPT.format(
                evaluation_content=evaluation_content
            )

            response = await self.rag.llm_model_func(
                prompt,
                system_prompt="You are an expert HR assistant parsing interview evaluations. Always return valid JSON.",
            )

            evaluation_data = self._parse_json_response(response)

            # Add metadata
            evaluation_id = str(uuid.uuid4())[:8]
            evaluation_data["_id"] = evaluation_id
            evaluation_data["_candidate_id"] = candidate_id
            evaluation_data["_evaluated_at"] = datetime.now().isoformat()
            evaluation_data["_weight"] = self.INTERVIEW_WEIGHT

            # Save evaluation
            eval_file = self.evaluations_dir / f"{candidate_id}_{evaluation_id}.json"
            eval_file.write_text(
                json.dumps(evaluation_data, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )

            # Update candidate with evaluation summary
            if "evaluations" not in candidate_data:
                candidate_data["evaluations"] = []
            candidate_data["evaluations"].append(
                {
                    "evaluation_id": evaluation_id,
                    "overall_recommendation": evaluation_data.get(
                        "overall_recommendation"
                    ),
                    "weighted_score": self._calculate_weighted_score(evaluation_data),
                    "evaluated_at": evaluation_data["_evaluated_at"],
                }
            )
            candidate_file.write_text(
                json.dumps(candidate_data, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )

            # Index evaluation to KG
            await self._index_evaluation_to_kg(candidate_id, evaluation_data)

            logger.info(
                f"Added evaluation {evaluation_id} for candidate {candidate_id}"
            )
            return evaluation_data

        except Exception as e:
            logger.error(f"Error adding evaluation: {e}")
            raise

    def _calculate_weighted_score(self, evaluation_data: dict) -> float:
        """Calculate weighted score from evaluation data."""
        scores = []

        # Technical score
        if evaluation_data.get("technical_assessment", {}).get("score"):
            scores.append(evaluation_data["technical_assessment"]["score"])

        # Soft skills average
        soft = evaluation_data.get("soft_skills_assessment", {})
        soft_scores = [
            v for k, v in soft.items() if isinstance(v, (int, float)) and k != "notes"
        ]
        if soft_scores:
            scores.append(sum(soft_scores) / len(soft_scores))

        # Cultural fit
        if evaluation_data.get("cultural_fit", {}).get("score"):
            scores.append(evaluation_data["cultural_fit"]["score"])

        if scores:
            return round(sum(scores) / len(scores) * 10, 1)  # Scale to 100
        return 0.0

    async def _index_evaluation_to_kg(
        self, candidate_id: str, evaluation_data: dict
    ):
        """Index interview evaluation to Knowledge Graph."""
        try:
            doc_parts = [
                f"Interview Evaluation for Candidate {candidate_id}",
                f"Overall Recommendation: {evaluation_data.get('overall_recommendation', 'N/A')}",
            ]

            tech = evaluation_data.get("technical_assessment", {})
            if tech:
                doc_parts.append(f"Technical Score: {tech.get('score', 'N/A')}/10")
                if tech.get("strengths"):
                    doc_parts.append(
                        f"Technical Strengths: {', '.join(tech['strengths'])}"
                    )

            soft = evaluation_data.get("soft_skills_assessment", {})
            if soft.get("notes"):
                doc_parts.append(f"Soft Skills Notes: {soft['notes']}")

            if evaluation_data.get("key_concerns"):
                doc_parts.append(
                    f"Key Concerns: {', '.join(evaluation_data['key_concerns'])}"
                )

            document = "\n".join(doc_parts)
            await self.rag.ainsert(document)

        except Exception as e:
            logger.error(f"Error indexing evaluation to KG: {e}")

    async def search_by_skill(
        self, skill: str, top_k: int = 10
    ) -> list[dict]:
        """
        Search candidates by skill using hybrid search (KG + vector).

        Args:
            skill: Skill to search for
            top_k: Number of results to return

        Returns:
            List of matching candidates with scores
        """
        try:
            from lightrag import QueryParam

            # Use hybrid mode for best results (KG entities + relationships)
            result = await self.rag.aquery(
                f"Find candidates with {skill} skill. List their names, experience level, and related skills.",
                param=QueryParam(mode="hybrid", top_k=top_k),
            )

            # Parse and enhance results with local candidate data
            candidates = await self._match_candidates_from_query(result, skill)

            return candidates

        except Exception as e:
            logger.error(f"Error searching by skill: {e}")
            raise

    async def _match_candidates_from_query(
        self, query_result: str, skill: str
    ) -> list[dict]:
        """Match query results with local candidate data."""
        candidates = []

        # Load all candidates
        for cand_file in self.candidates_dir.glob("*.json"):
            try:
                cand_data = json.loads(cand_file.read_text(encoding="utf-8"))
                skills = cand_data.get("skills", {})
                all_skills = (
                    skills.get("technical", [])
                    + skills.get("soft", [])
                )

                # Check if skill matches (handle None values)
                skill_lower = skill.lower()
                skill_matched = any(
                    s and skill_lower in s.lower() for s in all_skills
                )

                if skill_matched:
                    # Calculate match score
                    score = 70  # Base score for skill match

                    # Boost from evaluations
                    if cand_data.get("evaluations"):
                        best_eval = max(
                            cand_data["evaluations"],
                            key=lambda x: x.get("weighted_score", 0),
                        )
                        score += best_eval.get("weighted_score", 0) * 0.3

                    candidates.append(
                        {
                            "candidate_id": cand_data.get("_id"),
                            "name": cand_data.get("personal_info", {}).get(
                                "name", "Unknown"
                            ),
                            "matched_skill": skill,
                            "all_skills": all_skills[:10],
                            "score": min(100, round(score, 1)),
                            "has_evaluation": bool(cand_data.get("evaluations")),
                            "latest_experience": (
                                cand_data.get("experience", [{}])[0].get("role")
                                if cand_data.get("experience")
                                else None
                            ),
                        }
                    )

            except Exception as e:
                logger.warning(f"Error loading candidate {cand_file}: {e}")

        # Sort by score
        candidates.sort(key=lambda x: x["score"], reverse=True)
        return candidates

    async def match_job(self, job_description: str, top_k: int = 10) -> dict:
        """
        Match candidates to a job description using Hybrid RAG retrieval.

        Args:
            job_description: Job description text
            top_k: Number of candidates to return

        Returns:
            Job match results with ranked candidates
        """
        try:
            from lightrag import QueryParam

            # Step 1: Analyze the job requirements
            job_prompt = JOB_ANALYSIS_PROMPT.format(job_content=job_description)
            job_response = await self.rag.llm_model_func(
                job_prompt,
                system_prompt="You are an expert HR assistant analyzing job requirements. Always return valid JSON.",
            )
            job_requirements = self._parse_json_response(job_response)
            
            # Step 2: Build search query from job requirements
            required_skills = job_requirements.get("required_skills", {})
            must_have = required_skills.get("must_have", [])
            nice_to_have = required_skills.get("nice_to_have", [])
            job_title = job_requirements.get("job_title", "")
            
            # Create search query combining skills
            all_skills = must_have + nice_to_have
            search_query = f"""
            Find candidates for {job_title} position.
            Required skills: {', '.join(must_have) if must_have else 'Not specified'}.
            Nice to have: {', '.join(nice_to_have) if nice_to_have else 'Not specified'}.
            List candidate names, their relevant skills, experience level, and qualifications.
            """
            
            # Step 3: Use Hybrid mode to search Knowledge Graph
            logger.info(f"Searching candidates with Hybrid mode for: {job_title}")
            rag_result = await self.rag.aquery(
                search_query,
                param=QueryParam(
                    mode="hybrid",  # Use Hybrid mode for best results
                    top_k=top_k * 2,  # Get more to filter
                )
            )
            
            logger.debug(f"RAG Hybrid search result: {rag_result[:500]}...")

            # Step 4: Get all candidates from local storage
            all_candidates = await self.get_all_candidates()
            
            if not all_candidates:
                return {
                    "job_title": job_title,
                    "job_level": job_requirements.get("level"),
                    "required_skills": required_skills,
                    "matched_candidates": [],
                    "total_candidates": 0,
                    "search_context": rag_result[:1000] if rag_result else "No context found",
                }

            # Step 5: Match each candidate using LLM with RAG context
            matched_candidates = []
            for candidate in all_candidates:
                # Get evaluation data if exists
                evaluations = await self._get_candidate_evaluations(
                    candidate.get("_id")
                )

                # Enhanced matching prompt with RAG context
                match_prompt = f"""
Based on the Knowledge Graph search results and candidate profile, evaluate the match.

## Knowledge Graph Context (from Hybrid search):
{rag_result[:2000] if rag_result else "No additional context available"}

## Job Requirements:
{json.dumps(job_requirements, ensure_ascii=False, indent=2)}

## Candidate Profile:
{json.dumps(candidate, ensure_ascii=False, indent=2)}

## Interview Evaluations (Weight: 2.5x):
{json.dumps(evaluations, ensure_ascii=False, indent=2) if evaluations else "No interview data available"}

Evaluate how well this candidate matches the job. Consider:
1. Skills match (must-have vs nice-to-have)
2. Experience relevance
3. Interview evaluations (weighted 2.5x higher than CV claims)
4. Overall fit

Return JSON with:
{{
    "match_score": <0-100>,
    "overall_recommendation": "Strong Hire" | "Hire" | "Maybe" | "No Hire",
    "hiring_confidence": "High" | "Medium" | "Low",
    "strengths": ["strength1", "strength2"],
    "risks": ["risk1", "risk2"],
    "skill_match_details": {{
        "matched_must_have": ["skill1"],
        "missing_must_have": ["skill2"],
        "matched_nice_to_have": ["skill3"]
    }}
}}
"""

                match_response = await self.rag.llm_model_func(
                    match_prompt,
                    system_prompt="You are an expert HR assistant matching candidates to jobs. Always return valid JSON.",
                )
                match_result = self._parse_json_response(match_response)

                # Apply 2.5x weight boost if has positive evaluation
                base_score = match_result.get("match_score", 0)
                if evaluations:
                    for eval_data in evaluations:
                        if eval_data.get("overall_recommendation") in ["Strong Hire", "Hire"]:
                            base_score = min(100, base_score * 1.25)  # 25% boost for good reviews
                            break

                matched_candidates.append(
                    {
                        "candidate_id": candidate.get("_id"),
                        "name": candidate.get("personal_info", {}).get(
                            "name", "Unknown"
                        ),
                        "match_score": round(base_score, 1),
                        "recommendation": match_result.get("overall_recommendation"),
                        "hiring_confidence": match_result.get("hiring_confidence"),
                        "strengths": match_result.get("strengths", []),
                        "risks": match_result.get("risks", []),
                        "skill_match": match_result.get("skill_match_details", {}),
                        "has_evaluation": bool(evaluations),
                    }
                )

            # Sort by match score
            matched_candidates.sort(key=lambda x: x["match_score"], reverse=True)

            return {
                "job_title": job_title,
                "job_level": job_requirements.get("level"),
                "required_skills": required_skills,
                "matched_candidates": matched_candidates[:top_k],
                "total_candidates": len(all_candidates),
                "retrieval_mode": "hybrid",
            }

        except Exception as e:
            logger.error(f"Error matching job: {e}")
            raise

    async def _get_candidate_evaluations(
        self, candidate_id: str
    ) -> list[dict]:
        """Get all evaluations for a candidate."""
        evaluations = []
        for eval_file in self.evaluations_dir.glob(f"{candidate_id}_*.json"):
            try:
                eval_data = json.loads(eval_file.read_text(encoding="utf-8"))
                evaluations.append(eval_data)
            except Exception as e:
                logger.warning(f"Error loading evaluation {eval_file}: {e}")
        return evaluations

    async def get_all_candidates(self) -> list[dict]:
        """Get all candidates from local storage."""
        candidates = []
        for cand_file in self.candidates_dir.glob("*.json"):
            try:
                cand_data = json.loads(cand_file.read_text(encoding="utf-8"))
                candidates.append(cand_data)
            except Exception as e:
                logger.warning(f"Error loading candidate {cand_file}: {e}")
        return candidates

    async def get_candidate(self, candidate_id: str) -> Optional[dict]:
        """Get a specific candidate by ID."""
        candidate_file = self.candidates_dir / f"{candidate_id}.json"
        if not candidate_file.exists():
            return None

        candidate_data = json.loads(candidate_file.read_text(encoding="utf-8"))

        # Load evaluations
        candidate_data["_evaluations_detail"] = await self._get_candidate_evaluations(
            candidate_id
        )

        return candidate_data

    async def update_candidate(
        self, candidate_id: str, update_data: dict
    ) -> Optional[dict]:
        """
        Update candidate information (skills, experience, etc.).
        
        Args:
            candidate_id: ID of the candidate to update
            update_data: Dictionary with fields to update
            
        Returns:
            Updated candidate data or None if not found
        """
        candidate_file = self.candidates_dir / f"{candidate_id}.json"
        if not candidate_file.exists():
            return None

        try:
            candidate_data = json.loads(candidate_file.read_text(encoding="utf-8"))
            
            # Update allowed fields
            allowed_fields = [
                "personal_info", "summary", "skills", 
                "experience", "education", "certifications", "projects"
            ]
            
            for field in allowed_fields:
                if field in update_data:
                    if isinstance(update_data[field], dict) and isinstance(candidate_data.get(field), dict):
                        # Merge dictionaries
                        candidate_data[field].update(update_data[field])
                    elif isinstance(update_data[field], list) and isinstance(candidate_data.get(field), list):
                        # For lists, replace entirely or merge based on intent
                        if update_data.get("_merge_lists", False):
                            # Merge lists (add new items)
                            existing = set(str(item) for item in candidate_data[field])
                            for item in update_data[field]:
                                if str(item) not in existing:
                                    candidate_data[field].append(item)
                        else:
                            # Replace list
                            candidate_data[field] = update_data[field]
                    else:
                        candidate_data[field] = update_data[field]
            
            # Update metadata
            candidate_data["_updated_at"] = datetime.now().isoformat()
            
            # Save updated data
            candidate_file.write_text(
                json.dumps(candidate_data, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            
            # Re-index to Knowledge Graph
            await self._index_candidate_to_kg(candidate_data)
            
            logger.info(f"Updated candidate {candidate_id}")
            return candidate_data
            
        except Exception as e:
            logger.error(f"Error updating candidate {candidate_id}: {e}")
            raise

    async def delete_candidate(self, candidate_id: str) -> bool:
        """
        Delete a candidate and all associated data.
        
        Args:
            candidate_id: ID of the candidate to delete
            
        Returns:
            True if deleted successfully, False if not found
        """
        candidate_file = self.candidates_dir / f"{candidate_id}.json"
        if not candidate_file.exists():
            return False

        try:
            # Delete candidate file
            candidate_file.unlink()
            
            # Delete associated evaluations
            for eval_file in self.evaluations_dir.glob(f"{candidate_id}_*.json"):
                eval_file.unlink()
                logger.debug(f"Deleted evaluation file: {eval_file}")
            
            # Note: We cannot easily remove from KG without tracking doc IDs
            # The KG data will become stale but won't affect accuracy significantly
            
            logger.info(f"Deleted candidate {candidate_id} and associated evaluations")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting candidate {candidate_id}: {e}")
            raise

    async def add_skills_to_candidate(
        self, candidate_id: str, new_skills: dict
    ) -> Optional[dict]:
        """
        Convenience method to add new skills to a candidate.
        
        Args:
            candidate_id: ID of the candidate
            new_skills: Dict with 'technical' and/or 'soft' skill lists
            
        Returns:
            Updated candidate data
        """
        candidate_file = self.candidates_dir / f"{candidate_id}.json"
        if not candidate_file.exists():
            return None
            
        candidate_data = json.loads(candidate_file.read_text(encoding="utf-8"))
        
        # Get existing skills
        existing_skills = candidate_data.get("skills", {"technical": [], "soft": []})
        
        # Add new technical skills
        if new_skills.get("technical"):
            existing_tech = set(s for s in existing_skills.get("technical", []) if s)
            for skill in new_skills["technical"]:
                if skill and skill not in existing_tech:
                    existing_skills.setdefault("technical", []).append(skill)
        
        # Add new soft skills
        if new_skills.get("soft"):
            existing_soft = set(s for s in existing_skills.get("soft", []) if s)
            for skill in new_skills["soft"]:
                if skill and skill not in existing_soft:
                    existing_skills.setdefault("soft", []).append(skill)
        
        candidate_data["skills"] = existing_skills
        candidate_data["_updated_at"] = datetime.now().isoformat()
        
        candidate_file.write_text(
            json.dumps(candidate_data, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        
        # Re-index
        await self._index_candidate_to_kg(candidate_data)
        
        logger.info(f"Added skills to candidate {candidate_id}")
        return candidate_data

    async def get_all_skills(self) -> list[str]:
        """Get all unique skills from all candidates."""
        skills_set = set()
        for cand_file in self.candidates_dir.glob("*.json"):
            try:
                cand_data = json.loads(cand_file.read_text(encoding="utf-8"))
                skills = cand_data.get("skills", {})
                skills_set.update(skills.get("technical", []))
                skills_set.update(skills.get("soft", []))
            except Exception:
                pass
        return sorted(list(skills_set))

    def _parse_json_response(self, response: str) -> dict:
        """Parse JSON from LLM response, handling common issues."""
        try:
            # Try direct parse
            return json.loads(response)
        except json.JSONDecodeError:
            pass

        # Try to extract JSON from markdown code block
        import re

        json_match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", response, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass

        # Try to find JSON object
        json_match = re.search(r"\{.*\}", response, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(0))
            except json.JSONDecodeError:
                pass

        logger.warning(f"Failed to parse JSON response: {response[:200]}...")
        return {}
