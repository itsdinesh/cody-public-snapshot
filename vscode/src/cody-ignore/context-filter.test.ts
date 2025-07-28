import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock vscode.workspace.fs
vi.mock('vscode', () => ({
    workspace: {
        fs: {
            readFile: vi.fn(),
        },
        createFileSystemWatcher: vi.fn(() => ({
            onDidChange: vi.fn(),
            onDidCreate: vi.fn(),
            onDidDelete: vi.fn(),
            dispose: vi.fn(),
        })),
        getWorkspaceFolder: vi.fn(),
    },
    Uri: {
        file: vi.fn(),
        joinPath: vi.fn(),
    },
    RelativePattern: vi.fn(),
}))

import * as vscode from 'vscode'
import { clearCache, getExcludePattern, readIgnoreFile } from './context-filter'

describe('readIgnoreFile', () => {
    it('parses basic gitignore patterns', async () => {
        const mockData = new Uint8Array(Buffer.from('node_modules\n*.log\n.env'))
        vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockData)

        const result = await readIgnoreFile({} as vscode.Uri)

        expect(result).toEqual({
            '**/node_modules': true,
            '**/*.log': true,
            '**/.env': true,
        })
    })

    it('handles comments and empty lines', async () => {
        const mockData = new Uint8Array(
            Buffer.from('# Comment\nnode_modules\n\n*.log # inline comment\n')
        )
        vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockData)

        const result = await readIgnoreFile({} as vscode.Uri)

        expect(result).toEqual({
            '**/node_modules': true,
            '**/*.log': true,
        })
    })

    it('ignores negation patterns', async () => {
        const mockData = new Uint8Array(Buffer.from('*.log\n!important.log\nnode_modules'))
        vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockData)

        const result = await readIgnoreFile({} as vscode.Uri)

        expect(result).toEqual({
            '**/*.log': true,
            '**/node_modules': true,
        })
    })

    it('handles directory patterns', async () => {
        const mockData = new Uint8Array(Buffer.from('dist/\n/root_only\n**/deep_pattern'))
        vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockData)

        const result = await readIgnoreFile({} as vscode.Uri)

        expect(result).toEqual({
            '**/dist': true,
            '/root_only': true,
            '**/deep_pattern': true,
        })
    })

    it('replaces commas with dots to fix common typos', async () => {
        const mockData = new Uint8Array(
            Buffer.from('node_modules\n*,something\n*.log\n*,js\nvalid_pattern')
        )
        vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockData)

        const result = await readIgnoreFile({} as vscode.Uri)

        expect(result).toEqual({
            '**/node_modules': true,
            '**/*.something': true,
            '**/*.log': true,
            '**/*.js': true,
            '**/valid_pattern': true,
        })
    })

    it('handles file read errors gracefully', async () => {
        vi.mocked(vscode.workspace.fs.readFile).mockRejectedValue(new Error('File not found'))

        const result = await readIgnoreFile({} as vscode.Uri)

        expect(result).toEqual({})
    })

    it('handles whitespace and trailing slashes', async () => {
        const mockData = new Uint8Array(Buffer.from('  node_modules  \ndist/   \n  *.log  # comment  '))
        vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockData)

        const result = await readIgnoreFile({} as vscode.Uri)

        expect(result).toEqual({
            '**/node_modules': true,
            '**/dist': true,
            '**/*.log': true,
        })
    })
})

describe('getExcludePattern', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        // Clear cache for proper test isolation
        clearCache()
    })

    it('returns empty string when no exclude patterns exist', async () => {
        const mockWorkspace = { uri: { toString: () => 'test-workspace' } } as vscode.WorkspaceFolder

        vi.mocked(vscode.Uri.joinPath).mockReturnValue({} as vscode.Uri)
        vi.mocked(vscode.workspace.fs.readFile).mockRejectedValue(new Error('File not found'))

        const result = await getExcludePattern(mockWorkspace)

        expect(result).toBe('')
    })

    it('returns formatted glob pattern with single exclude pattern', async () => {
        const mockWorkspace = { uri: { toString: () => 'test-workspace' } } as vscode.WorkspaceFolder
        const mockData = new Uint8Array(Buffer.from('node_modules'))

        vi.mocked(vscode.Uri.joinPath).mockReturnValue({} as vscode.Uri)
        vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockData)

        const result = await getExcludePattern(mockWorkspace)

        expect(result).toBe('**/node_modules')
    })

    it('returns formatted glob pattern with multiple exclude patterns', async () => {
        const mockWorkspace = { uri: { toString: () => 'test-workspace' } } as vscode.WorkspaceFolder
        const mockData = new Uint8Array(Buffer.from('node_modules\n*.log\ndist/'))

        vi.mocked(vscode.Uri.joinPath).mockReturnValue({} as vscode.Uri)
        vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockData)

        const result = await getExcludePattern(mockWorkspace)

        expect(result).toBe('{**/node_modules,**/*.log,**/dist}')
    })

    it('handles null workspace folder', async () => {
        const result = await getExcludePattern(null)

        expect(result).toBe('')
    })

    it('handles patterns with special characters that could break glob', async () => {
        const mockWorkspace = { uri: { toString: () => 'test-workspace' } } as vscode.WorkspaceFolder
        const mockData = new Uint8Array(Buffer.from('*.{js,ts}\n**/*.log'))

        vi.mocked(vscode.Uri.joinPath).mockReturnValue({} as vscode.Uri)
        vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockData)

        const result = await getExcludePattern(mockWorkspace)

        // Should not create nested braces that break glob parsing
        expect(result).not.toMatch(/\{\{.*\}\}/)
        expect(result).toBe('{**/*.{js.ts},**/*.log}')
    })

    it('handles empty ignore file', async () => {
        const mockWorkspace = { uri: { toString: () => 'test-workspace' } } as vscode.WorkspaceFolder
        const mockData = new Uint8Array(Buffer.from(''))

        vi.mocked(vscode.Uri.joinPath).mockReturnValue({} as vscode.Uri)
        vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockData)

        const result = await getExcludePattern(mockWorkspace)

        expect(result).toBe('')
    })

    it('handles ignore file with only comments and empty lines', async () => {
        const mockWorkspace = { uri: { toString: () => 'test-workspace' } } as vscode.WorkspaceFolder
        const mockData = new Uint8Array(Buffer.from('# Comment only\n\n  \n# Another comment'))

        vi.mocked(vscode.Uri.joinPath).mockReturnValue({} as vscode.Uri)
        vi.mocked(vscode.workspace.fs.readFile).mockResolvedValue(mockData)

        const result = await getExcludePattern(mockWorkspace)

        expect(result).toBe('')
    })
})
