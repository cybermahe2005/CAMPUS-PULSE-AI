"""RBAC — Permission constants, role hierarchy, responsibility engine."""
from enum import Enum
from typing import Set, List, Optional


# ══════════════════════════════════════════════════════════════
# 1. BASE ROLES
# ══════════════════════════════════════════════════════════════
class BaseRole(str, Enum):
    ADMIN               = "ADMIN"
    PRINCIPAL           = "PRINCIPAL"
    HOD                 = "HOD"
    FACULTY             = "FACULTY"
    STUDENT             = "STUDENT"


# ══════════════════════════════════════════════════════════════
# 2. RESPONSIBILITIES (additive, not separate roles)
# ══════════════════════════════════════════════════════════════
class Responsibility(str, Enum):
    CLASS_ADVISOR           = "CLASS_ADVISOR"
    MENTOR                  = "MENTOR"
    PLACEMENT_COORDINATOR   = "PLACEMENT_COORDINATOR"
    CR                      = "CR"               # Student: Class Representative


# ══════════════════════════════════════════════════════════════
# 3. FINE-GRAINED PERMISSIONS
# ══════════════════════════════════════════════════════════════
class Permission(str, Enum):
    # ── Dashboard
    DASHBOARD_VIEW          = "dashboard.view"
    DASHBOARD_ADMIN         = "dashboard.admin"

    # ── Students
    STUDENT_LIST            = "student.list"
    STUDENT_VIEW            = "student.view"
    STUDENT_VIEW_OWN        = "student.view.own"
    STUDENT_VIEW_ASSIGNED   = "student.view.assigned"
    STUDENT_ACADEMIC_MODIFY = "student.academic.modify"

    # ── Risk intelligence
    RISK_VIEW               = "risk.view"
    RISK_VIEW_SHAP          = "risk.view.shap"          # hidden from CR/Student
    RISK_SCORES_VIEW        = "risk.scores.view"        # hidden from CR/Student

    # ── Interventions
    INTERVENTION_VIEW       = "intervention.view"
    INTERVENTION_CREATE     = "intervention.create"
    INTERVENTION_UPDATE     = "intervention.update"
    INTERVENTION_APPROVE    = "intervention.approve"

    # ── Simulator
    SIMULATOR_RUN           = "simulator.run"

    # ── Placement
    PLACEMENT_DASHBOARD_VIEW    = "placement.dashboard.view"
    PLACEMENT_STUDENT_VIEW      = "placement.student.view"
    PLACEMENT_STUDENT_OWN       = "placement.student.own"
    PLACEMENT_READINESS_VIEW    = "placement.readiness.view"
    PLACEMENT_RISK_VIEW         = "placement.risk.view"
    PLACEMENT_SKILLS_VIEW       = "placement.skills.view"
    PLACEMENT_SKILL_GAP_VIEW    = "placement.skill_gap.view"
    PLACEMENT_JOBS_VIEW         = "placement.jobs.view"
    PLACEMENT_JOBS_CREATE       = "placement.jobs.create"
    PLACEMENT_MATCHING_RUN      = "placement.matching.run"
    PLACEMENT_TRAINING_VIEW     = "placement.training.view"
    PLACEMENT_TRAINING_CREATE   = "placement.training.create"
    PLACEMENT_INTERVENTION_CREATE = "placement.intervention.create"
    PLACEMENT_OUTCOME_VIEW      = "placement.outcome.view"
    PLACEMENT_OUTCOME_RECORD    = "placement.outcome.record"
    PLACEMENT_ANALYTICS_VIEW    = "placement.analytics.view"
    PLACEMENT_EXPORT            = "placement.export"

    # ── AI Copilot
    COPILOT_USE             = "copilot.use"
    COPILOT_ADMIN           = "copilot.admin"

    # ── Data quality
    DATA_QUALITY_VIEW       = "data_quality.view"

    # ── User management
    USER_MANAGE             = "user.manage"
    ROLE_MANAGE             = "role.manage"
    AUDIT_VIEW              = "audit.view"

    # ── Reports
    REPORT_VIEW             = "report.view"
    REPORT_EXPORT           = "report.export"


