export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Returns the login URL for the application
// Using local auth - simple redirect to /login page
export const getLoginUrl = () => {
  return "/login";
};

