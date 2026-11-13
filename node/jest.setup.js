/* eslint-env jest */
/* eslint-disable global-require */
// Jest 25 (inside @vtex/test-tools) does not resolve package.json "exports" subpaths,
// which the OpenTelemetry dependencies of @vtex/api 6.51.0 rely on. Map them to their files.
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
