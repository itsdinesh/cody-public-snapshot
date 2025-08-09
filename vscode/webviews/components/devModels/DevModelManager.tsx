import React, { useState, useCallback } from 'react'
import { Button } from '../shadcn/ui/button'
import { Input } from '../shadcn/ui/input'
import { Label } from '../shadcn/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../shadcn/ui/card'
import { Trash2Icon, PlusIcon, SettingsIcon } from 'lucide-react'
import { getVSCodeAPI } from '../../utils/VSCodeApi'

interface DevModel {
    provider: string
    model: string
    title?: string
    apiKey?: string
    apiEndpoint?: string
    inputTokens?: number
    outputTokens?: number
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
    })

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

        // Reset form
        setNewModel({
            provider: '',
            model: '',
            title: '',
            apiKey: '',
            apiEndpoint: '',
            inputTokens: 8000,
            outputTokens: 2000,
        })
    }, [newModel, models])

    const removeModel = useCallback((index: number) => {
        const updatedModels = models.filter((_, i) => i !== index)
        setModels(updatedModels)
        
        // Save to VS Code settings
        getVSCodeAPI().postMessage({
            command: 'cody.dev.models.update',
            models: updatedModels,
        })
    }, [models])

    const startEditing = useCallback((index: number) => {
        setEditingIndex(index)
        setNewModel(models[index])
    }, [models])

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
        })
    }, [newModel, models, editingIndex])

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
        })
    }, [])

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
        }

        window.addEventListener('message', handleMessage)
        return () => window.removeEventListener('message', handleMessage)
    }, [])

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
                            <h3 className="tw-text-sm tw-font-medium tw-text-white">Configured Models</h3>
                            {models.map((model, index) => (
                                <div key={index} className="tw-flex tw-items-center tw-justify-between tw-p-3 tw-border tw-border-gray-600 tw-rounded-md tw-bg-gray-700">
                                    <div>
                                        <div className="tw-font-medium tw-text-white">{model.title || `${model.provider}/${model.model}`}</div>
                                        <div className="tw-text-sm tw-text-gray-300">
                                            {model.provider} • {model.model}
                                            {model.apiEndpoint && ` • ${model.apiEndpoint}`}
                                        </div>
                                    </div>
                                    <div className="tw-flex tw-gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => startEditing(index)}
                                            className="tw-text-blue-400 hover:tw-text-blue-300 hover:tw-bg-gray-600"
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeModel(index)}
                                            className="tw-text-red-400 hover:tw-text-red-300 hover:tw-bg-gray-600"
                                        >
                                            <Trash2Icon size={16} />
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
                                <Label htmlFor="provider" className="tw-text-white">Provider *</Label>
                                <Input
                                    id="provider"
                                    placeholder="e.g., openai, anthropic, google"
                                    value={newModel.provider}
                                    onChange={(e) => setNewModel({ ...newModel, provider: e.target.value })}
                                    className="tw-bg-gray-700 tw-border-gray-600 tw-text-white placeholder:tw-text-gray-400"
                                />
                            </div>
                            <div>
                                <Label htmlFor="model" className="tw-text-white">Model *</Label>
                                <Input
                                    id="model"
                                    placeholder="e.g., gpt-4, claude-3-sonnet"
                                    value={newModel.model}
                                    onChange={(e) => setNewModel({ ...newModel, model: e.target.value })}
                                    className="tw-bg-gray-700 tw-border-gray-600 tw-text-white placeholder:tw-text-gray-400"
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="title" className="tw-text-white">Display Title</Label>
                            <Input
                                id="title"
                                placeholder="Optional display name"
                                value={newModel.title}
                                onChange={(e) => setNewModel({ ...newModel, title: e.target.value })}
                                className="tw-bg-gray-700 tw-border-gray-600 tw-text-white placeholder:tw-text-gray-400"
                            />
                        </div>

                        <div>
                            <Label htmlFor="apiKey" className="tw-text-white">API Key</Label>
                            <Input
                                id="apiKey"
                                type="password"
                                placeholder="Your API key"
                                value={newModel.apiKey}
                                onChange={(e) => setNewModel({ ...newModel, apiKey: e.target.value })}
                                className="tw-bg-gray-700 tw-border-gray-600 tw-text-white placeholder:tw-text-gray-400"
                            />
                        </div>

                        <div>
                            <Label htmlFor="apiEndpoint" className="tw-text-white">API Endpoint</Label>
                            <Input
                                id="apiEndpoint"
                                placeholder="Optional custom endpoint"
                                value={newModel.apiEndpoint}
                                onChange={(e) => setNewModel({ ...newModel, apiEndpoint: e.target.value })}
                                className="tw-bg-gray-700 tw-border-gray-600 tw-text-white placeholder:tw-text-gray-400"
                            />
                        </div>

                        <div className="tw-grid tw-grid-cols-2 tw-gap-4">
                            <div>
                                <Label htmlFor="inputTokens" className="tw-text-white">Input Tokens</Label>
                                <Input
                                    id="inputTokens"
                                    type="number"
                                    value={newModel.inputTokens}
                                    onChange={(e) => setNewModel({ ...newModel, inputTokens: parseInt(e.target.value) || 8000 })}
                                    className="tw-bg-gray-700 tw-border-gray-600 tw-text-white"
                                />
                            </div>
                            <div>
                                <Label htmlFor="outputTokens" className="tw-text-white">Output Tokens</Label>
                                <Input
                                    id="outputTokens"
                                    type="number"
                                    value={newModel.outputTokens}
                                    onChange={(e) => setNewModel({ ...newModel, outputTokens: parseInt(e.target.value) || 2000 })}
                                    className="tw-bg-gray-700 tw-border-gray-600 tw-text-white"
                                />
                            </div>
                        </div>

                        {editingIndex !== null ? (
                            <div className="tw-flex tw-gap-2">
                                <Button 
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
                        <strong>Note:</strong> These models will be saved to your VS Code settings under <code className="tw-bg-gray-600 tw-px-1 tw-rounded">cody.dev.models</code>. 
                        They will be available immediately after adding and will persist across VS Code sessions.
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}