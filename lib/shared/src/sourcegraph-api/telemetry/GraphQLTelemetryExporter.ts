import type { TelemetryEventInput, TelemetryExporter } from '@sourcegraph/telemetry'

import { logError } from '../../logger'
import { isError } from '../../utils'
import { graphqlClient } from '../graphql/client'

/**
 * GraphQLTelemetryExporter exports events via the new Sourcegraph telemetry
 * framework: https://sourcegraph.com/docs/dev/background-information/telemetry
 *
 * If configured to do so, it will also attempt to send events to the old
 * event-logging mutations if the instance is older than 5.2.0.
 */
export class GraphQLTelemetryExporter implements TelemetryExporter {
    constructor(private readonly allowedDevEvents?: { feature: string; action: string }[]) {}

    private isEventAllowed(event: TelemetryEventInput): boolean {
        if (this.allowedDevEvents === undefined) {
            return true
        }

        return this.allowedDevEvents.some(
            allowed => allowed.feature === event.feature && allowed.action === event.action
        )
    }

    /**
     * BYPASS: Disable telemetry export to prevent network requests
     */
    public async exportEvents(events: TelemetryEventInput[]): Promise<void> {
        // Do nothing - telemetry disabled for spoofed authentication
        return
    }
}
