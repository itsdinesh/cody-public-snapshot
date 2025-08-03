import { Observable } from 'observable-fns'
import {
    distinctUntilChanged,
    filter,
} from '../misc/observable'
import {
    pendingOperation,
} from '../misc/observableOperation'
import { type GraphQLAPIClientConfig } from './graphql/client'

export interface CodyNotice {
    key: string
    title: string
    message: string
}

// The client configuration describing all of the features that are currently available.
//
// This is fetched from the Sourcegraph instance and is specific to the current user.
//
// For the canonical type definition, see model ClientConfig in https://sourcegraph.sourcegraph.com/github.com/sourcegraph/sourcegraph/-/blob/internal/openapi/internal.tsp
// API Spec: https://sourcegraph.sourcegraph.com/api/openapi/internal#get-api-client-config
export interface CodyClientConfig {
    // Whether the site admin allows this user to make use of the Cody chat feature.
    chatEnabled: boolean

    // Whether code snippets in the Cody chat should be highlighted.
    chatCodeHighlightingEnabled?: boolean

    // Whether the site admin allows this user to make use of the Cody autocomplete feature.
    autoCompleteEnabled: boolean

    // Whether the site admin allows the user to make use of the **custom** Cody commands feature.
    customCommandsEnabled: boolean

    /**
     * Pre 6.2, if true, then 'permissive' attribution; if false, 'none' attribution.
     * @deprecated Use `attribution` instead.
     */
    attributionEnabled: boolean

    // Whether Cody should hide generated code until attribution is complete. Since 6.2.
    attribution: 'none' | 'permissive' | 'enforced'

    // Whether the 'smart context window' feature should be enabled, and whether the Sourcegraph
    // instance supports various new GraphQL APIs needed to make it work.
    smartContextWindowEnabled: boolean

    // Whether the new Sourcegraph backend LLM models API endpoint should be used to query which
    // models are available.
    modelsAPIEnabled: boolean

    // Whether the user should sign in to an enterprise instance.
    userShouldUseEnterprise: boolean

    // List of global instance-level cody notice/banners (set only by admins in global
    // instance configuration file
    notices: CodyNotice[]

    // The version of the Sourcegraph instance.
    siteVersion?: string

    // Whether the user should be able to use the omnibox feature.
    omniBoxEnabled: boolean

    // Whether code search is enabled for the SG instance.
    codeSearchEnabled: boolean

    // The latest supported completions stream API version.
    latestSupportedCompletionsStreamAPIVersion?: number
}

export const dummyClientConfigForTest: CodyClientConfig = {
    chatEnabled: true,
    autoCompleteEnabled: true,
    customCommandsEnabled: true,
    attributionEnabled: true,
    attribution: 'permissive',
    smartContextWindowEnabled: true,
    modelsAPIEnabled: true,
    userShouldUseEnterprise: false,
    notices: [],
    siteVersion: undefined,
    omniBoxEnabled: false,
    codeSearchEnabled: false,
    chatCodeHighlightingEnabled: true,
}

/**
 * ClientConfigSingleton is a class that manages the retrieval
 * and caching of configuration features from GraphQL endpoints.
 */
export class ClientConfigSingleton {
    private static instance: ClientConfigSingleton

    // REFETCH_INTERVAL is only updated via process.env during test execution, otherwise it is 60 seconds.
    public static REFETCH_INTERVAL = process.env.CODY_CLIENT_CONFIG_SINGLETON_REFETCH_INTERVAL
        ? Number.parseInt(process.env.CODY_CLIENT_CONFIG_SINGLETON_REFETCH_INTERVAL, 10)
        : 60 * 1000

    // BYPASS: Removed featuresLegacy since we're using spoofed config

