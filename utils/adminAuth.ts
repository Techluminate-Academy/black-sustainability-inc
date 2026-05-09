// Admin emails that are allowed to access admin features (legacy support)
export const ADMIN_EMAILS = [
  'yeamah@blacksustainability.org',
  'raina@blacksustainability.org'
];

export interface AdminCheckResult {
  isAdmin: boolean;
  userEmail: string | null;
}

/**
 * Check if a user has admin privileges based on their email (legacy method)
 * @deprecated Use the new admin system with JWT tokens instead
 */
export function checkAdminAccess(userEmail: string | null): AdminCheckResult {
  if (!userEmail) {
    return { isAdmin: false, userEmail: null };
  }
  
  return {
    isAdmin: ADMIN_EMAILS.includes(userEmail),
    userEmail
  };
}

/**
 * Extract user email from bsn_user_data cookie
 */
export function extractUserEmailFromCookie(cookieString: string | undefined): string | null {
  if (!cookieString) return null;
  
  const bsnUserDataMatch = cookieString.match(/bsn_user_data=([^;]+)/);
  if (!bsnUserDataMatch) return null;
  
  try {
    const userData = JSON.parse(decodeURIComponent(bsnUserDataMatch[1]));
    return userData.loginEmail || userData.email || null;
  } catch (err) {
    console.error('Failed to parse bsn_user_data cookie:', err);
    return null;
  }
}

/**
 * Check admin access from cookie string (for server-side use)
 */
export function checkAdminFromCookie(cookieString: string | undefined): AdminCheckResult {
  const userEmail = extractUserEmailFromCookie(cookieString);
  return checkAdminAccess(userEmail);
}

/**
 * Check admin access from cookie (for client-side use)
 */
export function checkAdminFromClientCookie(): AdminCheckResult {
  if (typeof document === 'undefined') {
    return { isAdmin: false, userEmail: null };
  }
  
  function getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  const raw = getCookie('bsn_user_data');
  if (!raw) {
    return { isAdmin: false, userEmail: null };
  }

  try {
    const userObj = JSON.parse(raw);
    const email = userObj.loginEmail || userObj.email;
    return checkAdminAccess(email);
  } catch (err) {
    console.error('Failed to parse bsn_user_data cookie:', err);
    return { isAdmin: false, userEmail: null };
  }
} 