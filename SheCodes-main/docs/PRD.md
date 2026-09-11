# NeuroAid V4 — Project Requirements Document (PRD)

> **Document Version:** 4.0.0  
> **Target Event / Alignment:** Smart India Hackathon (SIH PS 26003) — Cognitive Gaming & Memory Assistance Platform for Elderly Dementia Patients  
> **Status:** Production Requirements Specification  

---

## 1. Executive Summary & Product Vision

**NeuroAid** is an end-to-end, multi-modal cognitive health platform designed for early-stage cognitive risk screening, longitudinal progression monitoring, adaptive cognitive gaming, and daily memory assistance for elderly dementia patients. Focused particularly on accessible health delivery in low-resource and remote regions—such as the North Eastern Region (NER) of India—NeuroAid bridges the gap between passive symptoms and clinical interventions.

### 1.1 Core Mission
To democratize early neurological screening and daily care for neurodegenerative conditions (such as Alzheimer's disease, Vascular Dementia, and Parkinson's disease) by deploying non-invasive, digital behavioral assessments, multi-lingual adaptive brain-training games, and an offline-first caregiver support infrastructure.

### 1.2 Key Differentiators
- **Multi-Modal Non-Invasive Screening:** Assesses 5 core cognitive domains (Speech, Memory, Reaction Time, Executive Function, Motor Coordination) using standard web APIs (Web Speech API, AudioContext, Canvas touch listeners).
- **4-Layer Clinical Adjustment Pipeline:** Normalizes raw performance against age brackets, education level (cognitive reserve), medical comorbidities, and session fatigue.
- **Multilingual & Cultural Localization (NER-Focus):** Full interface and voice guidance support for regional languages including Assamese (`as`), Bengali (`bn`), Meitei/Manipuri (`mni`), Hindi (`hi`), and English (`en`).
- **Offline-First Synchronization Engine:** Guarantees uninterrupted gaming, medication tracking, and routine support in connectivity-constrained rural healthcare centers, syncing seamlessly via IndexedDB and Service Workers when online.
- **Tri-Role Care Ecosystem:** Direct coordination between **Patients**, **Family Caregivers**, and **Neurologists/Clinicians**.

---

## 2. Target Users & Personas

NeuroAid serves four primary user cohorts across the healthcare delivery spectrum.

```
                   ┌───────────────────────────────────────┐
                   │    Elderly Dementia Patient (User)    │
                   └──────────────────┬────────────────────┘
                                      │
           ┌──────────────────────────┴──────────────────────────┐
           ▼                                                     ▼
┌───────────────────────┐                             ┌────────────────────┐
│   Family Caregiver    │                             │    Clinician /     │
│  (Son/Daughter/Spouse)│                             │    Neurologist     │
└──────────┬────────────┘                             └─────────┬──────────┘
           │                                                    │
           └──────────────────────────┬─────────────────────────┘
                                      ▼
                       ┌─────────────────────────────┐
                       │  Community Health Worker    │
                       │     (ASHA / ANM / PHC)      │
                       └─────────────────────────────┘
```

### Persona 1: Bhaben Borah (Elderly Dementia Patient)
- **Demographics:** Age 74, retired teacher residing in Tezpur, Assam. Speaks Assamese (`as`) and basic English. Diagnosed with mild cognitive impairment (MCI).
- **Needs:**
  - Simple, high-contrast, tremor-forgiving touchscreen user interface.
  - Audio voice guidance in Assamese explaining test instructions clearly.
  - Daily cognitive exercises that feel like enjoyable cultural puzzles rather than clinical exams.
  - Voice-assisted medication reminders and family memory orientation.
- **Pain Points:** Touchscreens with small buttons, complex navigation menus, anxiety during clinical evaluations, unstable cellular internet connection.

### Persona 2: Bikash Borah (Family Caregiver)
- **Demographics:** Age 42, software engineer residing in Guwahati, son of Bhaben.
- **Needs:**
  - Real-time updates on Bhaben’s daily game participation and medication adherence.
  - Automated anomaly alerts when Bhaben exhibits sudden drop-offs in motor stability or memory recall.
  - Easy patient-linking workflow via a simple 6-character code (`NER492`).
  - Educational guidance on managing behavioral dementia symptoms.
- **Pain Points:** Lack of visibility into early cognitive decline, difficulty coordinating with busy neurologists, guilt over leaving aging parents alone during work hours.

### Persona 3: Dr. Sunita Sarma (Neurologist / Clinician)
- **Demographics:** Age 51, Neurologist at Guwahati Medical College and Hospital (GMCH).
- **Needs:**
  - Objective, quantifiable data across 18 behavioral features (WPM, pause ratio, reaction variability, Stroop error rates) to supplement clinical MMSE/MoCA scores.
  - Ability to create custom reading passages and word-lists tailored to regional dialects.
  - Patient management portal to review longitudinal trend charts and approve/reject patient enrollment requests.
