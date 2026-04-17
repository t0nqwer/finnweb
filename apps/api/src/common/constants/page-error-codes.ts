/**
 * Page Editing API Error Codes
 *
 * This file documents all error codes returned by the page editing API
 * for use in frontend error handling and user messaging (especially Thai SMEs).
 */

export const PAGE_ERROR_CODES = {
  // Validation Errors
  PAGE_NOT_FOUND: {
    code: "PAGE_NOT_FOUND",
    message: "The page you tried to access does not exist",
    resolution: "Make sure the page ID is correct",
    httpStatus: 404,
  },

  PAGE_TITLE_REQUIRED: {
    code: "PAGE_TITLE_REQUIRED",
    message: "Page title is required",
    resolution: "Please enter a title for your page",
    httpStatus: 400,
  },

  PAGE_SLUG_REQUIRED: {
    code: "PAGE_SLUG_REQUIRED",
    message: "Page slug/URL is required",
    resolution: "Enter a valid URL slug (letters, numbers, and hyphens only)",
    httpStatus: 400,
  },

  PAGE_SLUG_ALREADY_EXISTS: {
    code: "PAGE_SLUG_ALREADY_EXISTS",
    message: "A page with this URL already exists on this site",
    resolution: "Choose a different URL for your page",
    httpStatus: 400,
  },

  PAGE_PATH_ALREADY_EXISTS: {
    code: "PAGE_PATH_ALREADY_EXISTS",
    message: "A page with this path already exists on this site",
    resolution:
      "The custom path you chose is already in use. Try a different path.",
    httpStatus: 400,
  },

  PAGE_LIMIT_REACHED: {
    code: "PAGE_LIMIT_REACHED",
    message: "You have reached the maximum number of pages for your plan",
    resolution:
      "Upgrade your plan to create more pages, or delete unused pages",
    httpStatus: 400,
  },

  // Home Page Errors
  HOME_PAGE_REQUIRED: {
    code: "HOME_PAGE_REQUIRED",
    message:
      "Your site must have a home page. You cannot unset the only home page.",
    resolution:
      "Create a new home page before changing this page's home status",
    httpStatus: 400,
  },

  HOME_PAGE_DELETE_NOT_ALLOWED: {
    code: "HOME_PAGE_DELETE_NOT_ALLOWED",
    message: "You cannot delete your site's home page",
    resolution:
      "Make a different page the home page first, then you can delete this one",
    httpStatus: 400,
  },

  // Permission Errors
  SITE_NOT_FOUND_OR_FORBIDDEN: {
    code: "SITE_NOT_FOUND_OR_FORBIDDEN",
    message: "You do not have access to this site",
    resolution: "Make sure you have permission to edit this site and try again",
    httpStatus: 403,
  },
} as const;

export type PageErrorCode = keyof typeof PAGE_ERROR_CODES;

/**
 * Get error details for a given error code
 */
export function getPageErrorDetails(code: string) {
  const details = PAGE_ERROR_CODES[code as PageErrorCode];
  return (
    details || {
      code,
      message: "An unknown error occurred",
      resolution: "Please try again or contact support",
      httpStatus: 500,
    }
  );
}
