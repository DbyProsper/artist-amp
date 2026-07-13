from enum import Enum
from typing import Union

class Plan(str, Enum):
    FREE   = 'free'
    PRO    = 'pro'
    STUDIO = 'studio'

INF = float('inf')

MONTHLY_LIMITS: dict[str, dict[str, float]] = {
    'free':   { 'full_songs': 2,   'beats': 30,  'clips_30s': 20, 'images': 30, 'lyrics': INF, 'audio_enhance': 0,   'audio_enhance_standard': 15 },
    'pro':    { 'full_songs': 30,  'beats': INF, 'clips_30s': INF,'images': INF,'lyrics': INF, 'audio_enhance': INF, 'audio_enhance_standard': INF },
    'studio': { 'full_songs': INF, 'beats': INF, 'clips_30s': INF,'images': INF,'lyrics': INF, 'audio_enhance': INF, 'audio_enhance_standard': INF },
}

DAILY_LIMITS: dict[str, dict[str, float]] = {
    'free':   { 'beats': 5, 'clips_30s': 3, 'images': 5, 'lyrics': 10, 'audio_enhance_standard': 3 },
    'pro':    { 'beats': INF, 'clips_30s': INF, 'images': INF, 'lyrics': INF, 'audio_enhance_standard': INF },
    'studio': { 'beats': INF, 'clips_30s': INF, 'images': INF, 'lyrics': INF, 'audio_enhance_standard': INF },
}

def is_at_limit(plan: str, key: str, used: int, limit_type: str = 'monthly') -> bool:
    limits = MONTHLY_LIMITS if limit_type == 'monthly' else DAILY_LIMITS
    limit = limits.get(plan, {}).get(key, INF)
    return limit != INF and used >= limit

def get_remaining(plan: str, key: str, used: int, limit_type: str = 'monthly') -> float:
    limits = MONTHLY_LIMITS if limit_type == 'monthly' else DAILY_LIMITS
    limit = limits.get(plan, {}).get(key, INF)
    if limit == INF:
        return INF
    return max(0, limit - used)
