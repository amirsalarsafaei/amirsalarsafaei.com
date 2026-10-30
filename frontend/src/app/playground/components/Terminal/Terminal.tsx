import {
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { TerminalController } from "./TerminalController";
import { Command } from "./Command";
import { applySuggestion, Suggestion } from "./completion";
import { onLaptopKey, type LaptopKeyDetail } from "../laptopInput";
import "./command.scss";

type TerminalProps = {
  focused: boolean;
};

const MAX_SUGGESTIONS = 8;

function suggestionIcon(kind: Suggestion["kind"]): string {
  switch (kind) {
    case "command":
      return "›";
    case "alias":
      return "≈";
    case "history":
      return "↺";
    case "option":
      return "−";
    case "variable":
      return "$";
    case "directory":
      return "▸";
    default:
      return "·";
  }
}

export function Terminal({ focused }: TerminalProps) {
  const [controller] = useState<TerminalController>(() => new TerminalController());
  const [input, setInput] = useState<string>("");
  const [caret, setCaret] = useState<number>(0);
  const [selected, setSelected] = useState<number>(0);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [reverseIndex, setReverseIndex] = useState<number | null>(null);
  const [tick, setTick] = useState<number>(0);

  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  // Mirror of the controlled input so a burst of injected 3D keypresses sees
  // the previous character even before React has committed the next render.
  const lineRef = useRef({ input, caret });
  lineRef.current = { input, caret };
  const laptopKeyHandler = useRef<(detail: LaptopKeyDetail) => void>(() => {});

  const exited = controller.isExited();
  const completion = useMemo(
    () => controller.getSuggestions(input, caret),
    [controller, input, caret],
  );
  const visibleSuggestions = completion.suggestions.slice(0, MAX_SUGGESTIONS);
  const suggestionsOpen = !dismissed && !exited && visibleSuggestions.length > 0;
  const safeSelected = Math.min(selected, Math.max(0, visibleSuggestions.length - 1));
  const ghost =
    !dismissed &&
    !exited &&
    input.length > 0 &&
    input.length < 64 &&
    caret === input.length &&
    selected === 0
      ? completion.ghost
      : "";

  const scrollToBottom = () => {
    const element = listRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  };

  const focusInput = () => {
    if (inputRef.current) inputRef.current.focus({ preventScroll: true });
  };

  useEffect(() => {
    if (focused) focusInput();
    else inputRef.current?.blur();
  }, [focused]);

  useEffect(() => {
    scrollToBottom();
  }, [tick, suggestionsOpen, visibleSuggestions.length]);

  useEffect(() => {
    setSelected(0);
  }, [input, caret]);

  const setLine = (value: string, nextCaret?: number) => {
    const position = nextCaret === undefined ? value.length : nextCaret;
    lineRef.current = { input: value, caret: position };
    setInput(value);
    setCaret(position);
    setDismissed(false);
    requestAnimationFrame(() => {
      const element = inputRef.current;
      if (element) {
        element.focus({ preventScroll: true });
        element.setSelectionRange(position, position);
      }
    });
  };

  const syncCaret = () => {
    const element = inputRef.current;
    if (element && element.selectionStart !== null) {
      setCaret(element.selectionStart);
    }
  };

  const resetSearch = () => {
    setSearchQuery(null);
    setReverseIndex(null);
  };

  const navigateHistory = (direction: 1 | -1) => {
    const history = controller.getHistory();
    if (history.length === 0) return;
    if (historyIndex === null) {
      if (direction === -1) {
        setDraft(input);
        setHistoryIndex(history.length - 1);
        setLine(history[history.length - 1]);
      }
      return;
    }
    const next = historyIndex + direction;
    if (next < 0) {
      setHistoryIndex(0);
      setLine(history[0]);
      return;
    }
    if (next >= history.length) {
      setHistoryIndex(null);
      setLine(draft);
      return;
    }
    setHistoryIndex(next);
    setLine(history[next]);
  };

  const accept = (suggestion?: Suggestion) => {
    const chosen = suggestion ?? visibleSuggestions[safeSelected];
    if (!chosen) return;
    const applied = applySuggestion(input, completion, chosen);
    setLine(applied.line, applied.caret);
    setSelected(0);
  };

  const reverseSearch = () => {
    const history = controller.getHistory();
    if (history.length === 0) return;
    const query = searchQuery ?? input;
    let index =
      reverseIndex === null ? history.length - 1 : reverseIndex - 1;
    while (index >= 0 && history[index].indexOf(query) === -1) index--;
    if (index < 0) return;
    setSearchQuery(query);
    setReverseIndex(index);
    setLine(history[index], history[index].length);
  };

  const deleteWordBeforeCaret = () => {
    const { input: value, caret: position } = lineRef.current;
    const before = value.slice(0, position);
    const after = value.slice(position);
    const trimmed = before.replace(/\s+$/, "");
    const boundary = Math.max(
      trimmed.lastIndexOf(" "),
      trimmed.lastIndexOf("/"),
    );
    const next = before.slice(0, boundary + 1) + after;
    setLine(next, boundary + 1);
  };

  const restart = () => {
    controller.reset();
    setTick((value) => value + 1);
    setLine("");
    resetSearch();
    setHistoryIndex(null);
  };

  const submit = () => {
    const current = lineRef.current.input;
    if (exited) {
      restart();
      return;
    }
    if (current.trim() === "") {
      setLine("");
      return;
    }
    controller.runCommand(current);
    setTick((value) => value + 1);
    setLine("");
    setHistoryIndex(null);
    resetSearch();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const mod = event.ctrlKey || event.metaKey;
    const key = event.key;

    if (key === "Enter") {
      event.preventDefault();
      submit();
      return;
    }

    if (key === "Tab") {
      event.preventDefault();
      if (suggestionsOpen) accept();
      return;
    }

    if (key === "Escape") {
      event.preventDefault();
      setDismissed(true);
      return;
    }

    if (key === "ArrowUp") {
      event.preventDefault();
      resetSearch();
      if (suggestionsOpen) {
        const count = visibleSuggestions.length;
        setSelected((value) => (value - 1 + count) % count);
      } else {
        navigateHistory(-1);
      }
      return;
    }

    if (key === "ArrowDown") {
      event.preventDefault();
      resetSearch();
      if (suggestionsOpen) {
        const count = visibleSuggestions.length;
        setSelected((value) => (value + 1) % count);
      } else {
        navigateHistory(1);
      }
      return;
    }

    if (key === "ArrowLeft" || key === "ArrowRight") {
      resetSearch();
      requestAnimationFrame(syncCaret);
      return;
    }

    if (mod) {
      const lower = key.toLowerCase();
      if (lower === "l") {
        event.preventDefault();
        controller.clear();
        setTick((value) => value + 1);
        setLine("");
        return;
      }
      if (lower === "c") {
        event.preventDefault();
        if (input !== "") controller.interrupt(input);
        setTick((value) => value + 1);
        setLine("");
        resetSearch();
        return;
      }
      if (lower === "u") {
        event.preventDefault();
        setLine(input.slice(caret), 0);
        return;
      }
      if (lower === "k") {
        event.preventDefault();
        setLine(input.slice(0, caret), caret);
        return;
      }
      if (lower === "w") {
        event.preventDefault();
        deleteWordBeforeCaret();
        return;
      }
      if (lower === "a") {
        event.preventDefault();
        setCaret(0);
        requestAnimationFrame(() => inputRef.current?.setSelectionRange(0, 0));
        return;
      }
      if (lower === "e") {
        event.preventDefault();
        setCaret(input.length);
        requestAnimationFrame(() =>
          inputRef.current?.setSelectionRange(input.length, input.length),
        );
        return;
      }
      if (lower === "r") {
        event.preventDefault();
        reverseSearch();
        return;
      }
      if (lower === "d") {
        event.preventDefault();
        if (input === "") {
          controller.runCommand("exit");
          setTick((value) => value + 1);
          setLine("");
        }
        return;
      }
    }

    resetSearch();
  };

  const handleChange = (value: string, position: number) => {
    lineRef.current = { input: value, caret: position };
    setInput(value);
    setCaret(position);
    setDismissed(false);
    setHistoryIndex(null);
    resetSearch();
  };

  const selectionRange = () => {
    const element = inputRef.current;
    const current = lineRef.current;
    if (element && document.activeElement === element) {
      const start = element.selectionStart ?? current.caret;
      const end = element.selectionEnd ?? start;
      return [start, end] as const;
    }
    return [current.caret, current.caret] as const;
  };

  const replaceRange = (start: number, end: number, text: string) => {
    const current = lineRef.current.input;
    const next = current.slice(0, start) + text + current.slice(end);
    const nextCaret = start + text.length;
    lineRef.current = { input: next, caret: nextCaret };
    setLine(next, nextCaret);
  };

  const moveCaret = (position: number) => {
    const next = Math.max(0, Math.min(lineRef.current.input.length, position));
    lineRef.current = { ...lineRef.current, caret: next };
    setCaret(next);
    requestAnimationFrame(() => {
      const element = inputRef.current;
      if (!element) return;
      element.focus({ preventScroll: true });
      element.setSelectionRange(next, next);
    });
  };

  // Pressing a physical or 3D laptop key lands here. Physical typing is left
  // to the browser while the input is focused; everything else is injected.
  laptopKeyHandler.current = (detail) => {
    focusInput();
    if (exited && detail.key !== "Enter") return;

    if (detail.ctrl) {
      const lower = (detail.char ?? "").toLowerCase();
      if (lower === "l") {
        controller.clear();
        setTick((value) => value + 1);
        setLine("");
        return;
      }
      if (lower === "c") {
        if (lineRef.current.input !== "") controller.interrupt(lineRef.current.input);
        setTick((value) => value + 1);
        setLine("");
        resetSearch();
        return;
      }
      if (lower === "u") {
        const { input: value, caret: position } = lineRef.current;
        setLine(value.slice(position), 0);
        return;
      }
      if (lower === "k") {
        const { input: value, caret: position } = lineRef.current;
        setLine(value.slice(0, position), position);
        return;
      }
      if (lower === "w") {
        deleteWordBeforeCaret();
        return;
      }
      if (lower === "a") {
        moveCaret(0);
        return;
      }
      if (lower === "e") {
        moveCaret(lineRef.current.input.length);
        return;
      }
      if (lower === "r") {
        reverseSearch();
        return;
      }
      if (lower === "d") {
        if (lineRef.current.input === "") {
          controller.runCommand("exit");
          setTick((value) => value + 1);
          setLine("");
        }
        return;
      }
      return;
    }

    switch (detail.key) {
      case "Enter":
        submit();
        return;
      case "Tab":
        if (suggestionsOpen) accept();
        return;
      case "Escape":
        setDismissed(true);
        return;
      case "Backspace": {
        const [start, end] = selectionRange();
        if (start !== end) replaceRange(start, end, "");
        else if (start > 0) replaceRange(start - 1, start, "");
        return;
      }
      case "Delete": {
        const [start, end] = selectionRange();
        if (start !== end) replaceRange(start, end, "");
        else if (start < lineRef.current.input.length)
          replaceRange(start, start + 1, "");
        return;
      }
      case "ArrowLeft": {
        const [start, end] = selectionRange();
        moveCaret(start === end ? start - 1 : start);
        return;
      }
      case "ArrowRight": {
        const [start, end] = selectionRange();
        moveCaret(start === end ? end + 1 : end);
        return;
      }
      case "ArrowUp":
      case "ArrowDown": {
        resetSearch();
        const direction = detail.key === "ArrowUp" ? -1 : 1;
        if (suggestionsOpen) {
          const count = visibleSuggestions.length;
          setSelected((value) => (value + direction + count) % count);
        } else {
          navigateHistory(direction as 1 | -1);
        }
        return;
      }
      default:
        if (detail.char) {
          const [start, end] = selectionRange();
          replaceRange(start, end, detail.char);
        }
    }
  };

  useEffect(
    () => onLaptopKey((detail) => laptopKeyHandler.current(detail)),
    [],
  );

  const prompt = controller.getPrompt();

  return (
    <div className="commands" ref={listRef} onClick={focusInput}>
      {controller.getCommands().map((record) => (
        <Command key={record.id} {...record} />
      ))}

      {exited && (
        <div
          className="session-ended"
          role="button"
          tabIndex={0}
          title="Start a new session"
          onClick={restart}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") restart();
          }}
        >
          <div className="session-ended__title">Connection to laptop closed.</div>
          <div className="session-ended__hint">
            Press <kbd>Enter</kbd> to start a new session.
          </div>
        </div>
      )}

      <div className="cmd-line-wrap">
        {suggestionsOpen && (
          <div className="suggestions" role="listbox" aria-label="Completions">
            <div className="suggestions__header">
              <span>
                {completion.suggestions.length} suggestion
                {completion.suggestions.length === 1 ? "" : "s"}
              </span>
              <span className="suggestions__keys">
                <kbd>Tab</kbd> complete · <kbd>↑↓</kbd> browse · <kbd>Esc</kbd>{" "}
                dismiss
              </span>
            </div>
            {visibleSuggestions.map((suggestion, index) => (
              <button
                type="button"
                role="option"
                aria-selected={index === safeSelected}
                className={`suggestion${index === safeSelected ? " suggestion--selected" : ""}`}
                key={`${suggestion.kind}-${suggestion.value}-${index}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setSelected(index)}
                onClick={() => accept(suggestion)}
              >
                <span
                  className={`suggestion__icon suggestion__icon--${suggestion.kind}`}
                >
                  {suggestionIcon(suggestion.kind)}
                </span>
                <span className="suggestion__label">{suggestion.label}</span>
                {suggestion.hint && (
                  <span className="suggestion__hint">{suggestion.hint}</span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="cmd-input-line">
          <span className="prompt">
            <span className="prompt__user">{prompt.user}</span>
            <span className="prompt__dim">@</span>
            <span className="prompt__host">{prompt.host}</span>
            <span className="prompt__dim">:</span>
            <span className="prompt__path">{prompt.path}</span>
            <span className="prompt__symbol">$</span>
          </span>
          <div
            className="cmd-input-wrapper"
            style={{ "--cursor-position": `${caret}` } as React.CSSProperties}
          >
            <input
              className="cmd-input"
              data-laptop-terminal=""
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              value={input}
              ref={inputRef}
              aria-label="Terminal input"
              onChange={(event) =>
                handleChange(
                  event.target.value,
                  event.target.selectionStart ?? event.target.value.length,
                )
              }
              onKeyDown={handleKeyDown}
              onKeyUp={syncCaret}
              onClick={syncCaret}
              onSelect={syncCaret}
            />
            {ghost && <span className="cmd-ghost">{ghost}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
