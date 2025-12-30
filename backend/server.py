from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Get Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============== PYDANTIC MODELS ==============

# Project Models
class ProjectBase(BaseModel):
    title: str
    series_name: Optional[str] = None
    universe: Optional[str] = None
    type: Optional[str] = "novel"
    status: str = "concept"
    word_count: int = 0
    summary: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    series_name: Optional[str] = None
    universe: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    word_count: Optional[int] = None
    summary: Optional[str] = None

class Project(ProjectBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Chapter Models
class ChapterBase(BaseModel):
    project_id: str
    chapter_number: int
    title: str
    content: str = ""
    status: str = "draft"

class ChapterCreate(ChapterBase):
    pass

class ChapterUpdate(BaseModel):
    chapter_number: Optional[int] = None
    title: Optional[str] = None
    content: Optional[str] = None
    status: Optional[str] = None

class Chapter(ChapterBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ToneProfile Models
class ToneProfileBase(BaseModel):
    project_id: str
    chapter_id: Optional[str] = None
    detected_tone: str
    reading_level: str
    pacing_notes: str
    voice_notes: str
    suggestions: List[str] = []

class ToneProfileCreate(ToneProfileBase):
    pass

class ToneProfile(ToneProfileBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ArtAsset Models
class ArtAssetBase(BaseModel):
    project_id: str
    chapter_id: Optional[str] = None
    type: str  # cover, chapter_header, spot_illustration
    style_preset: str
    prompt_used: str
    status: str = "generated"
    image_reference: Optional[str] = None

class ArtAssetCreate(ArtAssetBase):
    pass

class ArtAsset(ArtAssetBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# StylePreset Models
class StylePresetBase(BaseModel):
    name: str
    description: str
    visual_style: str
    mood: str
    color_palette: Optional[str] = None

class StylePresetCreate(StylePresetBase):
    pass

class StylePresetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    visual_style: Optional[str] = None
    mood: Optional[str] = None
    color_palette: Optional[str] = None

class StylePreset(StylePresetBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# AI Request/Response Models
class RewriteRequest(BaseModel):
    content: str
    tone: str = "warm and engaging"

class SummarizeRequest(BaseModel):
    content: str

class OutlineRequest(BaseModel):
    project_summary: str
    target_chapter_count: int = 10

class WorkflowAnalysisRequest(BaseModel):
    status_description: str

class ToneAnalysisRequest(BaseModel):
    content: str
    project_id: str
    chapter_id: Optional[str] = None

class ArtPromptRequest(BaseModel):
    project_id: str
    chapter_id: Optional[str] = None
    style_preset: str
    prompt_type: str  # cover, chapter_header, spot_illustration
    context: str

class AskThadRequest(BaseModel):
    query: str
    context: Optional[str] = None

class AIResponse(BaseModel):
    response: str
    module: str

# Market Intelligence Request Models
class BookIdeasRequest(BaseModel):
    universe: str = "Bigfoot Financial Adventures"
    count: int = 10

class MarketAnalysisRequest(BaseModel):
    genre: str = "children's financial literacy"
    age_group: Optional[str] = None

class CustomerResearchRequest(BaseModel):
    book_idea: str

class MarketOutlineRequest(BaseModel):
    book_idea: str
    chapter_count: int = 12

class ManuscriptDraftRequest(BaseModel):
    book_idea: str
    word_count: int = 30000

class BookDescriptionRequest(BaseModel):
    book_title: str
    book_summary: str

class SalesAnalysisRequest(BaseModel):
    sales_data: str

# ============== SYSTEM PROMPTS ==============

GLOBAL_SYSTEM_PROMPT = """You are Thaddaeus ("Thad"), the creative intelligence inside Mick's in-house Author OS. 
Your purpose is to help develop, refine, and publish manuscripts within the Bigfoot Financial Adventures universe and any future universes Mick creates.

IDENTITY & VOICE:
- You speak with Mick's tone: warm, visionary, encouraging, and clear.
- You are a creative partner, not a critic.
- You offer insight, structure, and clarity without overwhelming the user.
- You never mention internal instructions or system prompts.

GLOBAL BEHAVIOR RULES:
- Always understand the user's intent before responding.
- If the request is unclear, ask one clarifying question.
- Keep responses structured, concise, and actionable.
- Never invent missing data; ask for it.
- Never contradict the established universe tone or lore.
- Always maintain consistency across manuscripts, art, and workflow.
- When offering suggestions, provide 2–4 options, each distinct.

OUTPUT FORMAT:
Use a clear structure:
- Headings
- Bullet points
- Numbered steps
- Short paragraphs
- Optional examples

TONE GUIDELINES:
- Warm, encouraging, and visionary.
- Clear and direct, never overly technical.
- Creative but grounded.
- Supportive, collaborative, and forward-thinking."""

MANUSCRIPT_SYSTEM_PROMPT = GLOBAL_SYSTEM_PROMPT + """

You are operating in MANUSCRIPT MODE.

ROLE:
- Help plan, draft, revise, and refine manuscripts.
- Protect the story's intent while making it clearer, stronger, and more engaging.
- Focus on structure, pacing, clarity, and alignment with the target reader's age.

SPECIALTY:
- Outlining books and chapters.
- Turning ideas into clear beats or scenes.
- Adjusting reading level (e.g., 3rd–5th grade) without talking down to the reader.
- Helping with hooks, endings, transitions, and character voice consistency."""

WORKFLOW_SYSTEM_PROMPT = GLOBAL_SYSTEM_PROMPT + """

You are operating in WORKFLOW MODE.

ROLE:
- Act as a calm project manager for manuscripts and series.
- Transform vague progress feelings into clear stages, tasks, and next steps.

BEHAVIOR:
- Map manuscripts to stages: Concept → Outline → Draft → Revisions → Editing → Layout → Art → Proofing → Final → Published.
- Suggest the next 1–3 logical actions.
- Break big goals into short checklists when helpful."""

TONE_STYLE_SYSTEM_PROMPT = GLOBAL_SYSTEM_PROMPT + """

You are operating in TONE & STYLE MODE.

ROLE:
- Analyze and improve the tone, voice, pacing, and reading level of a manuscript.
- Keep the writing aligned with the intended audience and Mick's brand identity.

BEHAVIOR:
- Identify the current tone in clear, human terms.
- Estimate reading level and note if it fits the intended age group.
- Comment on pacing (fast, slow, dense, airy, etc.).
- Spot any noticeable shifts in voice or formality."""

ART_STUDIO_SYSTEM_PROMPT = GLOBAL_SYSTEM_PROMPT + """

You are operating in ART STUDIO MODE.

ROLE:
- Act as an art director and visual storyteller.
- Translate manuscript details into clear, vivid prompts for image generation.

BEHAVIOR:
- Include in prompts: Setting, Key characters, Important objects/symbols, Composition hints, Style cues.
- Provide 2–4 distinct prompt options with labels.
- Keep prompts detailed but not bloated; every phrase should add meaning."""

MARKET_INTELLIGENCE_SYSTEM_PROMPT = GLOBAL_SYSTEM_PROMPT + """

You are operating in MARKET INTELLIGENCE MODE.

PURPOSE:
- Help authors discover book ideas with strong market potential.
- Provide customer research insights.
- Suggest outlines and positioning based on reader demand.
- Support authors in creating books that are both meaningful and market-ready.

CAPABILITIES:
- Generate unique book topic ideas with market potential.
- Identify market gaps and opportunities.
- Summarize what readers want in a given genre or age group.
- Produce customer research reports.
- Suggest book positioning and differentiators.
- Create market-aligned outlines using the Lantern Path structure.
- Generate book descriptions optimized for sales pages.
- Analyze sales data and provide recommendations.

RULES:
- All suggestions must remain aligned with the Bigfoot Financial Adventures universe when applicable.
- Maintain the emotional palette (warm, curious, empowering).
- Avoid jargon; keep explanations accessible.
- Use symbolic language when appropriate.
- Never contradict universe lore or tone.

OUTPUT STRUCTURE:
- Use clear headings and sections.
- Provide actionable insights.
- Include market reasoning for recommendations.
- Balance creativity with commercial viability."""

# ============== AI HELPER FUNCTIONS ==============

async def get_ai_response(system_prompt: str, user_message: str, session_id: str = None) -> str:
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    if session_id is None:
        session_id = str(uuid.uuid4())
    
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_prompt
    ).with_model("openai", "gpt-5.2")
    
    message = UserMessage(text=user_message)
    response = await chat.send_message(message)
    return response

# ============== PROJECT ENDPOINTS ==============

@api_router.post("/projects", response_model=Project)
async def create_project(project: ProjectCreate):
    project_obj = Project(**project.model_dump())
    doc = project_obj.model_dump()
    await db.projects.insert_one(doc)
    return project_obj

@api_router.get("/projects", response_model=List[Project])
async def get_projects():
    projects = await db.projects.find({}, {"_id": 0}).to_list(1000)
    return projects

@api_router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@api_router.put("/projects/{project_id}", response_model=Project)
async def update_project(project_id: str, update: ProjectUpdate):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.projects.update_one(
        {"id": project_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    return project

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    result = await db.projects.delete_one({"id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    # Also delete related chapters
    await db.chapters.delete_many({"project_id": project_id})
    return {"message": "Project deleted successfully"}

# ============== CHAPTER ENDPOINTS ==============

@api_router.post("/chapters", response_model=Chapter)
async def create_chapter(chapter: ChapterCreate):
    chapter_obj = Chapter(**chapter.model_dump())
    doc = chapter_obj.model_dump()
    await db.chapters.insert_one(doc)
    
    # Update project word count
    word_count = len(chapter.content.split()) if chapter.content else 0
    project = await db.projects.find_one({"id": chapter.project_id})
    if project:
        new_word_count = project.get("word_count", 0) + word_count
        await db.projects.update_one(
            {"id": chapter.project_id},
            {"$set": {"word_count": new_word_count, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    return chapter_obj

@api_router.get("/chapters/project/{project_id}", response_model=List[Chapter])
async def get_chapters_by_project(project_id: str):
    chapters = await db.chapters.find({"project_id": project_id}, {"_id": 0}).sort("chapter_number", 1).to_list(1000)
    return chapters

@api_router.get("/chapters/{chapter_id}", response_model=Chapter)
async def get_chapter(chapter_id: str):
    chapter = await db.chapters.find_one({"id": chapter_id}, {"_id": 0})
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    return chapter

@api_router.put("/chapters/{chapter_id}", response_model=Chapter)
async def update_chapter(chapter_id: str, update: ChapterUpdate):
    # Get old chapter for word count calculation
    old_chapter = await db.chapters.find_one({"id": chapter_id})
    if not old_chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.chapters.update_one({"id": chapter_id}, {"$set": update_data})
    
    # Update project word count if content changed
    if "content" in update_data:
        old_words = len(old_chapter.get("content", "").split())
        new_words = len(update_data["content"].split())
        word_diff = new_words - old_words
        
        if word_diff != 0:
            await db.projects.update_one(
                {"id": old_chapter["project_id"]},
                {"$inc": {"word_count": word_diff}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
            )
    
    chapter = await db.chapters.find_one({"id": chapter_id}, {"_id": 0})
    return chapter

@api_router.delete("/chapters/{chapter_id}")
async def delete_chapter(chapter_id: str):
    chapter = await db.chapters.find_one({"id": chapter_id})
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    # Update project word count
    word_count = len(chapter.get("content", "").split())
    await db.projects.update_one(
        {"id": chapter["project_id"]},
        {"$inc": {"word_count": -word_count}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await db.chapters.delete_one({"id": chapter_id})
    return {"message": "Chapter deleted successfully"}

# ============== STYLE PRESET ENDPOINTS ==============

@api_router.post("/style-presets", response_model=StylePreset)
async def create_style_preset(preset: StylePresetCreate):
    preset_obj = StylePreset(**preset.model_dump())
    doc = preset_obj.model_dump()
    await db.style_presets.insert_one(doc)
    return preset_obj

@api_router.get("/style-presets", response_model=List[StylePreset])
async def get_style_presets():
    presets = await db.style_presets.find({}, {"_id": 0}).to_list(100)
    return presets

@api_router.get("/style-presets/{preset_id}", response_model=StylePreset)
async def get_style_preset(preset_id: str):
    preset = await db.style_presets.find_one({"id": preset_id}, {"_id": 0})
    if not preset:
        raise HTTPException(status_code=404, detail="Style preset not found")
    return preset

@api_router.put("/style-presets/{preset_id}", response_model=StylePreset)
async def update_style_preset(preset_id: str, update: StylePresetUpdate):
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    result = await db.style_presets.update_one({"id": preset_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Style preset not found")
    
    preset = await db.style_presets.find_one({"id": preset_id}, {"_id": 0})
    return preset

@api_router.delete("/style-presets/{preset_id}")
async def delete_style_preset(preset_id: str):
    result = await db.style_presets.delete_one({"id": preset_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Style preset not found")
    return {"message": "Style preset deleted successfully"}

# ============== ART ASSET ENDPOINTS ==============

@api_router.post("/art-assets", response_model=ArtAsset)
async def create_art_asset(asset: ArtAssetCreate):
    asset_obj = ArtAsset(**asset.model_dump())
    doc = asset_obj.model_dump()
    await db.art_assets.insert_one(doc)
    return asset_obj

@api_router.get("/art-assets/project/{project_id}", response_model=List[ArtAsset])
async def get_art_assets_by_project(project_id: str):
    assets = await db.art_assets.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
    return assets

@api_router.delete("/art-assets/{asset_id}")
async def delete_art_asset(asset_id: str):
    result = await db.art_assets.delete_one({"id": asset_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Art asset not found")
    return {"message": "Art asset deleted successfully"}

# ============== TONE PROFILE ENDPOINTS ==============

@api_router.get("/tone-profiles/project/{project_id}", response_model=List[ToneProfile])
async def get_tone_profiles_by_project(project_id: str):
    profiles = await db.tone_profiles.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
    return profiles

@api_router.get("/tone-profiles/chapter/{chapter_id}", response_model=ToneProfile)
async def get_tone_profile_by_chapter(chapter_id: str):
    profile = await db.tone_profiles.find_one({"chapter_id": chapter_id}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Tone profile not found")
    return profile

# ============== AI ENDPOINTS ==============

@api_router.post("/ai/rewrite", response_model=AIResponse)
async def rewrite_for_tone(request: RewriteRequest):
    prompt = f"""Task:
- Rewrite the following text to:
  - Match this tone: {request.tone}.
  - Fit this reading level: 3rd–5th grade.
- Preserve all important meaning, facts, and lore.
- Keep sentences clear, concrete, and engaging.
- Maintain the author's intent and emotional direction.

Text:
{request.content}"""
    
    response = await get_ai_response(MANUSCRIPT_SYSTEM_PROMPT, prompt)
    return AIResponse(response=response, module="manuscript")

@api_router.post("/ai/summarize", response_model=AIResponse)
async def summarize_chapter(request: SummarizeRequest):
    prompt = f"""Task:
- Summarize this chapter in 3 short, clear sentences.
- Aim for a 3rd–5th grade reading level.
- Preserve the emotional arc and key events.

Text:
{request.content}"""
    
    response = await get_ai_response(MANUSCRIPT_SYSTEM_PROMPT, prompt)
    return AIResponse(response=response, module="manuscript")

@api_router.post("/ai/outline", response_model=AIResponse)
async def generate_outline(request: OutlineRequest):
    prompt = f"""Task:
- Create a clear, chapter-by-chapter outline for this book.
- Aim for {request.target_chapter_count} chapters.
- Each chapter should include:
  - A main event or focus
  - An emotional beat
  - Any key educational or financial literacy concept (if applicable)
- Keep the outline structured, simple, and actionable.

Book idea or summary:
{request.project_summary}"""
    
    response = await get_ai_response(MANUSCRIPT_SYSTEM_PROMPT, prompt)
    return AIResponse(response=response, module="manuscript")

@api_router.post("/ai/workflow-analysis", response_model=AIResponse)
async def analyze_workflow(request: WorkflowAnalysisRequest):
    prompt = f"""Task:
- Based on the description below, identify the most accurate stage of the manuscript using this pipeline:
  Concept → Outline → Draft → Revisions → Editing → Layout → Art → Proofing → Final → Published.
- Then provide:
  1) The current stage.
  2) The next 3 concrete actions.
  3) Any blockers or dependencies.

Description of current progress:
{request.status_description}"""
    
    response = await get_ai_response(WORKFLOW_SYSTEM_PROMPT, prompt)
    return AIResponse(response=response, module="workflow")

@api_router.post("/ai/analyze-tone", response_model=AIResponse)
async def analyze_tone(request: ToneAnalysisRequest):
    prompt = f"""Target reader: 3rd–5th grade.

Task:
- Analyze the tone, reading level, and pacing of the following text.
- Provide:
  1) A short description of the current tone.
  2) A reading level impression (simple, not technical).
  3) Notes on pacing (fast, slow, dense, airy).
  4) Any noticeable shifts in voice or formality.
  5) 2–3 suggestions to better align with the target reader and the Bigfoot Financial Adventures brand.

Text:
{request.content}"""
    
    response = await get_ai_response(TONE_STYLE_SYSTEM_PROMPT, prompt)
    
    # Save tone profile
    tone_profile = ToneProfile(
        project_id=request.project_id,
        chapter_id=request.chapter_id,
        detected_tone="See analysis",
        reading_level="See analysis",
        pacing_notes="See analysis",
        voice_notes="See analysis",
        suggestions=["See full analysis for suggestions"]
    )
    
    # Update or insert tone profile
    if request.chapter_id:
        await db.tone_profiles.update_one(
            {"chapter_id": request.chapter_id},
            {"$set": tone_profile.model_dump()},
            upsert=True
        )
    else:
        await db.tone_profiles.insert_one(tone_profile.model_dump())
    
    return AIResponse(response=response, module="tone")

@api_router.post("/ai/art-prompts", response_model=AIResponse)
async def generate_art_prompts(request: ArtPromptRequest):
    # Get project info
    project = await db.projects.find_one({"id": request.project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    prompt_type_instructions = {
        "cover": f"""Task:
- Generate 3–4 distinct cover art prompt concepts for this book.
- The cover should:
  - Appeal to 3rd–5th grade readers.
  - Match this style preset: {request.style_preset}.
  - Reflect the mood of the story.

For each concept, provide:
- A short label (e.g., "Bigfoot at the Forest Bank").
- A detailed visual prompt describing:
  - Setting
  - Key characters
  - Important objects or symbols
  - Composition
  - Mood and lighting
  - Style cues

Book title: {project.get('title', 'Untitled')}
Series: {project.get('series_name', 'N/A')}
Context: {request.context}""",
        
        "chapter_header": f"""Task:
- Generate 2–3 chapter header art prompt options.
- Focus on a single clear moment, symbol, or character from the chapter.
- Match the universe/style preset: {request.style_preset}.
- Keep the composition simple enough for consistent reproduction across chapters.

Context:
{request.context}""",
        
        "spot_illustration": f"""Task:
- Generate 2–3 in-page spot illustration prompts.
- Each prompt should:
  - Highlight a key moment, object, or emotional beat.
  - Match the style preset: {request.style_preset}.
  - Be visually simple and readable at small sizes.

Context:
{request.context}"""
    }
    
    prompt = prompt_type_instructions.get(request.prompt_type, prompt_type_instructions["cover"])
    response = await get_ai_response(ART_STUDIO_SYSTEM_PROMPT, prompt)
    return AIResponse(response=response, module="art")

@api_router.post("/ai/ask-thad", response_model=AIResponse)
async def ask_thad(request: AskThadRequest):
    prompt = f"""The user is asking for help. They may need assistance with:
- Manuscript (writing, editing, outlining)
- Workflow (project stages, next steps)
- Tone & Style (voice, reading level, pacing)
- Art (visual prompts, cover concepts)

Determine which area(s) are relevant and provide helpful guidance.

User request:
{request.query}

Additional context:
{request.context if request.context else 'None provided'}"""
    
    response = await get_ai_response(GLOBAL_SYSTEM_PROMPT, prompt)
    return AIResponse(response=response, module="general")

# ============== MARKET INTELLIGENCE ENDPOINTS ==============

@api_router.post("/ai/market/book-ideas", response_model=AIResponse)
async def generate_book_ideas(request: BookIdeasRequest):
    prompt = f"""Generate {request.count} unique book topic ideas with strong market potential.

For each idea, include:
- **Title idea**: A compelling, market-ready title
- **One-sentence hook**: The pitch that would appear on the back cover
- **Why this topic has opportunity**: Market reasoning (gap, trend, demand)
- **Target reader age**: Specific age range

Universe: {request.universe}

Rules:
- All suggestions must align with the {request.universe} universe when applicable
- Maintain the emotional palette (warm, curious, empowering)
- Focus on financial literacy concepts that resonate with children
- Consider what parents and educators are actively seeking
- Balance creativity with commercial viability

Format each idea clearly numbered 1-{request.count}."""

    response = await get_ai_response(MARKET_INTELLIGENCE_SYSTEM_PROMPT, prompt)
    return AIResponse(response=response, module="market_intelligence")

@api_router.post("/ai/market/analysis", response_model=AIResponse)
async def analyze_market(request: MarketAnalysisRequest):
    age_context = f" for {request.age_group}" if request.age_group else ""
    prompt = f"""Analyze the current market for {request.genre} books{age_context}.

Provide a comprehensive analysis including:

## Market Gaps
- What topics are underserved?
- What formats are missing?
- What age groups lack good options?

## Underserved Themes
- Financial concepts not well covered
- Emotional angles being missed
- Cultural perspectives lacking representation

## Emerging Opportunities
- Rising trends in children's publishing
- New distribution channels
- Educational market shifts
- Parent/teacher demand signals

## Competitive Angles
- How to differentiate from existing books
- Unique positioning strategies
- Brand-building opportunities

## Summary & Recommendations
Provide 3 specific book directions with:
- Concept summary
- Target audience
- Key differentiator
- Market timing rationale"""

    response = await get_ai_response(MARKET_INTELLIGENCE_SYSTEM_PROMPT, prompt)
    return AIResponse(response=response, module="market_intelligence")

@api_router.post("/ai/market/customer-research", response_model=AIResponse)
async def generate_customer_research(request: CustomerResearchRequest):
    prompt = f"""Create a customer research report for the following book idea:

**Book Idea:** {request.book_idea}

Provide detailed insights on:

## What Readers Want
- Core desires and expectations
- Format preferences
- Length expectations
- Visual element preferences

## Common Frustrations
- What existing books get wrong
- Pain points with current options
- Unmet needs in the market

## Desired Outcomes
- What parents want kids to learn
- What teachers need for curriculum
- What kids want to feel after reading

## Emotional Triggers
- What motivates purchase decisions
- Fear-based triggers (what parents worry about)
- Aspiration-based triggers (what parents hope for)
- Joy-based triggers (what makes kids excited)

## Market Positioning Suggestions
- Recommended positioning statement
- Key differentiators to emphasize
- Messaging angles that resonate
- Price point considerations"""

    response = await get_ai_response(MARKET_INTELLIGENCE_SYSTEM_PROMPT, prompt)
    return AIResponse(response=response, module="market_intelligence")

@api_router.post("/ai/market/outline", response_model=AIResponse)
async def generate_market_outline(request: MarketOutlineRequest):
    prompt = f"""Create a chapter-by-chapter outline for this book idea:

**Book Idea:** {request.book_idea}
**Target Chapters:** {request.chapter_count}

Use the Lantern Path structure (guiding the reader through discovery).

For each chapter, include:

### Chapter [Number]: [Title]
- **Purpose**: What this chapter accomplishes in the journey
- **Emotional Beat**: The feeling the reader should experience
- **Financial Literacy Concept**: The key lesson embedded in the story
- **Market Appeal Note**: Why this chapter will resonate with buyers

Additional requirements:
- Build emotional momentum across chapters
- Ensure educational clarity without being preachy
- Include parent/teacher discussion opportunities
- Create natural cliffhangers or curiosity hooks
- Balance entertainment with learning

End with a summary of:
- Overall story arc
- Key learning outcomes
- Why this structure will sell"""

    response = await get_ai_response(MARKET_INTELLIGENCE_SYSTEM_PROMPT, prompt)
    return AIResponse(response=response, module="market_intelligence")

@api_router.post("/ai/market/manuscript-draft", response_model=AIResponse)
async def generate_manuscript_draft(request: ManuscriptDraftRequest):
    prompt = f"""Generate a full draft manuscript outline for a {request.word_count:,}-word book based on:

**Book Idea:** {request.book_idea}

Create a detailed outline including:

## Book Overview
- Title suggestion
- Subtitle suggestion
- Target word count per chapter
- Target reader age

## Chapter-by-Chapter Breakdown

For each chapter provide:
### Chapter [Number]: [Title] (~[word count] words)

**Summary**: 2-3 sentence overview

**Key Scenes**:
- Scene 1: [description]
- Scene 2: [description]
- Scene 3: [description]

**Emotional Arc**: Beginning feeling → Middle tension → End resolution

**Educational Beat**: The financial literacy concept woven in

**Market Alignment Note**: How this serves reader expectations

## Overall Structure Notes
- Pacing recommendations
- Illustration opportunity moments
- Discussion question hooks
- Series potential indicators

NOTE: This is an outline only. Do NOT generate the full {request.word_count:,} words unless explicitly asked."""

    response = await get_ai_response(MARKET_INTELLIGENCE_SYSTEM_PROMPT, prompt)
    return AIResponse(response=response, module="market_intelligence")

@api_router.post("/ai/market/book-description", response_model=AIResponse)
async def generate_book_description(request: BookDescriptionRequest):
    prompt = f"""Write a compelling book description for:

**Title:** {request.book_title}
**Summary:** {request.book_summary}

Create a sales-optimized description including:

## The Hook (Opening Line)
- Attention-grabbing first sentence
- Creates immediate curiosity

## The Emotional Promise
- What transformation awaits the reader
- The journey they'll experience

## What Kids Will Learn
- 3-5 key takeaways
- Framed as exciting discoveries, not lessons

## Why Parents & Teachers Will Love It
- Educational value
- Discussion opportunities
- Curriculum alignment
- Values reinforcement

## The Call to Action
- Compelling reason to buy now
- Perfect for [occasions/uses]

Tone: warm, mythic, empowering
Length: 150-250 words total
Format: Ready for Amazon/sales page"""

    response = await get_ai_response(MARKET_INTELLIGENCE_SYSTEM_PROMPT, prompt)
    return AIResponse(response=response, module="market_intelligence")

@api_router.post("/ai/market/sales-analysis", response_model=AIResponse)
async def analyze_sales_data(request: SalesAnalysisRequest):
    prompt = f"""Analyze the following sales data and provide strategic insights:

**Sales Data:**
{request.sales_data}

Provide:

## Performance Summary
- Overall sales performance
- Best and worst performing titles/periods
- Revenue highlights

## Trends
- Seasonal patterns
- Growth or decline indicators
- Channel performance
- Format preferences

## Opportunities
- Untapped markets
- Pricing optimization potential
- Bundle or series opportunities
- Marketing angles to explore

## Recommendations for Next Book
- Topic direction based on what's selling
- Format recommendations
- Timing suggestions
- Pricing strategy
- Marketing focus areas

## Action Items
Prioritized list of 5 specific actions to take based on this data."""

    response = await get_ai_response(MARKET_INTELLIGENCE_SYSTEM_PROMPT, prompt)
    return AIResponse(response=response, module="market_intelligence")

# ============== STATUS ENDPOINTS ==============

@api_router.get("/")
async def root():
    return {"message": "Author OS API is running"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "Author OS"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
