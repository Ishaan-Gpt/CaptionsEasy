"""Constant-time worker bearer-token comparison.

Tokens are stored in plaintext (see app.db.models.worker.Worker docstring
for why) — this just avoids a timing side-channel on the comparison.
"""

import hmac


def verify_worker_token(presented: str, expected: str) -> bool:
    return hmac.compare_digest(presented, expected)
