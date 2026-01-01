export const TEMPORAL_CONFIG = {
  address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
  namespace: process.env.TEMPORAL_NAMESPACE || 'default',
  taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'payment-task-queue',
};

export const WORKFLOW_CONFIG = {
  paymentTimeoutMs: 30 * 60 * 1000, // 30 minutos
  retryPolicy: {
    maximumAttempts: 3,
    initialInterval: '1 second',
    maximumInterval: '30 seconds',
    backoffCoefficient: 2,
  },
};
