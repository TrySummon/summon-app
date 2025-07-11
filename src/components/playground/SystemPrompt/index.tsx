import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { cn } from "@/utils/tailwind";
import { ChevronDown, ChevronUp } from "lucide-react";
import { EditorView } from "codemirror";
import { keymap, placeholder } from "@codemirror/view";
import { Extension } from "@codemirror/state";
import CodeMirrorEditor from "@/components/CodeEditor";
import { usePlaygroundStore } from "../../../stores/playgroundStore";
import { usePostHog } from "@/hooks/usePostHog";

interface SystemPromptProps {
  className?: string;
}

const SystemPrompt: React.FC<SystemPromptProps> = ({ className }) => {
  const { captureEvent } = usePostHog();
  const editorRef = useRef<EditorView | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const systemPrompt = usePlaygroundStore(
    (state) => state.getCurrentState().systemPrompt || "",
  );
  const isRunning = usePlaygroundStore(
    (state) => state.getCurrentState().running,
  );
  const updateSystemPrompt = usePlaygroundStore(
    (state) => state.updateSystemPrompt,
  );

  useEffect(() => {
    if (isExpanded) {
      captureEvent("playground_system_prompt_open", {
        length: systemPrompt.length,
      });
    } else {
      captureEvent("playground_system_prompt_close", {
        length: systemPrompt.length,
      });
    }
  }, [isExpanded]);

  // Update editor content when text changes
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const currentValue = editor.state.doc.toString();
    const newValue = systemPrompt;

    if (currentValue !== newValue) {
      editor.dispatch({
        changes: { from: 0, to: currentValue.length, insert: newValue },
      });
    }
  }, [systemPrompt]);

  const toggleExpand = useCallback(() => {
    const expanding = !isExpanded;
    setIsExpanded(expanding);
    if (expanding) {
      // Use a small timeout to ensure the editor is fully expanded before focusing
      setTimeout(() => {
        if (editorRef.current) {
          // Focus at the end of the content
          const doc = editorRef.current.state.doc;
          const endPos = doc.length;
          editorRef.current.dispatch({
            selection: { anchor: endPos, head: endPos },
          });
          editorRef.current.focus();
        }
      }, 50);
    }
  }, [isExpanded]);

  // Create keyboard shortcuts for Enter and Escape to close the editor
  const extensions = useMemo((): Extension[] => {
    return [
      placeholder("Your system prompt here..."),
      keymap.of([
        {
          key: "Enter",
          run: () => {
            setIsExpanded(false);
            return true;
          },
        },
        {
          key: "Escape",
          run: () => {
            setIsExpanded(false);
            return true;
          },
        },
      ]),
    ];
  }, []);

  const hasMultipleLines = systemPrompt.includes("\n");

  const showEditor = isExpanded || !!systemPrompt.trim();

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-md transition-all duration-200",
        isExpanded
          ? "bg-card/80 flex-grow p-3 shadow-sm"
          : "cursor-pointer bg-transparent pt-0",
        className,
      )}
      onClick={!isExpanded ? toggleExpand : undefined}
    >
      <div
        className="flex cursor-pointer items-center justify-between py-1"
        onClick={(e) => {
          e.stopPropagation();
          toggleExpand();
        }}
      >
        <div className="text-muted-foreground/70 text-xs font-medium">
          System prompt
        </div>
        <div className="text-muted-foreground/70 hover:text-muted-foreground flex items-center gap-2">
          {!isExpanded && hasMultipleLines && (
            <div className="text-xs">
              {systemPrompt.split("\n").length} lines
            </div>
          )}
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      <div
        className={cn(
          "relative overflow-hidden transition-all duration-200",
          isExpanded ? "mt-2" : showEditor ? "h-[24px]" : "h-0",
        )}
        onClick={(e) =>
          isExpanded ? undefined : (e.stopPropagation(), toggleExpand())
        }
      >
        <CodeMirrorEditor
          className={
            showEditor
              ? "translate-y-0 opacity-100"
              : "translate-y-[-100%] opacity-0"
          }
          editorRef={editorRef}
          onChange={updateSystemPrompt}
          readOnly={isRunning}
          language="markdown"
          additionalExtensions={extensions}
        />
        {!isExpanded && (
          <div
            className="from-background pointer-events-none absolute right-0 bottom-0 left-0 h-8 bg-gradient-to-t to-transparent"
            aria-hidden="true"
          />
        )}
      </div>
    </div>
  );
};

export default SystemPrompt;
