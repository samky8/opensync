"""Reject placeholder or insecure production configuration before archiving."""
import json
import sys
from urllib.parse import urlparse

targets = json.load(sys.stdin)
settings = next(item["buildSettings"] for item in targets if item["target"] == "OpenSync")
for key in ("OPENSYNC_API_URL", "SUPABASE_URL"):
    value = settings.get(key, "")
    parsed = urlparse(value)
    if "YOUR-" in value or parsed.scheme != "https" or not parsed.hostname or parsed.username:
        sys.exit(f"Release blocked: configure a real HTTPS {key} in Config/Local.xcconfig")
key = settings.get("SUPABASE_ANON_KEY", "")
if not key or "YOUR-" in key:
    sys.exit("Release blocked: configure the public Supabase anon key")
print("Release public configuration is present. Live connectivity still requires device testing.")
