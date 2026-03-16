# o3o-site Publishing Instructions
When I say "publish this:" followed by a PUBLISH BLOCK, do the following automatically with no confirmation needed:
## 1. Parse the PUBLISH BLOCK
Read the TYPE field to determine which content folder to use:
- think → content/think/
- learn → content/learn/
- build → content/build/
- ref → content/refs/
## 2. Create the content file
Generate a filename from the TITLE field:
- Lowercase everything
- Replace spaces with hyphens
- Remove special characters
- Add .txt extension
- Example: "Block Explorers Are Broken for Normal People" → block-explorers-are-broken-for-normal-people.txt
Save the full PUBLISH BLOCK text as-is into the correct folder.
## 3. Build the site
Run: node build.js
## 4. Commit and push
Run:
git add .
git commit -m "publish: [TITLE]"
git push
## 5. Confirm
Tell me: "Published — [TITLE] is live at https://ryan-otero.github.io/o3o-site/"
---
## Other commands
"build only" → run node build.js but do not push
"push" → commit and push whatever is staged without rebuilding
"status" → show me what content files exist and when they were last modified
"unpublish: [title]" → delete the matching content file, rebuild, and push
