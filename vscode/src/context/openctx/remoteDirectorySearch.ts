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
            // Step 1: Start with showing repositories search
            const trimmedQuery = query?.trim()
            if (!trimmedQuery) {
                return await getRepositoryMentions('', REMOTE_DIRECTORY_PROVIDER_URI)
            }

            // Step 2: Show Branch or Directory initial listing
            const [repoName, pathPart] = trimmedQuery.split(':', 2)
            if (!pathPart?.trim()) {
                // Empty path after colon - check if repo has branch specified
                if (repoName.includes('@')) {
                    // repo@branch: - show directories for this branch
                    return await getDirectoryMentions(repoName, '')
                }

                // repo: - show branch selection
                return await getDirectoryBranchMentions(repoName)
            }

            // Step 3: If we have a path without an @, search for branches
            if (!repoName.includes('@')) {
                return await getDirectoryBranchMentions(repoName, pathPart.trim())
            }

            // Step 4: No matching branches found, treat as directory search
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
    const filePattern = directoryPath ? `^${directoryRe}.*\\/.*` : '^[^/]+/[^/]+$ -file:^\\.'
    const query = `repo:${repoWithBranch} file:${filePattern} select:file.directory count:1000`

    const {
        auth: { serverEndpoint },
    } = await currentResolvedConfig()
    const dataOrError = await graphqlClient.searchFileMatches(query)

    if (isError(dataOrError) || dataOrError === null) {
        return []
    }

    // sort results by file path
    dataOrError.search.results.results.sort((a, b) => {
        return a.file.path.localeCompare(b.file.path)
    })

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
