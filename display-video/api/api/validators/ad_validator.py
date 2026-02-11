"""
Ad creation validations per PRD: Display image, DCM tag, HTML5 ZIP, Video file, VAST tag, tracking tags.
Demo-level metadata extraction and stitching (VAST wrapper, macro substitution).
"""
from __future__ import annotations

import re
import struct
import zipfile
from io import BytesIO
from typing import Any, Dict, List, Optional, Tuple

# PRD constants
DISPLAY_IMAGE_MAX_BYTES = 5 * 1024 * 1024  # 5 MB
DISPLAY_IMAGE_MIN_WIDTH, DISPLAY_IMAGE_MIN_HEIGHT = 177, 100
DISPLAY_IMAGE_MAX_WIDTH, DISPLAY_IMAGE_MAX_HEIGHT = 38200, 20000
DISPLAY_IMAGE_EXTENSIONS = {"jpeg", "jpg", "png", "tiff", "gif"}
DISPLAY_HTML5_ZIP_MAX_BYTES = 10 * 1024 * 1024  # 10 MB
# Video file: no size/codec limit; accept .mp4, .mov, .gif only (extension check only)
VAST_TAG_MAX_BYTES = 50 * 1024  # 50 KB
TRACKING_TAGS_MAX = 5

DCM_ALLOWED_PREFIXES = [
    "<ins class='dcmads'",
    '<ins class="dcmads"',
    "<iframe src='",
    '<iframe src="',
    "<script src='",
    '<script src="',
]
DOUBLECLICK_INDICATORS = ["doubleclick.net", "doubleclick.net/adx"]

# Aspect ratios (w, h) - allowlist with tolerance
ASPECT_RATIOS = [
    (1.91, 1), (1, 1), (4, 5), (2, 3), (9, 16), (16, 9), (3, 2), (2, 1),
    (300, 250), (336, 280), (728, 90), (160, 600), (320, 50), (300, 600),
    (320, 100), (300, 100), (468, 60), (250, 250),
]
ASPECT_TOLERANCE = 0.05

MACRO_ALLOWLIST = [
    "%%CLICK_URL_UNESC%%", "%%CLICK_URL_ESC%%", "%%CACHEBUSTER%%",
    "%%DEST_URL%%", "%%DEST_URL_ESC%%", "%%SESSION_ID%%", "%%SITE%%",
    "%%AD_ID%%", "%%CAMPAIGN_ID%%", "%%PLACEMENT_ID%%",
]


def _aspect_matches(width: int, height: int) -> bool:
    if width <= 0 or height <= 0:
        return False
    ratio = width / height
    for w, h in ASPECT_RATIOS:
        expected = w / h
        if abs(ratio - expected) / max(expected, 1e-6) <= ASPECT_TOLERANCE:
            return True
    return False


def validate_display_image(
    content_type: Optional[str],
    filename: str,
    size: int,
    width: Optional[int] = None,
    height: Optional[int] = None,
) -> Tuple[bool, List[Dict[str, str]]]:
    errors: List[Dict[str, str]] = []
    ext = (filename.rsplit(".", 1)[-1].lower() if "." in filename else "") or ""
    if ext not in DISPLAY_IMAGE_EXTENSIONS:
        errors.append({"field": "file", "message": "Supported formats: jpeg, jpg, png, tiff, gif."})
    if size > DISPLAY_IMAGE_MAX_BYTES:
        errors.append({"field": "file", "message": "File size must be at most 5 MB."})
    if width is not None and height is not None:
        if width < DISPLAY_IMAGE_MIN_WIDTH or height < DISPLAY_IMAGE_MIN_HEIGHT:
            errors.append({"field": "file", "message": f"Minimum dimensions: {DISPLAY_IMAGE_MIN_WIDTH}x{DISPLAY_IMAGE_MIN_HEIGHT} px."})
        if width > DISPLAY_IMAGE_MAX_WIDTH or height > DISPLAY_IMAGE_MAX_HEIGHT:
            errors.append({"field": "file", "message": f"Maximum dimensions: {DISPLAY_IMAGE_MAX_WIDTH}x{DISPLAY_IMAGE_MAX_HEIGHT} px."})
        if not _aspect_matches(width, height):
            errors.append({"field": "file", "message": "Aspect ratio is not in the allowed list."})
    return len(errors) == 0, errors


