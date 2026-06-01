# BSN Member Map — Testing Guide for Raina

Hi Raina and Kelyce,

Below is a step-by-step guide for testing the new member map updates.

**Where to test:** Use the staging link Jerry provides, or the live site once deployed.

**How to sign in:** Use the current test login process for the map (Mighty email at `/signin` — no separate map password). Jerry can confirm the correct login and test accounts before you begin. See also [MAP_QA_TEST_ACCOUNTS.md](MAP_QA_TEST_ACCOUNTS.md).

Please test on **both**:

- A computer
- A phone

Some items look different on mobile, especially the menu, tour, and animations.

For anything that does not work as expected, please note:

- The test section (e.g. A2, E1)
- What happened
- Your device and browser
- A screenshot if possible

You can report issues using **Map help** (question-mark icon in the menu) — the form creates a support ticket and gives you a ticket number.

---

## Important: Tester View Tool

Your account has a special testing tool that lets you preview the map as either a **paid** member or an **unpaid** member.

This does **not** change anyone’s real membership or billing status. It only changes what you see while testing.

- **Paid** members should see the full map experience.
- **Unpaid** members should have limited visibility.

### How to use the Tester View Tool

1. Sign in using the current test login process.
2. Look in the **bottom-right corner** of the map.
3. You should see a box labeled **Tester impersonation**, or a small button **Tester · OFF** — click it to open the full tester box.
4. You will see three buttons:
   - **View as Paid** — shows the map as a paid member.
   - **View as Unpaid** — shows the map as an unpaid member.
   - **Clear** — returns you to your normal view.
5. After selecting an option, the page may reload. The tester box should then show the current mode: **PAID**, **UNPAID**, or **OFF**.

If you do not see the tester tool on the live site, let Jerry know. It may not be enabled there yet.

---

## A. Tester View Checks

### A1 — Tester tool appears

After signing in, check the bottom-right corner of the map.

**Expected result:** The **Tester impersonation** box, or the **Tester · OFF** button, appears.

### A2 — View as Unpaid

1. Click **View as Unpaid**.
2. Wait for the page to reload.
3. Confirm the tester box says **UNPAID**.

**Expected result:** Unpaid member visibility should be limited. Your own pin and other unpaid members’ pins should not be visible.

### A3 — View as Paid

1. Click **View as Paid**.
2. Wait for the page to reload.
3. Confirm the tester box says **PAID**.

**Expected result:** Paid member visibility should return, and member pins should be visible again.

### A4 — Clear tester view

1. Click **Clear**.
2. Confirm the tester box says **OFF**.

**Expected result:** The map returns to your normal view.

---

## B. Profile Editing

### B1 — Open profile editor

Click **My profile** in the top menu.

**Expected result:** A profile box opens on top of the map. You should stay on the map page.

### B2 — Edit and save profile

1. Change the **First Name**, **Organization**, or **Bio** field.
2. Click **Save Profile**.

**Expected result:** You should see a confirmation message saying the map listing will update in a few seconds. The profile box should close.

### B3 — Confirm changes saved

Open **My profile** again.

**Expected result:** Your updated information should appear.

### B4 — First name required

1. Open **My profile**.
2. Delete the first name.
3. Try to save.

**Expected result:** The profile should not save until a first name is added.

### B5 — Instructions are clear

Open **My profile** and review the instructions.

**Expected result:** The profile box should explain how to update your map listing. It should also include a link to **My location** and explain that member level is controlled by BSN.

---

## C. Location Update

### C1 — Open location editor

Click **My location** in the menu.

**Expected result:** A location box opens on top of the map. The page should not jump away from the map.

### C2 — Set a location

1. Type a city, such as **Atlanta**.
2. Choose one of the suggested locations from the dropdown list.
3. Click **Save Location**.

**Expected result:** A confirmation message appears. The box closes, and the map recenters on the selected location.

### C3 — Must choose from the suggested list

1. Type a city or location.
2. Do **not** select a suggestion.
3. Click **Save Location**.

**Expected result:** You should be asked to choose a location from the list before saving.

---

## D. Profile Preview

### D1 — Open profile preview

Click your **profile photo** in the top-right area (desktop) or use **View profile** in the phone menu.

**Expected result:** A box titled **Your map profile** opens showing:

- Name
- Photo
- Email
- Location
- Organization
- Bio
- Member level

This is a **preview only**. You should **not** see the location edit form inside this box.

### D2 — Info icon (ℹ) at top of profile popup

1. In the profile preview header, find the small **ℹ** icon next to **Your map profile**.
2. On a computer, hover over it; on a phone, tap it.

**Expected result:** A short explanation appears: you can update the rest of your profile information in the Black Sustainability Network.

### D3 — Member level help icon (?)

Find the small **?** next to **Member level**.

- On a computer: hover over it.
- On a phone: tap it.

**Expected result:** A short explanation appears about unpaid plan visibility and how members can update their plan status through the Black Sustainability Network.

**Recommended check:** Use **View as Unpaid** from the tester tool and confirm the map behavior matches the explanation.

### D4 — Black Sustainability Network link

Click **Visit the Black Sustainability Network** in the profile preview footer.

**Expected result:** The Black Sustainability Network website opens in a new tab.

