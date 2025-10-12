import type { Disposable } from 'vscode'

/**
 * TELEMETRY COMPLETELY DISABLED
 *
 * This module has been disabled to prevent any telemetry or analytics
 * from being sent to Sourcegraph servers.
 */

export const ALLOWED_DEV_EVENTS: { feature: string; action: string }[] = []

/**
 * No-op function that returns an empty disposable.
 * Telemetry is completely disabled.
 */
export function createOrUpdateTelemetryRecorderProvider(_isExtensionModeDevOrTest: boolean): Disposable {
    // Return no-op disposable - telemetry is disabled
    return { dispose: () => {} }
}

/**
 * No-op function for splitting metadata.
 * Telemetry is completely disabled.
 */
export function splitSafeMetadata<Properties extends { [key: string]: any }>(
    _properties: Properties
): any {
    return {
        metadata: {},
        privateMetadata: {},
    }
}
