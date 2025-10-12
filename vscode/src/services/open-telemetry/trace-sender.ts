/**
 * Sends trace data to the server without blocking
 * DISABLED: Analytics and traces are completely disabled
 */
export const TraceSender = {
    send(_spanData: any): void {
        // Telemetry disabled - do nothing
    },
}
