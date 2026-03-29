"""Reverse geocoding with multiple providers + robust TLS (certifi) and graceful fallbacks."""

from __future__ import annotations

import json
import ssl
import urllib.error
import urllib.parse
import urllib.request

try:
    import certifi

    _CERT_FILE = certifi.where()
except ImportError:
    _CERT_FILE = None


USER_AGENT = "RespiraSense/1.0 (public health demo; educational use)"


def _ssl_context() -> ssl.SSLContext:
    if _CERT_FILE:
        return ssl.create_default_context(cafile=_CERT_FILE)
    return ssl.create_default_context()


def _get_json(url: str) -> dict | list:
    ctx = _ssl_context()
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=14, context=ctx) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _normalize_result(
    latitude: float,
    longitude: float,
    region_label: str,
    display_name: str | None = None,
    country: str | None = None,
) -> dict:
    label = (region_label or "").strip() or _coordinate_fallback_label(latitude, longitude)
    return {
        "region": label,
        "display_name": display_name or label,
        "latitude": latitude,
        "longitude": longitude,
        "country": country,
    }


def _coordinate_fallback_label(lat: float, lon: float) -> str:
    """Human-readable fallback when no geocoder returns a locality."""
    ns = "N" if lat >= 0 else "S"
    ew = "E" if lon >= 0 else "W"
    return f"{abs(lat):.2f}°{ns}, {abs(lon):.2f}°{ew}"


def _try_photon(latitude: float, longitude: float) -> dict | None:
    """Komoot Photon (OSM-based, no API key)."""
    params = urllib.parse.urlencode({"lat": latitude, "lon": longitude})
    url = f"https://photon.komoot.io/reverse?{params}"
    data = _get_json(url)
    features = data.get("features") if isinstance(data, dict) else None
    if not features:
        return None
    props = features[0].get("properties") or {}
    locality = (
        props.get("city")
        or props.get("town")
        or props.get("village")
        or props.get("district")
        or props.get("county")
        or props.get("state")
        or props.get("name")
    )
    if not locality:
        return None
    country = props.get("country")
    parts = [p for p in (props.get("street"), locality, country) if p]
    display = ", ".join(parts) if parts else locality
    return _normalize_result(latitude, longitude, locality, display, country)


def _try_nominatim(latitude: float, longitude: float) -> dict | None:
    """Nominatim — can block some server IPs; kept as secondary."""
    params = urllib.parse.urlencode(
        {
            "lat": latitude,
            "lon": longitude,
            "format": "json",
            "accept-language": "en",
        }
    )
    url = f"https://nominatim.openstreetmap.org/reverse?{params}"
    data = _get_json(url)
    if not isinstance(data, dict):
        return None
    addr = data.get("address") or {}
    locality = (
        addr.get("city")
        or addr.get("town")
        or addr.get("village")
        or addr.get("municipality")
        or addr.get("suburb")
        or addr.get("county")
        or addr.get("state")
        or addr.get("region")
    )
    if not locality and data.get("display_name"):
        locality = data["display_name"].split(",")[0].strip()
    if not locality:
        return None
    return _normalize_result(
        latitude,
        longitude,
        locality,
        data.get("display_name"),
        addr.get("country"),
    )


def reverse_geocode(latitude: float, longitude: float) -> dict:
    """
    Resolve coordinates to a region label.
    Never raises: falls back to a coordinate-based label if all providers fail.
    """
    for fn in (_try_photon, _try_nominatim):
        try:
            out = fn(latitude, longitude)
            if out:
                return out
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError, json.JSONDecodeError, KeyError):
            continue

    label = _coordinate_fallback_label(latitude, longitude)
    return _normalize_result(
        latitude,
        longitude,
        label,
        f"Area {label} — place name could not be resolved online; edit region if needed.",
        None,
    )
