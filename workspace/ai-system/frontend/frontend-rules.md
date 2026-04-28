Frontend Rules:

- MUST use MainLayout for all authenticated pages
- MUST reuse Navbar component
- MUST use 3-column layout:
  - Left Sidebar
  - Center Content
  - Right Sidebar

State Management:
- Use React Query for server state
- Use lightweight state (Zustand) for UI

UX:
- Infinite scroll for feed
- Optimistic updates for like/repost
- Skeleton loading states

Performance:
- Avoid unnecessary re-renders
- Use memoization when needed