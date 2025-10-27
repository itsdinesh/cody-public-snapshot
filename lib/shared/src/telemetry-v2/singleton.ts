import { CallbackTelemetryProcessor } from '@sourcegraph/telemetry'
import {
    NoOpTelemetryRecorderProvider,
    type TelemetryRecorder,
    type TelemetryRecorderProvider,
} from './TelemetryRecorderProvider'

export let telemetryRecorderProvider: TelemetryRecorderProvider | undefined

export let telemetryRecorder: TelemetryRecorder = new NoOpTelemetryRecorderProvider().getRecorder([
    new CallbackTelemetryProcessor(() => {}),
])

export function updateGlobalTelemetryInstances(
    updatedProvider: TelemetryRecorderProvider & { noOp?: boolean }
): void {}
