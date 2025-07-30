import { REMOTE_DIRECTORY_PROVIDER_URI, currentResolvedConfig } from '@sourcegraph/cody-shared'

import type { Item, Mention } from '@openctx/client'
import { graphqlClient, isDefined, isError } from '@sourcegraph/cody-shared'
import { getBranchMentions } from './common/branch-mentions'
import { getRepositoryMentions } from './common/get-repository-mentions'
import { escapeRegExp } from './remoteFileSearch'

import type { OpenCtxProvider } from './types'

/**
 * Extracts repo name and optional branch from a string.
 * Supports formats: "repo@branch", "repo", or "repo:directory@branch"
 */
export function extractRepoAndBranch(input: string): [string, string | undefined] {
    // Handle case where input contains a colon (repo:directory@branch)
    const colonIndex = input.indexOf(':')
    if (colonIndex !== -1) {
        const repoPart = input.substring(0, colonIndex)
        const atIndex = repoPart.indexOf('@')
        if (atIndex !== -1) {
            return [repoPart.substring(0, atIndex), repoPart.substring(atIndex + 1)]
        }
        return [repoPart, undefined]
    }

    // Handle simple case: repo@branch or repo
    const atIndex = input.indexOf('@')
    if (atIndex !== -1) {
        return [input.substring(0, atIndex), input.substring(atIndex + 1)]
    }

    return [input, undefined]
}

const RemoteDirectoryProvider = createRemoteDirectoryProvider()

export function createRemoteDirectoryProvider(customTitle?: string): OpenCtxProvider {
    return {
        providerUri: REMOTE_DIRECTORY_PROVIDER_URI,

        meta() {
            return {
                name: customTitle ?? 'Remote Directories',
                mentions: {},
            }
        },

        async mentions({ query }) {
            if (!query?.trim()) {
                return await getRepositoryMentions('', REMOTE_DIRECTORY_PROVIDER_URI)
            }

            const trimmedQuery = query.trim()

            // Step 1: Repository selection (no colon means we're still selecting repos)
            if (!trimmedQuery.includes(':')) {
                // Handle repo@branch format (direct branch specification)
                if (trimmedQuery.includes('@')) {
                    const slashIndex = trimmedQuery.indexOf('/', trimmedQuery.indexOf('@'))
                    if (slashIndex > 0) {
                        // Format: repo@branch/directory
                        const repoWithBranch = trimmedQuery.substring(0, slashIndex)
                        const directoryPathPart = trimmedQuery.substring(slashIndex + 1)
                        return await getDirectoryMentions(repoWithBranch, directoryPathPart)
                    }
                    // Format: repo@branch (show root directories)
                    return await getDirectoryMentions(trimmedQuery, '')
                }
                // No @ symbol, still selecting repositories
                return await getRepositoryMentions(trimmedQuery, REMOTE_DIRECTORY_PROVIDER_URI)
            }

            // Step 2: Parse repo:path format
            const [repoName, pathPart] = trimmedQuery.split(':', 2)
            if (!repoName.trim()) {
                return await getRepositoryMentions('', REMOTE_DIRECTORY_PROVIDER_URI)
            }

            // Step 3: Branch selection/filtering (path starts with @)
            if (pathPart?.startsWith('@')) {
                const branchQuery = pathPart.substring(1) // Remove @

                // Handle trailing colon from mention menu selection (repo:@branch:)
                if (branchQuery.endsWith(':')) {
                    const cleanBranchName = branchQuery.slice(0, -1)
                    return await getDirectoryMentions(`${repoName}@${cleanBranchName}`, '')
                }

                // Handle branch/directory format (repo:@branch/directory)
                const slashIndex = branchQuery.indexOf('/')
                if (slashIndex > 0) {
                    const branchName = branchQuery.substring(0, slashIndex)
                    const directoryPath = branchQuery.substring(slashIndex + 1)
                    return await getDirectoryMentions(`${repoName}@${branchName}`, directoryPath)
                }

                // Check if this looks like a complete branch name vs a search query
                // Complete branch names typically have hyphens, slashes, underscores, or are longer
                const looksLikeCompleteBranch = branchQuery.length > 6 ||
                    branchQuery.includes('-') ||
                    branchQuery.includes('/') ||
                    branchQuery.includes('_')

                if (looksLikeCompleteBranch) {
                    // Treat as exact branch name - show directories for this branch
                    return await getDirectoryMentions(`${repoName}@${branchQuery}`, '')
                }

                // Short query or empty - show branch filtering/search
                return await getDirectoryBranchMentions(repoName, branchQuery)
            }

            // Step 4: Directory selection/filtering
            if (!pathPart?.trim()) {
                // Empty path after colon - check if repo has branch specified
                if (repoName.includes('@')) {
                    // repo@branch: - show directories for this branch
                    return await getDirectoryMentions(repoName, '')
                }
                // repo: - show branch selection
                return await getDirectoryBranchMentions(repoName)
            }

            // Step 5: Handle repo:query - could be branch filtering or directory search
            // First try branch filtering (this allows filtering without @ prefix)
            const branchMentions = await getDirectoryBranchMentions(repoName, pathPart.trim())

            // If we found matching branches, return them
            if (branchMentions.length > 0) {
                return branchMentions
            }

            // No matching branches found, treat as directory search
            return await getDirectoryMentions(repoName, pathPart.trim())
        },

        async items({ mention, message }) {
            if (!mention?.data?.repoID || !mention?.data?.directoryPath || !message) {
                return []
            }
            const revision = mention.data.branch ?? mention.data.rev
            return await getDirectoryItem(
                mention.data.repoName as string,
                mention.data.directoryPath as string,
                revision as string
            )
        },
    }
}

