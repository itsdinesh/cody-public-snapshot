import { CallbackTelemetryProcessor } from '@sourcegraph/telemetry'
import {
    NoOpTelemetryRecorderProvider,
    type TelemetryRecorder,
    type TelemetryRecorderProvider,
} from './TelemetryRecorderProvider'

export let telemetryRecorderProvider: TelemetryRecorderProvider | undefined

/**
 * Recorder for recording telemetry events in the new telemetry framework:
 * https://sourcegraph.com/docs/dev/background-information/telemetry
 *
 * See GraphQLTelemetryExporter to learn more about how events are exported
 * when recorded using the new recorder.
 *
 * DISABLED: Telemetry is completely disabled - this is a no-op recorder
 *
 * DO NOT USE from webviews. Use the {@link useTelemetryRecorder} hook instead.
 */
export let telemetryRecorder: TelemetryRecorder = new NoOpTelemetryRecorderProvider().getRecorder([
    new CallbackTelemetryProcessor(() => {
        // DISABLED: Telemetry disabled - do nothing, don't throw error
    }),
])

export function updateGlobalTelemetryInstances(
    updatedProvider: TelemetryRecorderProvider & { noOp?: boolean }
): void {
    // DISABLED: Telemetry disabled - do nothing
    // Keep the no-op recorder, don't update it
}
