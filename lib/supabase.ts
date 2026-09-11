import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const jwtClockRetryDelays = [750, 1500, 3000, 5000] as const;

export function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export const supabase = createClient(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseAnonKey ?? "placeholder-key",
  { global: { fetch: fetchWithJwtClockRetry } },
);

async function fetchWithJwtClockRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const requestInputs = createRequestInputs(input);
  let response = await fetch(requestInputs[0], init);

  for (const [retryIndex, delayMs] of jwtClockRetryDelays.entries()) {
    if (!(await isFutureJwtResponse(response))) {
      return response;
    }

    logJwtClockRetry(retryIndex + 1, delayMs);
    await wait(delayMs);
    response = await fetch(requestInputs[retryIndex + 1], init);
  }

  return response;
}

function createRequestInputs(input: RequestInfo | URL): Array<RequestInfo | URL> {
  const requestCount = jwtClockRetryDelays.length + 1;

  if (typeof Request !== "undefined" && input instanceof Request) {
    return Array.from({ length: requestCount }, () => input.clone());
  }

  return Array.from({ length: requestCount }, () => input);
}

async function isFutureJwtResponse(response: Response): Promise<boolean> {
  if (response.status !== 401) {
    return false;
  }

  try {
    const responseBody: unknown = await response.clone().json();
    return isFutureJwtError(responseBody);
  } catch {
    return false;
  }
}

function isFutureJwtError(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  const error = value as Record<string, unknown>;
  return error.code === "PGRST303" && error.message === "JWT issued at future";
}

function logJwtClockRetry(attempt: number, delayMs: number): void {
  console.warn(
    JSON.stringify({ event: "supabase_jwt_clock_retry", attempt, delayMs }),
  );
}

function wait(delayMs: number): Promise<void> {
  return new Promise<void>((resolve) => {
    globalThis.setTimeout(resolve, delayMs);
  });
}
