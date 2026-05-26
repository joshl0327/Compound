# Design: Auth Avatar, Reset-with-Cloud-Wipe, Security Audit

**Date:** 2026-05-26  
**Branch:** josh  
**Status:** Approved

---

## Overview

Three improvements to the Compound app:

1. **NavAvatar** — an auth-aware indicator in the sticky navbar showing the signed-in user's avatar (or a "Sign in" link for guests) with a popover for quick account actions.
2. **Reset Data** — the existing "Reset All Data" button gains an export prompt, cloud row deletion, and a sign-out step so the wipe is truly complete.
3. **Security audit** — add an explanatory comment to `supabaseClient.js` about the anon key; confirm `.gitignore` and `.env` are correct; document the manual GH Secrets and RLS verification steps.

---

## Section 1 — NavAvatar

### New file: `src/components/NavAvatar.tsx`

A self-contained component that reads auth state from `useAuth()` and accepts `setActiveTab` as a prop (typed `(tab: TabId) => void`).

**Props:**
```ts
interface NavAvatarProps {
  setActiveTab: (tab: TabId) => void
}
```

**Render states:**

| State | Renders |
|---|---|
| `loading === true` | `null` |
| `guestMode === true` | A text button: `"Sign in"` |
| `session` present | 32×32 circular avatar button |

**Guest mode "Sign in" button:**
- Styled identically to the Export/Import buttons — `var(--color-text-muted)`, no border, `background: none`, `font-size: 12px`, `font-weight: 500`.
- Hover: brightens to `var(--color-text)` (same hover behavior as Export/Import).
- Clicking calls `setActiveTab('settings')`.
- No visual difference in weight vs Export/Import — guest mode is a valid choice, not a downgrade prompt.

**Signed-in avatar button:**
- 32×32px circle, `border-radius: 50%`, `overflow: hidden`.
- If `session.user.user_metadata.avatar_url` is set: renders `<img src={avatarUrl} width={32} height={32} alt="" />`.
- Fallback (no avatar URL): colored circle with first letter of `session.user.user_metadata.full_name` or `session.user.email`. Background: `var(--color-accent-dim)`, text: `var(--color-accent)`, `font-size: 13px`, `font-weight: 600`.
- No visible border by default; subtle `outline: 2px solid var(--color-accent)` on focus for a11y.
- Clicking toggles the popover open/close.

**Popover:**
- Positioned `absolute`, top: `calc(100% + 8px)`, right: `0`.
- Width: `200px`.
- Background: `var(--color-surface)`, border: `1px solid var(--color-border)`, `border-radius: 6px`, `box-shadow: 0 4px 16px rgba(0,0,0,0.3)`, `z-index: 100`.
- Contents (top to bottom):
  1. **Identity row** — `padding: 12px 14px 10px`. Shows display name (`session.user.user_metadata.full_name`) if available, otherwise email. `font-size: 12px`, `color: var(--color-text-muted)`. Truncated with `text-overflow: ellipsis`.
  2. **Divider** — `1px solid var(--color-border)`.
  3. **Settings button** — full-width, left-aligned, `padding: 8px 14px`, `font-size: 13px`, `color: var(--color-text)`, `background: none`, no border. Hover: `background: var(--color-surface-2)`. Clicking calls `setActiveTab('settings')` and closes the popover.
  4. **Sign out button** — same styling as Settings button but `color: #f87171` (the existing danger red used elsewhere in the app). Clicking calls `signOut()` and closes the popover.
- **Outside-click close:** a `useEffect` attaches a `mousedown` listener to `document` when the popover is open; if the click target is not inside the wrapper ref, closes the popover and removes the listener.
- The avatar wrapper div has `position: relative` so the popover is anchored to it.

**Integration in `App.tsx`:**
- Import `NavAvatar` and render it inside the `flex-shrink-0` div after the Import button:
  ```tsx
  <div className="flex items-center gap-2 ml-6 flex-shrink-0">
    <button onClick={handleExport}>Export</button>
    <button onClick={handleImport}>Import</button>
    <NavAvatar setActiveTab={setActiveTab} />
  </div>
  ```
- A small left separator (`margin-left: 8px`, `padding-left: 8px`, `border-left: 1px solid var(--color-border)`) visually separates the avatar from Export/Import. This can be a wrapper `<div>` around just the avatar rather than adding inline styles to NavAvatar itself.

---

## Section 2 — Reset Data (SettingsTab + cloudSync)

### `src/lib/cloudSync.ts` — new export

```ts
export async function deleteFromCloud(): Promise<void>
```

