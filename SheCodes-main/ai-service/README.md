# NeuroAid – AI Service

Cognitive risk assessment microservice for the **NeuroAid** hackathon project.  
Accepts speech audio, memory test results, and reaction times; returns a weighted risk score and categorical risk level.

---

## Quick Start

```bash
# 1. Navigate to the service folder
cd ai-service

# 2. (Recommended) Create a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start the development server
uvicorn app:app --reload
```

The API will be available at **http://localhost:8000**.  
Interactive docs: **http://localhost:8000/docs**

---

## Endpoint

### `POST /analyze`

**Request body (JSON):**

```json
{
  "speech_audio": "<base64-encoded-audio-string>",
  "memory_results": {
    "word_recall_accuracy": 80,
    "pattern_accuracy": 70
  },
  "reaction_times": [300, 280, 350, 310]
}
```

**Response:**

```json
{
  "speech_score": 55.0,
  "memory_score": 25.0,
  "reaction_score": 17.14,
  "risk_score": 33.43,
  "risk_level": "Low"
}
```

---

## Risk Level Thresholds

| Score Range | Risk Level |
|-------------|------------|
| 0 – 40      | Low        |
| 41 – 70     | Moderate   |
| 71 – 100    | High       |

---

## Scoring Formula

```
risk_score = 0.4 × speech_score + 0.4 × memory_score + 0.2 × reaction_score
```

Weights and thresholds are configurable in **`config.py`**.

---

## Folder Structure

```
ai-service/
├── app.py                  # FastAPI server & /analyze endpoint
├── feature_extractor.py    # Extracts speech / memory / reaction scores
├── scoring_engine.py       # Weighted composite score + risk level mapping
├── config.py               # Weights, thresholds, model paths
├── models/                 # Drop trained .pt / .onnx model files here
├── utils/
│   ├── audio_utils.py      # Audio decoding & MFCC extraction helpers
│   ├── text_utils.py       # Transcription cleaning & NLP helpers
│   └── data_processing.py  # Normalisation for memory & reaction data
├── requirements.txt
└── README.md
```

---

## Replacing Dummy Logic with Real Models

Each `extract_*` function in `feature_extractor.py` contains a clearly marked `# DUMMY` block.  
To upgrade:

1. **Speech** – load Whisper, transcribe `audio_b64`, run NLP features through `speech_classifier.pt`.  
2. **Memory** – feed normalised `memory_results` into `memory_classifier.pt`.  
3. **Reaction** – derive statistical features (mean, std, IQR) from `reaction_times` and run through `reaction_regressor.pt`.

Update `MODEL_PATHS` in `config.py` to point to your saved model files.

---

## Example `curl` Test

```bash
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "speech_audio": "dGVzdA==",
    "memory_results": {"word_recall_accuracy": 80, "pattern_accuracy": 70},
    "reaction_times": [300, 280, 350, 310]
  }'
```

---

*Built for the NeuroAid Hackathon — swap dummy logic for real AI when you're ready! 🚀*
