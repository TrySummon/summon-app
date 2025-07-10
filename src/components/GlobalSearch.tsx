import React, { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { X, ChevronUp, ChevronDown } from "lucide-react";

interface SearchMatch {
  element: HTMLElement;
  textNode: Text;
  startOffset: number;
  endOffset: number;
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up highlights
  const clearHighlights = useCallback(() => {
    // Clear regular highlights
    document.querySelectorAll(".search-highlight").forEach((el) => {
      const parent = el.parentNode;
      if (parent && el.textContent) {
        // Replace highlight span with its text content
        const textNode = document.createTextNode(el.textContent);
        parent.replaceChild(textNode, el);
      }
    });

    // Clear CodeMirror highlights
    document.querySelectorAll(".cm-search-match").forEach((el) => {
      el.classList.remove("cm-search-match");
      el.classList.remove("cm-search-match-current");
      delete (el as HTMLElement).dataset.searchMatches;
    });

    // Normalize text nodes to merge adjacent ones
    document.body.normalize();
  }, []);

  // Find all text nodes in the document
  const getTextNodes = useCallback((node: Node): Text[] => {
    const textNodes: Text[] = [];

    // Skip certain elements
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      // Skip script, style, and our own search bar
      if (
        element.tagName === "SCRIPT" ||
        element.tagName === "STYLE" ||
        element.classList.contains("global-search-bar") ||
        element.closest(".global-search-bar")
      ) {
        return textNodes;
      }

      // Don't skip CodeMirror content - we want to search it
      // But skip CodeMirror UI elements like panels and tooltips
      if (
        element.classList.contains("cm-tooltip") ||
        element.classList.contains("cm-panel") ||
        element.classList.contains("cm-search") ||
        element.classList.contains("cm-gutter")
      ) {
        return textNodes;
      }
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || "";
      if (text.trim()) {
        textNodes.push(node as Text);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      Array.from(node.childNodes).forEach((child) => {
        textNodes.push(...getTextNodes(child));
      });
    }

    return textNodes;
  }, []);

  // Highlight matches
  const highlightMatches = useCallback(
    (query: string): SearchMatch[] => {
      clearHighlights();

      if (!query) return [];

      const allMatches: SearchMatch[] = [];
      const textNodes = getTextNodes(document.body);
      const searchRegex = new RegExp(
        query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "gi",
      );

      textNodes.forEach((textNode) => {
        const text = textNode.textContent || "";
        const parent = textNode.parentNode;
        if (!parent) return;

        // Check if this text node is inside CodeMirror
        const isInCodeMirror = !!(parent as HTMLElement).closest?.(
          ".cm-content",
        );

        // Find all matches in this text node
        const matches: Array<{ start: number; end: number }> = [];
        let match;

        // Reset regex lastIndex to ensure we find all matches
        searchRegex.lastIndex = 0;

        while ((match = searchRegex.exec(text)) !== null) {
          matches.push({
            start: match.index,
            end: match.index + match[0].length,
          });
        }

        if (matches.length === 0) return;

        if (isInCodeMirror) {
          // For CodeMirror content, don't modify the DOM
          // Instead, just track the matches for navigation
          const parentElement = parent as HTMLElement;

          matches.forEach((range) => {
            // Add a temporary data attribute to help with highlighting
            if (!parentElement.dataset.searchMatches) {
              parentElement.dataset.searchMatches = JSON.stringify([range]);
            } else {
              const existing = JSON.parse(parentElement.dataset.searchMatches);
              existing.push(range);
              parentElement.dataset.searchMatches = JSON.stringify(existing);
            }

            // For navigation, we'll use the parent element
            allMatches.push({
              element: parentElement,
              textNode: textNode,
              startOffset: range.start,
              endOffset: range.end,
            });
          });

          // Apply highlighting via CSS
          parentElement.classList.add("cm-search-match");
        } else {
          // For non-CodeMirror content, use the original approach
          const fragment = document.createDocumentFragment();
          let lastEnd = 0;

          matches.forEach((range) => {
            // Add text before the match
            if (range.start > lastEnd) {
              fragment.appendChild(
                document.createTextNode(text.substring(lastEnd, range.start)),
              );
            }

            // Add the highlighted match
            const highlightSpan = document.createElement("span");
            highlightSpan.className = "search-highlight";
            highlightSpan.textContent = text.substring(range.start, range.end);
            fragment.appendChild(highlightSpan);

            allMatches.push({
              element: highlightSpan,
              textNode: textNode,
              startOffset: range.start,
              endOffset: range.end,
            });

            lastEnd = range.end;
          });

          // Add any remaining text after the last match
          if (lastEnd < text.length) {
            fragment.appendChild(
              document.createTextNode(text.substring(lastEnd)),
            );
          }

          // Replace the original text node with the fragment
          parent.replaceChild(fragment, textNode);
        }
      });

      return allMatches;
    },
    [getTextNodes, clearHighlights],
  );

  // Navigate to a specific match
  const navigateToMatch = useCallback(
    (index: number) => {
      if (matches.length === 0) return;

      // Remove current highlight from all matches
      document.querySelectorAll(".search-highlight").forEach((el) => {
        el.classList.remove("search-highlight-current");
      });

      // Remove current highlight from CodeMirror matches
      document.querySelectorAll(".cm-search-match").forEach((el) => {
        el.classList.remove("cm-search-match-current");
      });

      const match = matches[index];
      if (match && match.element) {
        // Check if this is a CodeMirror match
        if (match.element.classList.contains("cm-search-match")) {
          match.element.classList.add("cm-search-match-current");
        } else {
          match.element.classList.add("search-highlight-current");
        }
        match.element.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    },
    [matches],
  );

  // Search handler with debounce
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);

      // Clear existing timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Debounce the search
      searchTimeoutRef.current = setTimeout(() => {
        const foundMatches = highlightMatches(query);
        setMatches(foundMatches);

        if (foundMatches.length > 0) {
          setCurrentMatchIndex(0);
          navigateToMatch(0);
        } else {
          setCurrentMatchIndex(-1);
        }
      }, 150); // 150ms debounce
    },
    [highlightMatches, navigateToMatch],
  );

  // Navigation handlers
  const navigateNext = useCallback(() => {
    if (matches.length === 0) return;
    const nextIndex = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(nextIndex);
    navigateToMatch(nextIndex);
  }, [currentMatchIndex, matches.length, navigateToMatch]);

  const navigatePrevious = useCallback(() => {
    if (matches.length === 0) return;
    const prevIndex =
      currentMatchIndex === 0 ? matches.length - 1 : currentMatchIndex - 1;
    setCurrentMatchIndex(prevIndex);
    navigateToMatch(prevIndex);
  }, [currentMatchIndex, matches.length, navigateToMatch]);

  // Close search
  const closeSearch = useCallback(() => {
    setIsOpen(false);
    setSearchQuery("");
    setMatches([]);
    setCurrentMatchIndex(-1);
    clearHighlights();

    // Clear any pending search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  }, [clearHighlights]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open search with Cmd/Ctrl + F
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        // Always prevent default and open our global search
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }

      // Close with Escape
      if (e.key === "Escape" && isOpen) {
        closeSearch();
      }

      // Navigate with Enter/Shift+Enter when search is open
      if (isOpen && e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) {
          navigatePrevious();
        } else {
          navigateNext();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeSearch, navigateNext, navigatePrevious]);

  if (!isOpen) return null;

  return (
    <div className="global-search-bar bg-popover border-border fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg border-2 p-3 shadow-xl">
      <Input
        ref={inputRef}
        type="text"
        placeholder="Search..."
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        className="w-64 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
      />

      {searchQuery && matches.length === 0 && (
        <span className="text-muted-foreground text-sm">No results</span>
      )}

      {matches.length > 0 && (
        <div className="text-muted-foreground flex items-center gap-1 text-sm">
          <span className="font-medium">
            {currentMatchIndex + 1} / {matches.length}
          </span>
          <button
            onClick={navigatePrevious}
            className="hover:bg-accent rounded p-1 transition-colors"
            title="Previous match (Shift+Enter)"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            onClick={navigateNext}
            className="hover:bg-accent rounded p-1 transition-colors"
            title="Next match (Enter)"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      )}

      <button
        onClick={closeSearch}
        className="hover:bg-accent rounded p-1 transition-colors"
        title="Close (Esc)"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
