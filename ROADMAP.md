# OpenHiNotes Feature Roadmap

*Created: 2026-04-11*

---

## Phase 1 — Foundation & Fixes (High Priority)

These fix existing pain points and lay groundwork for later features.

### 1.1 — Fix Code Block Rendering in Chat Output
**Effort:** Small
**Why first:** Broken rendering undermines trust in the whole chat/summary feature. Quick win.
**Scope:** Fix markdown rendering in the LLM chat and summary output so fenced code blocks, inline code, and other markdown elements display correctly. Likely a frontend issue — check the markdown renderer component (possibly missing syntax highlighting library or incorrect sanitization stripping `<pre>`/`<code>` tags).

### 1.2 — Mobile Browser Responsiveness
**Effort:** Medium
**Why first:** Expands usability to a common use case (reviewing transcripts on the go). Affects every other feature built after this.
**Scope:**
- Audit all pages for mobile viewport issues (sidebar, tables, player controls, modals)
- Make the sidebar collapsible / drawer-based on small screens
- Ensure upload flow works on mobile (file picker, progress)
- Test transcript reading view, speaker editor, and chat on narrow viewports
- Touch-friendly controls for audio playback

---

## Phase 2 — Whisper vs Record Differentiation (Core New Feature)

This unlocks a new category of usage and is the foundation for whisper-specific features.

### 2.1 — Backend: Recording Type Model & Detection
**Effort:** Medium
**Scope:**
- Add `recording_type` enum (`record` / `whisper`) to the Transcription model
- New Alembic migration, default existing records to `record`
- Detect type at upload time by parsing `original_filename` (pattern: `Wip` → whisper, `Rec` → record)
- Skip diarization for whisper uploads (`diarize: false` to VoxHub)
- Add `recording_type` filter to the transcriptions list endpoint

### 2.2 — Frontend: Unified Recordings Page with Type Awareness
**Effort:** Medium
**Scope:**
- Add filter tabs or toggle on the Recordings/Transcriptions page: All / Records / Whispers
- Show a visual indicator (icon or badge) for whisper vs record entries
- Different default actions per type (e.g., whisper goes to whisper view, record goes to transcript view)

### 2.3 — Frontend: Dedicated Whisper View Page
**Effort:** Medium
**Scope:**
- New page for viewing transcribed whispers — note-style layout, no speaker timeline
- Rich markdown rendering with support for:
  - Checkboxes / checklists (interactive toggle)
  - Headings, bold, italic, lists
  - Code blocks (reuse fix from 1.1)
- Checkbox state persistence (store in transcription metadata or a new field)
- This rich markdown support should also benefit standard record summaries (checklists in meeting action items, etc.)

### 2.4 — Templates: Whisper-Specific Templates
**Effort:** Small-Medium
**Scope:**
- Add a `target_type` field to `SummaryTemplate` model (`record` / `whisper` / `both`), default `both` for existing templates. This is a **separate axis** from the existing `category` field (RH, cybersec, sales, health, etc.) — `category` stays semantic (what domain), `target_type` stays functional (what kind of recording).
- Single templates menu with two filtering dimensions: type filter (record / whisper / all) + existing category tags
- On upload/summarize flow, auto-set the type filter based on the recording type so users only see relevant templates
- Filter template list in UI based on the recording type being processed
- Create default whisper templates: "Quick idea summary," "Shopping / grocery list," "Action items checklist," "Voice memo to clean notes"

---

## Phase 3 — Groups & Permissions Enhancement

### 3.1 — User-Created Groups
**Effort:** Medium
**Scope:**
- Add admin setting: `allow_user_group_creation` (boolean, default false)
- Add `owner_id` field to `UserGroup` model (migration, backfill with `created_by` for existing groups)
- Update groups router:
  - Non-admin users can create groups when setting is enabled
  - Creator (owner) can add/remove members in their own groups
  - Creator controls a `sharing_policy` on the group: `creator_only` (only owner can share to group) or `members_allowed` (any member can share to group)
  - Admins retain full control over all groups
- Update frontend:
  - Move group creation out of admin-only area (conditionally, based on setting)
  - Group detail page shows owner and sharing policy
  - Members see groups they belong to, owners see a "My Groups" section

### 3.2 — Sharing Policy on User Groups
**Effort:** Small (builds on 3.1)
**Scope:**
- `sharing_policy` enum on `UserGroup`: `creator_only` / `members_allowed`
- PermissionService checks this policy when a user tries to create a ResourceShare targeting a group
- UI: toggle in group settings for the owner

---

## Phase 4 — Template Ecosystem & User Empowerment

