/**
 * spyxbd - Validation & Normalization Service
 */

export interface NormalizedPhone {
  isValid: boolean;
  raw: string;
  normalizedInternational: string; // e.g. +8801712345678
  normalizedLocal: string;         // e.g. 01712345678
  operator?: string;
  error?: string;
}

/**
 * Validates and normalizes Bangladeshi phone numbers.
 * Allowed formats:
 * - 01XXXXXXXXX (11 digits, starts with 013, 014, 015, 016, 017, 018, 019)
 * - +8801XXXXXXXXX or 8801XXXXXXXXX
 */
export function validateAndNormalizeBDPhone(rawPhone: string): NormalizedPhone {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return {
      isValid: false,
      raw: '',
      normalizedInternational: '',
      normalizedLocal: '',
      error: 'Phone number is required',
    };
  }

  // Strip spaces, hyphens, parentheses
  const cleaned = rawPhone.trim().replace(/[\s\-\(\)]/g, '');

  // Match BD phone formats
  // Matches +8801[3-9]\d{8}, 8801[3-9]\d{8}, or 01[3-9]\d{8}
  const bdRegex = /^(?:\+?88)?(01[3-9]\d{8})$/;
  const match = cleaned.match(bdRegex);

  if (!match) {
    return {
      isValid: false,
      raw: rawPhone,
      normalizedInternational: '',
      normalizedLocal: '',
      error: 'Please enter a valid Bangladeshi phone number (e.g., 01XXXXXXXXX or +8801XXXXXXXXX)',
    };
  }

  const localNumber = match[1]; // 01XXXXXXXXX
  const internationalNumber = `+88${localNumber}`;

  // Operator detection
  const prefix = localNumber.substring(0, 3);
  let operator = 'Unknown';
  if (prefix === '017' || prefix === '013') operator = 'Grameenphone';
  else if (prefix === '018') operator = 'Robi';
  else if (prefix === '019' || prefix === '014') operator = 'Banglalink';
  else if (prefix === '015') operator = 'Teletalk';
  else if (prefix === '016') operator = 'Airtel';

  return {
    isValid: true,
    raw: rawPhone,
    normalizedInternational: internationalNumber,
    normalizedLocal: localNumber,
    operator,
  };
}

export interface GeolocationValidation {
  isValid: boolean;
  errors: string[];
}

export function validateCoordinates(
  latitude: unknown,
  longitude: unknown,
  accuracy: unknown
): GeolocationValidation {
  const errors: string[] = [];

  if (typeof latitude !== 'number' || isNaN(latitude)) {
    errors.push('Latitude must be a valid number');
  } else if (latitude < -90 || latitude > 90) {
    errors.push('Latitude must be between -90 and 90 degrees');
  }

  if (typeof longitude !== 'number' || isNaN(longitude)) {
    errors.push('Longitude must be a valid number');
  } else if (longitude < -180 || longitude > 180) {
    errors.push('Longitude must be between -180 and 180 degrees');
  }

  if (typeof accuracy !== 'number' || isNaN(accuracy)) {
    errors.push('Accuracy must be a valid number');
  } else if (accuracy <= 0) {
    errors.push('Accuracy must be a positive number of meters');
  } else if (accuracy > 500000) {
    errors.push('Reported accuracy is implausibly large (>500km)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
