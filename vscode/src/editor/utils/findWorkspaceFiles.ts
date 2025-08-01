import * as vscode from 'vscode'

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

type IgnoreRecord = Record<string, boolean>

const excludeCache = new Map<string, IgnoreRecord>()
const fileWatchers = new Map<string, vscode.FileSystemWatcher>()

// Export for testing
export function clearCache(): void {
    excludeCache.clear()
    for (const watcher of fileWatchers.values()) {
        watcher.dispose()
    }
    fileWatchers.clear()
}

function getCacheKey(workspaceFolder: vscode.WorkspaceFolder | null): string {
    return workspaceFolder?.uri.toString() ?? 'no-workspace'
}

function setupFileWatcher(workspaceFolder: vscode.WorkspaceFolder): void {
    const filename = '.sourcegraph/ignore'
    const watcherKey = `${workspaceFolder.uri.toString()}:${filename}`
    if (fileWatchers.has(watcherKey)) {
        return
    }

    const pattern = new vscode.RelativePattern(workspaceFolder, filename)
    const watcher = vscode.workspace.createFileSystemWatcher(pattern)

    const updateCache = async () => {
        const cacheKey = getCacheKey(workspaceFolder)

        const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, filename)
        const ignoreData = await readIgnoreFile(fileUri)
        excludeCache.set(cacheKey, ignoreData)
    }

    watcher.onDidChange(updateCache)
    watcher.onDidCreate(updateCache)
    watcher.onDidDelete(async () => {
        const cacheKey = getCacheKey(workspaceFolder)
        excludeCache.set(cacheKey, {})
    })

    fileWatchers.set(watcherKey, watcher)
}

export async function initializeCache(workspaceFolder: vscode.WorkspaceFolder | null): Promise<void> {
    const cacheKey = getCacheKey(workspaceFolder)
    if (excludeCache.has(cacheKey)) {
        return
    }

    let sgignoreExclude: IgnoreRecord = {}

    if (workspaceFolder) {
        sgignoreExclude = await readIgnoreFile(
            vscode.Uri.joinPath(workspaceFolder.uri, '.sourcegraph', 'ignore')
        )

        setupFileWatcher(workspaceFolder)
    }

    excludeCache.set(cacheKey, sgignoreExclude)
}

export async function getExcludePattern(
    workspaceFolder: vscode.WorkspaceFolder | null
): Promise<string> {
    await initializeCache(workspaceFolder)

    const cacheKey = getCacheKey(workspaceFolder)
    const cached = excludeCache.get(cacheKey)
    const sgignoreExclude = cached ?? {}
    const mergedExclude: IgnoreRecord = {
        ...sgignoreExclude,
    }
    const excludePatterns = Object.keys(mergedExclude).filter(key => mergedExclude[key] === true)

    // Return empty string if no patterns, otherwise format as glob pattern
    if (excludePatterns.length === 0) {
        return ''
    }

    // For single pattern, no need for braces
    if (excludePatterns.length === 1) {
        return excludePatterns[0]
    }

    // For multiple patterns, wrap in braces
    return `{${excludePatterns.join(',')}}`
}

export async function readIgnoreFile(uri: vscode.Uri): Promise<IgnoreRecord> {
    const ignore: IgnoreRecord = {}
    try {
        const data = await vscode.workspace.fs.readFile(uri)
        const content = Buffer.from(data).toString('utf-8')

        for (let line of content.split('\n')) {
            if (line.startsWith('!')) {
                continue
            }

            // Strip comment and whitespace.
            line = line.replace(/\s*(#.*)?$/, '').trim()

            if (line === '') {
                continue
            }

            // Replace , with . that contain commas to avoid typos for entries such as
            // *,something
            if (line.includes(',')) {
                line = line.replace(/,/g, '.')
            }

            if (line.endsWith('/')) {
                line = line.slice(0, -1)
            }
            if (!line.startsWith('/') && !line.startsWith('**/')) {
                line = `**/${line}`
            }
            ignore[line] = true
        }
    } catch (error) {
        // Silently handle file not found or read errors
        // This is expected behavior when .sourcegraph/ignore doesn't exist
    }
    return ignore
}

/**
 * Dispose all file watchers and clear caches. Call this when the extension is deactivated.
 */
export function disposeFileWatchers(): void {
    for (const watcher of fileWatchers.values()) {
        watcher.dispose()
    }
    fileWatchers.clear()
    excludeCache.clear()
}
