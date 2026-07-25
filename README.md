<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1vgaZne7rnszGhZtSVRnyt2DRWEmUrZ3T

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Optionally set `GEMINI_API_KEY` in the server environment. It is used only by
   the Python backend for AI-generated demo data and is never bundled into the browser.
3. Install Azure CLI if you want to use the live connection.
4. Run both the frontend and authentication backend:
   `python3 start_server.py`

Running only `npm run dev` starts the frontend; live authentication and AI demo
generation require `backend_server.py` on port 5000.