### D5 — Edit from the menu (not inside preview)

The profile **preview** does not include **Edit profile** or **My location** buttons inside the box.

1. Close the preview.
2. From the top menu, open **My profile** and **My location** separately.

**Expected result:** **My profile** opens the profile editor. **My location** opens the location editor.

---

## E. Map Help / Report an Issue

### E1 — Open Map help

Click the **Map help** question-mark icon in the menu (next to your profile photo on desktop; labeled **Map help** in the phone menu).

**Expected result:** A **Map help** box opens with the message:

> Running into any issues? Let us know here:

Below that you should see a form to describe the issue (not an external Google Form).

### E2 — Submit a test ticket

1. Type a short test message (e.g. “QA test — please ignore”).
2. Click **Submit ticket**.
3. Wait for the success message.

**Expected result:**

- You see a confirmation with a ticket number (format **BSN-000123**).
- If your account has an email on file, you should receive a confirmation email with the same ticket number.
- Click **Done** to close the help box.

### E3 — Public support page (optional)

1. Open **Map help** again.
2. At the bottom, click **Open public support page**.

**Expected result:** The full-page support form at `/support` opens. You can use this when not signed in or if you prefer a larger form.

Please use **Map help** or `/support` to report anything that does not work correctly during testing. Include your ticket number when following up.

---

## F. Menu and Layout Checks

### F1 — Computer menu

On a computer, review the top menu.

**Expected result:** The menu should look clean and organized. **My profile**, **My location**, account actions, **Map help**, **Take a tour**, and return-home links should be easy to find.

### F2 — Phone menu

1. Open the map on a phone.
2. Tap the menu icon.
3. Review the menu.

**Expected result:** The menu should open smoothly. Links should be centered, buttons should be easy to tap, and the map behind the menu should look slightly dimmed.

### F3 — Close phone menu

Tap a link, tap outside the menu, or press **Esc** if using a keyboard.

**Expected result:** The menu should close smoothly.

---

## G. Location Prompt

This only applies if your account does **not** already have a saved location.

### G1 — Location prompt appears

After signing in, check whether the map asks you to confirm or add your location.

**Expected result:** If your account is missing a location, you should be prompted to add one.

### G2 — Add location from the prompt

1. Follow the prompt.
2. Choose a location from the suggested list.
3. Save.

**Expected result:** Your location saves successfully, and the prompt no longer appears.

### G3 — Don’t ask again

1. If the prompt appears, choose **Don’t ask again**.
2. Sign out and sign back in.

**Expected result:** The location prompt should not appear again.

---

## H. Take a Tour (guided walkthrough)

The map includes an interactive **Take a tour** in the menu. It has **five steps** and ends on your profile photo, map help, and profile info.

### H1 — Start the tour

1. Sign in.
2. In the menu, click **Take a tour**.

**Expected result:** A guided overlay starts. You can use **Next**, **Back**, and **Skip** as needed.

### H2 — Steps 1–4 (map basics)

Complete the first four steps and confirm each makes sense:

| Step | Topic | What it highlights |
|------|--------|-------------------|
| 1 | Welcome | The main map — zoom and explore |
| 2 | Markers | Map markers and zoom controls |
| 3 | Search | Search bar and industry filter |
| 4 | Directory | Member list in the sidebar |

**Expected result:** Each step points at the right part of the screen and the text is easy to read.

### H3 — Step 5 (profile, info, help)

On the **last step**, the tour should highlight your **profile photo** and **Map help** area in the nav.

**On a phone:** The menu may open automatically for this step so you can see profile photo and help.

**Expected result:** The final step explains:

- **Profile photo** — opens a preview of what others see on the map.
- **ℹ Info** — inside that profile popup, use the info icon at the top to learn how to update your full profile in the Black Sustainability Network.
- **Help (?)** — report map issues; the app creates a support ticket and emails you a ticket number.

### H4 — Finish or skip

1. Complete the tour through the last step, **or** click **Skip**.
2. Confirm the tour closes and you can use the map normally.

**Expected result:** The tour ends without errors. You can start it again from **Take a tour** anytime.

### H5 — Tour matches real UI

After the tour, manually check:

1. Profile photo → opens **Your map profile** preview (section D).
2. **ℹ** in that preview → shows the Network update hint (section D2).
3. **Map help** → opens the ticket form (section E).

**Expected result:** What the tour describes matches what you see when you use those controls.

---

## Final Testing Notes

The most important things to confirm are:

- Paid and unpaid views behave correctly (section A).
- Profile updates save and appear correctly (section B).
- Location updates work smoothly (section C).
- Profile preview shows the right information, including **ℹ** and **?** hints (section D).
- Map help and ticket submission work (section E).
- Desktop and mobile menus look clean and easy to use (section F).
- Location prompt behavior (section G), if applicable.
- **Take a tour** covers all five steps and matches the real profile/help UI (section H).

Once these items pass, the new map updates are ready for final review.

---

## Quick reference for testers

| Topic | Doc |
|-------|-----|
| Test emails (paid / unpaid) | [MAP_QA_TEST_ACCOUNTS.md](MAP_QA_TEST_ACCOUNTS.md) |
| Staff impersonation env | `.env.example` (`BSN_IMPERSONATE_*`) |
