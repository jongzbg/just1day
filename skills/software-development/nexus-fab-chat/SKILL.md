---
name: nexus-fab-chat
description: FAB Chat Widget implementation for Nexus Social (Next.js + NestJS + Socket.IO). Backend/WebSocket already complete — only frontend FAB Widget needs building.
created: 2026-05-04
tags: [nexus, chat, frontend, nextjs, socket-io]
---

# FAB Chat Widget — Implementation Plan

## Status

- **Backend WebSocket (NestJS):** ✅ Complete — `chat.gateway.ts`, `chat.service.ts`, `chat.controller.ts`
- **Frontend infrastructure:** ✅ Complete — `useChat.ts`, `useChatSocket.ts`, `chatApi.ts`, `types/chat.ts`
- **Frontend FAB Widget:** ⚠️ TODO — เป็นสิ่งที่ต้องสร้างใหม่

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  app/layout.tsx                                      │
│  └─ <FABChatProvider>                                │
│       └─ <FABWidget />  ← fixed bottom-right overlay │
│            ├─ FABButton (circular, badge)            │
│            └─ FABPanel (chat panel popup)            │
│                 ├─ FABConversationList                │
│                 └─ FABChatView (reuses ChatWindow)   │
└──────────────────────────────────────────────────────┘
```

FAB Widget ไม่ใช้ pages ใหม่ — เป็น **overlay component** ที่อยู่บนทุกหน้า

## Files to Create

### 1. `client/src/types/fab.ts`
```typescript
export type FABPanelState = 'closed' | 'list' | 'chat'
```

### 2. `client/src/contexts/FABChatContext.tsx`
React Context สำหรับ global FAB state:
- `panelState: FABPanelState` — 'closed' | 'list' | 'chat'
- `activeConversationId: string | null`
- `totalUnreadCount: number`
- `openPanel()` → panelState = 'list'
- `openChat(conversationId)` → panelState = 'chat', activeConversationId = id
- `closePanel()` → panelState = 'closed'
- `setUnreadCount(n)`

Context ไม่ต้องจัดการ socket — แค่ UI state

### 3. `client/src/hooks/useFABChat.ts`
Public hook ที่ expose:
```typescript
const { panelState, activeConversationId, totalUnreadCount,
        openPanel, openChat, closePanel, setUnreadCount } = useFABChat()
