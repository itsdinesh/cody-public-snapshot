import { Observable } from 'observable-fns'
import { pendingOperation } from '../misc/observableOperation'
import { type CodyLLMSiteConfiguration } from '../sourcegraph-api/graphql/client'

/**
 * BYPASS: Always return null to disable server-side config overwrites and prevent network requests
 */
export const configOverwrites: Observable<CodyLLMSiteConfiguration | null | typeof pendingOperation> =
    Observable.of(null)

// Subscribe so that other subscribers get the replayed value. There are no other permanent
// subscribers to this value.
//
// TODO(sqs): This fixes an issue where switching accounts (`rtx exec node@18.17.1 -- pnpm run test
// agent/src/auth.test.ts -t 'switches'`) took ~2.7s on Node 18.
configOverwrites.subscribe({})
