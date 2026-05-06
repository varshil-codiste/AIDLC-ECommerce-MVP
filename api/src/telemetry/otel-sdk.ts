import { NodeSDK, resources, tracing } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const { BatchSpanProcessor } = tracing;
const { Resource } = resources;

const exporter = new OTLPTraceExporter({
  url: process.env.OTLP_ENDPOINT ?? 'http://localhost:4317',
  headers: process.env.OTLP_AUTH_HEADER ? { authorization: process.env.OTLP_AUTH_HEADER } : {},
});

const sdk = new NodeSDK({
  resource: new Resource({
    'service.name': process.env.OTEL_SERVICE_NAME ?? 'api',
    'service.version': process.env.OTEL_SERVICE_VERSION ?? 'dev',
    'deployment.environment': process.env.NODE_ENV ?? 'development',
  }),
  spanProcessor: new BatchSpanProcessor(exporter, {
    maxExportBatchSize: 512,
    scheduledDelayMillis: 5000,
    exportTimeoutMillis: 5000,
    maxQueueSize: 2048,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().catch(() => undefined);
});
