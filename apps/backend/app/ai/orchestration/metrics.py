"""Metrics collection. Source: Sprint 1.4 brief > Observability.

"Track: provider, model, latency_ms, input_tokens, output_tokens,
estimated_cost, retries. Persist metrics."

contracts/database.md defines no AI-metrics table, so — consistent with how
Sprint 1.3 handled worker progress/dead-letters (Redis, not a new table) —
persistence here is a pluggable `MetricsRecorder` interface. The default
`InMemoryMetricsRecorder` is the right "persistence" for a sprint with no
real AI calls; swapping in a Redis- or DB-backed recorder later is a
drop-in replacement, not a rewrite of this module.
"""

import time
from dataclasses import dataclass, field
from typing import Protocol

from app.ai.types import PipelineStage, ProviderUsage


@dataclass(frozen=True)
class StageMetric:
    job_id: str
    stage: PipelineStage
    provider: str
    model: str
    latency_ms: float
    input_tokens: int | None
    output_tokens: int | None
    estimated_cost_usd: float | None
    retries: int
    success: bool
    recorded_at: float = field(default_factory=time.time)
    # Sprint 1.5 brief > Observability adds language/duration to the metric
    # set already tracked here. `video_id` is additive too, so the speech
    # stage's metrics correlate back to the video even though the
    # `transcripts` table itself has no video_id column (contracts/
    # database.md only defines project_id for that table).
    video_id: str | None = None
    language: str | None = None
    duration_ms: int | None = None
    repair_count: int = 0
    validation_failures: int = 0

    @classmethod
    def from_usage(
        cls,
        *,
        job_id: str,
        stage: PipelineStage,
        usage: ProviderUsage,
        success: bool,
        video_id: str | None = None,
        language: str | None = None,
        duration_ms: int | None = None,
        repair_count: int = 0,
        validation_failures: int = 0,
    ) -> "StageMetric":
        return cls(
            job_id=job_id,
            stage=stage,
            provider=usage.provider,
            model=usage.model,
            latency_ms=usage.latency_ms,
            input_tokens=usage.input_tokens,
            output_tokens=usage.output_tokens,
            estimated_cost_usd=usage.estimated_cost_usd,
            retries=usage.retries,
            success=success,
            video_id=video_id,
            language=language,
            duration_ms=duration_ms,
            repair_count=repair_count,
            validation_failures=validation_failures,
        )


class MetricsRecorder(Protocol):
    def record(self, metric: StageMetric) -> None: ...


class InMemoryMetricsRecorder:
    """Default recorder. Holds every metric for the process lifetime —
    fine for a sprint with no real AI calls; a future sprint can swap this
    for a Redis/DB-backed recorder without touching call sites."""

    def __init__(self) -> None:
        self.records: list[StageMetric] = []

    def record(self, metric: StageMetric) -> None:
        self.records.append(metric)

    def for_job(self, job_id: str) -> list[StageMetric]:
        return [m for m in self.records if m.job_id == job_id]