- **Pain Points:** Short 10-minute outpatient consultation windows, reliance on subjective self-reporting from family members, lack of baseline cognitive trends.

### Persona 4: Anjali Gogoi (Community Health Worker / ASHA Worker)
- **Demographics:** Age 34, Health Worker in a Primary Health Centre (PHC) in Darrang District.
- **Needs:**
  - Tablet-friendly tool that runs completely offline during rural field visits.
  - Fast 5-minute screening protocol to flag high-risk individuals for hospital referral.
- **Pain Points:** Zero internet connectivity in remote villages, lack of specialized neurological screening training.

---

## 3. Real-Life Use Cases & Scenarios

### Scenario A: Rural Screening & Early Detection (ASHA Field Visit)
Anjali visits Bhaben's household during a routine health drive. She opens NeuroAid on her offline-capable tablet in Assamese mode. Bhaben completes a 3-minute speech passage test and a reaction time test. The local algorithm calculates a normalized risk index adjusted for Bhaben’s age (74) and education (Postgraduate). The tool flags a *Mild Cognitive Risk* trend ($Z = -1.6$) driven by prolonged speech pause ratios ($>32\%$). Anjali saves the results offline, which automatically upload to the central system once her device re-connects to Wi-Fi at the district PHC.

### Scenario B: Daily Memory & Routine Assistance at Home
Every morning at 08:30 AM, NeuroAid plays a gentle voice chime in Assamese: *"Bhaben, time to take your morning blood pressure medication."* Bhaben taps a large green check button. At 11:00 AM, Bhaben launches the **Cognitive Games Hub** and plays *Bihu Memory Match* and *Pattern Sequence*. The game engine dynamically adjusts difficulty (DDA) based on his tap speeds and errors.

### Scenario C: Caregiver Monitoring & Anomaly Alerting
Bikash (in Guwahati) opens his **Caregiver Portal**. He views a dashboard card showing Bhaben’s weekly adherence ($92\%$ meds taken, 5 games completed). However, a yellow warning banner appears: *"Notice: Reaction time drift increased by $28\%$ over the past 3 days."* Bikash taps **Message Doctor** to send Bhaben’s longitudinal report directly to Dr. Sunita.

### Scenario D: Specialist Review & Treatment Adjustment
Dr. Sunita receives the encrypted patient report on her **Doctor Dashboard**. She views Bhaben’s 18-feature breakdown, compares the latest composite score against baseline records from 3 months ago, and writes a prescription adjustment note while adding a custom regional reading passage for Bhaben’s next assessment.

---

## 4. Core Product Features & Requirements

### 4.1 Multi-Modal Cognitive Risk Screening (5 Domains)
1. **Speech Analysis:** Measures Words-Per-Minute (WPM), speech speed deviation, pitch variability, pause frequency ratio ($>0.5\text{s}$ silences), and initial articulation delay.
2. **Memory Assessment:** Measures 10-word immediate recall accuracy, 3-minute delayed recall, intrusion error counts, recall latency, and sequence order matching.
3. **Reaction Time Test:** Evaluates mean reaction time ($ms$), response variance ($\sigma$), minimum latency, attention drift over 10 stimulus trials, and missed target count.
4. **Executive Function (Stroop Test):** Measures color-word incongruency conflict, error rates, and response latency under cognitive interference.
5. **Motor Coordination (Tapping Test):** Assesses 10-second finger-tapping frequency, inter-tap interval standard deviation, rhythm stability, and motor fatigue index.

### 4.2 Machine Learning & Clinical Calibration Layer
- **18-Dimensional Feature Extraction Engine:** Processes multi-modal client trials into a unified feature vector.
- **Disease-Specific Logistic Classification:** Evaluates risk probability models for Alzheimer's Disease, General Dementia, and Parkinson's Disease.
- **4-Layer Demographic Normalization:**
  - *Layer 1:* Age bracket z-score normalization ($20\text{--}39, 40\text{--}59, 60\text{--}75, 75+$).
  - *Layer 2:* Education level reserve offsets (No schooling to Postgraduate).
  - *Layer 3:* Medical comorbidity risk weighting (Hypertension, Diabetes, Stroke history, Family History).
  - *Layer 4:* Session fatigue & confidence gating (Retest trigger if confidence $<65\%$).

### 4.3 Multilingual & Localized Interface (NER Specific)
- **Language Switcher:** Instant runtime switching between Assamese, Bengali, Meitei (Manipuri), Hindi, and English.
- **Regional Content Pool:** Cultural reading passages (e.g., *Bihu Festival*, *Kaziranga Wildlife*, *Tea Gardens of Assam*) and native voice prompts.

