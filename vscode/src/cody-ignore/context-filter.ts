import { ContextFiltersProvider, type IsIgnored, contextFiltersProvider } from '@sourcegraph/cody-shared'
import * as vscode from 'vscode'
import { disposeFileWatchers, getExcludePattern } from '../editor/utils/findWorkspaceFiles'
import { type CodyIgnoreFeature, showCodyIgnoreNotification } from './notification'

export async function isUriIgnoredByContextFilterWithNotification(
    uri: vscode.Uri,
    feature: CodyIgnoreFeature
): Promise<IsIgnored> {
    const isIgnored = await contextFiltersProvider.isUriIgnored(uri)
    if (isIgnored) {
        showCodyIgnoreNotification(feature, isIgnored)
    }
    return isIgnored
}

/**
 * Initialize the ContextFiltersProvider with exclude pattern getter.
 * Returns a disposable that cleans up the configuration when disposed.
 */
export function initializeContextFiltersProvider(): vscode.Disposable {
    // Set up exclude pattern getter for ContextFiltersProvider
    ContextFiltersProvider.excludePatternGetter = {
        getExcludePattern,
        getWorkspaceFolder: (uri: vscode.Uri) => vscode.workspace.getWorkspaceFolder(uri) ?? null,
    }

    // Return disposable that cleans up the configuration
    return {
        dispose: disposeFileWatchers,
    }
}
