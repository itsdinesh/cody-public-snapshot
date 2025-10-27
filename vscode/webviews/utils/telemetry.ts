import type { TelemetryRecorder } from '@sourcegraph/cody-shared'

import type { SpanContext } from '@opentelemetry/api'
import { createContext, useContext } from 'react'
import { ApiPostMessage } from '../Chat'
import { VSCodeWrapper } from './VSCodeApi'

/**
 * Create a new {@link TelemetryRecorder} for use in the VS Code webviews for V2 telemetry.
 * Use either postMessage or VSCodeWrapper to send messages to the VS Code extension.
 */
export function createWebviewTelemetryRecorder(
    postMessage: ApiPostMessage | Pick<VSCodeWrapper, 'postMessage'>
): TelemetryRecorder {
    return {
        recordEvent(feature, action, parameters) {},
    }
}

export const TelemetryRecorderContext = createContext<TelemetryRecorder | null>(null)

export function useTelemetryRecorder(): TelemetryRecorder {
    const telemetryRecorder = useContext(TelemetryRecorderContext)
    if (!telemetryRecorder) {
        throw new Error('no telemetryRecorder')
    }
    return telemetryRecorder
}

export function getTraceparentFromSpanContext(spanContext: SpanContext): string {
    return `00-${spanContext.traceId}-${spanContext.spanId}-${spanContext.traceFlags
        .toString(16)
        .padStart(2, '0')}`
}
