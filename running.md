# How to Run the FIFA Threat Intelligence Platform

The platform consists of three main components: a **FastAPI Backend**, a **Next.js Dashboard**, and a **Chrome Extension**. 

You will need to run the backend and the dashboard in separate terminal windows, and then load the extension into your Chrome browser.

---

## 1. Prerequisites

Before you begin, ensure you have the following installed on your machine:
- **Python 3.10+** (with `pip`)
- **Node.js 18+** (with `npm`)
- **Google Chrome** browser

---

## 2. Start the Backend Server (FastAPI)

The backend handles the AI-powered URL analysis, domain intelligence, and visual similarity checks.

1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   # On Windows (PowerShell/CMD):
   python -m venv venv
   .\venv\Scripts\activate

   # On macOS/Linux:
   python -m venv venv
   source venv/bin/activate
   ```
3. Install the required Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Install the Playwright browser dependencies (required for the visual cloned-page detection module):
   ```bash
   playwright install chromium
   ```
5. **(Optional)** If you want to use the Gemini AI features (for OSINT campaign clustering and the AI assistant), create a `.env` file in the `backend/` directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
6. Start the FastAPI server using Uvicorn:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   *The backend API will now be running at `http://127.0.0.1:8000`. You can view the API documentation at `http://127.0.0.1:8000/docs`.*

---

## 3. Start the Frontend Dashboard (Next.js)

The dashboard allows you to monitor activity, visualize campaigns, and manage threat blocks.

1. Open a **new, separate terminal window** and navigate to the `my-app` directory:
   ```bash
   cd my-app
   ```
2. Install the Node.js dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   *The dashboard will now be running at `http://localhost:3000`. Open this URL in your browser.*

---

## 4. Install the Chrome Extension

The Chrome Extension provides real-time protection by injecting risk badges on search pages and actively blocking malicious domains.

1. Open Google Chrome.
2. Type `chrome://extensions/` into the URL bar and hit Enter.
3. Turn on **Developer mode** using the toggle switch in the top-right corner.
4. Click the **"Load unpacked"** button that appears in the top-left corner.
5. In the file explorer dialog, select the `extension-clean` folder from this project directory.
6. The "FIFA Threat Intel" extension is now installed. You can pin it to your browser toolbar for quick access to the popup menu.

---

## 🎉 You're All Set!

With the backend running, the dashboard active, and the extension installed, the FIFA Threat Intelligence Platform is fully operational. Try searching for links in Google or entering URLs into the dashboard to see it in action!
