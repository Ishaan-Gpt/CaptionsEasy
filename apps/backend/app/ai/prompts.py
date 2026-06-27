import os
from pathlib import Path

def load_prompt(prompt_name: str, version: str = "1.0") -> str:
    """Loads a prompt template from the root prompts directory.
    
    Supports versioning by searching for f"{prompt_name}_v{version}.txt"
    before falling back to f"{prompt_name}.txt".
    """
    # The prompts directory is at the monorepo root, which is 4 levels up
    # from apps/backend/app/ai/prompts.py (i.e. apps/backend/app/ai/prompts.py -> app/ai -> app -> backend -> root)
    base_dir = Path(__file__).resolve().parent.parent.parent.parent.parent / "prompts"
    
    # 1. Try versioned file
    versioned_filename = f"{prompt_name}_v{version}.txt"
    versioned_path = base_dir / versioned_filename
    if versioned_path.exists():
        return versioned_path.read_text(encoding="utf-8")
        
    # 2. Try default file
    default_filename = f"{prompt_name}.txt"
    default_path = base_dir / default_filename
    if default_path.exists():
        return default_path.read_text(encoding="utf-8")
        
    raise FileNotFoundError(
        f"Prompt template '{prompt_name}' not found (searched in {base_dir})"
    )
