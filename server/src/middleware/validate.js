// Input validation utilities

export const MAX_CONTENT_LENGTH = 50000; // 50KB max for posts
export const MAX_TITLE_LENGTH = 200;
export const MAX_NAME_LENGTH = 50;
export const MAX_SIGNATURE_LENGTH = 500;
export const MAX_URL_LENGTH = 500;
export const MAX_SEARCH_LENGTH = 200;
export const MAX_PAGE_LIMIT = 100;

// Validate positive integer
export const isPositiveInt = (value) => {
  const num = parseInt(value, 10);
  return !isNaN(num) && num > 0 && num <= 2147483647;
};

// Validate pagination params
export const validatePagination = (page, limit, maxLimit = MAX_PAGE_LIMIT) => {
  const validPage = Math.max(1, parseInt(page, 10) || 1);
  const validLimit = Math.min(maxLimit, Math.max(1, parseInt(limit, 10) || 20));
  return { page: validPage, limit: validLimit, offset: (validPage - 1) * validLimit };
};

// Validate string with max length
export const validateString = (value, maxLength, minLength = 0) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length < minLength || trimmed.length > maxLength) return null;
  return trimmed;
};

// Validate agent name (alphanumeric, underscore, hyphen, space)
export const validateAgentName = (name) => {
  const trimmed = validateString(name, MAX_NAME_LENGTH, 3);
  if (!trimmed) return null;
  // Allow letters, numbers, underscores, hyphens, spaces
  if (!/^[\w\s-]+$/u.test(trimmed)) return null;
  return trimmed;
};

// Validate URL
export const validateUrl = (url) => {
  if (!url) return null;
  const trimmed = validateString(url, MAX_URL_LENGTH);
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    // Only allow http/https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return trimmed;
  } catch {
    return null;
  }
};

// Sanitize content (basic XSS prevention - removes script tags)
export const sanitizeContent = (content) => {
  if (typeof content !== 'string') return '';
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');
};

// Validation middleware factory
export const validateBody = (schema) => (req, res, next) => {
  const errors = [];

  for (const [field, rules] of Object.entries(schema)) {
    const value = req.body[field];

    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} is required`);
      continue;
    }

    if (value === undefined || value === null) continue;

    if (rules.type === 'string') {
      const validated = validateString(value, rules.maxLength || 1000, rules.minLength || 0);
      if (validated === null) {
        errors.push(`${field} must be a string between ${rules.minLength || 0} and ${rules.maxLength || 1000} characters`);
      } else {
        req.body[field] = rules.sanitize ? sanitizeContent(validated) : validated;
      }
    }

    if (rules.type === 'int') {
      if (!isPositiveInt(value)) {
        errors.push(`${field} must be a positive integer`);
      } else {
        req.body[field] = parseInt(value, 10);
      }
    }

    if (rules.type === 'url') {
      const validated = validateUrl(value);
      if (value && validated === null) {
        errors.push(`${field} must be a valid HTTP/HTTPS URL`);
      } else {
        req.body[field] = validated;
      }
    }

    if (rules.type === 'name') {
      const validated = validateAgentName(value);
      if (validated === null) {
        errors.push(`${field} must be 3-50 characters, alphanumeric with spaces/hyphens/underscores only`);
      } else {
        req.body[field] = validated;
      }
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: errors.join(', ') });
  }

  next();
};

// Validate ID parameter middleware
export const validateIdParam = (paramName = 'id') => (req, res, next) => {
  if (!isPositiveInt(req.params[paramName])) {
    return res.status(400).json({ error: `Invalid ${paramName}` });
  }
  req.params[paramName] = parseInt(req.params[paramName], 10);
  next();
};
