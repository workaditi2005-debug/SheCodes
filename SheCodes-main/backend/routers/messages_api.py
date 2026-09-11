from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Header, HTTPException

from core.storage import messages_store
from services import auth_service


router = APIRouter(tags=["messages"])


def _load_messages() -> list[dict[str, Any]]:
    payload = messages_store.read()
    return payload if isinstance(payload, list) else []


@router.post("/messages/send")
def send_message(body: dict[str, Any], authorization: str = Header(...)) -> dict[str, Any]:
    user = auth_service.require_user(authorization)
    text = str(body.get("text", "")).strip()
    recipient_id = str(body.get("recipient_id", "")).strip()
    if not text:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    if not recipient_id:
        raise HTTPException(status_code=400, detail="Recipient ID required.")

    users = auth_service.get_users()
    if recipient_id not in users:
        raise HTTPException(status_code=404, detail="Recipient not found.")

    sender_record = users.get(user["id"], {})
    if user.get("role") == "doctor":
        if recipient_id not in set(sender_record.get("patient_list", [])):
            raise HTTPException(status_code=403, detail="You can only message your enrolled patients.")
    else:
        if recipient_id != sender_record.get("assigned_doctor_id"):
            raise HTTPException(status_code=403, detail="You can only message your assigned doctor.")

    messages = _load_messages()
    message = {
        "id": str(uuid.uuid4()),
        "sender_id": user["id"],
        "sender_name": user["full_name"],
        "sender_role": user.get("role", "patient"),
        "recipient_id": recipient_id,
        "text": text,
        "timestamp": auth_service.utcnow_iso(),
        "deleted_by": [],
    }
    messages.append(message)
    messages_store.write(messages)
    return {"message": message}


@router.get("/messages/unread/count")
def unread_count(authorization: str = Header(...)) -> dict[str, int]:
    user = auth_service.require_user(authorization)
    user_id = user["id"]
    messages = _load_messages()
    count = sum(
        1
        for message in messages
        if message["recipient_id"] == user_id and user_id not in message.get("deleted_by", [])
    )
    return {"count": count}


@router.get("/conversations")
def get_conversations(authorization: str = Header(...)) -> dict[str, Any]:
    user = auth_service.require_user(authorization)
    user_id = user["id"]
    users = auth_service.get_users()
    messages = _load_messages()

    if user.get("role") == "doctor":
        allowed_ids = set(users.get(user_id, {}).get("patient_list", []))
    else:
        assigned = users.get(user_id, {}).get("assigned_doctor_id")
        allowed_ids = {assigned} if assigned else set()

    partners: dict[str, dict[str, Any]] = {}
    for other_id in allowed_ids:
        other_user = users.get(other_id)
        if other_user:
            partners[other_id] = {
                "user_id": other_id,
                "full_name": other_user.get("full_name", "Unknown"),
                "role": other_user.get("role", "patient"),
                "last_msg": None,
                "last_ts": "",
            }

    for message in messages:
        if user_id in message.get("deleted_by", []):
            continue
        if message["sender_id"] == user_id:
            other_id = message["recipient_id"]
        elif message["recipient_id"] == user_id:
            other_id = message["sender_id"]
        else:
            continue

        if other_id not in allowed_ids:
            continue

        if other_id not in partners or message["timestamp"] > partners[other_id]["last_ts"]:
            other_user = users.get(other_id, {})
            partners[other_id] = {
                "user_id": other_id,
                "full_name": other_user.get("full_name", "Unknown"),
                "role": other_user.get("role", "patient"),
                "last_msg": message["text"],
                "last_ts": message["timestamp"],
            }

    conversations = sorted(partners.values(), key=lambda item: item["last_ts"], reverse=True)
    return {"conversations": conversations}


@router.get("/messages/{other_user_id}")
def get_messages(other_user_id: str, authorization: str = Header(...)) -> dict[str, Any]:
    user = auth_service.require_user(authorization)
    user_id = user["id"]
    messages = [
        message
        for message in _load_messages()
        if (
            (message["sender_id"] == user_id and message["recipient_id"] == other_user_id)
            or (message["sender_id"] == other_user_id and message["recipient_id"] == user_id)
        )
        and user_id not in message.get("deleted_by", [])
    ]
    return {"messages": messages}


@router.delete("/messages/{message_id}")
def delete_message(message_id: str, authorization: str = Header(...)) -> dict[str, bool]:
    user = auth_service.require_user(authorization)
    messages = _load_messages()
    target_msg = next((m for m in messages if m["id"] == message_id), None)
    if not target_msg:
        raise HTTPException(status_code=404, detail="Message not found.")

    # Only participants may delete/hide a message
    if user["id"] not in (target_msg.get("sender_id"), target_msg.get("recipient_id")):
        raise HTTPException(status_code=403, detail="Unauthorized: You are not a participant in this message.")

    if user["id"] not in target_msg.get("deleted_by", []):
        target_msg.setdefault("deleted_by", []).append(user["id"])
        messages_store.write(messages)

    return {"ok": True}