### 4.1 — User-Created Templates
**Effort:** Medium
**Scope:**
- Allow regular users to create templates (currently possible in the model but may be UI-gated)
- User templates are private by default (visible only to creator)
- Add `visibility` field: `private` / `pending_review` / `public`
- "Submit for review" action sets status to `pending_review`

### 4.2 — Admin Template Review Flow
**Effort:** Small-Medium
**Scope:**
- Admin page section: pending template submissions
- Admin can approve (→ `public`), reject (→ back to `private` with optional feedback), or edit before approving
- Notification to user on approval/rejection (if email/notification system in place)

---

## Phase 5 — Export & Productivity

### 5.1 — Export Options
**Effort:** Medium
**Scope:**
- Export formats:
  - `.txt` — plain text with speaker labels and timestamps
  - `.srt` / `.vtt` — subtitle format (great for video workflows)
  - `.docx` — formatted document with speaker labels, timestamps, and summary sections
  - `.md` — markdown export
- Export endpoint: `GET /api/transcriptions/{id}/export?format=txt|srt|docx|md`
- Frontend: export dropdown button on transcription detail page
- For whispers: export as `.md` (with checkboxes preserved) or `.txt`

### 5.2 — Rich Markdown in Record Summaries
**Effort:** Small (builds on 2.3 renderer)
**Scope:**
- Reuse the rich markdown renderer from the whisper view in the standard transcript summary view
- Checklists in meeting summaries (action items with checkboxes)
- Checkbox state persistence for summaries

---

## Phase 6 — Quality of Life

### 6.1 — Full-Text Search
**Effort:** Medium
**Scope:**
- PostgreSQL `tsvector` index on `transcriptions.text` and `transcriptions.segments`
- Search endpoint with ranking and snippet highlighting
- Frontend search bar on Transcriptions page with instant results
- Search across both records and whispers

### 6.2 — Favorites / Pinning
**Effort:** Small
**Scope:**
- `is_pinned` boolean on Transcription model
- Pin/unpin toggle in UI
- Pinned items shown at top of lists or in a dedicated section

### 6.3 — Batch Operations
**Effort:** Medium
**Scope:**
- Multi-select mode on transcription list
- Batch actions: move to collection, share with group, delete, export
- Backend: batch endpoints or accept arrays of IDs

### 6.4 — Keyboard Shortcuts for Audio Playback
**Effort:** Small
**Scope:**
- Play/pause (Space), skip back 5s (←), skip forward 5s (→), speed control (S)
- Visual hint showing available shortcuts
- Works on transcript detail page when audio player is present

### 6.5 — Notifications on Transcription Complete
**Effort:** Small-Medium
**Scope:**
- Browser push notification when a queued transcription completes (Service Worker)
- Optional email notification (leverage existing SMTP config)
- User preference toggle in settings

---

## Priority Summary

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| **P0** | 1.1 Fix code block rendering | Small | High — fixes broken existing feature |
| **P0** | 1.2 Mobile responsiveness | Medium | High — unlocks mobile usage |
| **P1** | 2.1 Recording type model | Medium | High — foundation for whisper features |
| **P1** | 2.2 Recordings page type awareness | Medium | High — immediate UX improvement |
| **P1** | 2.3 Whisper view page + rich markdown | Medium | High — core whisper experience |
| **P1** | 2.4 Whisper-specific templates | Small-Med | Medium — completes the whisper story |
| **P2** | 3.1 User-created groups | Medium | Medium — empowers users |
| **P2** | 3.2 Group sharing policy | Small | Medium — completes group story |
| **P2** | 5.1 Export options | Medium | High — frequently requested feature |
| **P3** | 4.1 User-created templates | Medium | Medium — user empowerment |
| **P3** | 4.2 Admin template review | Small-Med | Medium — governance |
| **P3** | 5.2 Rich markdown in record summaries | Small | Medium — quality of life |
| **P4** | 6.1 Full-text search | Medium | High — scales with usage |
| **P4** | 6.2 Favorites / pinning | Small | Low-Med — convenience |
| **P4** | 6.3 Batch operations | Medium | Medium — power users |
| **P4** | 6.4 Keyboard shortcuts | Small | Low-Med — power users |
| **P4** | 6.5 Transcription notifications | Small-Med | Medium — async workflow |

---

## Suggested Implementation Order

**Sprint 1:** 1.1 + 1.2 (fix what's broken, get mobile working)
**Sprint 2:** 2.1 + 2.2 (backend type detection + recordings page update)
**Sprint 3:** 2.3 + 2.4 (whisper view + templates)
**Sprint 4:** 5.1 (export — high value, independent of other features)
**Sprint 5:** 3.1 + 3.2 (groups)
**Sprint 6:** 4.1 + 4.2 (user templates + review flow)
**Sprint 7:** 6.x features (search, favorites, batch, shortcuts, notifications — pick based on user feedback)