- Calls `supabase.auth.getUser()`. If no user, returns immediately (no-op).
- Calls `.from('user_data').delete().eq('user_id', user.id).eq('key', 'compound_v4')`.
- On error: logs `[cloudSync] deleteFromCloud error:` with the error object, does not throw — caller proceeds regardless.

### `src/tabs/SettingsTab.tsx` — ResetModal component + updated resetAllData

**Inline `ResetModal` component** (defined in the same file, not exported):

A simple modal overlay rendered via a React portal or plain absolute positioning. Two sequential views:

**View 1 — Export prompt:**
> "Do you want to export a backup before deleting?"  
> Your data will be permanently deleted. You can download a copy first.

Two buttons:
- **Download & Continue** — triggers a JSON export inline (same `Blob` → `URL.createObjectURL` → `<a>` click pattern as `handleExport` in App.tsx; `data` is already available via `useData()` which SettingsTab already calls) → then advance to View 2
- **Skip** — advances to View 2 without exporting

**View 2 — Final confirmation:**
> "Delete all data?"  
> This will permanently delete all your data from this device and your cloud backup. You will be signed out. This cannot be undone.

Two buttons:
- **Delete Everything** — styled in danger red (`#f87171` border + text, `#2a0a0a` background — matches existing Reset button). Triggers the deletion sequence.
- **Cancel** — closes the modal.

**Deletion sequence (async, triggered by "Delete Everything"):**
1. `await deleteFromCloud()` — removes cloud row (no-op if guest)
2. `localStorage.removeItem('compound_v4')`
3. `localStorage.removeItem('compound_onboarding_done')`
4. `localStorage.removeItem('compound_profile_done')`
5. `await signOut()` — signs out of Supabase, clears guestMode
6. `window.location.reload()`

**`resetAllData()`** becomes an async function that sets a `showResetModal` state variable to `true` rather than showing a `window.confirm`. The ResetModal is rendered conditionally at the bottom of SettingsTab's JSX.

**signOut** must be pulled from `useAuth()` — it's already destructured in SettingsTab.

**Modal styling:**
- Overlay: fixed, full-screen, `background: rgba(0,0,0,0.6)`, `z-index: 200`.
- Dialog: centered, `max-width: 380px`, `background: var(--color-surface)`, `border: 1px solid var(--color-border)`, `border-radius: 8px`, `padding: 24px`.
- Title: `font-size: 15px`, `font-weight: 600`, `color: var(--color-text)`.
- Body: `font-size: 13px`, `color: var(--color-text-muted)`, `line-height: 1.6`.
- Button row: `display: flex`, `gap: 8px`, `margin-top: 20px`, `justify-content: flex-end`.

---

## Section 3 — Security Audit

### `src/lib/supabaseClient.js` — add comment

Add a comment block above the `createClient` call:

```js
// VITE_SUPABASE_ANON_KEY is Supabase's intentionally public "anon" key.
// Vite bakes all VITE_* env vars into the static bundle at build time, so
// this key is visible in the compiled JS — that is expected and safe.
// Security is enforced by Row Level Security (RLS) policies on the user_data
// table (auth.uid() = user_id), not by keeping this key secret.
// See: https://supabase.com/docs/guides/api/api-keys
```

### `.gitignore` — no changes needed

`.env` is already listed. `git ls-files .env` returns empty, confirming it has never been committed.

### Developer action items (manual, not automatable from the repo)

These must be verified by the developer in external dashboards:

1. **GH Secrets** — go to the repo → Settings → Secrets → Actions → `VITE_SUPABASE_ANON_KEY`. Confirm the value starts with `sb_publishable_`. If it still holds an `sb_secret_` value, update it to the publishable key.

2. **Supabase RLS** — go to Supabase dashboard → Table Editor → `user_data` → RLS policies. Confirm:
   - A SELECT policy with `auth.uid() = user_id`
   - An INSERT/UPDATE policy with `auth.uid() = user_id`
   - RLS is **enabled** on the table (the toggle is on)
   
   The `sb_secret_` key should exist only in the Supabase dashboard itself and any server-side environments — never in client code or GH Secrets for a static site.

---

## Files Changed

| File | Change |
|---|---|
| `src/components/NavAvatar.tsx` | **New** — avatar/guest indicator with popover |
| `src/App.tsx` | Add `<NavAvatar setActiveTab={setActiveTab} />` to navbar |
| `src/lib/cloudSync.ts` | Add `deleteFromCloud()` export |
| `src/tabs/SettingsTab.tsx` | Add inline `ResetModal`, rewrite `resetAllData()` |
| `src/lib/supabaseClient.js` | Add anon-key comment block |
| `.gitignore` | No changes |

---

## Out of Scope

- No changes to the AuthGate sign-in flow
- No changes to the cloud sync / save mechanism
- No database schema changes
- No new dependencies