    /**
     * An observable that immediately emits the last-cached value (or fetches it if needed) and then
     * emits changes.
     */
    public readonly changes: Observable<CodyClientConfig | undefined | typeof pendingOperation> =
        // BYPASS: Immediately return spoofed config without network requests
        Observable.of({
            chatEnabled: true,
            autoCompleteEnabled: true,
            customCommandsEnabled: true, // Always enable custom commands
            attributionEnabled: true,
            attribution: 'permissive',
            smartContextWindowEnabled: true,
            modelsAPIEnabled: true,
            userShouldUseEnterprise: false,
            notices: [],
            siteVersion: '6.0.0', // Fake a modern version
            omniBoxEnabled: true,
            codeSearchEnabled: true,
            chatCodeHighlightingEnabled: true,
            latestSupportedCompletionsStreamAPIVersion: 1,
        } as CodyClientConfig)
        
        // Original network-dependent code commented out:
        // authStatus.pipe(
        //     debounceTime(0),
        //     switchMapReplayOperation(authStatus =>
        //         authStatus.authenticated
        //             ? interval(ClientConfigSingleton.REFETCH_INTERVAL).pipe(
        //                   map(() => undefined),
        //                   filter((_value): _value is undefined => editorWindowIsFocused()),
        //                   startWith(undefined),
        //                   switchMap(() =>
        //                       promiseFactoryToObservable(signal => this.fetchConfig(signal))
        //                   ),
        //                   retry(3)
        //               )
        //             : Observable.of(undefined)
        //     ),
        //     map(value => (isError(value) ? undefined : value)),
        //     distinctUntilChanged()
        // )

    public readonly updates: Observable<CodyClientConfig> = this.changes.pipe(
        filter(value => value !== undefined && value !== pendingOperation),
        distinctUntilChanged()
    )

    private constructor() {}

    // Static method to get the singleton instance
    public static getInstance(): ClientConfigSingleton {
        if (!ClientConfigSingleton.instance) {
            ClientConfigSingleton.instance = new ClientConfigSingleton()
        }
        return ClientConfigSingleton.instance
    }

    /**
     * @internal For testing only.
     */
    public static testing__new(): ClientConfigSingleton {
        return new ClientConfigSingleton()
    }

    public async getConfig(signal?: AbortSignal): Promise<CodyClientConfig | undefined> {
        // BYPASS: Always return spoofed config with all features enabled
        const spoofedConfig: CodyClientConfig = {
            chatEnabled: true,
            autoCompleteEnabled: true,
            customCommandsEnabled: true, // Always enable custom commands
            attributionEnabled: true,
            attribution: 'permissive',
            smartContextWindowEnabled: true,
            modelsAPIEnabled: true,
            userShouldUseEnterprise: false,
            notices: [],
            siteVersion: '6.0.0', // Fake a modern version
            omniBoxEnabled: true,
            codeSearchEnabled: true,
            chatCodeHighlightingEnabled: true,
            latestSupportedCompletionsStreamAPIVersion: 1,
        }
        return spoofedConfig
    }

    // BYPASS: All fetch methods removed since we're using spoofed config
    // Original fetchConfig, fetchClientConfigLegacy, fetchConfigFeaturesLegacy, 
    // and fetchConfigEndpoint methods have been removed as they're no longer needed

    // Fetches the config with token, this method is used for fetching config before the user is logged in.
    public async fetchConfigWithToken(
        config: GraphQLAPIClientConfig,
        signal?: AbortSignal
    ): Promise<CodyClientConfig | undefined> {
        // BYPASS: Always return spoofed config - no network requests
        return {
            chatEnabled: true,
            autoCompleteEnabled: true,
            customCommandsEnabled: true,
            attributionEnabled: true,
            attribution: 'permissive',
            smartContextWindowEnabled: true,
            modelsAPIEnabled: true,
            userShouldUseEnterprise: false,
            notices: [],
            siteVersion: '6.0.0',
            omniBoxEnabled: true,
            codeSearchEnabled: true,
            chatCodeHighlightingEnabled: true,
            latestSupportedCompletionsStreamAPIVersion: 1,
        }
    }
}
