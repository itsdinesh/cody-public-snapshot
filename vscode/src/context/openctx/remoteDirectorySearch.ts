import { REMOTE_DIRECTORY_PROVIDER_URI, currentResolvedConfig } from '@sourcegraph/cody-shared'

import type { Item, Mention } from '@openctx/client'
import { graphqlClient, isDefined, isError } from '@sourcegraph/cody-shared'
import { getBranchMentions } from './common/branch-mentions'
import { getRepositoryMentions } from './common/get-repository-mentions'
import { escapeRegExp } from './remoteFileSearch'

import type { OpenCtxProvider } from './types'

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
            const trimmedQuery = query?.trim() ?? ''
            if (!trimmedQuery.includes(':')) {
                return await getRepositoryMentions(trimmedQuery, REMOTE_DIRECTORY_PROVIDER_URI)
            }

            // Step 2: Show Branch listing and allow searching
            const [repoName, directoryPath] = trimmedQuery.split(':')
            if (!repoName.includes('@')) {
                return await getDirectoryBranchMentions(repoName, directoryPath?.trim())
            }

            // This is "repo@branch:" - show file listing for this branch
            // Step 3: branch found, treat as directory search
            const [repoNamePart, branch] = repoName.split('@')
            return await getDirectoryMentions(repoNamePart, directoryPath?.trim(), branch)
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

async function getDirectoryMentions(
    repoName: string,
    directoryPath?: string,
    branch?: string
): Promise<Mention[]> {
    const repoRe = `^${escapeRegExp(repoName)}$`
    const directoryRe = directoryPath ? escapeRegExp(directoryPath) : ''
    const repoWithBranch = branch ? `${repoRe}@${branch}` : repoRe

    // For root directory search, use a pattern that finds top-level directories without .directories
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
            const branchUrl = branch ? `${baseUrl}@${branch}` : baseUrl
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
                    branch: branch,
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

    // Filter out binary files and entries without rawURL
    const validEntries = entries.filter(entry => entry.rawURL && !entry.binary)

    // Fetch content in parallel for better performance
    const contentPromises = validEntries.map(async entry => {
        try {
            const content = await graphqlClient.fetchContentFromRawURL(entry.rawURL!)
            if (isError(content)) {
                console.error(`Failed to fetch content for ${entry.path}:`, content)
                return null
            }
            return {
                entry,
                content,
            }
        } catch (error) {
            console.error(`Error fetching content for ${entry.path}:`, error)
            return null
        }
    })

    const results = await Promise.all(contentPromises)

    return results
        .filter(result => result !== null)
        .map(({ entry, content }) => ({
            url: revision
                ? `${serverEndpoint.replace(/\/$/, '')}/${repoName}@${revision}/-/blob/${entry.path}`
                : `${serverEndpoint.replace(/\/$/, '')}${entry.url}`,
            title: entry.path,
            ai: {
                content: content || '', // Include empty files
            },
        }))
}

export default RemoteDirectoryProvider
