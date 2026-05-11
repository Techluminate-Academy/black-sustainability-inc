# TODO: Address Feedback on Map Tour and Page Functionality

## 🛠 Task Overview
**Title:** Address Feedback on Map Tour and Page Functionality  
**Type:** Bug Fixes & UI Improvements  
**Assignee:** Jerry Bony  
**Priority:** High  

---

## ✅ Checklist of Tasks

### 🔄 Authentication & Session Behavior
- [ ] Investigate why users (especially with multiple Gmail/BSI logins) are being logged out unexpectedly in Safari and Chrome
- [ ] Verify if the guided tour or recent backend changes are invalidating sessions or cookies
- [ ] Ensure returning users are not forced to go through the full navigation just to reach the map

### 🖼 Map Image & Icon Loading
- [ ] Fix blurry image loading when users are not logged in (optimize fallback state)
- [ ] Improve conditional rendering logic to prevent default blurred image from showing if user is authenticated

### ❌ Broken UI Elements
- [ ] Identify and fix the missing widget/icon between the "Update Profile" and "Take Tour" buttons
- [ ] Confirm this works in both Safari and Chrome

### 📋 Footer Consistency
- [ ] Audit footer links on the map page
- [ ] Either:
  - [ ] Match the link titles with the homepage footer, or
  - [ ] Reuse the homepage footer component for consistency

### 📬 Missing Email Follow-up
- [ ] Send the rough draft of the guided tour script and detailed form instructions to the user for review

---

## 📝 Notes
- Based on email feedback received
- Priority: High - affects user experience and functionality
- Cross-browser testing required (Safari and Chrome)
- Session management investigation needed

## 🏷 Tags
`bug-fix`, `ui-improvement`, `authentication`, `map-functionality`, `cross-browser` 