# NeuroAid V4 — Current Architecture & Repository Audit

> **Audit Date:** September 2026  
> **Repository:** `unnkarm/NeuroAid-AI`  
> **Status:** Behavioral screening and clinician workflow platform (Pre-SIH PS 26003 Alignment)

---

## Executive Summary

NeuroAid is an early-stage cognitive risk screening web application designed to assess cognitive indicators across five domains: Speech, Memory, Reaction Time, Executive Function, and Motor Coordination. The system combines client-side behavioral assessments, a FastAPI backend with simulated clinical calibration layers and logistic models, a secondary AI microservice with educational RAG capabilities, and a doctor-patient communication workflow.

This document presents a comprehensive, component-level technical audit of the existing codebase prior to implementing the features required by Smart India Hackathon Problem Statement 26003 (SIH PS 26003).

---

## 1. Frontend Framework & Architecture

### 1.1 Core Stack
- **Framework:** React 19.2.0 (`react`, `react-dom`)
- **Build Tool / Bundler:** Vite 7.3.1 (`@vitejs/plugin-react` v5.1.1)
- **Module System:** ES Modules (`"type": "module"`)
- **Target Browser Support:** Modern evergreen browsers supporting ES2022+ and Web Audio/Speech APIs.

### 1.2 Styling & Design System
- **CSS Framework:** Tailwind CSS 3.4.19 with PostCSS 8.5.6 and Autoprefixer 10.4.24 (also has `@tailwindcss/vite` 4.2.0 installed in dependencies).
- **Design Tokens:** Defined in `frontend/src/utils/theme.js` and `helpers.js`.
  - Dark-mode aesthetic: Primary background `#080808` / `#07070a`, lime accent `#C8F135`, soft cream `#FFFFFF`/`#f0ece3`.
  - Glassmorphic styling with backdrop-filter blur (`blur(24px) saturate(140%)`), translucent borders (`rgba(255,255,255,0.09)`), and radial glow highlights.
- **Dynamic Styles Injection:** `injectStyles()` in `theme.js` injects global CSS animations (`float-up`, `pulse-dot`, `twinkle`, `glow-pulse`, `scan-line`, `ghost-drift`) and Google Fonts (`DM Sans`).

### 1.3 Routing & Navigation
- **Routing Paradigm:** Custom state-based single-page application (SPA) routing. There is **no client-side router library** (such as `react-router-dom`).
- **Navigation State:** Managed at the root component `App.jsx` using three state variables:
  - `view`: Pre-auth and top-level views (`"landing"`, `"about"`, `"login"`, `"dashboard"`, `"doctor-dashboard"`).
  - `role`: Current user permission context (`"user"` for patients, `"doctor"` for clinicians).
  - `page`: Active screen inside the authenticated shell (`"dashboard"`, `"assessments"`, `"speech"`, `"memory"`, `"reaction"`, `"stroop"`, `"tap"`, `"results"`, `"progress"`, `"messages"`, `"doctors"` for patients; `"doctor-dashboard"`, `"patients"`, `"patient-detail"`, `"messages"`, `"content"` for doctors).

### 1.4 State Management & Context
- **Global Context:** `AssessmentContext.jsx` provides assessment trial states:
  - Tracks `speechData`, `memoryData`, `reactionData`, `stroopData`, `tapData`, `apiResult`, `loading`, `error`, and `completedCount`.
- **Session Persistence:** Managed directly through browser `sessionStorage`:
  - `neuroaid_token`: Active Bearer session token.
  - `neuroaid_user`: Serialized JSON object of the current authenticated user profile.
- **Data Visualization:** Custom SVG and CSS rendering (e.g., SVG `<polyline>` sparklines in `ProgressPage.jsx`, inline flexbox bar charts in `PatientDetail.jsx`, SVG animated dots in `MiniChart.jsx`). No external charting library (e.g. Chart.js, Recharts) is used.

