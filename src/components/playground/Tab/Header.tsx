import React, { useEffect, useState } from 'react';
import { Brush, Undo, Redo } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { usePlaygroundStore } from '../store';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/Kbd';
import { toast } from 'sonner';
import ToolPicker from './ToolPicker';
import { LLMPicker } from '@/components/llm-picker';

export default function TabHeader() {
    const {
      updateCurrentState,
      undo,
      redo,
      canUndo,
      canRedo,
      getCurrentState,
    } = usePlaygroundStore();
    
    // Track undo/redo state
    const [canUndoState, setCanUndoState] = useState(canUndo());
    const [canRedoState, setCanRedoState] = useState(canRedo());
    
    // Use state to track the current playground state
    const [currentState, setCurrentState] = useState(getCurrentState());
    const isRunning = currentState.running;
    
    // Update state when store changes
    useEffect(() => {
      // Create a subscription to the store
      const unsubscribe = usePlaygroundStore.subscribe((state) => {
        // Check if undo/redo state has changed
        const canUndoCurrent = canUndo();
        const canRedoCurrent = canRedo();
        
        if (canUndoCurrent !== canUndoState) {
          setCanUndoState(canUndoCurrent);
        }
        
        if (canRedoCurrent !== canRedoState) {
          setCanRedoState(canRedoCurrent);
        }
        
        // Update current state to reflect latest changes
        setCurrentState(getCurrentState());
      });
      
      // Cleanup subscription
      return unsubscribe;
    }, [canUndoState, canRedoState]);

    const clearMessages = () => {
        updateCurrentState((state) => ({
          ...state,
          messages: [],
          tokenUsage: undefined,
          latency: undefined,
        }), true, "Cleared all messages");
    };
    
    const handleUndo = () => {
        const description = undo();
        if (description) {
            toast.info(`Undo: ${description}`);
        }
    };
    
    const handleRedo = () => {
        const description = redo();
        if (description) {
            toast.info(`Redo: ${description}`);
        }
    };
    
    // Set up keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check if focus is in a CodeMirror editor
            const isInCodeMirror = document.activeElement?.closest('.cm-editor') !== null;
            
            // Don't handle shortcuts if we're in CodeMirror
            if (isInCodeMirror) {
                return;
            }
            
            // Check for Undo: Cmd+Z (Mac) or Ctrl+Z (Windows/Linux)
            if (e.metaKey && e.key === 'z' && !e.shiftKey) {
                if (canUndoState && !isRunning) {
                    e.preventDefault();
                    handleUndo();
                }
            }
            
            // Check for Redo: Cmd+Shift+Z (Mac) or Ctrl+Shift+Z (Windows/Linux)
            if (e.metaKey && e.key === 'z' && e.shiftKey) {
                if (canRedoState && !isRunning) {
                    e.preventDefault();
                    handleRedo();
                }
            }
        };
        
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [canUndoState, canRedoState, isRunning]);

    return <div className='flex justify-between items-center gap-2 px-4'>
      <div className='flex gap-2'>
        <LLMPicker config={{
          credentialId: currentState.credentialId,
          model: currentState.model,
          settings: currentState.settings,
          }} onChange={(config) => updateCurrentState((state) => ({
            ...state,
            credentialId: config.credentialId,
            model: config.model,
            settings: config.settings,
          }))} />
      <ToolPicker />
      </div>
      <div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            onClick={handleUndo}
            variant="ghost"
            size="icon"
            aria-label="Undo"
            disabled={!canUndoState || isRunning}
          >
            <Undo className='h-4 w-4' />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex items-center gap-1">
            <p>Undo</p>
            <Kbd className='z-10'>cmd+z</Kbd>
          </div>
        </TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            onClick={handleRedo}
            variant="ghost"
            size="icon"
            aria-label="Redo"
            disabled={!canRedoState || isRunning}
          >
            <Redo className='h-4 w-4' />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex items-center gap-1">
            <p>Redo</p>
            <Kbd className='z-10'>cmd+shift+z</Kbd>
          </div>
        </TooltipContent>
      </Tooltip>
      
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            onClick={clearMessages}
            disabled={isRunning || !currentState.messages.length}
            variant="ghost"
            size="icon"
            aria-label="Clear messages"
          >
            <Brush className='h-4 w-4' />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Clear messages</p>
        </TooltipContent>
      </Tooltip>
      </div>
    </div>
}