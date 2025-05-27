import { streamText, ToolSet } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import type { PlaygroundStore } from './store';
import { v4 as uuidv4 } from 'uuid';
import { UIMessage } from 'ai';
import { captureEvent } from '@/lib/posthog';

export async function runAgent(get: () => PlaygroundStore) {
    const startTime = Date.now();
    
    try {
        get().updateCurrentState((state) => ({
            ...state,
            running: true
        }));
        const {aiToolMap, getCurrentState} = get();
        const {messages, model, settings, maxSteps} = getCurrentState();
        
        // Track AI agent start
        captureEvent('playground_ai_agent_started', {
            model: model,
            conversation_length: messages.length,
            max_steps: maxSteps,
            tools_available: Object.keys(aiToolMap).length,
            temperature: settings.temperature,
            max_tokens: settings.maxTokens,
            timestamp: new Date().toISOString()
        });

        const toolSet: ToolSet = {}
        Object.values(aiToolMap).forEach((tools) => {
            Object.entries(tools).forEach(([toolName, tool]) => {
                toolSet[toolName] = tool;
            })
        });
        
        const openai = createOpenAI({ apiKey: "PLACEHOLDER" });
        
        // We'll create the assistant message only when we receive the first token
        const assistantMessageId = uuidv4();
        let assistantMessageCreated = false;

        // Stream the response
        const { textStream } = streamText({
            model: openai(model),
            tools: toolSet,
            messages: messages,
            maxSteps,
            onStepFinish: (step) => {
                if(step.finishReason === "tool-calls") {
                    const toolMessages: UIMessage[] = [];
                    step.toolCalls.forEach((toolCall, i) => {
                        const toolMessage: UIMessage = {
                            id: toolCall.toolCallId,
                            role: 'data',
                            content: '',
                            parts: [{ type: 'tool-invocation', toolInvocation: {
                                state: "result",
                                toolCallId: toolCall.toolCallId,
                                toolName: toolCall.toolName,
                                args: toolCall.args,
                                result: (step.toolResults[i] as any).result,
                            } }],
                            createdAt: new Date()
                        };
                        toolMessages.push(toolMessage);
                    });
                    get().updateCurrentState((state) => ({
                        ...state,
                        messages: [
                            ...state.messages,
                            ...toolMessages
                        ]
                    }));
                }
            },
            ...settings,
        });
        
        let fullResponse = '';
        let tokenCount = 0;
        
        // Process each chunk of the stream
        for await (const textPart of textStream) {
            fullResponse += textPart;
            tokenCount++;
            
            // Create the assistant message on first token if it doesn't exist yet
            if (!assistantMessageCreated) {
                const initialAssistantMessage: UIMessage = {
                    id: assistantMessageId,
                    role: 'assistant',
                    content: fullResponse,
                    parts: [{ type: 'text', text: fullResponse }],
                    createdAt: new Date()
                };
                
                get().updateCurrentState((state) => ({
                    ...state,
                    messages: [
                        ...state.messages, 
                        initialAssistantMessage
                    ]
                }));
                
                assistantMessageCreated = true;
            } else {
                // Update the assistant message with the accumulated text
                const messageIndex = get().getCurrentState().messages.findIndex(msg => msg.id === assistantMessageId);
                
                if (messageIndex !== -1) {
                    const updatedAssistantMessage: UIMessage = {
                        id: assistantMessageId,
                        role: 'assistant',
                        content: fullResponse,
                        parts: [{ type: 'text', text: fullResponse }],
                        createdAt: new Date()
                    };
                    
                    get().updateExistingMessage(messageIndex, updatedAssistantMessage);
                }
            }
        }
        
        // Track successful AI response completion
        const endTime = Date.now();
        const currentState = getCurrentState();
        captureEvent('playground_ai_response_completed', {
            model: model,
            response_length: fullResponse.length,
            token_count: tokenCount,
            duration_ms: endTime - startTime,
            conversation_length: currentState.messages.length,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error generating response:', error);
        
        // Track AI agent error
        const endTime = Date.now();
        const {getCurrentState: getState} = get();
        const errorState = getState();
        captureEvent('playground_ai_agent_error', {
            model: errorState.model,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            duration_ms: endTime - startTime,
            conversation_length: errorState.messages.length,
            timestamp: new Date().toISOString()
        });
        
        // Add an error message to the chat
        const errorMessage: UIMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: 'Sorry, there was an error generating a response. Please try again.',
        parts: [{ 
            type: 'text', 
            text: 'Sorry, there was an error generating a response. Please try again.' 
        }],
        createdAt: new Date()
        };
        
        get().updateCurrentState((state) => ({
        ...state,
        messages: [
            ...state.messages,
            errorMessage
        ]
        }));
    } finally {
        get().updateCurrentState((state) => ({
            ...state,
            running: false
        }));
    }
          
}