### 4.4 Adaptive Cognitive Gaming Hub & 5-Tier DDA Engine
- **5 Clinical Brain Games:**
  1. **Memory Match (`game-match`):** Visuospatial associative memory with North Eastern cultural symbols (Assam Tea, Japi, Rhino, Dhol, Lotus, Flute, Bell, Fish, Diya, Peacock, Gamosa, Hornbill).
  2. **Sequence Recall (`game-sequence`):** Audio-visual working memory & attention span with synthesized color frequency chords.
  3. **Object Recognition (`game-object`):** Semantic artifact identification with contextual hints and voice answer options.
  4. **Pattern Completion (`game-pattern`):** Executive function & fluid reasoning over weather, growth, rhythm, and shape sequences.
  5. **Daily Routine Recall (`game-routine`):** Temporal orientation & procedural sequencing from morning tea to night rest.
- **5 Progressive Difficulty Levels:**
  - **Level 1 (Easy):** Foundational baseline (3 items / 3 pairs / 3 rounds) with relaxed $3.5\text{s}$ decision pacing.
  - **Level 2 (Medium):** Standard engagement (4 items / 4 pairs / 4 rounds) with $2.8\text{s}$ pacing.
  - **Level 3 (Hard):** Elevated cognitive stimulation (5 items / 6 pairs / 5 rounds) with $2.2\text{s}$ pacing.
  - **Level 4 (Pro):** High-focus challenge (6 items / 8 pairs / 7 rounds) with accelerated $1.8\text{s}$ pacing.
  - **Level 5 (Advance):** Master challenge (8 items / 10 pairs / 9 rounds) with high-speed $1.4\text{s}$ response benchmarks.
- **Deterministic Dynamic Difficulty Adjustment (DDA):**
  - **Promotion:** $\ge 85\%$ accuracy, $\le 15\%$ errors, response time within benchmark bounds, and no fatigue drift.
  - **Demotion:** $< 60\%$ accuracy, $\ge 35\%$ errors, or incomplete sessions to prevent cognitive distress.
  - **Fatigue Protection:** Analyzes latency drift across session halves; freezes level progression if pacing slows by $> 30\%$ to protect elderly dignity.
  - **Clinical Explainability:** Emits structured rationales (`"accuracy above target"`, `"stable response time"`) and recommended levels.

### 4.5 Memory & Routine Assistance Hub
- **Medication & Daily Routine Reminders:** Text and TTS voice alerts for medications, meals, and hydration.
- **Reminiscence Photo Wall:** Caregiver-uploaded family photographs tagged with names and voice notes to reinforce person recognition.
- **SOS Emergency Alert Button:** One-touch emergency trigger alerting designated caregivers via SMS/notification.

### 4.6 Tri-Role Authentication & Workflows
- **Patient Workflow:** Simple PIN/Password login, simplified navigation, large target buttons, audio guidance.
- **Caregiver Workflow:** Patient pairing management, daily activity logs, adherence metrics, anomaly alerts.
- **Doctor Workflow:** Full patient roster access, deep feature breakdowns, passage/wordset creation tools, medical notes.

### 4.7 Standalone Educational AI RAG Chatbot
- Clinically guarded educational assistant powered by RAG (Retrieval-Augmented Generation) querying authoritative neurological guidelines (NIH, WHO, Alzheimer's Association). Refuses medical diagnosis or medication prescription requests.

---

## 5. Non-Functional Requirements (NFRs)

| NFR Category | Requirement Specification |
|---|---|
| **Accessibility (WCAG 2.1 AA)** | Touch targets $\ge 48\times 48\text{px}$, color contrast ratios $\ge 4.5:1$, support for text scaling up to $200\%$, screen-reader compatible ARIA labels. |
| **Performance** | Page load under 1.5s on 3G connections; assessment risk evaluation response $< 400\text{ms}$; FPS $\ge 60$ for touch interactions. |
| **Offline Operating Range** | Complete functionality of assessments, cognitive games, and memory reminders without active internet connection; storage capacity for up to 100 offline session logs in IndexedDB. |
| **Data Privacy & Security** | Passwords salted and hashed with PBKDF2-HMAC-SHA256 (390,000 iterations); cryptographic session tokens (256-bit); atomic JSON store updates with file locks (`RLock`). |
| **Cross-Platform Compatibility** | Fully responsive web app optimized for evergreen mobile browsers (Chrome Android 110+, Safari iOS 16+, Edge), Android tablets, and desktop displays. |

---

## 6. Success Metrics & Key Performance Indicators (KPIs)

1. **Screening Accuracy & Sensitivity:** $\ge 88\%$ correlation with clinical MoCA/MMSE risk categorizations during validation trials.
2. **Caregiver Engagement Rate:** $\ge 75\%$ weekly active caregiver logins for linked patient tracking.
3. **Game Adherence Rate:** Average of $\ge 4$ cognitive game sessions completed per patient per week.
4. **Offline Sync Reliability:** $99.9\%$ successful batch sync of offline IndexedDB records upon network restoration with 0% data corruption.
5. **Localization Coverage:** $100\%$ UI strings and voice cues translated across all 5 target languages (Assamese, Bengali, Meitei, Hindi, English).
