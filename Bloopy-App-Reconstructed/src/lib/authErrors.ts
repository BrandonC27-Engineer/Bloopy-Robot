export function getFriendlyAuthError(error: unknown): string {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : String(error ?? "");

  const normalized = message.toLowerCase();

  if (normalized.includes("failed to fetch") || normalized.includes("network")) {
    return "I can’t reach Bloopy’s account server right now. Check the internet connection and try again.";
  }

  if (normalized.includes("invalid login credentials")) {
    return "Hmm, that email and password don’t match. Try again or reset your password.";
  }

  if (normalized.includes("email not confirmed")) {
    return "That email still needs to be confirmed. Check your inbox for Bloopy’s confirmation email.";
  }

  if (normalized.includes("rate limit") || normalized.includes("too many requests")) {
    return "Too many tries at once. Give Bloopy a minute, then try again.";
  }

  return message || "Something went wrong. Please try again.";
}
