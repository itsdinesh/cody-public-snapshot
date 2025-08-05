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
        <div className="tw-fixed tw-inset-0 tw-bg-black tw-bg-opacity-50 tw-flex tw-items-center tw-justify-center tw-z-50">
            <Card className="tw-w-full tw-max-w-2xl tw-max-h-[80vh] tw-overflow-y-auto tw-m-4">
                <CardHeader className="tw-flex tw-flex-row tw-items-center tw-justify-between">
                    <CardTitle className="tw-flex tw-items-center tw-gap-2">
                        <SettingsIcon size={20} />
                        Custom Models (cody.dev.models)
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        ×
                    </Button>
                </CardHeader>
                <CardContent className="tw-space-y-6">
                    {/* Existing Models */}
                    {models.length > 0 && (
                        <div className="tw-space-y-3">
                            <h3 className="tw-text-sm tw-font-medium">Configured Models</h3>
                            {models.map((model, index) => (
                                <div key={index} className="tw-flex tw-items-center tw-justify-between tw-p-3 tw-border tw-rounded-md">
                                    <div>
                                        <div className="tw-font-medium">{model.title || `${model.provider}/${model.model}`}</div>
                                        <div className="tw-text-sm tw-text-muted-foreground">
                                            {model.provider} • {model.model}
                                            {model.apiEndpoint && ` • ${model.apiEndpoint}`}
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeModel(index)}
                                        className="tw-text-red-500 hover:tw-text-red-700"
                                    >
                                        <Trash2Icon size={16} />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add New Model Form */}
                    <div className="tw-space-y-4">
                        <h3 className="tw-text-sm tw-font-medium tw-flex tw-items-center tw-gap-2">
                            <PlusIcon size={16} />
                            Add New Model
                        </h3>
                        
                        <div className="tw-grid tw-grid-cols-2 tw-gap-4">
                            <div>
                                <Label htmlFor="provider">Provider *</Label>
                                <Input
                                    id="provider"
                                    placeholder="e.g., openai, anthropic, google"
                                    value={newModel.provider}
                                    onChange={(e) => setNewModel({ ...newModel, provider: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label htmlFor="model">Model *</Label>
                                <Input
                                    id="model"
                                    placeholder="e.g., gpt-4, claude-3-sonnet"
                                    value={newModel.model}
                                    onChange={(e) => setNewModel({ ...newModel, model: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="title">Display Title</Label>
                            <Input
                                id="title"
                                placeholder="Optional display name"
                                value={newModel.title}
                                onChange={(e) => setNewModel({ ...newModel, title: e.target.value })}
                            />
                        </div>

                        <div>
                            <Label htmlFor="apiKey">API Key</Label>
                            <Input
                                id="apiKey"
                                type="password"
                                placeholder="Your API key"
                                value={newModel.apiKey}
                                onChange={(e) => setNewModel({ ...newModel, apiKey: e.target.value })}
                            />
                        </div>

                        <div>
                            <Label htmlFor="apiEndpoint">API Endpoint</Label>
                            <Input
                                id="apiEndpoint"
                                placeholder="Optional custom endpoint"
                                value={newModel.apiEndpoint}
                                onChange={(e) => setNewModel({ ...newModel, apiEndpoint: e.target.value })}
                            />
                        </div>

                        <div className="tw-grid tw-grid-cols-2 tw-gap-4">
                            <div>
                                <Label htmlFor="inputTokens">Input Tokens</Label>
                                <Input
                                    id="inputTokens"
                                    type="number"
                                    value={newModel.inputTokens}
                                    onChange={(e) => setNewModel({ ...newModel, inputTokens: parseInt(e.target.value) || 8000 })}
                                />
                            </div>
                            <div>
                                <Label htmlFor="outputTokens">Output Tokens</Label>
                                <Input
                                    id="outputTokens"
                                    type="number"
                                    value={newModel.outputTokens}
                                    onChange={(e) => setNewModel({ ...newModel, outputTokens: parseInt(e.target.value) || 2000 })}
                                />
                            </div>
                        </div>

                        <Button 
                            onClick={addModel} 
                            disabled={!newModel.provider || !newModel.model}
                            className="tw-w-full"
                        >
                            <PlusIcon size={16} className="tw-mr-2" />
                            Add Model
                        </Button>
                    </div>

                    <div className="tw-text-xs tw-text-muted-foreground tw-p-3 tw-bg-muted tw-rounded-md">
                        <strong>Note:</strong> These models will be saved to your VS Code settings under <code>cody.dev.models</code>. 
                        They will be available immediately after adding and will persist across VS Code sessions.
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}