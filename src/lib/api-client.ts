import { withRetry, isRetryableError } from './retry';

interface RequestOptions extends RequestInit {
    retries?: number;
    skipRetry?: boolean;
}

class ApiClient {
    private async request<T>(url: string, options: RequestOptions = {}): Promise<T> {
        const { retries = 3, skipRetry = false, ...fetchOptions } = options;

        const executeRequest = async () => {
            const response = await fetch(url, {
                ...fetchOptions,
                headers: {
                    'Content-Type': 'application/json',
                    ...fetchOptions.headers,
                },
            });

            if (!response.ok) {
                const error = new Error(`HTTP error! status: ${response.status}`);
                (error as any).status = response.status;
                throw error;
            }

            // If the response is empty (e.g. 204), return null
            if (response.status === 204) return null as unknown as T;

            // Check content type to determine how to parse
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return response.json();
            }

            // For other types, return text or blob? For now, assume JSON or text.
            // If we need streams, we should expose a separate method or return response.
            return response.text() as unknown as T;
        };

        if (skipRetry) {
            return executeRequest();
        }

        return withRetry(executeRequest, {
            shouldRetry: isRetryableError,
            retries,
        });
    }

    // Exposed methods
    async get<T>(url: string, options?: RequestOptions): Promise<T> {
        return this.request<T>(url, { ...options, method: 'GET' });
    }

    async post<T>(url: string, body: any, options?: RequestOptions): Promise<T> {
        return this.request<T>(url, {
            ...options,
            method: 'POST',
            body: JSON.stringify(body),
        });
    }

    async put<T>(url: string, body: any, options?: RequestOptions): Promise<T> {
        return this.request<T>(url, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(body),
        });
    }

    async delete<T>(url: string, options?: RequestOptions): Promise<T> {
        return this.request<T>(url, { ...options, method: 'DELETE' });
    }

    // Special method for streaming or raw response
    async fetchRaw(url: string, options: RequestOptions = {}): Promise<Response> {
        const { retries = 3, skipRetry = false, ...fetchOptions } = options;

        const executeRequest = async () => {
            const response = await fetch(url, {
                ...fetchOptions,
                headers: {
                    'Content-Type': 'application/json',
                    ...fetchOptions.headers,
                },
            });

            if (!response.ok) {
                const error = new Error(`HTTP error! status: ${response.status}`);
                (error as any).status = response.status;
                throw error;
            }
            return response;
        };

        if (skipRetry) {
            return executeRequest();
        }

        return withRetry(executeRequest, {
            shouldRetry: isRetryableError,
            retries,
        });
    }
}

export const api = new ApiClient();
