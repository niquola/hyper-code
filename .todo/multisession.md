# Multisession draft

## Goal
- Store chat sessions on disk inside the project folder
- Show sessions list in the UI menu
- Persist a session model

## Proposed storage
- Directory: `.sessions/`
- One JSON file per session: `.sessions/<sessionId>.json`
- Optional index file for ordering: `.sessions/index.json`

## Session model (type)
- File: `chat_type_Session.ts`
- Fields (draft):
  - `id: string`
  - `title: string` (derived from first user message, editable later)
  - `createdAt: number`
  - `updatedAt: number`
  - `messages: Message[]`

## UI menu
- Add a sessions list to top menu (or left panel)
- Show: title + updated date
- Actions:
  - Open (load session)
  - New session
  - Delete (optional; confirm)

## Routes (draft)
- `page_chat_$id.tsx` — open session
- `form_session_new_POST.tsx` — create
- `form_session_delete_POST.tsx` — delete
- `frag_sessions.tsx` — list fragment for htmx refresh

## Open questions
- Exact folder name for sessions?
- Need migration from current in-memory session?
- Should sessions be auto-saved on each message?
- How should session titles be generated/edited?