def validate_dcm_tag(tag_text: str) -> Tuple[bool, List[Dict[str, str]]]:
    errors: List[Dict[str, str]] = []
    t = tag_text.strip()
    if not t:
        errors.append({"field": "tagText", "message": "Paste a full DCM tag (HTML)."})
        return False, errors
    has_prefix = any(t.lower().startswith(p.lower()) for p in DCM_ALLOWED_PREFIXES)
    has_dc = any(d in t.lower() for d in DOUBLECLICK_INDICATORS)
    if not has_prefix and not has_dc:
        errors.append({"field": "tagText", "message": "Tag must start with <ins class='dcmads'... or <iframe src='...doubleclick.net...' or <script src='...doubleclick.net/adx...'."})
    if "<" not in t or ">" not in t:
        errors.append({"field": "tagText", "message": "Tag must be valid HTML (contains tags)."})
    return len(errors) == 0, errors


def validate_html5_zip(filename: str, size: int) -> Tuple[bool, List[Dict[str, str]]]:
    errors: List[Dict[str, str]] = []
    if not filename.lower().endswith(".zip"):
        errors.append({"field": "file", "message": "HTML5 ad must be a .zip file."})
    if size > DISPLAY_HTML5_ZIP_MAX_BYTES:
        errors.append({"field": "file", "message": f"ZIP size must be at most {DISPLAY_HTML5_ZIP_MAX_BYTES // (1024*1024)} MB."})
    return len(errors) == 0, errors


VIDEO_FILE_EXTENSIONS = (".mp4", ".mov", ".gif")


def validate_video_file(filename: str, content_type: Optional[str], size: int) -> Tuple[bool, List[Dict[str, str]]]:
    """Accept VIDEO_FILE upload if filename ends with .mp4, .mov, or .gif (case-insensitive). No codec or size check."""
    errors: List[Dict[str, str]] = []
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in VIDEO_FILE_EXTENSIONS:
        errors.append({"field": "file", "message": "Video file must be .mp4, .mov, or .gif."})
    return len(errors) == 0, errors


def validate_vast_tag(tag_text: str) -> Tuple[bool, List[Dict[str, str]]]:
    errors: List[Dict[str, str]] = []
    size = len(tag_text.encode("utf-8"))
    if size > VAST_TAG_MAX_BYTES:
        errors.append({"field": "tagText", "message": "VAST tag must be at most 50 KB."})
    t = tag_text.strip()
    if t:
        like_xml = t.startswith("<?xml") or t.startswith("<VAST") or t.startswith("<vast")
        like_script = "<script" in t
        if not like_xml and not like_script:
            errors.append({"field": "tagText", "message": "Paste VAST XML or script content."})
    return len(errors) == 0, errors


def validate_tracking_tags(tags: Optional[List[str]]) -> Tuple[bool, List[Dict[str, str]]]:
    errors: List[Dict[str, str]] = []
    if not tags:
        return True, []
    if len(tags) > TRACKING_TAGS_MAX:
        errors.append({"field": "trackingTags", "message": f"Maximum {TRACKING_TAGS_MAX} tracking tags allowed."})
    for i, tag in enumerate(tags):
        t = (tag or "").strip()
        if not t:
            continue
        is_url = bool(re.match(r"^https?://", t, re.I))
        has_img = "<img" in t
        has_script = "<script" in t
        if not (is_url or has_img or has_script):
            errors.append({"field": f"trackingTags[{i}]", "message": "Tag must be a URL pixel (http(s):// or <img) or JavaScript (<script)."})
    return len(errors) == 0, errors


def substitute_macros(text: str) -> str:
    """Replace only allowlisted macros with placeholder (demo)."""
    out = text
    for macro in MACRO_ALLOWLIST:
        # Demo: replace with a placeholder value
        if macro == "%%CACHEBUSTER%%":
            out = out.replace(macro, "123456789")
        elif macro == "%%CLICK_URL_ESC%%":
            out = out.replace(macro, "https%3A%2F%2Fexample.com%2Fclick")
        elif macro == "%%CLICK_URL_UNESC%%":
            out = out.replace(macro, "https://example.com/click")
        else:
            out = out.replace(macro, "demo_value")
    return out


