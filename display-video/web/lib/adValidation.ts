/**
 * Ad creation validations and constants per PRD (Display & Video Managed Services).
 * Entity is "Ad" (not Creative). Validations gate on adType (Display/Video) and inputType.
 */

export const DISPLAY_IMAGE = {
  /** Supported formats: jpeg, jpg, png, tiff, gif */
  ALLOWED_EXTENSIONS: ['jpeg', 'jpg', 'png', 'tiff', 'gif'],
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/tiff', 'image/gif'],
  MAX_SIZE_BYTES: 5 * 1024 * 1024, // 5 MB
  MIN_WIDTH: 177,
  MIN_HEIGHT: 100,
  MAX_WIDTH: 38200,
  MAX_HEIGHT: 20000,
  /** Allowed aspect ratios (width:height) with tolerance. Values as decimal for comparison. */
  ASPECT_RATIOS: [
    { w: 1.91, h: 1 },
    { w: 1, h: 1 },
    { w: 4, h: 5 },
    { w: 2, h: 3 },
    { w: 9, h: 16 },
    { w: 16, h: 9 },
    { w: 3, h: 2 },
    { w: 2, h: 1 },
    { w: 1200, h: 628 },
    { w: 300, h: 250 },
    { w: 336, h: 280 },
    { w: 728, h: 90 },
    { w: 160, h: 600 },
    { w: 320, h: 50 },
    { w: 300, h: 600 },
    { w: 320, h: 100 },
    { w: 300, h: 100 },
    { w: 468, h: 60 },
    { w: 250, h: 250 },
  ],
  ASPECT_TOLERANCE: 0.05,
};

export const DISPLAY_DCM = {
  /** Tag must start with one of these (case-insensitive, trimmed). */
  ALLOWED_PREFIXES: [
    "<ins class='dcmads'",
    "<ins class=\"dcmads\"",
    "<iframe src='",
    "<iframe src=\"",
    "<script src='",
    "<script src=\"",
  ],
  DOUBLECLICK_INDICATORS: ['doubleclick.net', 'doubleclick.net/adx'],
};

export const DISPLAY_HTML5_ZIP = {
  MAX_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB demo limit
  ALLOWED_EXTENSION: 'zip',
};

export const VIDEO_FILE = {
  MAX_SIZE_BYTES: 100 * 1024 * 1024, // 100 MB
  ALLOWED_EXTENSIONS: ['mp4', 'mov', 'gif'],
  ALLOWED_MIME_PREFIX: 'video/',
};

export const VAST_TAG = {
  MAX_SIZE_BYTES: 50 * 1024, // 50 KB
};

export const TRACKING_TAGS = {
  MAX_COUNT: 5,
};

/** Macros allowed for substitution (allowlist). */
export const MACRO_ALLOWLIST = [
  '%%CLICK_URL_UNESC%%',
  '%%CLICK_URL_ESC%%',
  '%%CACHEBUSTER%%',
  '%%DEST_URL%%',
  '%%DEST_URL_ESC%%',
  '%%SESSION_ID%%',
  '%%SITE%%',
  '%%AD_ID%%',
  '%%CAMPAIGN_ID%%',
  '%%PLACEMENT_ID%%',
];

export interface DisplayImageValidation {
  valid: boolean;
  errors: string[];
  metadata?: { width?: number; height?: number; fileType?: string; fileSizeBytes?: number; assetUrl?: string };
}

export function validateDisplayImage(file: File, dimensions?: { width: number; height: number } | null): DisplayImageValidation {
  const errors: string[] = [];
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!DISPLAY_IMAGE.ALLOWED_EXTENSIONS.includes(ext)) {
    errors.push(`Supported formats: jpeg, jpg, png, tiff, gif. Received: ${ext || 'unknown'}.`);
  }
  if (file.size > DISPLAY_IMAGE.MAX_SIZE_BYTES) {
    errors.push(`File size must be at most 5 MB. Current: ${(file.size / (1024 * 1024)).toFixed(2)} MB.`);
  }
  if (dimensions) {
    const { width, height } = dimensions;
    if (width < DISPLAY_IMAGE.MIN_WIDTH || height < DISPLAY_IMAGE.MIN_HEIGHT) {
      errors.push(`Minimum dimensions: ${DISPLAY_IMAGE.MIN_WIDTH}×${DISPLAY_IMAGE.MIN_HEIGHT} px.`);
    }
    if (width > DISPLAY_IMAGE.MAX_WIDTH || height > DISPLAY_IMAGE.MAX_HEIGHT) {
      errors.push(`Maximum dimensions: ${DISPLAY_IMAGE.MAX_WIDTH}×${DISPLAY_IMAGE.MAX_HEIGHT} px.`);
    }
    const ratio = width / height;
    const matchesRatio = DISPLAY_IMAGE.ASPECT_RATIOS.some((ar) => {
      const expected = ar.w / ar.h;
      return Math.abs(ratio - expected) / expected <= DISPLAY_IMAGE.ASPECT_TOLERANCE;
    });
    if (!matchesRatio && width > 0 && height > 0) {
      errors.push('Aspect ratio is not in the allowed list.');
    }
  } else if (file.type.startsWith('image/')) {
    // Dimensions may be filled async; don't fail yet
  }
  const metadata =
    dimensions || file.size
      ? {
          width: dimensions?.width,
          height: dimensions?.height,
          fileType: file.type,
          fileSizeBytes: file.size,
          assetUrl: undefined as string | undefined,
        }
      : undefined;
  return { valid: errors.length === 0, errors, metadata };
}

