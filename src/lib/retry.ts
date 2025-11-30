export interface RetryOptions {
    retries?: number;
    backoff?: number;
    maxBackoff?: number;
    onRetry?: (attempt: number, error: Error) => void;
    shouldRetry?: (error: Error) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
    retries: 3,
    backoff: 1000,
    maxBackoff: 10000,
    onRetry: () => { },
    shouldRetry: () => true,
};

export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const config = { ...DEFAULT_OPTIONS, ...options };
    let attempt = 0;

    while (true) {
        try {
            return await fn();
        } catch (error) {
            attempt++;

            if (attempt > config.retries) {
                throw error;
            }

            if (error instanceof Error && !config.shouldRetry(error)) {
                throw error;
            }

            if (config.onRetry) {
                config.onRetry(attempt, error instanceof Error ? error : new Error(String(error)));
            }

            // Calculate delay with exponential backoff and jitter
            const delay = Math.min(
                config.backoff * Math.pow(2, attempt - 1),
                config.maxBackoff
            );
            const jitter = Math.random() * 100;

            await new Promise((resolve) => setTimeout(resolve, delay + jitter));
        }
    }
}

export function isRetryableError(error: any): boolean {
    // Don't retry on 4xx client errors (except 429 Too Many Requests or 408 Request Timeout)
    if (error instanceof Response || (error && typeof error.status === 'number')) {
        const status = error.status;
        if (status >= 400 && status < 500) {
            return status === 429 || status === 408;
        }
    }
    return true;
}
