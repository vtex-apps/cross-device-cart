/** HTTP status of a failed request, or undefined (also for a thrown null/undefined). */
export const httpStatus = (error: unknown): number | undefined =>
  (error as { response?: { status?: number } } | null | undefined)?.response
    ?.status
