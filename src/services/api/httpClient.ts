export type HttpRequestOptions = {
  timeoutMs: number;
  retryNetwork?: boolean;
};

export class ApiClientError extends Error {
  status?: number;
  detail?: string;
  isTimeout?: boolean;
  isNetwork?: boolean;

  constructor(message: string, init?: Partial<ApiClientError>) {
    super(message);
    Object.assign(this, init);
  }
}

async function fetchWithTimeout(input: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (caught) {
    if (caught instanceof Error && caught.name === "AbortError") {
      throw new ApiClientError("Request timed out", { isTimeout: true });
    }
    throw new ApiClientError("Network error", { isNetwork: true });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function parseError(response: Response): Promise<ApiClientError> {
  let detail = `HTTP ${response.status}`;
  try {
    const body = (await response.json()) as { detail?: string };
    if (body.detail) {
      detail = body.detail;
    }
  } catch {
    // no-op
  }
  return new ApiClientError(detail, { status: response.status, detail });
}

export async function postJson<T>(url: string, body: unknown, options: HttpRequestOptions): Promise<T> {
  const attempt = async () => {
    const response = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // TODO: attach Supabase auth token header when backend auth is enabled.
        },
        body: JSON.stringify(body),
      },
      options.timeoutMs,
    );

    if (!response.ok) {
      throw await parseError(response);
    }

    return (await response.json()) as T;
  };

  try {
    return await attempt();
  } catch (caught) {
    const err = caught instanceof ApiClientError ? caught : new ApiClientError("Request failed");
    if (options.retryNetwork && (err.isTimeout || err.isNetwork)) {
      return attempt();
    }
    throw err;
  }
}

export function inferApiMessage(caught: unknown): string {
  if (caught instanceof ApiClientError) {
    if (caught.isTimeout || caught.isNetwork) {
      return "Couldn't reach analysis service. Check internet and try again.";
    }
    if (caught.status === 400) {
      return caught.detail || "The image could not be processed.";
    }
    if (caught.status && caught.status >= 500) {
      return "Analysis service failed. Please retry.";
    }
    return caught.message;
  }

  if (caught instanceof Error && caught.message) {
    return caught.message;
  }

  return "Something went wrong. Please try again.";
}
