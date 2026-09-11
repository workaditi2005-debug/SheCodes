from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Header, HTTPException

from core.storage import content_store
from services import auth_service


router = APIRouter(tags=["content"])


def _content_payload() -> dict[str, Any]:
    payload = content_store.read()
    payload.setdefault("passages", [])
    payload.setdefault("word_sets", [])
    return payload


@router.get("/content")
def get_content(authorization: str = Header(...)) -> dict[str, Any]:
    auth_service.require_user(authorization)
    return _content_payload()


@router.post("/content/passage")
def add_passage(body: dict[str, Any], authorization: str = Header(...)) -> dict[str, Any]:
    user = auth_service.require_doctor(authorization)
    text = str(body.get("text", "")).strip()
    if len(text) < 30:
        raise HTTPException(status_code=400, detail="Passage must be at least 30 characters.")
    if len(text) > 800:
        raise HTTPException(status_code=400, detail="Passage must be under 800 characters.")

    content = _content_payload()
    content["passages"].append(
        {
            "id": str(uuid.uuid4()),
            "text": text,
            "added_by": user["full_name"],
            "added_role": user.get("role"),
            "created_at": auth_service.utcnow_iso(),
        }
    )
    content_store.write(content)
    return {"ok": True, "count": len(content["passages"])}


@router.post("/content/wordset")
def add_wordset(body: dict[str, Any], authorization: str = Header(...)) -> dict[str, Any]:
    user = auth_service.require_doctor(authorization)
    words = body.get("words", [])
    if not isinstance(words, list) or len(words) < 8:
        raise HTTPException(status_code=400, detail="Provide at least 8 words.")
    if len(words) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 words per set.")

    normalized = [str(word).strip().capitalize() for word in words if str(word).strip()]
    content = _content_payload()
    content["word_sets"].append(
        {
            "id": str(uuid.uuid4()),
            "words": normalized,
            "added_by": user["full_name"],
            "added_role": user.get("role"),
            "created_at": auth_service.utcnow_iso(),
        }
    )
    content_store.write(content)
    return {"ok": True, "count": len(content["word_sets"])}


@router.delete("/content/passage/{item_id}")
def delete_passage(item_id: str, authorization: str = Header(...)) -> dict[str, bool]:
    auth_service.require_doctor(authorization)
    content = _content_payload()
    content["passages"] = [item for item in content["passages"] if item["id"] != item_id]
    content_store.write(content)
    return {"ok": True}


@router.delete("/content/wordset/{item_id}")
def delete_wordset(item_id: str, authorization: str = Header(...)) -> dict[str, bool]:
    auth_service.require_doctor(authorization)
    content = _content_payload()
    content["word_sets"] = [item for item in content["word_sets"] if item["id"] != item_id]
    content_store.write(content)
    return {"ok": True}

