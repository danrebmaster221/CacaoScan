/**
 * ISO 27001 Control #2 — Strong Password Policy
 *
 * Validates passwords against enterprise security requirements:
 * - Minimum 12 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one number (0-9)
 * - At least one special character (!@#$%^&*...)
 *
 * Security Test: Verified that passwords below policy are rejected
 * at the UI layer before reaching the server.
 */

export interface PasswordRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: 'length',
    label: 'At least 12 characters',
    test: (p) => p.length >= 12,
  },
  {
    id: 'uppercase',
    label: 'One uppercase letter (A-Z)',
    test: (p) => /[A-Z]/.test(p),
  },
  {
    id: 'lowercase',
    label: 'One lowercase letter (a-z)',
    test: (p) => /[a-z]/.test(p),
  },
  {
    id: 'number',
    label: 'One number (0-9)',
    test: (p) => /[0-9]/.test(p),
  },
  {
    id: 'special',
    label: 'One special character (!@#$%^&*)',
    test: (p) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(p),
  },
];

/**
 * Validates a password against all rules.
 * Returns { isValid, failures[] }
 */
export function validatePassword(password: string): {
  isValid: boolean;
  passedRules: string[];
  failedRules: string[];
  strength: number; // 0-100
} {
  const passedRules: string[] = [];
  const failedRules: string[] = [];

  for (const rule of PASSWORD_RULES) {
    if (rule.test(password)) {
      passedRules.push(rule.id);
    } else {
      failedRules.push(rule.id);
    }
  }

  const strength = Math.round((passedRules.length / PASSWORD_RULES.length) * 100);

  return {
    isValid: failedRules.length === 0,
    passedRules,
    failedRules,
    strength,
  };
}

/**
 * Returns a human-readable strength label and color.
 */
export function getStrengthInfo(strength: number): {
  label: string;
  color: string;
} {
  if (strength <= 20) return { label: 'Very Weak', color: '#E53935' };
  if (strength <= 40) return { label: 'Weak', color: '#FF7043' };
  if (strength <= 60) return { label: 'Fair', color: '#FFA726' };
  if (strength <= 80) return { label: 'Strong', color: '#66BB6A' };
  return { label: 'Very Strong', color: '#4CAF50' };
}
