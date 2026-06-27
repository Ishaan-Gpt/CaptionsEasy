"""Validation middleware. Source: contracts/ai.md > Validation

"Every stage validates JSON. Invalid JSON is rejected. Attempt automatic
repair once. If repair fails, mark job failed."

No prompt text lives here — `repair_fn` is injected by the caller and may
itself be backed by a provider, but this module has no knowledge of that.
"""

from collections.abc import Awaitable, Callable
from typing import TypeVar

from pydantic import BaseModel, ValidationError

from app.ai.types import PipelineStage, StageFailure

ModelT = TypeVar("ModelT", bound=BaseModel)

RepairFn = Callable[[dict, ValidationError], Awaitable[dict]]


async def validate_with_repair(
    *,
    stage: PipelineStage,
    raw: dict,
    model: type[ModelT],
    repair_fn: RepairFn | None = None,
) -> tuple[ModelT, bool]:
    """Validate `raw` against `model`. On failure, attempt exactly one repair
    via `repair_fn` (if provided) and re-validate once. Returns
    (validated_model, was_repaired). Raises StageFailure if both attempts fail.
    """
    try:
        return model.model_validate(raw), False
    except ValidationError as first_error:
        if repair_fn is None:
            raise StageFailure(
                stage, "Invalid JSON output and no repair function configured", cause=first_error
            ) from first_error

        try:
            repaired_raw = await repair_fn(raw, first_error)
            return model.model_validate(repaired_raw), True
        except ValidationError as second_error:
            raise StageFailure(
                stage, "JSON repair attempt failed validation", cause=second_error
            ) from second_error
        except Exception as repair_exc:  # noqa: BLE001 - any repair failure is terminal here
            raise StageFailure(
                stage, "JSON repair attempt raised an error", cause=repair_exc
            ) from repair_exc
