import json
import time
from typing import Any
import httpx
from app.ai.prompts import load_prompt
from app.ai.providers.stage_providers import CreativeProvider, ProviderOutput
from app.ai.types import ProviderUsage
from app.core.config import Settings
from packages.contracts.python import Transcript

class GroqCreativeProvider(CreativeProvider):
    def __init__(
        self,
        *,
        settings: Settings,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self._settings = settings
        self._http_client = http_client

    async def analyze(self, *, transcript: Transcript) -> ProviderOutput:
        prompt_template = load_prompt("creative_analysis")
        # Format prompt with transcript JSON
        transcript_json_str = json.dumps(transcript.model_dump(), indent=2)
        user_message = prompt_template.format(transcript_json=transcript_json_str)

        start = time.monotonic()
        response_json = await self._call_groq(user_message)
        latency_ms = (time.monotonic() - start) * 1000

        choices = response_json.get("choices", [])
        if not choices:
            raise ValueError("No response choices returned from Groq.")
        content = choices[0]["message"]["content"]
        
        # Clean potential markdown wrappers (```json ... ```)
        clean_content = content.strip()
        if clean_content.startswith("```"):
            lines = clean_content.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            clean_content = "\n".join(lines).strip()

        data = json.loads(clean_content)

        usage_data = response_json.get("usage", {})
        prompt_tokens = usage_data.get("prompt_tokens") or 0
        completion_tokens = usage_data.get("completion_tokens") or 0
        cost = (
            prompt_tokens * self._settings.groq_creative_cost_input_usd
            + completion_tokens * self._settings.groq_creative_cost_output_usd
        )

        usage = ProviderUsage(
            provider="groq",
            model=self._settings.groq_creative_model,
            latency_ms=latency_ms,
            input_tokens=prompt_tokens,
            output_tokens=completion_tokens,
            estimated_cost_usd=cost,
        )
        return ProviderOutput(data=data, usage=usage)

    async def _call_groq(self, prompt: str) -> dict[str, Any]:
        url = f"{self._settings.groq_base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self._settings.groq_api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self._settings.groq_creative_model,
            "messages": [
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.2,
        }

        client = self._http_client
        owns_client = client is None
        if owns_client:
            client = httpx.AsyncClient(timeout=self._settings.groq_timeout_seconds)
        try:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            return response.json()
        finally:
            if owns_client:
                await client.aclose()
