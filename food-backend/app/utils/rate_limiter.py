import time
from collections import defaultdict
import logging
import os

logger = logging.getLogger(__name__)

class RateLimiter:
    """Simple IP-based rate limiter for API protection"""

    def __init__(self):
        self.requests = defaultdict(list)
        self.max_requests = int(os.getenv('MAX_REQUESTS_PER_MINUTE', '10'))
        self.window_seconds = 60  # 1 minute window

    def is_allowed(self, client_ip: str) -> bool:
        """Check if request is allowed based on rate limit"""
        current_time = time.time()

        # Clean old requests outside the window
        self.requests[client_ip] = [
            req_time for req_time in self.requests[client_ip]
            if current_time - req_time < self.window_seconds
        ]

        # Check if under limit
        if len(self.requests[client_ip]) < self.max_requests:
            return True

        # Log rate limit violation
        logger.warning(f"Rate limit exceeded for IP: {client_ip}")
        return False

    def record_request(self, client_ip: str):
        """Record a request for rate limiting"""
        current_time = time.time()
        self.requests[client_ip].append(current_time)

        # Clean up old entries periodically
        if len(self.requests) > 1000:  # Prevent memory leak
            self._cleanup_old_entries()

    def _cleanup_old_entries(self):
        """Clean up old entries to prevent memory leaks"""
        current_time = time.time()
        cutoff_time = current_time - (self.window_seconds * 2)

        for ip in list(self.requests.keys()):
            self.requests[ip] = [
                req_time for req_time in self.requests[ip]
                if req_time > cutoff_time
            ]
            # Remove empty lists
            if not self.requests[ip]:
                del self.requests[ip]

    def get_remaining_requests(self, client_ip: str) -> int:
        """Get remaining requests allowed for this IP"""
        current_time = time.time()
        # Clean old requests
        self.requests[client_ip] = [
            req_time for req_time in self.requests[client_ip]
            if current_time - req_time < self.window_seconds
        ]

        remaining = self.max_requests - len(self.requests[client_ip])
        return max(0, remaining)