async function getDirectoryMentions(repoName: string, directoryPath?: string): Promise<Mention[]> {
    // Parse repo name and optional branch (format: repo@branch or repo:directory@branch)
    const [repoNamePart, branchPart] = extractRepoAndBranch(repoName)
    const repoRe = `^${escapeRegExp(repoNamePart)}$`
    const directoryRe = directoryPath ? escapeRegExp(directoryPath) : ''
    const repoWithBranch = branchPart ? `${repoRe}@${escapeRegExp(branchPart)}` : repoRe

    // For root directory search, use a pattern that finds top-level directories
    const filePattern = directoryPath ? `^${directoryRe}.*\\/.*` : '^[^/]+/[^/]+$'
    const query = `repo:${repoWithBranch} file:${filePattern} select:file.directory count:1000`

    const {
        auth: { serverEndpoint },
    } = await currentResolvedConfig()
    const dataOrError = await graphqlClient.searchFileMatches(query)

    if (isError(dataOrError) || dataOrError === null) {
        return []
    }

    return dataOrError.search.results.results
        .map(result => {
            if (result.__typename !== 'FileMatch') {
                return null
            }

            // Construct URL with branch information if available
            const baseUrl = `${serverEndpoint.replace(/\/$/, '')}/${result.repository.name}`
            const branchUrl = branchPart ? `${baseUrl}@${branchPart}` : baseUrl
            const url = `${branchUrl}/-/tree/${result.file.path}`

            return {
                uri: url,
                title: result.file.path,
                description: ' ',
                data: {
                    repoName: result.repository.name,
                    repoID: result.repository.id,
                    rev: result.file.commit.oid,
                    directoryPath: result.file.path,
                    branch: branchPart,
                },
            } satisfies Mention
        })
        .filter(isDefined)
}

async function getDirectoryBranchMentions(repoName: string, branchQuery?: string): Promise<Mention[]> {
    const branchMentions = await getBranchMentions({
        repoName,
        providerUri: REMOTE_DIRECTORY_PROVIDER_URI,
        branchQuery,
    })

    return branchMentions
}

async function getDirectoryItem(
    repoName: string,
    directoryPath: string,
    revision?: string
): Promise<Item[]> {
    const dataOrError = await graphqlClient.getDirectoryContents(repoName, directoryPath, revision)
    if (isError(dataOrError) || dataOrError === null) {
        return []
    }

    const entries = dataOrError.repository?.commit?.tree?.entries || []
    const {
        auth: { serverEndpoint },
    } = await currentResolvedConfig()

    const items: Item[] = []
    for (const entry of entries) {
        if (!entry.rawURL || entry.binary) {
            continue
        }

        let content = ''
        const rawContent = await graphqlClient.fetchContentFromRawURL(entry.rawURL)
        if (!isError(rawContent)) {
            content = rawContent
        }

        if (content) {
            items.push({
                url: revision
                    ? `${serverEndpoint.replace(/\/$/, '')}/${repoName}@${revision}/-/blob/${entry.path}`
                    : `${serverEndpoint.replace(/\/$/, '')}${entry.url}`,
                title: entry.path,
                ai: {
                    content,
                },
            })
        }
    }
    return items
}

export default RemoteDirectoryProvider
