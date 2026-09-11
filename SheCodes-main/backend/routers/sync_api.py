"""Idempotent ingestion of changes captured while a patient was offline."""
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from core.storage import sync_receipts_store
from models.schemas import GameSessionSubmit
from routers import games_api
from services import auth_service, reminder_service

router = APIRouter(prefix="/sync", tags=["sync"])

class SyncAction(BaseModel):
    id: str = Field(min_length=1, max_length=100)
    type: str
    payload: Dict[str, Any] = Field(default_factory=dict)
    created_at: Optional[str] = None

class SyncBatch(BaseModel):
    actions: List[SyncAction] = Field(default_factory=list, max_length=100)

def _user(authorization: Optional[str]) -> Dict[str, Any]:
    if not authorization: raise HTTPException(status_code=401, detail="Authentication required.")
    user = auth_service.get_user_from_token(auth_service.extract_bearer_token(authorization))
    if not user: raise HTTPException(status_code=401, detail="Invalid session token.")
    return user

@router.post("/batch")
def batch_sync(payload: SyncBatch, authorization: Optional[str] = Header(default=None)) -> Dict[str, Any]:
    user = _user(authorization)
    receipts = sync_receipts_store.read()
    results = []
    for action in payload.actions:
        receipt = receipts.get(action.id)
        if receipt and receipt.get("user_id") == user["id"]:
            results.append({"id": action.id, "status": "duplicate"})
            continue
        try:
            if action.type == "GAME_SESSION":
                game = games_api.submit_game_session(GameSessionSubmit(**{**action.payload, "client_action_id": action.id}), authorization)
                outcome = {"session_id": game.session_id}
            elif action.type == "REMINDER_COMPLETE":
                reminder_id = action.payload.get("reminder_id")
                item = reminder_service.complete_reminder(reminder_id, user["id"], action.id)
                if not item: raise ValueError("Reminder no longer exists")
                outcome = {"reminder_id": reminder_id}
            elif action.type == "RHYTHM_SESSION_SUBMIT":
                from app.api.v1.games.rhythm_recall import submit_rhythm_session
                from models.schemas import RhythmRecallSubmission
                rhythm_sess = submit_rhythm_session(
                    RhythmRecallSubmission(**{**action.payload, "client_action_id": action.id}),
                    authorization,
                )
                outcome = {"session_id": rhythm_sess.session_id}
            else:
                raise ValueError("Unsupported sync action")
            receipts[action.id] = {"user_id": user["id"], "type": action.type, "outcome": outcome, "synced_at": auth_service.utcnow_iso()}
            results.append({"id": action.id, "status": "applied", **outcome})
        except Exception as error:
            results.append({"id": action.id, "status": "retry", "detail": str(error)})
    sync_receipts_store.write(receipts)
    return {"sync_status": "success", "results": results}
