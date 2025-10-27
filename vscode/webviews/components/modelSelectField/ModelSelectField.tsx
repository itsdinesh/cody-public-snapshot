import { type ChatMessage, type Model, ModelTag, type ModelsData } from '@sourcegraph/cody-shared'
import { isMacOS } from '@sourcegraph/cody-shared'
import { DeepCodyAgentID, ToolCodyModelName } from '@sourcegraph/cody-shared/src/models/client'
import { clsx } from 'clsx'
import { AlertTriangleIcon, BrainIcon } from 'lucide-react'
import React, { type FunctionComponent, type ReactNode, useCallback, useMemo } from 'react'
import type { UserAccountInfo } from '../../Chat'
import { getVSCodeAPI } from '../../utils/VSCodeApi'
import { useTelemetryRecorder } from '../../utils/telemetry'
import { chatModelIconComponent } from '../ChatModelIcon'
import { Badge } from '../shadcn/ui/badge'
import { Command, CommandGroup, CommandItem, CommandList } from '../shadcn/ui/command'
import { ToolbarPopoverItem } from '../shadcn/ui/toolbar'
import { cn } from '../shadcn/utils'
import styles from './ModelSelectField.module.css'

type Value = string

interface SelectListOption {
    value: Value | undefined
    title: string | ReactNode
    tooltip: string
    filterKeywords?: string[]
    group?: string
    disabled?: boolean
}