export interface DCMValidation {
  valid: boolean;
  errors: string[];
}

export function validateDCMTag(tagText: string): DCMValidation {
  const errors: string[] = [];
  const trimmed = tagText.trim();
  if (!trimmed) {
    return { valid: false, errors: ['Paste a full DCM tag (HTML).'] };
  }
  const hasPrefix = DISPLAY_DCM.ALLOWED_PREFIXES.some((p) => trimmed.toLowerCase().startsWith(p.toLowerCase()));
  if (!hasPrefix) {
    const hasDoubleClick = DISPLAY_DCM.DOUBLECLICK_INDICATORS.some((d) => trimmed.toLowerCase().includes(d.toLowerCase()));
    if (!hasDoubleClick) {
      errors.push('Tag must start with <ins class=\'dcmads\'... or <iframe src=\'...doubleclick.net...\' or <script src=\'...doubleclick.net/adx...\'.');
    }
  }
  if (!trimmed.includes('<') || !trimmed.includes('>')) {
    errors.push('Tag must be valid HTML (contains tags).');
  }
  return { valid: errors.length === 0, errors };
}

export function validateHTML5Zip(file: File): { valid: boolean; errors: string[]; metadata?: { fileType: string; fileSizeBytes: number } } {
  const errors: string[] = [];
  if (!file.name.toLowerCase().endsWith('.zip')) {
    errors.push('HTML5 ad must be a .zip file.');
  }
  if (file.size > DISPLAY_HTML5_ZIP.MAX_SIZE_BYTES) {
    errors.push(`ZIP size must be at most ${DISPLAY_HTML5_ZIP.MAX_SIZE_BYTES / (1024 * 1024)} MB.`);
  }
  const metadata = { fileType: file.type || 'application/zip', fileSizeBytes: file.size };
  return { valid: errors.length === 0, errors, metadata };
}

/** Video File upload: no validation. Only check in UI is "a file is selected". Do NOT validate MIME, codec, or size. Never show "Supported: MP4 (H.264). Max 100 MB." */
export function validateVideoFile(_file: File): { valid: boolean; errors: string[]; metadata?: { duration?: number; bitrate?: string; resolution?: string; fileSizeBytes: number; assetUrl?: string } } {
  const metadata = {
    duration: undefined as number | undefined,
    bitrate: undefined as string | undefined,
    resolution: undefined as string | undefined,
    fileSizeBytes: _file.size,
    assetUrl: undefined as string | undefined,
  };
  return { valid: true, errors: [], metadata };
}

export function validateVASTTag(tagText: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const sizeBytes = new TextEncoder().encode(tagText).length;
  if (sizeBytes > VAST_TAG.MAX_SIZE_BYTES) {
    errors.push(`VAST tag must be at most 50 KB. Current: ${(sizeBytes / 1024).toFixed(1)} KB.`);
  }
  const trimmed = tagText.trim();
  if (trimmed) {
    const looksLikeXml = trimmed.startsWith('<?xml') || trimmed.startsWith('<VAST') || trimmed.startsWith('<vast');
    const looksLikeScript = trimmed.includes('<script');
    if (!looksLikeXml && !looksLikeScript) {
      errors.push('Paste VAST XML or script content.');
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validateTrackingTag(tag: string, index: number): { valid: boolean; error?: string } {
  if (!tag.trim()) return { valid: true };
  const t = tag.trim();
  const isUrlPixel = /^https?:\/\//i.test(t) || t.includes('<img');
  const isScript = t.includes('<script');
  if (!isUrlPixel && !isScript) {
    return { valid: false, error: 'Tag must be a URL pixel (http(s):// or <img) or JavaScript (<script).' };
  }
  return { valid: true };
}

export function validateTrackingTags(tags: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (tags.length > TRACKING_TAGS.MAX_COUNT) {
    errors.push(`Maximum ${TRACKING_TAGS.MAX_COUNT} tracking tags allowed.`);
  }
  tags.forEach((tag, i) => {
    const r = validateTrackingTag(tag, i);
    if (!r.valid && r.error) errors.push(`Tag ${i + 1}: ${r.error}`);
  });
  return { valid: errors.length === 0, errors };
}

/** Extract dimensions from image file (client-side). */
export function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
