import { EditorView } from "codemirror";
import { Extension, RangeSetBuilder } from "@codemirror/state";
import { Decoration, ViewPlugin, ViewUpdate } from "@codemirror/view";
import {
  autocompletion,
  Completion,
  CompletionContext,
  CompletionResult,
} from "@codemirror/autocomplete";
import { MentionData } from "./index";

export interface ExtractedMention {
  text: string;
  name: string;
  type: "image" | "file" | "tool" | "api";
}

// Utility to extract unique mentions from the message
export function extractMentions(
  text: string,
  mentionData: MentionData[],
): ExtractedMention[] {
  if (mentionData.length === 0) {
    return [];
  }
  // Create a regex that specifically matches the known mention names.
  // Sort by length descending to ensure longer matches are tried first
  // (prevents shorter substrings from matching when longer options exist)
  const mentionNames = mentionData
    .map((item) => ({
      name: item.name,
      escaped: item.name.replace(/[-/^$*+?.()|[\]{}]/g, "\\$&"),
    }))
    .sort((a, b) => b.name.length - a.name.length)
    .map((item) => item.escaped);
  const mentionRegex = new RegExp(`@(${mentionNames.join("|")})`, "g");

  const mentionSet = new Set<string>();
  let match;
  // By creating a new RegExp object, we ensure the search starts from the beginning of the string every time.
  const regex = new RegExp(mentionRegex);
  while ((match = regex.exec(text))) {
    mentionSet.add(match[1]); // `match[1]` is the captured group (the name)
  }

  return Array.from(mentionSet).map((name) => {
    const data = mentionData.find(
      (item) => item.name.toLowerCase() === name.toLowerCase(),
    );

    return {
      text: `@${name}`,
      name,
      type: data?.type || "tool", // Default to tool if not found
    };
  });
}

// Create mention regex
export function createMentionRegex(mentionData: MentionData[]): RegExp | null {
  if (mentionData.length === 0) {
    return null;
  }
  // Sort by length descending to ensure longer matches are tried first
  const mentionNames = mentionData
    .map((item) => ({
      name: item.name,
      escaped: item.name.replace(/[-/^$*+?.()|[\]{}]/g, "\\$&"),
    }))
    .sort((a, b) => b.name.length - a.name.length)
    .map((item) => item.escaped);
  return new RegExp(`@(${mentionNames.join("|")})`, "g");
}

// Autocomplete extension for mentions
export function createMentionAutocompletion(
  mentionData: MentionData[],
): Extension {
  return autocompletion({
    icons: false,
    maxRenderedOptions: 20,
    optionClass: () => "custom-autocomplete-option",
    override: [
      (context: CompletionContext): CompletionResult | null => {
        const match = context.matchBefore(/@[\w\s]*/);
        if (!match || (match.from === match.to && !context.explicit)) {
          return null;
        }

        // Group mentions by type
        const groupedMentions = mentionData.reduce(
          (acc, item) => {
            const category =
              item.type === "api"
                ? "APIs"
                : item.type === "tool"
                  ? "Tools"
                  : "Other";

            if (!acc[category]) {
              acc[category] = [];
            }
            acc[category].push(item);
            return acc;
          },
          {} as Record<string, typeof mentionData>,
        );

        // Create options with sections
        const options: Completion[] = [];

        // Add APIs first
        if (groupedMentions.APIs) {
          options.push(
            ...groupedMentions.APIs.map((item) => ({
              label: `@${item.name}`,
              displayLabel: item.name,
              type: "variable",
              apply: `@${item.name} `,
              detail: "API",
              boost: 100,
            })),
          );
        }

        // Then add Tools
        if (groupedMentions.Tools) {
          options.push(
            ...groupedMentions.Tools.map((item) => ({
              label: `@${item.name}`,
              displayLabel: item.name,
              type: "variable",
              apply: `@${item.name} `,
              detail: "Tool",
              boost: 50,
            })),
          );
        }

        // Finally add Other category if it exists
        if (groupedMentions.Other) {
          options.push(
            ...groupedMentions.Other.map((item) => ({
              label: `@${item.name}`,
              type: "variable",
              apply: `@${item.name} `,
              detail: "Other",
              boost: 10,
            })),
          );
        }

        return {
          from: match.from,
          options,
        };
      },
    ],
  });
}

// Create mention decoration plugin
export function createMentionDecorationPlugin(
  mentionRegex: RegExp | null,
): Extension {
  const buildMentionDecorations = (view: EditorView) => {
    const builder = new RangeSetBuilder<Decoration>();
    if (!mentionRegex) {
      return builder.finish();
    }
    // By creating a new RegExp object, we ensure the search starts from the beginning of the string every time.
    const regex = new RegExp(mentionRegex);

    for (const { from, to } of view.visibleRanges) {
      const text = view.state.doc.sliceString(from, to);
      let match;
      while ((match = regex.exec(text))) {
        const start = from + match.index;
        const end = start + match[0].length;
        builder.add(
          start,
          end,
          Decoration.mark({
            class: "bg-muted text-primary font-semibold rounded-sm px-0.5",
          }),
        );
      }
    }
    return builder.finish();
  };

  return ViewPlugin.fromClass(
    class {
      decorations;

      constructor(view: EditorView) {
        this.decorations = buildMentionDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildMentionDecorations(update.view);
        }
      }
    },
    {
      decorations: (v) => v.decorations,
    },
  );
}

// Create backspace handler for mentions
export function createMentionBackspaceHandler(
  mentionData: MentionData[],
  mentionRegex: RegExp | null,
) {
  return (view: EditorView): boolean => {
    if (!mentionRegex) return false;
    const { state } = view;
    const { selection } = state;
    if (!selection.main.empty) {
      return false; // Let default behavior handle selection deletion
    }

    const pos = selection.main.head;
    // Check for a mention immediately before the cursor
    const textBefore = state.doc.sliceString(Math.max(0, pos - 50), pos);
    // We use a non-global regex here to match only the end of the string
    // Sort by length descending to ensure longer matches are tried first
    const sortedMentionNames = mentionData
      .map((item) => ({
        name: item.name,
        escaped: item.name.replace(/[-/^$*+?.()|[\]{}]/g, "\\$&"),
      }))
      .sort((a, b) => b.name.length - a.name.length)
      .map((item) => item.escaped);
    const currentMentionRegex = new RegExp(
      `@(${sortedMentionNames.join("|")})$`,
    );
    const match = textBefore.match(currentMentionRegex);

    if (match) {
      const fullMatch = match[0];
      // If it's a valid mention, delete the whole thing
      const from = pos - fullMatch.length;
      const to = pos;
      view.dispatch({
        changes: { from, to, insert: "" },
      });
      return true; // Mark as handled
    }
    return false; // Not a mention, use default backspace behavior
  };
}