# ══════════════════════════════════════════════════════════════
# 4. BASE ROLE → PERMISSIONS MAP
# ══════════════════════════════════════════════════════════════
_P = Permission  # alias

BASE_ROLE_PERMISSIONS: dict[BaseRole, Set[Permission]] = {

    BaseRole.ADMIN: {p for p in Permission},  # ALL permissions

    BaseRole.PRINCIPAL: {
        _P.DASHBOARD_VIEW,
        _P.STUDENT_LIST, _P.STUDENT_VIEW,
        _P.RISK_VIEW, _P.RISK_VIEW_SHAP, _P.RISK_SCORES_VIEW,
        _P.INTERVENTION_VIEW, _P.INTERVENTION_APPROVE,
        _P.SIMULATOR_RUN,
        _P.PLACEMENT_DASHBOARD_VIEW, _P.PLACEMENT_STUDENT_VIEW,
        _P.PLACEMENT_READINESS_VIEW, _P.PLACEMENT_RISK_VIEW,
        _P.PLACEMENT_SKILLS_VIEW, _P.PLACEMENT_ANALYTICS_VIEW,
        _P.PLACEMENT_JOBS_VIEW, _P.PLACEMENT_OUTCOME_VIEW,
        _P.COPILOT_USE,
        _P.DATA_QUALITY_VIEW,
        _P.REPORT_VIEW, _P.REPORT_EXPORT,
        _P.AUDIT_VIEW,
    },

    BaseRole.HOD: {
        _P.DASHBOARD_VIEW,
        _P.STUDENT_LIST, _P.STUDENT_VIEW,
        _P.RISK_VIEW, _P.RISK_VIEW_SHAP, _P.RISK_SCORES_VIEW,
        _P.INTERVENTION_VIEW, _P.INTERVENTION_CREATE, _P.INTERVENTION_UPDATE, _P.INTERVENTION_APPROVE,
        _P.SIMULATOR_RUN,
        _P.PLACEMENT_DASHBOARD_VIEW, _P.PLACEMENT_STUDENT_VIEW,
        _P.PLACEMENT_READINESS_VIEW, _P.PLACEMENT_RISK_VIEW,
        _P.PLACEMENT_SKILLS_VIEW, _P.PLACEMENT_ANALYTICS_VIEW,
        _P.PLACEMENT_JOBS_VIEW, _P.PLACEMENT_OUTCOME_VIEW,
        _P.COPILOT_USE,
        _P.DATA_QUALITY_VIEW,
        _P.REPORT_VIEW, _P.REPORT_EXPORT,
    },

    BaseRole.FACULTY: {
        _P.DASHBOARD_VIEW,
        _P.STUDENT_LIST, _P.STUDENT_VIEW,
        _P.RISK_VIEW, _P.RISK_VIEW_SHAP, _P.RISK_SCORES_VIEW,
        _P.INTERVENTION_VIEW, _P.INTERVENTION_CREATE, _P.INTERVENTION_UPDATE,
        _P.SIMULATOR_RUN,
        _P.PLACEMENT_DASHBOARD_VIEW, _P.PLACEMENT_STUDENT_VIEW,
        _P.PLACEMENT_READINESS_VIEW, _P.PLACEMENT_RISK_VIEW,
        _P.PLACEMENT_SKILLS_VIEW, _P.PLACEMENT_SKILL_GAP_VIEW,
        _P.PLACEMENT_JOBS_VIEW,
        _P.COPILOT_USE,
        _P.REPORT_VIEW,
    },

    BaseRole.STUDENT: {
        _P.STUDENT_VIEW_OWN,
        _P.PLACEMENT_STUDENT_OWN, _P.PLACEMENT_READINESS_VIEW,
        _P.PLACEMENT_SKILLS_VIEW, _P.PLACEMENT_SKILL_GAP_VIEW,
        _P.PLACEMENT_TRAINING_VIEW,
        _P.SIMULATOR_RUN,
        _P.COPILOT_USE,
    },
}


