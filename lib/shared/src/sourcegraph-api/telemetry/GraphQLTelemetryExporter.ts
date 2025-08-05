import type { TelemetryEventInput, TelemetryExporter } from '@sourcegraph/telemetry'

/**
 * GraphQLTelemetryExporter exports events via the new Sourcegraph telemetry
 * framework: https://sourcegraph.com/docs/dev/background-information/telemetry
 *
 * If configured to do so, it will also attempt to send events to the old
 * event-logging mutations if the instance is older than 5.2.0.
 */
export class GraphQLTelemetryExporter implements TelemetryExporter {
    constructor(_allowedDevEvents?: { feature: string; action: string }[]) {}



    /**
     * BYPASS: Disable telemetry export to prevent network requests
     */
    public async exportEvents(_events: TelemetryEventInput[]): Promise<void> {
        // Do nothing - telemetry disabled for spoofed authentication
        return
    }
}
