# Author OS - Product Requirements Document

## Original Problem Statement
Build a private, in-house "Author OS" web app for managing books, chapters, publishing workflow, tone analysis, and art prompt generation. The application should feature a rich text editor, multiple workspaces for different tasks (Manuscript, Workflow, Tone & Style, Art Studio), and a dashboard to view all projects.

## Core Requirements

### User Personas
- **Primary User**: Authors managing multiple book projects
- **Use Case**: Writing, organizing, and refining manuscripts with AI assistance

### Core Screens
1. **Dashboard** - Project overview with quick actions
2. **Manuscript Workspace** - Rich text editor with chapter management
3. **Workflow Workspace** - Publishing pipeline visualization
4. **Tone & Style Workspace** - Tone analysis tools
5. **Art Studio** - AI art prompt generation
6. **Market Intelligence** - Market analysis and book idea generation
7. **Settings** - Style preset management

## Technology Stack
- **Frontend**: React, TailwindCSS, shadcn/ui, TipTap Editor
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **AI Integration**: OpenAI GPT-5.2 via Emergent LLM Key

## Data Models

### Primary Collections
- `projects` - Book projects (legacy, being migrated)
- `manuscripts_collection` - Unified manuscript records (new)
- `chapters` - Individual chapters with content
- `versions` - Content snapshots for version history
- `notes` - Notes and comments for chapters/manuscripts
- `style_presets` - Writing style configurations
- `art_assets` - Generated art assets
- `tone_profiles` - Tone analysis results

### Key Relationships
- Projects → Chapters (one-to-many)
- Chapters → Versions (one-to-many)
- Chapters → Notes (one-to-many)
- Manuscripts can have Versions and Notes directly

## Features Implemented

### Phase 1: Core Application ✅
- [x] Dashboard with project overview
- [x] Project CRUD operations
- [x] Chapter CRUD operations
- [x] Rich text editor (TipTap)
- [x] AI "Thad" assistant with context-aware prompts
- [x] Manuscript, Workflow, Tone & Style, Art Studio workspaces

### Phase 2: AI Integration ✅
- [x] Rewrite for Tone
- [x] Summarize Chapter
- [x] Generate Book Outline
- [x] Workflow Analysis
- [x] Tone Analysis
- [x] Art Prompt Generation
- [x] Ask Thad (general AI assistant)

### Phase 3: Market Intelligence ✅
- [x] Generate Book Ideas
- [x] Market Analysis
- [x] Customer Research
- [x] Market Outline Generation
- [x] Manuscript Draft Generation
- [x] Book Description Generation
- [x] Sales Analysis

### Phase 4: Manuscript Import ✅
- [x] File upload support (.txt, .docx, .pdf, .md)
- [x] Drag & drop functionality
- [x] Import preview
- [x] Import Analysis AI workflow
- [x] Implement/Ignore actions for suggestions

### Phase 5: Data Collections (Builder Mode) ✅ (Dec 31, 2025)
- [x] Manuscripts collection with CRUD API
- [x] Versions collection with CRUD API
- [x] Notes collection with CRUD API
- [x] Migration endpoint (projects → manuscripts)
- [x] Tabbed UI in Manuscript Workspace (Chapters | Versions | Notes)
- [x] Version snapshot creation
- [x] Version restore functionality
- [x] Note types (comment, todo, revision, author_intent)
- [x] Note CRUD with edit and delete

### Phase 6: Version Comparison ✅ (Dec 31, 2025)
- [x] Compare Mode toggle in Versions panel
- [x] Multi-version selection (select 2 versions)
- [x] Side-by-side diff view
- [x] Unified diff view
- [x] Word-level change highlighting (added/removed/unchanged)
- [x] Stats display (words added, removed, unchanged)
- [x] Automatic detection of older/newer versions

### Phase 7: Auto-Version Snapshots ✅ (Dec 31, 2025)
- [x] Auto-version toggle in editor toolbar
- [x] Automatic version snapshot after 10 minutes of editing
- [x] Visual indicator showing auto-version status
- [x] Toast notification when auto-save occurs
- [x] Auto-labeled versions with "Auto-save (timestamp)"
- [x] Content change detection to track editing activity

## API Endpoints

### Projects
- `GET/POST /api/projects` - List/Create projects
- `GET/PUT/DELETE /api/projects/{id}` - Single project operations

### Chapters
- `GET /api/chapters/project/{project_id}` - Chapters by project
- `GET/POST /api/chapters` - Chapter CRUD
- `PUT/DELETE /api/chapters/{id}` - Update/Delete chapter

### Manuscripts Collection
- `GET/POST /api/manuscripts-collection` - List/Create
- `GET/PUT/DELETE /api/manuscripts-collection/{id}` - Single manuscript
- `GET /api/manuscripts-collection/{id}/chapters` - Chapters by manuscript

### Versions
- `POST /api/versions` - Create version snapshot
- `GET /api/versions/parent/{type}/{id}` - Versions by parent
- `GET /api/versions/{id}` - Get version
- `DELETE /api/versions/{id}` - Delete version

### Notes
- `POST /api/notes` - Create note
- `GET /api/notes/parent/{type}/{id}` - Notes by parent
- `GET/PUT/DELETE /api/notes/{id}` - Single note operations

### AI Endpoints
- `POST /api/ai/rewrite` - Rewrite for tone
- `POST /api/ai/summarize` - Summarize content
- `POST /api/ai/outline` - Generate outline
- `POST /api/ai/workflow-analysis` - Analyze workflow
- `POST /api/ai/analyze-tone` - Tone analysis
- `POST /api/ai/art-prompts` - Generate art prompts
- `POST /api/ai/ask-thad` - General AI query
- `POST /api/ai/import/analyze` - Import analysis
- `POST /api/ai/import/action` - Execute import action
- `POST /api/ai/market/*` - Market intelligence endpoints

### Upload
- `POST /api/manuscripts/upload` - Upload manuscript
- `POST /api/manuscripts/upload-preview` - Preview upload
- `POST /api/actions/import-manuscript` - Import to manuscripts collection

### Migration
- `POST /api/migrate/projects-to-manuscripts` - Migrate projects to manuscripts

## Outstanding Tasks

### P1 - High Priority
- [ ] Implement "Implement Changes" backend logic for Import Analysis actions (auto-formatting, chapter splitting, etc.)
- [ ] Complete data model unification (deprecate old project endpoints)

### P2 - Medium Priority
- [ ] Add export functionality (PDF, DOCX)
- [ ] Implement collaborative editing support
- [ ] Add analytics dashboard for writing progress

### P3 - Low Priority
- [ ] Dark/light theme toggle
- [ ] Keyboard shortcuts
- [ ] Mobile responsive improvements

## Known Issues
- Console warnings for controlled/uncontrolled Select components (cosmetic)
- ProseMirror CSS white-space warning (cosmetic)
- ESLint warnings for useEffect dependencies (code quality)

## Test Coverage
- Backend: 30/30 tests passing (100%)
- Frontend: All core features tested and working

## 3rd Party Integrations
- **OpenAI GPT-5.2** - Text generation via Emergent LLM Key

---
*Last Updated: December 31, 2025*