# ══════════════════════════════════════════════════════════════
# 5. RESPONSIBILITY → ADDITIONAL PERMISSIONS
# ══════════════════════════════════════════════════════════════
RESPONSIBILITY_PERMISSIONS: dict[Responsibility, Set[Permission]] = {

    Responsibility.CLASS_ADVISOR: {
        _P.STUDENT_VIEW_ASSIGNED,
        _P.INTERVENTION_CREATE, _P.INTERVENTION_VIEW,
        _P.RISK_VIEW, _P.RISK_VIEW_SHAP,
        _P.SIMULATOR_RUN,
        _P.REPORT_VIEW,
    },

    Responsibility.MENTOR: {
        _P.STUDENT_VIEW_ASSIGNED,
        _P.INTERVENTION_VIEW, _P.INTERVENTION_CREATE,
        _P.SIMULATOR_RUN,
    },

    Responsibility.PLACEMENT_COORDINATOR: {
        _P.PLACEMENT_DASHBOARD_VIEW,
        _P.PLACEMENT_STUDENT_VIEW,
        _P.PLACEMENT_READINESS_VIEW, _P.PLACEMENT_RISK_VIEW,
        _P.PLACEMENT_SKILLS_VIEW, _P.PLACEMENT_SKILL_GAP_VIEW,
        _P.PLACEMENT_JOBS_VIEW, _P.PLACEMENT_JOBS_CREATE,
        _P.PLACEMENT_MATCHING_RUN,
        _P.PLACEMENT_TRAINING_VIEW, _P.PLACEMENT_TRAINING_CREATE,
        _P.PLACEMENT_INTERVENTION_CREATE,
        _P.PLACEMENT_OUTCOME_VIEW, _P.PLACEMENT_OUTCOME_RECORD,
        _P.PLACEMENT_ANALYTICS_VIEW, _P.PLACEMENT_EXPORT,
        _P.REPORT_VIEW, _P.REPORT_EXPORT,
    },

    Responsibility.CR: {
        # Class Rep: can see aggregate class stats only — no individual sensitive data
        _P.DASHBOARD_VIEW,
        _P.STUDENT_LIST,            # list without individual SHAP/risk scores
    },
}


# ══════════════════════════════════════════════════════════════
# 6. ROLE HIERARCHY (numerical rank — higher = more authority)
# ══════════════════════════════════════════════════════════════
ROLE_HIERARCHY: dict[BaseRole, int] = {
    BaseRole.ADMIN:     100,
    BaseRole.PRINCIPAL: 80,
    BaseRole.HOD:       60,
    BaseRole.FACULTY:   40,
    BaseRole.STUDENT:   10,
}


# ══════════════════════════════════════════════════════════════
# 7. EFFECTIVE PERMISSION RESOLVER
# ══════════════════════════════════════════════════════════════
def get_effective_permissions(
    role: str,
    responsibilities: Optional[List[str]] = None,
) -> Set[str]:
    """Return the full set of permission strings for a user."""
    try:
        base = BaseRole(role)
    except ValueError:
        base = BaseRole.STUDENT

    perms: Set[Permission] = set(BASE_ROLE_PERMISSIONS.get(base, set()))

    for resp_str in (responsibilities or []):
        try:
            resp = Responsibility(resp_str)
            perms |= RESPONSIBILITY_PERMISSIONS.get(resp, set())
        except ValueError:
            pass

    return {p.value for p in perms}


def has_permission(
    role: str,
    permission: str,
    responsibilities: Optional[List[str]] = None,
) -> bool:
    return permission in get_effective_permissions(role, responsibilities)


def is_senior_to(role_a: str, role_b: str) -> bool:
    """Returns True if role_a has higher hierarchy rank than role_b."""
    try:
        rank_a = ROLE_HIERARCHY.get(BaseRole(role_a), 0)
        rank_b = ROLE_HIERARCHY.get(BaseRole(role_b), 0)
        return rank_a > rank_b
    except ValueError:
        return False
