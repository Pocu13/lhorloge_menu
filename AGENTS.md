<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Menu dishes live in the `dishes` table and are read via `src/lib/menu-api.ts`; `src/lib/menu-data.ts` only holds static UI text, categories and allergen labels — why: admin edits must show up on the public menu.
- Admin writes go through the browser client and are gated by RLS `has_role(auth.uid(),'admin')`; username "admin" maps to a fixed email and the typed password is prefixed before sign-in — why: user asked for a short PIN below the auth minimum length.
