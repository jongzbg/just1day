# Product Requirements Document: Modern Social Media Platform

## 1. Overview
A modern, responsive social media web platform UI with a clean, minimal aesthetic inspired by Twitter/X. The focus is on improved usability, a sleek dark theme, and a structured three-column layout.

## 2. Visual Style
- **Theme:** Dark theme (Black: #000000, Dark Gray: #16181C).
- **Typography:** Sans-serif (Inter/SF Pro). White primary text, gray secondary text.
- **Accents:** Blue (#1D9BF0) for links, hashtags, and active states.
- **Components:** 8-12px border radius, soft shadows, subtle separators.
- **Interactions:** Smooth hover states and transitions.

## 3. Core Screens & Features

### 3.1 Home Page (Logged In)
- **Three-Column Layout:**
    - **Left Sidebar:** "Top 100 Liked Users" and "Top 100 Reposted Users" modules.
    - **Main Feed:** Center-aligned.
        - **Post Composer:** Text (2000 chars), image upload, card-style.
        - **Feed:** List of posts with profile info, content, and actions (Like, Repost).
        - **Interactions:** Infinite scroll, skeleton loading, user info cards on hover.
    - **Right Sidebar:** "Trending Hashtags" module.
- **Navbar:** 
    - Left: Logo, Search bar with recent searches dropdown.
    - Center: "For You" and "Following" tabs with state retention.
    - Right: Notification icon, User avatar with dropdown (Account, Logout).

### 3.2 Home Page (Not Logged In)
- **Login Card:** Centered card with email/password inputs, "Log In", "Create New Account", and "Forgot Password".

### 3.3 Profile Page (`/:username`)
- **Profile Header:** Profile image, Name, Public/Private status, Stats (Following, Followers, Likes).
- **Actions:** "Edit Profile" button.
- **Content:** List of user's posts and reposts.

### 3.4 Edit Profile Page (`/settings`)
- **Form:** Editable First Name, Surname, Profile Image upload.
- **Actions:** Save and Cancel buttons.

### 3.5 Admin Dashboard (`/admin`)
- **Metrics:** Total users, Online users, Total posts/reposts/comments today.
- **Leaderboards:** Top 100 most liked/reposted users.

## 4. Technical & Behavioral Specs
- **Post Lifecycle:** Soft-delete after 24 hours.
- **Chat:** Floating real-time chat (WebSocket) with 24-hour message expiry.
- **Images:** Auto-conversion to WebP; generation of Thumb, Medium, and Full sizes.
- **State:** Persist UI states like selected tabs and interaction statuses.