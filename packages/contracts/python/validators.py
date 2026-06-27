"""Runtime validators for MotionAI JSON contracts.

Source: contracts/renderplan.md ("Validation Rules"), contracts/json-schemas.md
("Validation Rules"). No rendering logic lives here — these functions only
validate structure/ordering and raise on violation.
"""

from pydantic import ValidationError

from .api_entities import ApiError, Export, JobStatus, Project, User, Video
from .pipeline import CaptionPlan, CreativePlan, Transcript
from .render_plan import RenderPlan, TimelineEvent


class RenderPlanValidationError(ValueError):
    pass


def validate_render_plan(data: dict) -> RenderPlan:
    """Validate and parse a RenderPlan, enforcing rules not expressible
    purely via the Pydantic field types:
      - every event has id/type/start_ms/end_ms (enforced by required fields)
      - negative timestamps are invalid
      - timeline must be chronological (sorted by start_ms)
      - no overlapping events on the same exclusive layer
      - unknown event types are rejected (enforced by the EventType enum)
    """
    try:
        plan = RenderPlan.model_validate(data)
    except ValidationError as exc:
        raise RenderPlanValidationError(str(exc)) from exc

    _validate_timestamps(plan.timeline)
    _validate_chronological(plan.timeline)
    _validate_no_overlap(plan.timeline)

    return plan


def _validate_timestamps(timeline: list[TimelineEvent]) -> None:
    for event in timeline:
        if event.start_ms < 0 or event.end_ms < 0:
            raise RenderPlanValidationError(f"Negative timestamp on event {event.id}")
        if event.end_ms < event.start_ms:
            raise RenderPlanValidationError(f"end_ms before start_ms on event {event.id}")


def _validate_chronological(timeline: list[TimelineEvent]) -> None:
    last_start = -1
    for event in timeline:
        if event.start_ms < last_start:
            raise RenderPlanValidationError(
                f"Timeline is not chronological at event {event.id}"
            )
        last_start = event.start_ms


def _validate_no_overlap(timeline: list[TimelineEvent]) -> None:
    by_layer: dict[str, list[TimelineEvent]] = {}
    for event in timeline:
        by_layer.setdefault(event.layer.value, []).append(event)

    for layer, events in by_layer.items():
        ordered = sorted(events, key=lambda e: e.start_ms)
        for prev, curr in zip(ordered, ordered[1:]):
            if curr.start_ms < prev.end_ms:
                raise RenderPlanValidationError(
                    f"Overlapping events on layer '{layer}': {prev.id} and {curr.id}"
                )


def validate_transcript(data: dict) -> Transcript:
    return Transcript.model_validate(data)


def validate_creative_plan(data: dict) -> CreativePlan:
    return CreativePlan.model_validate(data)


def validate_caption_plan(data: dict) -> CaptionPlan:
    return CaptionPlan.model_validate(data)


def validate_job_status(data: dict) -> JobStatus:
    return JobStatus.model_validate(data)


def validate_api_error(data: dict) -> ApiError:
    return ApiError.model_validate(data)


def validate_user(data: dict) -> User:
    return User.model_validate(data)


def validate_project(data: dict) -> Project:
    return Project.model_validate(data)


def validate_video(data: dict) -> Video:
    return Video.model_validate(data)


def validate_export(data: dict) -> Export:
    return Export.model_validate(data)
