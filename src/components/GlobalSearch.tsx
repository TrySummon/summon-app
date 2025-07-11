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
    try {
      // Clear regular highlights
      document.querySelectorAll(".search-highlight").forEach((el) => {
        try {
          const parent = el.parentNode;
          if (parent && el.textContent) {
            // Replace highlight span with its text content
            const textNode = document.createTextNode(el.textContent);
            parent.replaceChild(textNode, el);
          }
        } catch (error) {
          console.warn("Error clearing highlight:", error);
        }
      });

      // Clear CodeMirror highlights
      document.querySelectorAll(".cm-search-match").forEach((el) => {
        try {
          el.classList.remove("cm-search-match");
          el.classList.remove("cm-search-match-current");
          delete (el as HTMLElement).dataset.searchMatches;
        } catch (error) {
          console.warn("Error clearing CodeMirror highlight:", error);
        }
      });

      // Normalize text nodes to merge adjacent ones
      try {
        document.body.normalize();
      } catch (error) {
        console.warn("Error normalizing document body:", error);
      }
    } catch (error) {
      console.error("Error in clearHighlights:", error);
    }
  }, []);

  // Find all text nodes in the document
  const getTextNodes = useCallback((node: Node): Text[] => {
    const textNodes: Text[] = [];

    try {
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
        try {
          Array.from(node.childNodes).forEach((child) => {
            textNodes.push(...getTextNodes(child));
          });
        } catch (error) {
          console.warn("Error traversing child nodes:", error);
        }
      }
    } catch (error) {
      console.warn("Error in getTextNodes:", error);
    }

    return textNodes;
  }, []);

  // Highlight matches
  const highlightMatches = useCallback(
    (query: string): SearchMatch[] => {
      try {
        clearHighlights();

        if (!query) return [];

        const allMatches: SearchMatch[] = [];
        const textNodes = getTextNodes(document.body);
        const searchRegex = new RegExp(
          query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          "gi",
        );

        textNodes.forEach((textNode) => {
          try {
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
                try {
                  // Add a temporary data attribute to help with highlighting
                  if (!parentElement.dataset.searchMatches) {
                    parentElement.dataset.searchMatches = JSON.stringify([
                      range,
                    ]);
                  } else {
                    const existing = JSON.parse(
                      parentElement.dataset.searchMatches,
                    );
                    existing.push(range);
                    parentElement.dataset.searchMatches =
                      JSON.stringify(existing);
                  }

                  // For navigation, we'll use the parent element
                  allMatches.push({
                    element: parentElement,
                    textNode: textNode,
                    startOffset: range.start,
                    endOffset: range.end,
                  });
                } catch (error) {
                  console.warn("Error processing CodeMirror match:", error);
                }
              });

              // Apply highlighting via CSS
              try {
                parentElement.classList.add("cm-search-match");
              } catch (error) {
                console.warn("Error adding CodeMirror highlight class:", error);
              }
            } else {
              // For non-CodeMirror content, use the original approach
              try {
                const fragment = document.createDocumentFragment();
                let lastEnd = 0;

                matches.forEach((range) => {
                  try {
                    // Add text before the match
                    if (range.start > lastEnd) {
                      fragment.appendChild(
                        document.createTextNode(
                          text.substring(lastEnd, range.start),
                        ),
                      );
                    }

                    // Add the highlighted match
                    const highlightSpan = document.createElement("span");
                    highlightSpan.className = "search-highlight";
                    highlightSpan.textContent = text.substring(
                      range.start,
                      range.end,
                    );
                    fragment.appendChild(highlightSpan);

                    allMatches.push({
                      element: highlightSpan,
                      textNode: textNode,
                      startOffset: range.start,
                      endOffset: range.end,
                    });

                    lastEnd = range.end;
                  } catch (error) {
                    console.warn("Error creating highlight span:", error);
                  }
                });

                // Add any remaining text after the last match
                if (lastEnd < text.length) {
                  fragment.appendChild(
                    document.createTextNode(text.substring(lastEnd)),
                  );
                }

                // Replace the original text node with the fragment
                parent.replaceChild(fragment, textNode);
              } catch (error) {
                console.warn(
                  "Error replacing text node with highlighted content:",
                  error,
                );
              }
            }
          } catch (error) {
            console.warn("Error processing text node:", error);
          }
        });

        return allMatches;
      } catch (error) {
        console.error("Error in highlightMatches:", error);
        return [];
      }
    },
    [getTextNodes, clearHighlights],
  );

  // Navigate to a specific match
  const navigateToMatch = useCallback(
    (index: number) => {
      try {
        if (matches.length === 0) return;

        // Remove current highlight from all matches
        try {
          document.querySelectorAll(".search-highlight").forEach((el) => {
            try {
              el.classList.remove("search-highlight-current");
            } catch (error) {
              console.warn("Error removing highlight class:", error);
            }
          });
        } catch (error) {
          console.warn("Error querying search highlights:", error);
        }

        // Remove current highlight from CodeMirror matches
        try {
          document.querySelectorAll(".cm-search-match").forEach((el) => {
            try {
              el.classList.remove("cm-search-match-current");
            } catch (error) {
              console.warn("Error removing CodeMirror highlight class:", error);
            }
          });
        } catch (error) {
          console.warn("Error querying CodeMirror matches:", error);
        }

        const match = matches[index];
        if (match && match.element) {
          try {
            // Check if this is a CodeMirror match
            if (match.element.classList.contains("cm-search-match")) {
              match.element.classList.add("cm-search-match-current");
            } else {
              match.element.classList.add("search-highlight-current");
            }
          } catch (error) {
            console.warn("Error adding current highlight class:", error);
          }

          try {
            match.element.scrollIntoView({
              behavior: "smooth",
              block: "nearest",
            });
          } catch (error) {
            console.warn("Error scrolling to match:", error);
          }
        }
      } catch (error) {
        console.error("Error in navigateToMatch:", error);
      }
    },
    [matches],
  );

  // Search handler with debounce
  const handleSearch = useCallback(
    (query: string) => {
      try {
        setSearchQuery(query);

        // Clear existing timeout
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
        }

        // Debounce the search
        searchTimeoutRef.current = setTimeout(() => {
          try {
            const foundMatches = highlightMatches(query);
            setMatches(foundMatches);

            if (foundMatches.length > 0) {
              setCurrentMatchIndex(0);
              navigateToMatch(0);
            } else {
              setCurrentMatchIndex(-1);
            }
          } catch (error) {
            console.error("Error in debounced search:", error);
            setMatches([]);
            setCurrentMatchIndex(-1);
          }
        }, 150); // 150ms debounce
      } catch (error) {
        console.error("Error in handleSearch:", error);
        setMatches([]);
        setCurrentMatchIndex(-1);
      }
    },
    [highlightMatches, navigateToMatch],
  );

  // Navigation handlers
  const navigateNext = useCallback(() => {
    try {
      if (matches.length === 0) return;
      const nextIndex = (currentMatchIndex + 1) % matches.length;
      setCurrentMatchIndex(nextIndex);
      navigateToMatch(nextIndex);
    } catch (error) {
      console.error("Error in navigateNext:", error);
    }
  }, [currentMatchIndex, matches.length, navigateToMatch]);

  const navigatePrevious = useCallback(() => {
    try {
      if (matches.length === 0) return;
      const prevIndex =
        currentMatchIndex === 0 ? matches.length - 1 : currentMatchIndex - 1;
      setCurrentMatchIndex(prevIndex);
      navigateToMatch(prevIndex);
    } catch (error) {
      console.error("Error in navigatePrevious:", error);
    }
  }, [currentMatchIndex, matches.length, navigateToMatch]);

  // Close search
  const closeSearch = useCallback(() => {
    try {
      setIsOpen(false);
      setSearchQuery("");
      setMatches([]);
      setCurrentMatchIndex(-1);
      clearHighlights();

      // Clear any pending search
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    } catch (error) {
      console.error("Error in closeSearch:", error);
    }
  }, [clearHighlights]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      try {
        // Open search with Cmd/Ctrl + F
        if ((e.metaKey || e.ctrlKey) && e.key === "f") {
          // Always prevent default and open our global search
          e.preventDefault();
          setIsOpen(true);
          setTimeout(() => {
            try {
              inputRef.current?.focus();
            } catch (error) {
              console.warn("Error focusing input:", error);
            }
          }, 100);
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
      } catch (error) {
        console.error("Error in keyboard handler:", error);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeSearch, navigateNext, navigatePrevious]);

  if (!isOpen) return null;

  return (
    <div className="global-search-bar bg-popover border-border fixed top-4 right-4 z-50 flex min-w-96 items-center gap-2 rounded-lg border-2 p-3 shadow-2xl backdrop-blur-sm">
      <Input
        ref={inputRef}
        type="text"
        placeholder="Search..."
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        className="border-input bg-background/80 focus-visible:ring-ring w-64 border focus-visible:ring-1"
      />

      <div className="flex w-32 items-center justify-end gap-2">
        {searchQuery && matches.length === 0 && (
          <span className="text-muted-foreground text-sm whitespace-nowrap">
            No results
          </span>
        )}

        {matches.length > 0 && (
          <div className="text-muted-foreground flex items-center gap-1 text-sm">
            <span className="font-medium whitespace-nowrap">
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
      </div>

      <button
        onClick={closeSearch}
        className="hover:bg-accent flex-shrink-0 rounded p-1 transition-colors"
        title="Close (Esc)"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
