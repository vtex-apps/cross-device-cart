import type { InstanceOptions, IOContext } from '@vtex/api'
import { ExternalClient } from '@vtex/api'

/**
 * Response of POST /api/vtexid/credential/validate.
 * Documented in the VTEX ID API reference ("Check authenticated user").
 */
export interface ValidatedCredential {
  authStatus: string
  id?: string
  user?: string
  account?: string
  audience?: string
  tokenType?: string
}

const NOT_AUTHENTICATED_STATUSES = [400, 401, 403, 404]

/**
 * Account-scoped VTEX ID client. Uses the documented POST credential/validate
 * endpoint instead of the deprecated GET pub/authenticated/user, which is
 * not scoped to an account.
 */
export default class VtexId extends ExternalClient {
  constructor(context: IOContext, options?: InstanceOptions) {
    super(`http://${context.account}.vtexcommercestable.com.br`, context, {
      ...options,
      headers: {
        ...options?.headers,
        'X-Vtex-Proxy-To': `https://${context.account}.vtexcommercestable.com.br`,
      },
    })
  }

  /**
   * Returns the credential behind a VTEX ID user token, or null when the
   * token is not valid. Throws on 5xx / network errors.
   */
  public async validateToken(
    token: string
  ): Promise<ValidatedCredential | null> {
    try {
      return await this.http.post<ValidatedCredential>(
        '/api/vtexid/credential/validate',
        { token },
        {
          params: { an: this.context.account },
          metric: 'vtexid-credential-validate',
        }
      )
    } catch (error) {
      const status = (error as any)?.response?.status

      if (NOT_AUTHENTICATED_STATUSES.includes(status)) {
        return null
      }

      throw error
    }
  }
}
