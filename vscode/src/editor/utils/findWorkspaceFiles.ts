import * as vscode from 'vscode'
import { getExcludePattern } from '../../cody-ignore/context-filter'

/**
 * Find all files in all workspace folders, respecting the user's `files.exclude`, `search.exclude`,
 * and other exclude settings. The intent is to match the files shown by VS Code's built-in `Go to
 * File...` command.
 */
export async function findWorkspaceFiles(): Promise<ReadonlyArray<vscode.Uri>> {
    const excludePatternStrings = await Promise.all(
        vscode.workspace.workspaceFolders?.flatMap(workspaceFolder =>
            getExcludePattern(workspaceFolder)
        ) ?? []
    )

    // Each excludePatternString is already formatted as {pattern1,pattern2}
    // We need to extract the patterns and combine them into a single exclude string
    const allExcludePatterns: string[] = []
    for (const patternString of excludePatternStrings) {
        if (patternString?.startsWith('{') && patternString.endsWith('}')) {
            const content = patternString.slice(1, -1)
            if (content) {
                allExcludePatterns.push(...content.split(',').filter(p => p.trim()))
            }
        }
    }

    // Add VS Code's built-in exclude patterns
    const config = vscode.workspace.getConfiguration()
    const filesExclude = config.get<Record<string, boolean>>('files.exclude') || {}
    const searchExclude = config.get<Record<string, boolean>>('search.exclude') || {}

    // Add patterns from files.exclude and search.exclude that are set to true
    for (const [pattern, enabled] of Object.entries(filesExclude)) {
        if (enabled) {
            allExcludePatterns.push(pattern)
        }
    }
    for (const [pattern, enabled] of Object.entries(searchExclude)) {
        if (enabled) {
            allExcludePatterns.push(pattern)
        }
    }

    // Always exclude .vscode directories to prevent config files from appearing in @-mentions
    allExcludePatterns.push('**/.vscode/**')

    const excludePattern = allExcludePatterns.length > 0 ? `{${allExcludePatterns.join(',')}}` : ''
    return vscode.workspace.findFiles('**/*', excludePattern)
}
