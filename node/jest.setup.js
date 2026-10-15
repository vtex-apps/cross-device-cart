/* eslint-env jest */
/* eslint-disable global-require */
// Jest 25 (from @vtex/test-tools) cannot resolve the package.json "exports"
// subpaths used by the OpenTelemetry dependencies of @vtex/api >= 6.50, so map them to their files.
jest.mock(
  '@opentelemetry/otlp-exporter-base/node-http',
  () =>
    require('@opentelemetry/otlp-exporter-base/build/src/index-node-http.js'),
  { virtual: true }
)
jest.mock(
  '@vtex/diagnostics-semconv',
  () => require('@vtex/diagnostics-semconv/dist/cjs/index.cjs'),
  { virtual: true }
)
