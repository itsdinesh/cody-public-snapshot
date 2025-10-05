import { PlusIcon, SettingsIcon, StarIcon, Trash2Icon } from 'lucide-react'
import React, { useState, useCallback } from 'react'
import { getVSCodeAPI } from '../../utils/VSCodeApi'
import { Button } from '../shadcn/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../shadcn/ui/card'
import { Input } from '../shadcn/ui/input'
import { Label } from '../shadcn/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../shadcn/ui/select'

interface DevModel {
    provider: string
    model: string
    title?: string
    apiKey?: string
    apiEndpoint?: string
    inputTokens?: number
    outputTokens?: number
    isDefaultEdit?: boolean
}

interface DevModelManagerProps {
    isOpen: boolean
    onClose: () => void
}

export const DevModelManager: React.FC<DevModelManagerProps> = ({ isOpen, onClose }) => {
    const [models, setModels] = useState<DevModel[]>([])
    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const [newModel, setNewModel] = useState<DevModel>({
        provider: '',
        model: '',
        title: '',
        apiKey: '',
        apiEndpoint: '',
        inputTokens: 8000,
        outputTokens: 2000,
        isDefaultEdit: false,
    })

    const providerOptions = [
        'openaicompatible',
        'google',
        'mistral',
        'ollama',
        'openai',
        'anthropic',
        'groq',
    ]

    const addModel = useCallback(() => {
        if (!newModel.provider || !newModel.model) {
            return
        }

        const modelToAdd = {
            ...newModel,
            title: newModel.title || `${newModel.provider}/${newModel.model}`,
        }

        const updatedModels = [...models, modelToAdd]
        setModels(updatedModels)

        // Save to VS Code settings
        getVSCodeAPI().postMessage({
            command: 'cody.dev.models.update',
            models: updatedModels,
        })

        // Save defaults if set
        if (modelToAdd.isDefaultEdit) {
            getVSCodeAPI().postMessage({
                command: 'cody.dev.models.setDefaults',
                editDefault: `${modelToAdd.provider}::${modelToAdd.model}`,
            })
        }

        // Reset form
        setNewModel({
            provider: '',
            model: '',
            title: '',
            apiKey: '',
            apiEndpoint: '',
            inputTokens: 8000,
            outputTokens: 2000,
            isDefaultEdit: false,
        })

        // Close the dialog after a short delay to allow the configuration to save
        // This will cause the parent component to re-render and pick up the new models
        setTimeout(() => {
            onClose()
        }, 500)
    }, [newModel, models, onClose])

    const removeModel = useCallback(
        (index: number) => {
            const updatedModels = models.filter((_, i) => i !== index)
            setModels(updatedModels)

            // Save to VS Code settings
            getVSCodeAPI().postMessage({
                command: 'cody.dev.models.update',
                models: updatedModels,
            })
        },
        [models]
    )

    const startEditing = useCallback(
        (index: number) => {
            setEditingIndex(index)
            setNewModel(models[index])
        },
        [models]
    )

    const saveEdit = useCallback(() => {
        if (editingIndex === null || !newModel.provider || !newModel.model) {
            return
        }

        const modelToSave = {
            ...newModel,
            title: newModel.title || `${newModel.provider}/${newModel.model}`,
        }

        const updatedModels = [...models]
        updatedModels[editingIndex] = modelToSave
        setModels(updatedModels)

        // Save to VS Code settings
        getVSCodeAPI().postMessage({
            command: 'cody.dev.models.update',
            models: updatedModels,
        })

        // Save defaults if set
        if (modelToSave.isDefaultEdit) {
            getVSCodeAPI().postMessage({
                command: 'cody.dev.models.setDefaults',
                editDefault: `${modelToSave.provider}::${modelToSave.model}`,
            })
        }

        // Reset form
        setEditingIndex(null)
        setNewModel({
            provider: '',
            model: '',
            title: '',
            apiKey: '',
            apiEndpoint: '',
            inputTokens: 8000,
            outputTokens: 2000,
            isDefaultEdit: false,
        })

        // Close the dialog after a short delay to allow the configuration to save
        // This will cause the parent component to re-render and pick up the new models
        setTimeout(() => {
            onClose()
        }, 500)
    }, [newModel, models, editingIndex, onClose])

    const cancelEdit = useCallback(() => {
        setEditingIndex(null)
        setNewModel({
            provider: '',
            model: '',
            title: '',
            apiKey: '',
            apiEndpoint: '',
            inputTokens: 8000,
            outputTokens: 2000,
            isDefaultEdit: false,
        })
    }, [])

    const toggleDefault = useCallback(
        (index: number) => {
            const updatedModels = [...models]
            const model = updatedModels[index]

            const wasDefault = model.isDefaultEdit
            // Clear all edit defaults first
            for (const m of updatedModels) {
                m.isDefaultEdit = false
            }
            // Toggle: if it was default, leave all unset; if it wasn't, set this one
            if (!wasDefault) {
                model.isDefaultEdit = true
            }

            setModels(updatedModels)

            // Save defaults (this will also update the models configuration)
            const editDefault = updatedModels.find(m => m.isDefaultEdit)

            // Send the message with explicit undefined for unset defaults
            // This ensures the backend knows we're intentionally unsetting
            getVSCodeAPI().postMessage({
                command: 'cody.dev.models.setDefaults',
                editDefault: editDefault ? `${editDefault.provider}::${editDefault.model}` : undefined,
            })
        },
        [models]
    )

    const loadExistingModels = useCallback(() => {
        // Request current models from VS Code
        getVSCodeAPI().postMessage({
            command: 'cody.dev.models.get',
        })
    }, [])

    React.useEffect(() => {
        if (isOpen) {
            loadExistingModels()
        }
    }, [isOpen, loadExistingModels])

    React.useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data
            if (message.type === 'cody.dev.models.current') {
                setModels(message.models || [])
            }
            if (message.type === 'cody.dev.models.updated') {
                if (message.success) {
                    // Reload models after successful update
                    loadExistingModels()
                }
            }
            if (message.type === 'cody.dev.models.defaultsSet') {
                if (message.success) {
                    // Reload models after successful defaults update to show updated star states
                    loadExistingModels()
                } else if (message.error) {
                    console.error('Failed to set defaults:', message.error)
                }
            }
        }

        window.addEventListener('message', handleMessage)
        return () => window.removeEventListener('message', handleMessage)
    }, [loadExistingModels])

    if (!isOpen) return null

    return (
        <div className="tw-fixed tw-inset-0 tw-bg-gray-900 tw-bg-opacity-90 tw-flex tw-items-center tw-justify-center tw-z-50">
            <Card className="tw-w-full tw-max-w-2xl tw-max-h-[80vh] tw-overflow-y-auto tw-m-4 tw-bg-gray-800 tw-border-gray-700">
                <CardHeader className="tw-bg-gray-800 tw-border-b tw-border-gray-700 tw-p-4">
                    <CardTitle className="tw-flex tw-items-center tw-gap-2 tw-text-white tw-text-lg tw-font-semibold">
                        <SettingsIcon size={20} />
                        Custom Models
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="tw-text-white hover:tw-bg-gray-700 tw-text-xl tw-w-8 tw-h-8 tw-flex tw-items-center tw-justify-center tw-rounded-full tw-ml-2 tw-flex-shrink-0"
                            aria-label="Close"
                        >
                            ×
                        </Button>
                    </CardTitle>
                </CardHeader>
                <CardContent className="tw-space-y-6 tw-bg-gray-800 tw-text-white">
                    {/* Existing Models */}
                    {models.length > 0 && (
                        <div className="tw-space-y-3">
                            <h3 className="tw-text-sm tw-font-medium tw-text-white">
                                Configured Models
                            </h3>
                            {models
                                .map((model, originalIndex) => ({ ...model, originalIndex }))
                                .sort((a, b) => {
                                    // Sort by title/name for consistent display, but keep original indices
                                    const aName = a.title || `${a.provider}/${a.model}`
                                    const bName = b.title || `${b.provider}/${b.model}`
                                    return aName.localeCompare(bName)
                                })
                                .map(model => (
                                    <div
                                        key={`${model.provider}::${model.model}`}
                                        className="tw-flex tw-items-start tw-gap-3 tw-p-3 tw-border tw-border-gray-600 tw-rounded-md tw-bg-gray-700"
                                    >
                                        <div className="tw-flex-1 tw-min-w-0">
                                            <div className="tw-font-medium tw-text-white tw-break-words tw-mb-1">
                                                {model.title || `${model.provider}/${model.model}`}
                                            </div>
                                            <div className="tw-text-sm tw-text-gray-300 tw-break-words">
                                                <span className="tw-inline-block tw-mr-2">
                                                    {model.provider}
                                                </span>
                                                <span className="tw-inline-block tw-mr-2">
                                                    • {model.model}
                                                </span>
                                                {model.apiEndpoint && (
                                                    <span className="tw-inline-block tw-break-all">
                                                        • {model.apiEndpoint}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="tw-flex tw-gap-2 tw-mt-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => toggleDefault(model.originalIndex)}
                                                    className={`tw-text-xs tw-h-6 tw-px-2 tw-flex tw-items-center tw-gap-1 ${
                                                        model.isDefaultEdit
                                                            ? 'tw-text-yellow-400 tw-bg-yellow-400/10 hover:tw-bg-yellow-400/20'
                                                            : 'tw-text-gray-400 hover:tw-text-yellow-400 hover:tw-bg-gray-600'
                                                    }`}
                                                    title={
                                                        model.isDefaultEdit
                                                            ? 'Remove as default edit model'
                                                            : 'Set as default edit model'
                                                    }
                                                >
                                                    <StarIcon
                                                        size={12}
                                                        className={
                                                            model.isDefaultEdit ? 'tw-fill-current' : ''
                                                        }
                                                    />
                                                    Default for Edit
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="tw-flex tw-flex-col tw-gap-1 tw-flex-shrink-0">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => startEditing(model.originalIndex)}
                                                className="tw-text-blue-400 hover:tw-text-blue-300 hover:tw-bg-gray-600 tw-h-8 tw-px-2 tw-text-xs"
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => removeModel(model.originalIndex)}
                                                className="tw-text-red-400 hover:tw-text-red-300 hover:tw-bg-gray-600 tw-h-8 tw-px-2"
                                            >
                                                <Trash2Icon size={14} />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    )}

                    {/* Add New Model Form */}
                    <div className="tw-space-y-4">
                        <h3 className="tw-text-sm tw-font-medium tw-flex tw-items-center tw-gap-2 tw-text-white">
                            <PlusIcon size={16} />
                            {editingIndex !== null ? 'Edit Model' : 'Add New Model'}
                        </h3>

                        <div className="tw-grid tw-grid-cols-2 tw-gap-4">
                            <div>
                                <Label htmlFor="provider" className="tw-text-white">
                                    Provider *
                                </Label>
                                <Select
                                    value={newModel.provider}
                                    onValueChange={value =>
                                        setNewModel({ ...newModel, provider: value })
                                    }
                                >
                                    <SelectTrigger className="tw-bg-gray-700 tw-border-gray-600 tw-text-white">
                                        <SelectValue placeholder="Select provider" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {providerOptions.map(provider => (
                                            <SelectItem key={provider} value={provider}>
                                                {provider}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="model" className="tw-text-white">
                                    Model *
                                </Label>
                                <Input
                                    id="model"
                                    placeholder="e.g., gpt-4, claude-3-sonnet"
                                    value={newModel.model}
                                    onChange={e => setNewModel({ ...newModel, model: e.target.value })}
                                    className="tw-bg-gray-700 tw-border-gray-600 tw-text-white placeholder:tw-text-gray-400"
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="title" className="tw-text-white">
                                Display Title
                            </Label>
                            <Input
                                id="title"
                                placeholder="Optional display name"
                                value={newModel.title}
                                onChange={e => setNewModel({ ...newModel, title: e.target.value })}
                                className="tw-bg-gray-700 tw-border-gray-600 tw-text-white placeholder:tw-text-gray-400"
                            />
                        </div>

                        <div>
                            <Label htmlFor="apiKey" className="tw-text-white">
                                API Key
                            </Label>
                            <Input
                                id="apiKey"
                                type="password"
                                placeholder="Your API key"
                                value={newModel.apiKey}
                                onChange={e => setNewModel({ ...newModel, apiKey: e.target.value })}
                                className="tw-bg-gray-700 tw-border-gray-600 tw-text-white placeholder:tw-text-gray-400"
                            />
                        </div>

                        <div>
                            <Label htmlFor="apiEndpoint" className="tw-text-white">
                                API Endpoint
                            </Label>
                            <Input
                                id="apiEndpoint"
                                placeholder="Optional custom endpoint"
                                value={newModel.apiEndpoint}
                                onChange={e => setNewModel({ ...newModel, apiEndpoint: e.target.value })}
                                className="tw-bg-gray-700 tw-border-gray-600 tw-text-white placeholder:tw-text-gray-400"
                            />
                        </div>

                        <div className="tw-grid tw-grid-cols-2 tw-gap-4">
                            <div>
                                <Label htmlFor="inputTokens" className="tw-text-white">
                                    Input Tokens
                                </Label>
                                <Input
                                    id="inputTokens"
                                    type="number"
                                    value={newModel.inputTokens}
                                    onChange={e =>
                                        setNewModel({
                                            ...newModel,
                                            inputTokens: Number.parseInt(e.target.value) || 8000,
                                        })
                                    }
                                    className="tw-bg-gray-700 tw-border-gray-600 tw-text-white"
                                />
                            </div>
                            <div>
                                <Label htmlFor="outputTokens" className="tw-text-white">
                                    Output Tokens
                                </Label>
                                <Input
                                    id="outputTokens"
                                    type="number"
                                    value={newModel.outputTokens}
                                    onChange={e =>
                                        setNewModel({
                                            ...newModel,
                                            outputTokens: Number.parseInt(e.target.value) || 2000,
                                        })
                                    }
                                    className="tw-bg-gray-700 tw-border-gray-600 tw-text-white"
                                />
                            </div>
                        </div>

                        {editingIndex !== null ? (
                            <div className="tw-flex tw-gap-2">
                                <Button
                                    variant="default"
                                    onClick={saveEdit}
                                    disabled={!newModel.provider || !newModel.model}
                                    className="tw-flex-1 tw-bg-blue-600 hover:tw-bg-blue-700"
                                >
                                    Save Changes
                                </Button>
                                <Button
                                    onClick={cancelEdit}
                                    variant="outline"
                                    className="tw-flex-1 tw-border-gray-600 tw-text-white hover:tw-bg-gray-700"
                                >
                                    Cancel
                                </Button>
                            </div>
                        ) : (
                            <Button
                                variant="default"
                                onClick={addModel}
                                disabled={!newModel.provider || !newModel.model}
                                className="tw-w-full tw-bg-green-600 hover:tw-bg-green-700"
                            >
                                <PlusIcon size={16} className="tw-mr-2" />
                                Add Model
                            </Button>
                        )}
                    </div>

                    <div className="tw-text-xs tw-text-gray-300 tw-p-3 tw-bg-gray-700 tw-rounded-md tw-border tw-border-gray-600">
                        <strong>Note:</strong> These models will be saved to your VS Code settings under{' '}
                        <code className="tw-bg-gray-600 tw-px-1 tw-rounded">cody.dev.models</code>. They
                        will be available immediately after adding and will persist across VS Code
                        sessions.
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}