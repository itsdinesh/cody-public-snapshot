import { describe, expect, it } from 'vitest'
import { createGuardrailsImpl } from './index'

describe('Guardrails', () => {
    describe('needsAttribution', () => {
        const guardrails = createGuardrailsImpl('permissive', () => {})

        it('should skip attribution for content with data URL image patterns', () => {
            const codeWithDataUrl = `
Here's an image:
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==
Some other code here
            `.trim()

            expect(guardrails.needsAttribution({ code: codeWithDataUrl, language: 'javascript' })).toBe(false)
        })

        it('should skip attribution for content with large base64 strings', () => {
            const longBase64 = 'A'.repeat(150) + '=='
            const codeWithBase64 = `
Some code here
${longBase64}
More code
            `.trim()

            expect(guardrails.needsAttribution({ code: codeWithBase64, language: 'javascript' })).toBe(false)
        })

        it('should require attribution for normal code blocks over 10 lines', () => {
            const normalCode = Array.from({ length: 15 }, (_, i) => `console.log(${i})`).join('\n')

            expect(guardrails.needsAttribution({ code: normalCode, language: 'javascript' })).toBe(true)
        })

        it('should not require attribution for short code blocks', () => {
            const shortCode = Array.from({ length: 5 }, (_, i) => `console.log(${i})`).join('\n')

            expect(guardrails.needsAttribution({ code: shortCode, language: 'javascript' })).toBe(false)
        })

        it('should not require attribution for shell languages', () => {
            const shellCode = Array.from({ length: 15 }, (_, i) => `echo ${i}`).join('\n')

            expect(guardrails.needsAttribution({ code: shellCode, language: 'bash' })).toBe(false)
            expect(guardrails.needsAttribution({ code: shellCode, language: 'sh' })).toBe(false)
        })

        it('should handle mixed content with images correctly', () => {
            const mixedContent = `
function example() {
    console.log("Hello world")
    // Here's an embedded image:
    const imageData = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
    return imageData
}
            `.trim()

            expect(guardrails.needsAttribution({ code: mixedContent, language: 'javascript' })).toBe(false)
        })
    })
})
