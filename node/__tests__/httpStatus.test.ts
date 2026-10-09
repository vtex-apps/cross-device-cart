import { httpStatus } from '../utils/httpStatus'

describe('httpStatus', () => {
  it('returns the response status of a failed request', () => {
    expect(httpStatus({ response: { status: 404 } })).toBe(404)
  })

  it.each([null, undefined, new Error('boom'), 'boom', { response: null }])(
    'returns undefined without throwing for %p',
    (error) => {
      expect(httpStatus(error)).toBeUndefined()
    }
  )
})
