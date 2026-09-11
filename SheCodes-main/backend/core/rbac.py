"""
rbac.py — Role-Based Access Control (RBAC) Module for NeuroAid
=============================================================
Defines standard system roles, permissions, and validation helpers.
Screening output is never a clinical diagnosis.
"""
from __future__ import annotations

from enum import Enum
from typing import Any, Set


class Role(str, Enum):
    PATIENT = "patient"
    CAREGIVER = "caregiver"
    DOCTOR = "doctor"
    ADMIN = "admin"


class Permission(str, Enum):
    # Self-data permissions
    READ_OWN_PROFILE = "read_own_profile"
    UPDATE_OWN_PROFILE = "update_own_profile"
    READ_OWN_RESULTS = "read_own_results"
    SUBMIT_OWN_ASSESSMENT = "submit_own_assessment"
    MANAGE_OWN_REMINDERS = "manage_own_reminders"
    MANAGE_OWN_MEMORY_BANK = "manage_own_memory_bank"
    MANAGE_OWN_CONSENT = "manage_own_consent"

    # Care team / Clinician permissions (subject to enrollment & consent)
    READ_PATIENT_OVERVIEW = "read_patient_overview"
    READ_PATIENT_CLINICAL = "read_patient_clinical"
    MANAGE_PATIENT_REMINDERS = "manage_patient_reminders"
    MANAGE_PATIENT_MEMORY_BANK = "manage_patient_memory_bank"

    # Content & Admin permissions
    MANAGE_CONTENT = "manage_content"
    VIEW_AUDIT_LOGS = "view_audit_logs"


# Base role-to-permissions mapping
ROLE_PERMISSIONS: dict[Role, Set[Permission]] = {
    Role.PATIENT: {
        Permission.READ_OWN_PROFILE,
        Permission.UPDATE_OWN_PROFILE,
        Permission.READ_OWN_RESULTS,
        Permission.SUBMIT_OWN_ASSESSMENT,
        Permission.MANAGE_OWN_REMINDERS,
        Permission.MANAGE_OWN_MEMORY_BANK,
        Permission.MANAGE_OWN_CONSENT,
    },
    Role.CAREGIVER: {
        Permission.READ_OWN_PROFILE,
        Permission.UPDATE_OWN_PROFILE,
        Permission.READ_PATIENT_OVERVIEW,
        Permission.MANAGE_PATIENT_REMINDERS,
        Permission.MANAGE_PATIENT_MEMORY_BANK,
        Permission.VIEW_AUDIT_LOGS,
    },
    Role.DOCTOR: {
        Permission.READ_OWN_PROFILE,
        Permission.UPDATE_OWN_PROFILE,
        Permission.READ_PATIENT_OVERVIEW,
        Permission.READ_PATIENT_CLINICAL,
        Permission.MANAGE_PATIENT_REMINDERS,
        Permission.MANAGE_PATIENT_MEMORY_BANK,
        Permission.MANAGE_CONTENT,
        Permission.VIEW_AUDIT_LOGS,
    },
    Role.ADMIN: {
        Permission.READ_OWN_PROFILE,
        Permission.UPDATE_OWN_PROFILE,
        Permission.MANAGE_CONTENT,
        Permission.VIEW_AUDIT_LOGS,
    },
}


def get_permissions_for_role(role_name: str | None) -> Set[Permission]:
    if not role_name:
        return set()
    try:
        role = Role(role_name.lower())
        return ROLE_PERMISSIONS.get(role, set())
    except ValueError:
        return set()


def has_permission(user: dict[str, Any] | None, permission: Permission) -> bool:
    if not user:
        return False
    role_name = user.get("role")
    permissions = get_permissions_for_role(role_name)
    return permission in permissions
