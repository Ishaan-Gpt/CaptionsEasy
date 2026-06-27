"""Dummy pipeline stages. Source: Sprint 1.3 brief > Worker.

"Do not process AI. Use dummy stages only."
Extract Video Metadata -> Extract Audio -> Prepare Workspace -> Completed.

These stages do no real work — they exist to exercise the job processing
framework end to end before any AI/transcription/rendering code lands.
"""

import time
from collections.abc import Callable
from dataclasses import dataclass


@dataclass(frozen=True)
class Stage:
    name: str
    run: Callable[[], None]


def _sleep(seconds: float) -> Callable[[], None]:
    return lambda: time.sleep(seconds)


def build_dummy_stages(*, stage_duration_seconds: float) -> list[Stage]:
    """Builds the dummy metadata-extraction pipeline. `stage_duration_seconds`
    simulates work — tests pass 0 to run instantly."""
    return [
        Stage("Extract Video Metadata", _sleep(stage_duration_seconds)),
        Stage("Extract Audio", _sleep(stage_duration_seconds)),
        Stage("Prepare Workspace", _sleep(stage_duration_seconds)),
    ]
