from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, Any


@dataclass
class MemoryStore:
    partners: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    advertisers: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    campaigns: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    asset_groups: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    ads: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    # adId -> (bytes, content_type) for file-based ads; in-memory only
    ad_content: Dict[str, tuple[bytes, str]] = field(default_factory=dict)


STORE = MemoryStore()