def get_image_dimensions_from_bytes(data: bytes) -> Optional[Tuple[int, int]]:
    """Best-effort read image dimensions (PNG/JPEG/GIF)."""
    try:
        if data[:8] == b"\x89PNG\r\n\x1a\n":
            # PNG: after 8-byte sig, first chunk is IHDR (13 bytes: width 4, height 4)
            if len(data) >= 24:
                w, h = struct.unpack(">II", data[16:24])
                return w, h
        if data[:2] in (b"\xff\xd8", b"\xff\xd9"):
            # JPEG: scan for SOF0 (0xff 0xc0) or SOF2 (0xff 0xc2)
            i = 2
            while i < len(data) - 9:
                if data[i] == 0xFF and data[i + 1] in (0xC0, 0xC2):
                    h, w = struct.unpack(">HH", data[i + 5 : i + 9])
                    return w, h
                if data[i] != 0xFF:
                    i += 1
                    continue
                block_len = struct.unpack(">H", data[i + 2 : i + 4])[0]
                i += 2 + block_len
        if data[:6] in (b"GIF87a", b"GIF89a") and len(data) >= 10:
            w, h = struct.unpack("<HH", data[6:10])
            return w, h
    except Exception:
        pass
    return None


def extract_display_image_metadata(data: bytes, content_type: str, filename: str) -> Dict[str, Any]:
    dims = get_image_dimensions_from_bytes(data)
    meta: Dict[str, Any] = {
        "fileType": content_type,
        "fileSizeBytes": len(data),
        "assetUrl": None,
    }
    if dims:
        meta["width"], meta["height"] = dims
        meta["size"] = f"{dims[0]}x{dims[1]}"
    return meta


def extract_video_metadata_demo(data: bytes, filename: str) -> Dict[str, Any]:
    """Demo: no real codec/duration parsing; placeholders."""
    return {
        "duration": None,
        "bitrate": "—",
        "resolution": "—",
        "fileSizeBytes": len(data),
        "assetUrl": None,
        "codecNote": "Codec validation is best-effort in demo.",
    }


def _parse_manifest_csv(csv_bytes: bytes) -> List[Dict[str, Any]]:
    """Parse manifest.csv: Filename required; tracking1..tracking5 optional. Returns list of dicts."""
    rows: List[Dict[str, Any]] = []
    try:
        text = csv_bytes.decode("utf-8", errors="replace")
        lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
        if not lines:
            return []
        header = [h.strip() for h in lines[0].split(",")]
        fn_idx = next((i for i, h in enumerate(header) if h.lower() == "filename"), None)
        if fn_idx is None:
            return []
        track_cols = [i for i, h in enumerate(header) if re.match(r"tracking\d?", h, re.I) and i != fn_idx][:5]
        for line in lines[1:]:
            parts = [p.strip().strip('"') for p in line.split(",")]
            if fn_idx >= len(parts):
                continue
            row = {"filename": parts[fn_idx], "trackingTags": []}
            for i in track_cols:
                if i < len(parts) and parts[i]:
                    row["trackingTags"].append(parts[i])
            rows.append(row)
    except Exception:
        pass
    return rows


def parse_bulk_display_zip(zip_bytes: bytes) -> Tuple[List[Dict[str, Any]], List[Dict[str, str]]]:
    """
    Parse bulk display zip (images + optional manifest.csv).
    Returns (parsed_items, global_errors). Each item: {filename, bytes, content_type, trackingTags, errors[]}.
    """
    global_errors: List[Dict[str, str]] = []
    parsed: List[Dict[str, Any]] = []
    manifest_rows: List[Dict[str, Any]] = []
    try:
        with zipfile.ZipFile(BytesIO(zip_bytes), "r") as zf:
            names = zf.namelist()
            manifest_data = None
            for n in names:
                if n.lower().endswith("manifest.csv"):
                    manifest_data = zf.read(n)
                    break
            if manifest_data is not None:
                manifest_rows = _parse_manifest_csv(manifest_data)
            # Build lookup by filename (key = basename for matching)
            manifest_by_name = {r["filename"].lstrip("./"): r for r in manifest_rows}

            for name in names:
                if name.endswith("/") or name.lower().endswith("manifest.csv"):
                    continue
                data = zf.read(name)
                base = name.split("/")[-1] if "/" in name else name
                tracking_tags = []
                if base in manifest_by_name:
                    tracking_tags = manifest_by_name[base].get("trackingTags", [])[:5]
                ext = base.rsplit(".", 1)[-1].lower() if "." in base else ""
                ct = "image/png"
                if ext in ("jpg", "jpeg"):
                    ct = "image/jpeg"
                elif ext == "png":
                    ct = "image/png"
                elif ext == "gif":
                    ct = "image/gif"
                elif ext == "tiff":
                    ct = "image/tiff"
                item_errors: List[Dict[str, str]] = []
                dims = get_image_dimensions_from_bytes(data) if ext in DISPLAY_IMAGE_EXTENSIONS else None
                w, h = (dims[0], dims[1]) if dims else (None, None)
                ok, errs = validate_display_image(ct, base, len(data), w, h)
                if not ok:
                    item_errors.extend(errs)
                ok2, errs2 = validate_tracking_tags(tracking_tags)
                if not ok2:
                    item_errors.extend([{"field": f"{base}:tracking", "message": e.get("message", "")} for e in errs2])
                parsed.append({
                    "filename": base,
                    "bytes": data,
                    "contentType": ct,
                    "trackingTags": tracking_tags,
                    "errors": item_errors,
                })
    except zipfile.BadZipFile:
        global_errors.append({"field": "file", "message": "Invalid ZIP file."})
    except Exception as e:
        global_errors.append({"field": "file", "message": str(e)})
    return parsed, global_errors