export const ModelSelectField: React.FunctionComponent<{
    models: Model[]
    onModelSelect: (model: Model) => void
    serverSentModelsEnabled: boolean

    userInfo: Pick<UserAccountInfo, 'isCodyProUser' | 'isDotComUser'>

    onCloseByEscape?: () => void
    className?: string

    intent?: ChatMessage['intent']

    /** For storybooks only. */
    __storybook__open?: boolean
    modelSelectorRef?: React.MutableRefObject<{ open: () => void; close: () => void } | null>
    modelsData?: ModelsData
}> = ({
    models,
    onModelSelect: parentOnModelSelect,
    serverSentModelsEnabled,
    userInfo,
    onCloseByEscape,
    className,
    intent,
    __storybook__open,
    modelSelectorRef,
    modelsData,
}) => {
    const telemetryRecorder = useTelemetryRecorder()

    // Use a static variable to persist user selections across re-renders and backend updates
    // Find the model marked as default, fallback to first model if none found
    const defaultModel = models.find(model => model.tags.includes(ModelTag.Default)) || models[0]

    // Use stored selection if it exists and the model is still available, otherwise use default
    const storedSelection = (ModelSelectField as any)._lastUserSelection
    const storedModelExists = storedSelection && models.find(model => model.id === storedSelection)
    const initialSelectedModelId = storedModelExists ? storedSelection : defaultModel?.id

    // Maintain local state for the selected model to ensure UI updates immediately
    const [selectedModelId, setSelectedModelId] = React.useState(initialSelectedModelId)

    // Request remembered model from backend on mount
    React.useEffect(() => {
        // Request the remembered model immediately
        getVSCodeAPI().postMessage({
            command: 'cody.chat.model.getRemembered',
        })
    }, [])

    // Listen for remembered model from backend and model changes from other instances
    React.useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data
            if (message.type === 'cody.chat.model.remembered' && message.modelId) {
                const modelExists = models.find(m => m.id === message.modelId)
                if (modelExists) {
                    setSelectedModelId(message.modelId)
                    ;(ModelSelectField as any)._lastUserSelection = message.modelId
                }
            }
            // Listen for model changes from other chat instances
            if (message.type === 'cody.chat.model.changed' && message.modelId) {
                const modelExists = models.find(m => m.id === message.modelId)
                if (modelExists && selectedModelId !== message.modelId) {
                    setSelectedModelId(message.modelId)
                    ;(ModelSelectField as any)._lastUserSelection = message.modelId
                }
            }
        }

        window.addEventListener('message', handleMessage)
        return () => window.removeEventListener('message', handleMessage)
    }, [models, selectedModelId])

    // Update local state when the models array changes, but only if stored selection is no longer valid
    React.useEffect(() => {
        const storedSelection = (ModelSelectField as any)._lastUserSelection
        const storedModelExists = storedSelection && models.find(model => model.id === storedSelection)

        if (storedModelExists) {
            // Use stored selection if it's still valid
            if (selectedModelId !== storedSelection) {
                setSelectedModelId(storedSelection)
            }
        } else if (!storedSelection) {
            // Only fall back to default/first model if there's no stored selection at all
            // This handles the initial load case
            const defaultModel = models.find(model => model.tags.includes(ModelTag.Default)) || models[0]
            if (defaultModel && defaultModel.id !== selectedModelId) {
                setSelectedModelId(defaultModel.id)
            }
        }
        // If storedSelection exists but model doesn't exist in list, keep current selection
        // This prevents resetting when models array temporarily doesn't include the selected model
    }, [models, selectedModelId])

    // The selected model should be the one matching our selectedModelId
    // Fall back to models[0] only if selectedModelId doesn't exist in the list
    const selectedModel = models.find(model => model.id === selectedModelId) || models[0]

    const onModelSelect = useCallback(
        (model: Model): void => {
            if (selectedModel.id !== model.id) {
                telemetryRecorder.recordEvent('cody.modelSelector', 'select', {
                    metadata: {},
                    privateMetadata: {
                        modelId: model.id,
                        modelProvider: model.provider,
                        modelTitle: model.title,
                    },
                    billingMetadata: {
                        product: 'cody',
                        category: 'billable',
                    },
                })

                // Update local state immediately for responsive UI
                setSelectedModelId(model.id)
                // Store the user's selection persistently in memory
                ;(ModelSelectField as any)._lastUserSelection = model.id

                // Persist to backend storage asynchronously (fire and forget)
                getVSCodeAPI().postMessage({
                    command: 'cody.chat.model.remember',
                    modelId: model.id,
                })

                // Immediately notify parent to use the new model
                parentOnModelSelect(model)
            }
        },
        [selectedModel, telemetryRecorder.recordEvent, parentOnModelSelect]
    )

    // Readonly if they are an enterprise user that does not support server-sent models
    const readOnly = !(userInfo.isDotComUser || serverSentModelsEnabled)

    const onOpenChange = useCallback(
        (open: boolean): void => {
            if (open) {
                // Trigger only when dropdown is about to be opened.
                telemetryRecorder.recordEvent('cody.modelSelector', 'open', {
                    metadata: {
                        totalModels: models.length,
                    },
                    billingMetadata: {
                        product: 'cody',
                        category: 'billable',
                    },
                })
            }
        },
        [telemetryRecorder.recordEvent, models.length]
    )

    const options = useMemo<SelectListOption[]>(
        () =>
            models.map(m => {
                const availability = modelAvailability(userInfo, serverSentModelsEnabled, m, intent)
                return {
                    value: m.id,
                    title: (
                        <ModelTitleWithIcon
                            model={m}
                            showIcon={true}
                            showProvider={true}
                            modelAvailability={availability}
                        />
                    ),
                    disabled: availability !== 'available',
                    group: getModelDropDownUIGroup(m),
                    tooltip: getTooltip(m, availability),
                } satisfies SelectListOption
            }),
        [models, userInfo, serverSentModelsEnabled, intent]
    )
    const optionsByGroup: { group: string; options: SelectListOption[] }[] = useMemo(() => {
        return optionByGroup(options)
    }, [options])

    const onChange = useCallback(
        (value: string | undefined) => {
            onModelSelect(models.find(m => m.id === value)!)
        },
        [onModelSelect, models]
    )

    const onKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLDivElement>) => {
            if (event.key === 'Escape') {
                onCloseByEscape?.()
            }
        },
        [onCloseByEscape]
    )

    if (!models.length || models.length < 1) {
        return null
    }

    const value = selectedModel.id
    return (
        <ToolbarPopoverItem
            role="combobox"
            data-testid="chat-model-selector"
            iconEnd={readOnly ? undefined : 'chevron'}
            className={cn('tw-w-full', className)}
            disabled={readOnly}
            __storybook__open={__storybook__open}
            tooltip={readOnly ? undefined : isMacOS() ? 'Switch model (⌘M)' : 'Switch model (Ctrl+M)'}
            aria-label="Select a model or an agent"
            controlRef={modelSelectorRef}
            popoverContent={close => (
                <Command
                    loop={true}
                    defaultValue={value}
                    tabIndex={0}
                    className={`focus:tw-outline-none ${styles.chatModelPopover}`}
                    data-testid="chat-model-popover"
                >
                    {intent === 'agentic' && (
                        <div className="tw-pl-5 tw-pr-3 tw-py-1.5 tw-text-sm tw-text-foreground tw-flex tw-justify-center">
                            <div className="tw-flex tw-items-start tw-gap-2 tw-bg-muted tw-px-2 tw-py-0.5 tw-rounded">
                                <AlertTriangleIcon className="tw-w-[16px] tw-h-[16px] tw-mt-[2px]" />
                                <span className="tw-leading-4 tw-font-semibold">
                                    Only Claude 3.7 Sonnet is currently available in Agent Mode
                                </span>
                            </div>
                        </div>
                    )}
                    <CommandList
                        className="model-selector-popover tw-max-h-[80vh] tw-overflow-y-auto"
                        data-testid="chat-model-popover-option"
                    >
                        {optionsByGroup.map(({ group, options }) => (
                            <CommandGroup heading={group} key={group}>
                                {options.map(option => (
                                    <CommandItem
                                        data-testid="chat-model-popover-option"
                                        key={option.value}
                                        value={option.value}
                                        onSelect={currentValue => {
                                            onChange(currentValue)
                                            close()
                                        }}
                                        disabled={option.disabled}
                                        tooltip={option.tooltip}
                                    >
                                        {option.title}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        ))}
                    </CommandList>
                </Command>
            )}
            popoverRootProps={{ onOpenChange }}
            popoverContentProps={{
                className: 'tw-w-full tw-max-w-full !tw-p-0',
                onKeyDown: onKeyDown,
                onCloseAutoFocus: event => {
                    // Prevent the popover trigger from stealing focus after the user selects an
                    // item. We want the focus to return to the editor.
                    event.preventDefault()
                },
            }}
        >
            <span className="tw-flex-1 tw-min-w-0 tw-overflow-visible">
                {value !== undefined
                    ? options.find(option => option.value === value)?.title
                    : 'Select...'}
            </span>
        </ToolbarPopoverItem>
    )
}

type ModelAvailability = 'available' | 'not-selectable'

function modelAvailability(
    userInfo: Pick<UserAccountInfo, 'isCodyProUser' | 'isDotComUser'>,
    serverSentModelsEnabled: boolean,
    model: Model,
    intent?: ChatMessage['intent']
): ModelAvailability {
    if (model.disabled) {
        return 'not-selectable'
    }
    if (intent === 'agentic' && !model.tags.includes(ModelTag.Default)) {
        return 'not-selectable'
    }
    return 'available'
}

function getTooltip(model: Model, availability: string): string {
    if (model.id.includes(DeepCodyAgentID)) {
        return 'Agentic chat reflects on your request and uses tools to dynamically retrieve relevant context, improving accuracy and response quality.'
    }

    if (model.tags.includes(ModelTag.Waitlist)) {
        return 'Request access to this new model'
    }
    if (model.tags.includes(ModelTag.OnWaitlist)) {
        return 'Request received, we will reach out with next steps'
    }

    if (model.disabled) {
        return 'This model is currently unavailable.'
    }

    const capitalizedProvider =
        model.provider === 'openai'
            ? 'OpenAI'
            : model.provider.charAt(0).toUpperCase() + model.provider.slice(1)
    return `${model.title} by ${capitalizedProvider}`
}

const getBadgeText = (model: Model): string | null => {
    const tagToText: Record<string, string> = {
        [ModelTag.Internal]: 'Internal',
        [ModelTag.Experimental]: 'Experimental',
        [ModelTag.Waitlist]: 'Join Waitlist',
        [ModelTag.OnWaitlist]: 'On Waitlist',
        [ModelTag.EarlyAccess]: 'Early Access',
        [ModelTag.Recommended]: 'Recommended',
        [ModelTag.Deprecated]: 'Deprecated',
        [ModelTag.Dev]: 'Preview',
    }

    return model.tags.reduce((text, tag) => text || tagToText[tag] || '', null as string | null)
}

const ModelTitleWithIcon: React.FC<{
    model: Model
    showIcon?: boolean
    showProvider?: boolean
    modelAvailability?: ModelAvailability
    isCurrentlySelected?: boolean
}> = ({ model, showIcon, modelAvailability }) => {
    const modelBadge = getBadgeText(model)
    const isDisabled = modelAvailability !== 'available'

    return (
        <span
            className={clsx(styles.modelTitleWithIcon, 'tw-min-w-0', {
                [styles.disabled]: isDisabled,
            })}
        >
            {showIcon ? (
                model.id.includes(DeepCodyAgentID) ? (
                    <BrainIcon size={16} className={styles.modelIcon} />
                ) : (
                    <ChatModelIcon model={model.provider} className={styles.modelIcon} />
                )
            ) : null}
            <span className={clsx('tw-flex-grow tw-min-w-0', styles.modelName)}>{model.title}</span>
            {modelBadge && (
                <Badge variant="secondary" className={clsx(styles.badge)}>
                    {modelBadge}
                </Badge>
            )}
        </span>
    )
}

const ChatModelIcon: FunctionComponent<{
    model: string
    className?: string
}> = ({ model, className }) => {
    const ModelIcon = chatModelIconComponent(model)
    return ModelIcon ? <ModelIcon size={16} className={className} /> : null
}

/** Common {@link ModelsService.uiGroup} values. */
const ModelUIGroup: Record<string, string> = {
    Agents: 'Agent, extensive context fetching',
    Power: 'More powerful models',
    Balanced: 'Balanced for power and speed',
    Speed: 'Faster models',
    Ollama: 'Ollama (Local models)',
    Other: 'Other',
}

const getModelDropDownUIGroup = (model: Model): string => {
    if ([DeepCodyAgentID, ToolCodyModelName].some(id => model.id.includes(id)))
        return ModelUIGroup.Agents
    if (model.tags.includes(ModelTag.Power)) return ModelUIGroup.Power
    if (model.tags.includes(ModelTag.Balanced)) return ModelUIGroup.Balanced
    if (model.tags.includes(ModelTag.Speed)) return ModelUIGroup.Speed
    if (model.tags.includes(ModelTag.Ollama)) return ModelUIGroup.Ollama
    return ModelUIGroup.Other
}

const optionByGroup = (
    options: SelectListOption[]
): { group: string; options: SelectListOption[] }[] => {
    const groupOrder = [
        ModelUIGroup.Power,
        ModelUIGroup.Balanced,
        ModelUIGroup.Speed,
        ModelUIGroup.Ollama,
        ModelUIGroup.Other,
    ]
    const groups = new Map<string, SelectListOption[]>()

    for (const option of options) {
        const group = option.group ?? ModelUIGroup.Other
        const groupOptions = groups.get(group) ?? []
        groupOptions.push(option)
        groups.set(group, groupOptions)
    }

    return [...groups.entries()]
        .sort(([a], [b]) => groupOrder.indexOf(a) - groupOrder.indexOf(b))
        .map(([group, options]) => ({ group, options }))
}