### 1.5 Hardware & Web API Integrations
- **Web Speech API:** Utilizes `window.SpeechRecognition` / `window.webkitSpeechRecognition` for real-time speech transcription in `SpeechTest.jsx`.
- **Web Audio API:** Utilizes `AudioContext` and `AnalyserNode` for raw microphone frequency analysis, silence/pause detection, and audio energy measurement.
- **Fallback Recording:** Uses `MediaRecorder` when native speech recognition is unsupported.

---

## 2. Backend Framework & Architecture

### 2.1 Core Stack
- **Framework:** FastAPI (`fastapi>=0.111.0`)
- **ASGI Server:** Uvicorn (`uvicorn[standard]>=0.29.0`) running asynchronously
- **Validation Engine:** Pydantic v2 (`pydantic>=2.0.0`)
- **HTTP Client:** HTTPX (`httpx>=0.27.0`) for inter-service communication to the AI microservice
- **Python Version:** Python 3.12 compatible

### 2.2 Entry Point & Router Structure
- **Main Entry:** `backend/main.py` initializes the FastAPI application, registers CORS middleware, configures global exception handling, and mounts the active routers:
  ```python
  app.include_router(analyze_api.router, prefix="/api")
  app.include_router(auth_api.router, prefix="/api")
  app.include_router(messages_api.router, prefix="/api")
  app.include_router(content_api.router, prefix="/api")
  app.include_router(chat_api.router, prefix="/api")
  ```
- **Router Modularization:**
  - `routers/analyze_api.py`: Assessment pipeline execution, composite scoring, and longitudinal anomaly evaluation.
  - `routers/auth_api.py`: Registration, login, profile updates, and doctor-patient pairing workflows.
  - `routers/messages_api.py`: Threaded messaging between patients and their assigned doctors.
  - `routers/content_api.py`: Doctor management of reading passages and memory word pools.
  - `routers/chat_api.py`: User educational query handler with safety guardrails, proxying to `ai-service`.
  - *Legacy Routers:* `analyze.py`, `auth.py`, `chat.py`, `content.py`, and `messages.py` represent earlier V3/V4 implementations that were subsequently refactored into the `*_api.py` pattern.

### 2.3 Configuration & Settings
- Managed via `backend/core/settings.py` with immutable `@dataclass(frozen=True) Settings` loaded from environment variables (`APP_NAME`, `APP_VERSION`, `APP_ENV`, `API_HOST`, `API_PORT`, `ALLOWED_ORIGINS`, `DATA_DIR`, `AI_SERVICE_URL`, `AI_SERVICE_TIMEOUT`).

---

## 3. AI / ML Libraries & Scoring Pipeline

### 3.1 Backend ML Layer (`backend/services/ai_service.py` & `backend/core/ml_engine.py`)
- **Numerical Processing:** `numpy>=1.26.0` handles feature vectors, matrix dot products, and activation functions.
- **18-Dimensional Feature Vector:**
  1. **Speech (5):** `wpm`, `speed_deviation`, `speech_variability`, `pause_ratio`, `speech_start_delay`
  2. **Memory (5):** `immediate_recall_accuracy`, `delayed_recall_accuracy`, `intrusion_count`, `recall_latency`, `order_match_ratio`
  3. **Reaction (5):** `mean_rt`, `std_rt`, `min_rt`, `reaction_drift`, `miss_count`
  4. **Executive (2):** `stroop_error_rate`, `stroop_rt`
  5. **Motor (1):** `tap_interval_std`
- **Disease-Specific Logistic Models:**
  - Forward pass logistic regression: $P(\text{disease}) = \sigma(W^T X + b)$
  - Tuned weight vectors for:
    - **Alzheimer's Disease:** Heavy negative weights on memory recall and positive weight on pause ratio/intrusions.
    - **General Dementia:** Heavy weights on reaction time, reaction variability, Stroop error rate, and attention drift.
    - **Parkinson's Disease:** Heavy weights on motor tap interval standard deviation, reaction initiation delay, and bradykinesia indicators.