def parse_bulk_video_zip(zip_bytes: bytes) -> Tuple[List[Dict[str, Any]], List[Dict[str, str]]]:
    """
    Parse bulk video zip (mp4s + optional manifest.csv).
    Returns (parsed_items, global_errors). Each item: {filename, bytes, content_type, trackingTags, errors[]}.
    """
    global_errors: List[Dict[str, str]] = []
    parsed: List[Dict[str, Any]] = []
    try:
        with zipfile.ZipFile(BytesIO(zip_bytes), "r") as zf:
            names = zf.namelist()
            manifest_data = None
            for n in names:
                if n.lower().endswith("manifest.csv"):
                    manifest_data = zf.read(n)
                    break
            manifest_rows = _parse_manifest_csv(manifest_data) if manifest_data else []
            manifest_by_name = {r["filename"].lstrip("./"): r for r in manifest_rows}

            for name in names:
                if name.endswith("/") or name.lower().endswith("manifest.csv"):
                    continue
                data = zf.read(name)
                base = name.split("/")[-1] if "/" in name else name
                if not base.lower().endswith(".mp4"):
                    parsed.append({
                        "filename": base,
                        "bytes": data,
                        "contentType": "application/octet-stream",
                        "trackingTags": [],
                        "errors": [{"field": "file", "message": "Only .mp4 files allowed in video bulk upload."}],
                    })
                    continue
                tracking_tags = manifest_by_name.get(base, {}).get("trackingTags", [])[:5]
                ct = "video/mp4"
                item_errors: List[Dict[str, str]] = []
                ok, errs = validate_video_file(base, ct, len(data))
                if not ok:
                    item_errors.extend(errs)
                ok2, errs2 = validate_tracking_tags(tracking_tags)
                if not ok2:
                    item_errors.extend([{"field": f"{base}:tracking", "message": e.get("message", "")} for e in errs2])
                parsed.append({
                    "filename": base,
                    "bytes": data,
                    "contentType": ct,
                    "trackingTags": tracking_tags,
                    "errors": item_errors,
                })
    except zipfile.BadZipFile:
        global_errors.append({"field": "file", "message": "Invalid ZIP file."})
    except Exception as e:
        global_errors.append({"field": "file", "message": str(e)})
    return parsed, global_errors


def generate_vast_wrapper_demo(
    content_url: str,
    tracking_tags: Optional[List[str]] = None,
) -> str:
    """Generate a VAST wrapper with impression, clickTracking, and events (demo)."""
    tracking = (tracking_tags or [])
    tracking_xml = "\n".join(
        f'    <Tracking event="{evt}"><![CDATA[https://track.example.com/{evt}]]></Tracking>'
        for evt in ["start", "firstQuartile", "midpoint", "thirdQuartile", "complete", "pause", "resume", "skip"]
    )
    third_party = "\n".join(
        f'    <Tracking event="progress"><![CDATA[{t}]]></Tracking>'
        for t in tracking if t.strip()
    )
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<VAST version="3.0">
  <Ad id="generated">
    <InLine>
      <Impression><![CDATA[https://impression.example.com]]></Impression>
      <Creatives>
        <Creative>
          <Linear>
            <Duration>00:00:15</Duration>
            <MediaFiles>
              <MediaFile delivery="progressive" type="video/mp4" width="1920" height="1080"><![CDATA[{content_url}]]></MediaFile>
            </MediaFiles>
            <VideoClicks>
              <ClickThrough><![CDATA[https://click.example.com]]></ClickThrough>
            </VideoClicks>
            <TrackingEvents>
{tracking_xml}
{third_party}
            </TrackingEvents>
          </Linear>
        </Creative>
      </Creatives>
    </InLine>
  </Ad>
</VAST>"""
