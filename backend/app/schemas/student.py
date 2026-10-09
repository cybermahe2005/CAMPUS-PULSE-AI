"""Pydantic schemas for Student 360 profile and related models."""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class RiskLevel(str, Enum):
    HEALTHY = "healthy"
    WATCH = "watch"
    AT_RISK = "at_risk"
    CRITICAL = "critical"


class MomentumCategory(str, Enum):
    POSITIVE = "POSITIVE"
    STABLE = "STABLE"
    NEGATIVE = "NEGATIVE"


class StudentSegment(str, Enum):
    FUTURE_LEADER    = "future_leader"
    ACADEMIC_STAR    = "academic_star"
    HIDDEN_TALENT    = "hidden_talent"
    SILENT_DECLINER  = "silent_decliner"
    CRITICAL_SUPPORT = "critical_support"
    RECOVERABLE_RISK = "recoverable_risk"


class Skills(BaseModel):
    java:          Optional[float] = None
    python:        Optional[float] = None
    sql:           Optional[float] = None
    dsa:           Optional[float] = None
    communication: Optional[float] = None
    problemSolving:Optional[float] = None
    git:           Optional[float] = None
    javascript:    Optional[float] = None
    softSkill:     Optional[float] = None


class StudentSummary(BaseModel):
    studentId:          str
    name:               str
    department:         str
    semester:           int
    email:              Optional[str] = None
    rollNo:             Optional[str] = None
    # Core metrics
    cgpa:               float
    attendancePct:      float
    codingScore:        float
    aptitudeScore:      float
    mockInterviewScore: float
    lmsConsistency:     float
    # Computed scores
    successIndex:       Optional[float] = None
    academicReadiness:  Optional[float] = None
    placementReadiness: Optional[float] = None
    engagementHealth:   Optional[float] = None
    riskProbability:    Optional[float] = None
    riskLevel:          Optional[RiskLevel] = None
    momentum:           Optional[MomentumCategory] = None
    riskVelocity:       Optional[float] = None
    recoveryPotential:  Optional[float] = None
    segment:            Optional[StudentSegment] = None
    dataConfidence:     Optional[float] = None


class SHAPDriver(BaseModel):
    feature:      str
    value:        Any
    contribution: float    # positive = increases risk
    direction:    str      # "increases_risk" | "reduces_risk"
    displayLabel: str


class TrajectoryPoint(BaseModel):
    period:       str
    cgpa:         Optional[float] = None
    attendance:   Optional[float] = None
    codingScore:  Optional[float] = None
    riskProb:     Optional[float] = None
    successIndex: Optional[float] = None


class InterventionRecommendation(BaseModel):
    interventionId:  str
    name:            str
    targetProblem:   str
    reason:          str
    ownerRole:       str
    effortLevel:     str
    durationDays:    int
    expectedImpact:  str
    priorityScore:   float
    evidenceCount:   int


class InterventionHistory(BaseModel):
    interventionId:   str
    name:             str
    startDate:        datetime
    endDate:          Optional[datetime] = None
    status:           str
    beforeMetrics:    Dict[str, float]
    afterMetrics:     Optional[Dict[str, float]] = None
    observedImpact:   Optional[str] = None
    approvedBy:       Optional[str] = None


class Student360(BaseModel):
    # Identity
    studentId:          str
    name:               str
    department:         str
    semester:           int
    email:              Optional[str] = None
    rollNo:             Optional[str] = None
    # Raw metrics
    cgpa:               float
    attendancePct:      float
    codingScore:        float
    aptitudeScore:      float
    mockInterviewScore: float
    lmsConsistency:     float
    backlogCount:       int = 0
    certificationCount: int = 0
    eventCount:         int = 0
    skills:             Optional[Skills] = None
    # Computed (from latest prediction)
    successIndex:       Optional[float] = None
    componentScores:    Optional[Dict[str, float]] = None
    academicReadiness:  Optional[float] = None
    placementReadiness: Optional[float] = None
    engagementHealth:   Optional[float] = None
    riskProbability:    Optional[float] = None
    riskLevel:          Optional[RiskLevel] = None
    momentum:           Optional[MomentumCategory] = None
    riskVelocity:       Optional[float] = None
    recoveryPotential:  Optional[float] = None
    recoveryLabel:      Optional[str] = None
    segment:            Optional[StudentSegment] = None
    segmentLabel:       Optional[str] = None
    dataConfidence:     Optional[float] = None
    # Explainability
    shapDrivers:        Optional[List[SHAPDriver]] = None
    # Longitudinal
    trajectory:         Optional[List[TrajectoryPoint]] = None
    # Interventions
    recommendedInterventions: Optional[List[InterventionRecommendation]] = None
    interventionHistory:      Optional[List[InterventionHistory]] = None
    # Metadata
    lastUpdated:        Optional[datetime] = None


class StudentListResponse(BaseModel):
    students: List[StudentSummary]
    total:    int
    page:     int
    perPage:  int
    pages:    int


class StudentFilter(BaseModel):
    q:          Optional[str] = None
    department: Optional[str] = None
    semester:   Optional[int] = None
    riskLevel:  Optional[RiskLevel] = None
    momentum:   Optional[MomentumCategory] = None
    segment:    Optional[StudentSegment] = None
    sortBy:     str = "successIndex"
    sortAsc:    bool = False
    page:       int = Field(default=1, ge=1)
    perPage:    int = Field(default=30, ge=1, le=100)