- **4-Layer Clinical Adjustment Pipeline (`backend/core/clinical_config.py`):**
  - **Layer 1 (Age Norms):** Z-score normalization against age brackets (20–39, 40–59, 60–75, 75+).
  - **Layer 2 (Education Correction):** Cognitive reserve adjustment (+0.05 for no schooling down to -0.02 for postgraduate).
  - **Layer 3 (Medical Comorbidities):** Risk multipliers for 7 conditions (diabetes, hypertension, stroke history, family Alzheimer's, Parkinson's Dx, depression, thyroid).
  - **Layer 4 (Fatigue Confidence):** Penalizes confidence if patient reports sleep deprivation, illness, or anxiety; triggers `recommend_retest` if confidence falls below 0.65.
- **Hybrid Scoring & Anomaly Detection (`backend/core/ml_engine.py`):**
  - Blended hybrid risk: $\text{Final Risk} = 0.6 \times \text{Clinical Risk} + 0.4 \times \text{Raw ML Risk}$.
  - 95% Confidence Interval calculation: $\text{Risk} \pm \text{Margin of Error}$.
  - Z-score based progress anomaly detection: Flags sudden performance drops ($Z < -1.5$ mild, $Z < -1.75$ significant, $Z < -2.5$ severe).

### 3.2 AI-Service Microservice (`ai-service/`)
- **Dependencies:** `fastapi`, `uvicorn`, `numpy`, `scipy`, `pydub`, `transformers`, `torch`, `librosa`, `openai-whisper`.
- **Current Status:**
  - Microservice endpoints exist (`/analyze` and `/rag/ask`).
  - Feature extraction functions in `ai-service/feature_extractor.py` contain simulated heuristic scoring algorithms with marked `# DUMMY` blocks awaiting final neural model weights (`speech_classifier.pt`, `memory_classifier.pt`).
  - `rag_service.py` and `knowledge_base/` enforce strict clinical safety guardrails (refusing diagnosis or medication inquiries) and query a curated index of authoritative neurological guidance (NIH, WHO, Alzheimer's Association).

---

## 4. Database & Persistence Architecture

### 4.1 Primary Storage Engine (`backend/core/storage.py`)
- **Storage Pattern:** Flat-file atomic JSON persistence (`JsonStore`).
- **Concurrency & Integrity:**
  - Read/write access synchronized via re-entrant locks (`threading.RLock`).
  - Atomicity guaranteed using temporary file writes (`tempfile.NamedTemporaryFile`) followed by an atomic file replace (`os.replace`) and filesystem flush (`os.fsync`).
- **Data Stores (`backend/data/`):**
  1. `users.json`: Dictionary of user records keyed by UUID (`id`, `full_name`, `email`, `password_hash`, `role`, `created_at`, clinical profile fields, doctor-patient links).
  2. `sessions.json`: Active session dictionary keyed by 64-character token hex (`token` -> `{user_id, created_at}`).
  3. `results.json`: Assessment history dictionary keyed by patient ID mapping to an array of up to 20 historical assessment result objects.
  4. `messages.json`: Array of message objects (`id`, `sender_id`, `recipient_id`, `text`, `timestamp`, `deleted_by`).
  5. `custom_content.json`: Object containing custom reading passages and memory word sets created by clinicians.

### 4.2 Firebase Configuration Analysis
- `frontend/src/firebase.js` defines an initialized Firebase configuration connecting to Firestore, Auth, and Analytics.
- **Critical Finding:** Firebase is **not installed** in `frontend/package.json` (`firebase` package is omitted from `dependencies`). The codebase was previously ported to the local FastAPI JSON API (`backend/data/`). Active views (`ProgressPage.jsx`, `ResultsPage.jsx`, `api.js`) do not use Firebase.

---

## 5. Authentication & Authorization

### 5.1 Security Mechanics
- **Password Hashing:** PBKDF2 with HMAC-SHA256, 390,000 iterations, and a 16-byte random salt (`backend/core/security.py`).
  - Format: `pbkdf2_sha256$390000$<salt_hex>$<derived_hex>`.
  - Includes constant-time verification (`hmac.compare_digest`) and backward compatibility for legacy SHA256 hashes.
- **Session Tokens:** 32-byte cryptographically secure random tokens generated via `secrets.token_hex(32)`.
- **Authorization Protocol:** Bearer token transmitted in the HTTP `Authorization` request header (`Bearer <token>`).

### 5.2 Roles & Access Control
- **Supported Roles:**
  - `patient`: Can run assessments, view personal results and trends, request doctor enrollment, and chat with their assigned doctor.
  - `doctor`: Can view all registered and enrolled patients, approve/reject enrollment requests, view deep longitudinal patient data, publish custom assessment content, and message enrolled patients.
- **Guard Functions:**
  - `require_user()`: Validates active session token.
  - `require_doctor()`: Validates active session and confirms role == `"doctor"`.
- **Enrollment Constraint:** Patients can only message their assigned doctor; doctors can only message enrolled patients whose requests they have approved.

---

## 6. Existing API Endpoints

### 6.1 Backend API Surface (`http://localhost:8000`)

| Method | Endpoint | Router | Auth Required | Description |
|---|---|---|---|---|
| `GET` | `/health` | `main.py` | No | System health check and environment status |
| `POST` | `/api/auth/register` | `auth_api.py` | No | Register new patient or doctor account |
| `POST` | `/api/auth/login` | `auth_api.py` | No | Authenticate user with role validation |
| `POST` | `/api/auth/logout` | `auth_api.py` | Yes | Invalidate active session token |
| `GET` | `/api/auth/me` | `auth_api.py` | Yes | Retrieve authenticated user profile |
| `PUT` | `/api/auth/me` | `auth_api.py` | Yes | Update basic user demographic fields |
| `PUT` | `/api/auth/profile-extended` | `auth_api.py` | Yes | Update extended clinical & health history fields |
| `GET` | `/api/auth/patients` | `auth_api.py` | Yes (Doctor) | List all registered patients for doctor review |
| `GET` | `/api/auth/doctors` | `auth_api.py` | Yes | List all registered doctors with credentials |
| `POST` | `/api/auth/doctors/enroll` | `auth_api.py` | Yes (Patient) | Submit enrollment request to a doctor |
| `POST` | `/api/auth/doctors/approve` | `auth_api.py` | Yes (Doctor) | Approve or reject a patient enrollment request |
| `GET` | `/api/auth/doctors/my-doctor` | `auth_api.py` | Yes (Patient) | Get patient's assigned and pending doctor details |
| `GET` | `/api/auth/doctors/pending-requests` | `auth_api.py` | Yes (Doctor) | Retrieve pending patient enrollment requests |
| `POST` | `/api/analyze` | `analyze_api.py` | Optional | Execute 18-feature assessment & risk calculation |
| `GET` | `/api/results/my` | `analyze_api.py` | Yes (Patient) | Retrieve patient's own history and progress trends |
| `GET` | `/api/results/patient/{id}` | `analyze_api.py` | Yes (Doctor) | Retrieve specific patient's assessment history |
| `POST` | `/api/messages/send` | `messages_api.py` | Yes | Send direct message between enrolled patient & doctor |
| `GET` | `/api/messages/unread/count`| `messages_api.py` | Yes | Retrieve total count of unread incoming messages |
| `GET` | `/api/conversations` | `messages_api.py` | Yes | List active conversation threads with last message |
| `GET` | `/api/messages/{user_id}` | `messages_api.py` | Yes | Retrieve full message thread with specific user |
| `DELETE`| `/api/messages/{id}` | `messages_api.py` | Yes | Soft-delete a message for the authenticated user |
| `GET` | `/api/content` | `content_api.py` | Yes | Retrieve custom reading passages & word sets |
| `POST` | `/api/content/passage` | `content_api.py` | Yes (Doctor) | Add custom reading passage for speech test |
| `POST` | `/api/content/wordset` | `content_api.py` | Yes (Doctor) | Add custom word set for memory recall test |
| `DELETE`| `/api/content/passage/{id}`| `content_api.py` | Yes (Doctor) | Delete custom reading passage |
| `DELETE`| `/api/content/wordset/{id}`| `content_api.py` | Yes (Doctor) | Delete custom memory word set |
| `POST` | `/api/chat` | `chat_api.py` | No | Educational chatbot proxy with guardrail filters |

### 6.2 AI Microservice Surface (`http://localhost:8001`)

| Method | Endpoint | File | Description |
|---|---|---|---|
| `GET` | `/` | `app.py` | AI service health check & version info |
| `POST` | `/analyze` | `app.py` | Standalone 4-layer heuristic risk scoring |
| `POST` | `/rag/ask` | `app.py` | RAG knowledge retrieval with medical guardrails |

---

## 7. Existing Cognitive Tests & Assessment Modules

Currently, the patient assessment suite consists of five active screening modules mounted in `AssessmentHub.jsx`, along with two unmounted components discovered in `frontend/src/components/`:

### 7.1 Active Assessment Modules
1. **Speech Analysis (`SpeechTest.jsx`):**
   - **Task:** Patient reads an on-screen passage aloud.
   - **Metrics Extracted:** Words per minute (WPM), speech speed deviation, pause ratio (Web Audio silence detection), speech initiation delay, filler words count ("uh", "um"), and word-level reading accuracy via Longest Common Subsequence (LCS).
2. **Memory Recall Test (`MemoryTest.jsx`):**
   - **Task:** Patient studies a 10-word target list, undergoes a distraction phase, and identifies targets from a randomized grid of 16 words (10 targets + 6 distractors).
   - **Metrics Extracted:** Immediate recall accuracy, delayed recall accuracy, recall latency (seconds to first selection), target selection order match ratio, and intrusion count (distractor clicks).
3. **Reaction Time Test (`ReactionTest.jsx`):**
   - **Task:** 7-round visual stimulus test. Patient clicks as soon as screen changes color.
   - **Metrics Extracted:** Mean reaction time (ms), reaction standard deviation, minimum RT, reaction drift (fatigue across rounds), and miss/false-start count.
4. **Executive Function Stroop Test (`StroopTest.jsx`):**
   - **Task:** 12 trials (4 congruent warm-up, 8 incongruent scored). Patient selects the font color rather than the written color word.
   - **Metrics Extracted:** Stroop error rate, mean reaction time, incongruent trial latency, and interference delay.
5. **Motor Tap Test (`TapTest.jsx`):**
   - **Task:** 10-second rapid screen tapping task.
   - **Metrics Extracted:** Inter-tap interval standard deviation (`tap_interval_std`), total tap count, and tap frequency (Hz), identifying motor timing irregularity and dysrhythmia.

### 7.2 Unmounted / Disconnected Tests
6. **Digit Span Test (`DigitSpanTest.jsx`):**
   - Forward digit span working memory test (sequences of 4 to 9 digits displayed sequentially).
   - *Status:* File exists in `components/`, but is **not referenced** in `AssessmentHub.jsx`, `App.jsx`, or `AssessmentContext.jsx`.
7. **Verbal Fluency Test (`FluencyTest.jsx`):**
   - 30-second timed category/letter word generation test measuring word retrieval speed, unique word count, repetitions, and inter-word pause durations.
   - *Status:* File exists in `components/`, but is **not referenced** in `AssessmentHub.jsx`, `App.jsx`, or `AssessmentContext.jsx`.

---

## 8. Existing Caregiver / Doctor Functionality

### 8.1 Doctor Capabilities
- **Doctor Roster & Dashboard (`DoctorDashboard.jsx`):** Filter and search all registered patients by risk classification (High, Moderate, Low, No data).
- **Clinical Overview Hub (`DoctorHome.jsx`):** High-level KPI cards, pending patient enrollment request management (Approve/Reject buttons), and patient quick-action cards.
- **Longitudinal Patient Details (`PatientDetail.jsx`):** Deep dive into an individual patient's records:
  - 5-domain performance bar charts (Speech, Memory, Reaction, Executive, Motor).
  - Assessment history table with anomaly flags.
  - Automated diagnostic note pre-filler based on risk category.
- **Custom Content Manager (`ContentManager.jsx`):** Allows doctors to create and delete tailored reading passages and memory word pools for cognitive assessments.
- **Messaging (`MessagesPage.jsx`):** Direct communication with enrolled patients.

### 8.2 Caregiver Capabilities (Current Status)
- **Finding:** There is currently **no dedicated Caregiver role or interface** in the system.
- Caregivers cannot register as family monitors.
- There are no features for daily routine reminders, medication tracking, hydration alerts, dementia reminiscence support, or SMS/emergency decline notifications.

---

## 9. Docker & Deployment Architecture

### 9.1 Root `docker-compose.yml`
```yaml
version: "3.9"
services:
  neuroaid-backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: neuroaid-backend
    ports:
      - "8000:8000"
    environment:
      APP_ENV: production
      DEBUG: "false"
      API_HOST: 0.0.0.0
      API_PORT: 8000
      ALLOWED_ORIGINS: "*"
      DATA_DIR: /app/data
      AI_SERVICE_URL: http://host.docker.internal:8001
      AI_SERVICE_TIMEOUT: 15
    volumes:
      - ./backend/data:/app/data
    restart: unless-stopped
```

### 9.2 Containerization Gaps
1. **Frontend Uncontainerized:** `frontend/` does not contain a `Dockerfile` and is not included in `docker-compose.yml`.
2. **AI Service Uncontainerized:** `ai-service/` does not contain a `Dockerfile` and is not orchestrated in Compose.
3. **Network Isolation:** Backend relies on `host.docker.internal:8001` to reach the AI service rather than using an internal bridge network.

---

## 10. Existing Reusable Components & Utilities

### 10.1 UI Component Library (`frontend/src/components/ui/` & `RiskDashboard.jsx`)
- `DarkCard.jsx`: Glassmorphic container with configurable hover lift, lime ambient glow, and specular top edge.
- `Btn.jsx`: Unified button supporting primary, secondary, and disabled styling states.
- `Badge.jsx`: Compact pill badge for status and risk level tags.
- `MiniChart.jsx`: Canvas-free SVG dot-and-line sparkline.
- `Sidebar.jsx`: Standard navigation sidebar with unread counter badges.
- `Stars.jsx`: Deterministic animated starfield canvas backdrop.
- `Shell`: Global layout wrapper managing desktop sidebar, mobile responsive slide-out drawer, header, and user session badge.
- `NeuroBot.jsx`: Floating chat widget with auto-scrolling message bubbles, quick-prompt pills, and offline fallback responses.

### 10.2 Audit Findings & Code Disconnects
1. **Missing `submitChat` export:** `NeuroBot.jsx` imports `submitChat` from `../services/api`, but `api.js` does not export this function, causing an error if fallback is not triggered.
2. **Unmounted Tests:** `DigitSpanTest.jsx` and `FluencyTest.jsx` call `useAssessment()`, but `AssessmentContext.jsx` lacks handlers for `setDigitSpanData` and `setFluencyData`.
3. **Orphaned Firebase Code:** `frontend/src/firebase.js` imports `firebase/app`, `firebase/auth`, `firebase/firestore`, and `firebase/analytics`, none of which are declared in `package.json`.
