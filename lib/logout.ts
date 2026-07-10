const DEFAULT_LOGOUT_TIMEOUT_MS = 3_000;

interface LogoutResponse {
  success: boolean;
  error?: string;
}

export interface LogoutWithImmediateCleanupOptions {
  revoke: () => Promise<LogoutResponse>;
  cleanup: () => void;
  timeoutMs?: number;
}

function awaitWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Signed out locally, but the server session revocation timed out.'));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function logoutWithImmediateCleanup({
  revoke,
  cleanup,
  timeoutMs = DEFAULT_LOGOUT_TIMEOUT_MS,
}: LogoutWithImmediateCleanupOptions): Promise<void> {
  let revocation: Promise<LogoutResponse>;
  try {
    revocation = revoke();
  } catch (error) {
    revocation = Promise.reject(error);
  }

  cleanup();

  const response = await awaitWithTimeout(revocation, timeoutMs);
  if (!response.success) {
    throw new Error(response.error || 'Signed out locally, but the server session could not be closed.');
  }
}
