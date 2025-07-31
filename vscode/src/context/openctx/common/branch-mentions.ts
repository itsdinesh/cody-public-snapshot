import type { Mention } from '@openctx/client'
import { currentResolvedConfig, graphqlClient, isDefined, isError } from '@sourcegraph/cody-shared'
import { getRepositoryMentions } from './get-repository-mentions'

export interface BranchMentionOptions {
    repoName: string
    providerUri: string
    branchQuery?: string
}

/**
 * Creates branch mentions for a repository, including branch search functionality.
 */
export async function getBranchMentions(options: BranchMentionOptions): Promise<Mention[]> {
    const { repoName, providerUri, branchQuery } = options

    // Get branch info from the repository mentions
    const repoMentions = await getRepositoryMentions(repoName, providerUri)
    if (!repoMentions || repoMentions.length === 0) {
        return []
    }

    const repoMention = repoMentions.find(mention => mention.data?.repoName === repoName)

    if (!repoMention?.data) {
        return []
    }

    const branches = (repoMention.data.branches as string[]) || []
    const defaultBranch = repoMention.data.defaultBranch as string | undefined
    const repoId = repoMention.data.repoId as string

    // If no branch info available, return empty
    if (branches.length === 0 && !defaultBranch) {
        return []
    }

    // Filter branches if we have a search query
    let filteredBranches = branches
    if (branchQuery?.trim()) {
        const query = branchQuery.toLowerCase()
        filteredBranches = branches.filter(branch => branch.toLowerCase().includes(query))

        // If we have a search query but found no matches in the first 10 branches,
        // try searching for more branches using the GraphQL API
        if (filteredBranches.length === 0 && query.length >= 2) {
            const searchResult = await searchRepositoryBranches(
                repoName,
                branchQuery,
                repoId,
                defaultBranch
            )
            if (searchResult.length > 0) {
                return searchResult
            }
        }
    }

    return createBranchMentionsFromData({
        repoName,
        repoId,
        defaultBranch,
        branches: filteredBranches,
        branchQuery,
    })
}

export interface CreateBranchMentionsOptions {
    repoName: string
    repoId: string
    defaultBranch?: string
    branches?: string[]
    branchQuery?: string
}

/**
 * Searches for branches in a repository using the GraphQL API when client-side filtering
 * doesn't find matches in the first 10 branches.
 */
async function searchRepositoryBranches(
    repoName: string,
    branchQuery: string,
    repoId: string,
    defaultBranch?: string
): Promise<Mention[]> {
    const response = await graphqlClient.getRepositoryBranches(repoName, 10, branchQuery)

    if (isError(response) || !response.repository) {
        return []
    }

    const { repository } = response
    const allBranches = repository.branches.nodes.map(node => node.abbrevName)
    const repositoryDefaultBranch = repository.defaultBranch?.abbrevName || defaultBranch

    // Filter branches client-side with the search query
    const query = branchQuery.toLowerCase()
    const filteredBranches = allBranches.filter(branch => branch.toLowerCase().includes(query))

    return createBranchMentionsFromData({
        repoName,
        repoId,
        defaultBranch: repositoryDefaultBranch,
        branches: filteredBranches,
        branchQuery,
    })
}

/**
 * Creates mention objects for branches with optional browse and search hint options.
 */
export async function createBranchMentionsFromData(
    options: CreateBranchMentionsOptions
): Promise<Mention[]> {
    const { repoName, repoId, defaultBranch, branches = [] } = options

    const {
        auth: { serverEndpoint },
    } = await currentResolvedConfig()

    const mentions: Mention[] = []

    // Add default branch first if available and it's in the branches list
    if (defaultBranch && branches.includes(defaultBranch)) {
        mentions.push({
            uri: `${serverEndpoint.replace(/\/$/, '')}/${repoName}@${defaultBranch}`,
            title: `@${defaultBranch}`,
            description: 'Default branch',
            data: {
                repoName,
                repoID: repoId,
                branch: defaultBranch,
            },
        })
    }

    // Add other branches
    for (const branch of branches) {
        if (branch !== defaultBranch) {
            mentions.push({
                uri: `${serverEndpoint.replace(/\/$/, '')}/${repoName}@${branch}`,
                title: `@${branch}`,
                // needs to be a space to avoid showing the URL in the menu for branches
                description: ' ',
                data: {
                    repoName,
                    repoID: repoId,
                    branch,
                },
            })
        }
    }

    return mentions.filter(isDefined)
}
