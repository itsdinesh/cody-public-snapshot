import { describe, expect, it } from 'vitest'
import { ContextFiltersProvider } from './context-filters-provider'

describe('ContextFiltersProvider', () => {
    describe('parseExcludePatternString', () => {
        it('should handle properly formatted pattern strings', () => {
            const provider = new ContextFiltersProvider()
            // Access private method for testing
            const parseMethod = (provider as any).parseExcludePatternString.bind(provider)

            expect(parseMethod('{node_modules,*.log}')).toEqual(['node_modules', '*.log'])
            expect(parseMethod('{}')).toEqual([])
            expect(parseMethod('{single}')).toEqual(['single'])
        })

        it('should handle malformed pattern strings safely', () => {
            const provider = new ContextFiltersProvider()
            const parseMethod = (provider as any).parseExcludePatternString.bind(provider)

            // Missing braces should return empty array
            expect(parseMethod('node_modules,*.log')).toEqual([])
            expect(parseMethod('missing-start-brace}')).toEqual([])
            expect(parseMethod('{missing-end-brace')).toEqual([])
            expect(parseMethod('')).toEqual([])
        })

        it('should filter out empty patterns', () => {
            const provider = new ContextFiltersProvider()
            const parseMethod = (provider as any).parseExcludePatternString.bind(provider)

            expect(parseMethod('{node_modules,,*.log}')).toEqual(['node_modules', '*.log'])
            expect(parseMethod('{,}')).toEqual([])
            expect(parseMethod('{ , }')).toEqual([])
        })
    })
})