```

### 4. `client/src/components/chat/FABWidget.tsx`
Main component — รวม FAB button + panel

**Structure:**
```
<div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">
  {/* ── Chat Panel (shows when open) ── */}
  {panelState !== 'closed' && (
    <div className="w-[380px] h-[520px] max-h-[70vh]
                    bg-[#16181c] rounded-2xl shadow-2xl border border-[#2f3336]
                    flex flex-col overflow-hidden">
      {/* Panel content — FABConversationList or FABChatView */}
    </div>
  )}

  {/* ── FAB Button ── */}
  <button className="...">
    {/* Unread badge */}
    {/* Icon */}
  </button>
</div>
```

**Key behaviors:**
- Click FAB → `openPanel()` (show conversation list)
- Panel has header with "Support Chat" title + close button
- `panelState = 'list'` → show FABConversationList
- `panelState = 'chat'` → show FABChatView (reuses existing components)
- When FAB panel is open, FAB button gets subtle highlight ring

**Responsive:**
- Desktop: `w-[380px] h-[520px]`
- Mobile (<640px): `w-[calc(100vw-32px)] max-w-[380px] h-[70vh]`
- FAB button stays same size

### 5. `client/src/components/chat/FABConversationList.tsx`
Conversation list inside FAB panel — ใช้ existing `ConversationList` แต่ปรับให้ compact กว่าเดิม

**Differences from main messages page:**
- Header: "Support Chat" + minimize/close buttons
- Smaller list items (p-3 instead of p-4)
- Click item → `openChat(convId)`
- Empty state: "No messages yet"
- Shows avatar + name + last message preview + unread badge
- Does NOT use Link — all navigation via FABChatContext

**Key:** ใช้ `useChat` hook ผ่าน socket เพื่ออัปเดต conversations แบบ real-time เมื่อ panel เปิดอยู่

### 6. `client/src/components/chat/FABChatView.tsx`
Inline chat view inside FAB panel

**Uses existing components:**
- `ChatWindow` (re-styled for compact panel)
- `useChat` hook for real-time
- `useFABChat` for conversation context

**Key differences from full page:**
- No back button (instead: back arrow in header returns to list)
- Header: compact — avatar + name + back button + close
- Smaller padding/spacing
- Max height constraint from panel
- Enter key sends (same as full page)

**On send:**
1. Optimistic update (same as messages/[id]/page.tsx)
2. When message confirmed → socket broadcast → FABConversationList also updates (via shared useChat socket)

### 7. Update `client/src/components/layout/FAB.tsx`
Simplify — just trigger FAB context:
```tsx
'use client'
import { useFABChat } from '@/hooks/useFABChat'

export default function FAB() {
  const { openPanel, totalUnreadCount } = useFABChat()
  
  return (
    <button onClick={openPanel} className="fixed bottom-6 right-6 ...">
      {/* badge + icon */}
    </button>
  )
}
```
**Remove** `router.push('/messages')` — FAB now opens inline panel

### 8. Update `client/src/app/layout.tsx`
Wrap with FABChatProvider:
```tsx
import FABChatProvider from '@/contexts/FABChatContext'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <FABChatProvider>
          {children}
          <FABWidget />
        </FABChatProvider>
      </body>
    </html>
  )
}
```

### 9. Update `client/src/components/layout/MainLayout.tsx`
**Remove** `<FAB />` — FABWidget is now at root layout level (no duplicate)

### 10. Update `client/src/contexts/FABChatContext.tsx` — Unread Count Logic
- On mount: fetch all conversations via `chatApi.getConversations()`
- Count unread: sum of conversations where lastMessage.createdAt > lastReadAt
- Listen to `new_message` socket event → increment unread if panel is closed
- Listen to `messages_read` custom event (existing from full page) → decrement
- When panel opens (list or chat) → clear total unread
- When opening specific chat → mark as read via `chatApi.markAsRead()`

## Styling

**Theme:** Dark (Nexus default) — `bg-[#16181c]`, `border-[#2f3336]`, text white
**Accent:** `#1d9bf0` (Nexus blue) — badge, send button, active states
**Panel:** Rounded-2xl, shadow-2xl, border

## Key UX Details

1. **Unread badge:** Circular, red/orange, shows count (max "9+"). Positioned top-right of FAB
2. **Panel position:** Bottom-right, above FAB button (flex-col items-end)
3. **Close behavior:** Click X → `closePanel()`. Click outside panel → NOT closed (intentional)
4. **Back behavior:** Back button in chat view → `openPanel()` (return to list)
5. **Conversation list refresh:** On panel open, refetch conversations + listen to socket events
6. **Reconnect:** useChat/useChatSocket handles reconnection automatically
7. **Mobile:** Panel takes most of screen width on mobile

## Backend Events (already exist)

| Event | Direction | Purpose |
|-------|-----------|---------|
| `join_conversation` | C→S | Join room |
| `send_message` | C→S | Send message |
| `new_message` | S→C | Message confirmed/received |
| `typing_start/typing_stop` | C↔S | Typing indicator |
| `message_error` | S→C | Error handling |

## Conversation List Fetching

FAB panel ใช้ `chatApi.getConversations()` สำหรับ initial load
Real-time updates มาจาก socket events:
- `new_message` → update conversation's lastMessage + unread
- หรือ poll เมื่อ panel เปิดอยู่ (fallback)

## Gotchas

1. **Duplicate socket:** `useChat` is already called by both `messages/[id]/page.tsx` AND `FABChatView` — each creates its own socket instance? No — `getSocket()` in `socket.ts` is a singleton. Both hooks share the same socket. Listeners are scoped per hook instance. ✅ OK
2. **Double-mount:** FABChatContext and FABWidget both on same level in layout — FABWidget is OUTSIDE FABChatProvider? No, FABWidget is INSIDE FABChatProvider. Correct.
3. **SSR:** `useFABChat` uses `localStorage.getItem('token')` — must be inside a Client Component with `useEffect` guard
4. **Z-index:** FAB widget should be above everything — `z-[9999]`
5. **FAB in MainLayout removed:** Prevents double FAB
6. **Avatar URL:** Use existing `getAvatarUrl()` utility, NOT hardcoded DiceBear

## Related Existing Files

- `client/src/hooks/useChat.ts` — re-use, DO NOT modify
- `client/src/hooks/useChatSocket.ts` — re-use, DO NOT modify
- `client/src/components/chat/ChatWindow.tsx` — re-use (re-style for compact)
- `client/src/components/chat/MessageList.tsx` — re-use
- `client/src/components/chat/MessageBubble.tsx` — re-use
- `client/src/components/chat/MessageInput.tsx` — re-use
- `client/src/components/chat/ConversationList.tsx` — re-use logic, new wrapper
- `client/src/lib/chatApi.ts` — re-use
- `client/src/lib/avatarUtils.ts` — re-use
- `client/src/types/chat.ts` — re-use
- `client/src/components/layout/FAB.tsx` — MODIFY (simplify)
- `client/src/components/layout/MainLayout.tsx` — MODIFY (remove FAB)
- `client/src/app/layout.tsx` — MODIFY (add provider + widget)
