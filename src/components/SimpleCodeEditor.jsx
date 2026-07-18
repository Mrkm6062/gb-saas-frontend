import React, { useState, useEffect, useRef } from "react";
import { Copy, Clipboard, Trash2, RotateCcw, RotateCw, AlignLeft, WrapText, Check, AlertCircle } from "lucide-react";

// A simple, pure JS beautifier/formatter to clean up basic formatting
const formatCodeString = (code, language) => {
  if (!code) return "";
  try {
    if (language === "css") {
      return code
        .replace(/\s*([{\};,])\s*/g, "$1") // strip spaces around brackets & semicolons
        .replace(/{/g, " {\n  ")
        .replace(/;/g, ";\n  ")
        .replace(/;\s*}/g, "\n}")
        .replace(/}/g, "\n}\n")
        .replace(/\n\s*\n/g, "\n")
        .trim();
    } else if (language === "javascript" || language === "js") {
      return code
        .replace(/;\s*/g, ";\n")
        .replace(/{\s*/g, " {\n  ")
        .replace(/}\s*/g, "\n}\n")
        .replace(/\n\s*\n/g, "\n")
        .trim();
    } else if (language === "html") {
      // Basic HTML tag indentation formatter
      let formatted = "";
      let indent = 0;
      const tokens = code.split(/(<\/?[a-zA-Z0-9]+[^>]*>)/g);
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i].trim();
        if (!token) continue;
        if (token.startsWith("</")) {
          indent = Math.max(0, indent - 1);
          formatted += "  ".repeat(indent) + token + "\n";
        } else if (token.startsWith("<") && !token.endsWith("/>") && !token.startsWith("<!")) {
          // Check if self-closing tag or tag with no block container
          const isSelfClosing = token.match(/<(img|br|hr|input|link|meta|wbr)\b/i);
          formatted += "  ".repeat(indent) + token + "\n";
          if (!isSelfClosing) {
            indent++;
          }
        } else {
          formatted += "  ".repeat(indent) + token + "\n";
        }
      }
      return formatted.trim();
    }
  } catch (e) {
    console.error("Format error", e);
  }
  return code; // Fallback to raw code on error
};

const SimpleCodeEditor = ({
  value = "",
  onChange,
  language = "html",
  theme = "vs-dark", // vs-dark or vs-light
  placeholder = "",
  textareaRef,
  onFocus,
  onSaveShortcut // Bubbles up Ctrl+S save command
}) => {
  const [wordWrap, setWordWrap] = useState(true);
  const [copied, setCopied] = useState(false);
  
  // History buffer for Undo/Redo
  const [history, setHistory] = useState([value]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isUndoRedoActionRef = useRef(false);

  // Sync state changes with history manager (debounced to avoid massive arrays)
  useEffect(() => {
    if (isUndoRedoActionRef.current) {
      isUndoRedoActionRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      // If code is different from last state in history index, push it
      if (value !== history[historyIndex]) {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(value);
        
        // Limit history size to 100 entries
        if (newHistory.length > 100) {
          newHistory.shift();
        }
        
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      }
    }, 400); // 400ms typing idle pushes to history

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Dynamic Textarea Auto-Resizing
  useEffect(() => {
    const el = textareaRef?.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.max(350, el.scrollHeight) + "px";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleTextareaChange = (e) => {
    onChange(e.target.value);
  };

  // Keyboard shortcut actions (Undo/Redo, Tabs, Save)
  const handleKeyDown = (e) => {
    // 1. Tab insertion spaces
    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const targetValue = e.target.value;
      const newValue = targetValue.substring(0, start) + "  " + targetValue.substring(end);
      onChange(newValue);
      
      // Restore cursor position
      setTimeout(() => {
        if (textareaRef?.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }

    // 2. Ctrl + Z (Undo)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      handleUndo();
    }

    // 3. Ctrl + Y (Redo)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
      e.preventDefault();
      handleRedo();
    }

    // 4. Ctrl + S (Save)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      if (onSaveShortcut) {
        onSaveShortcut();
      }
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      isUndoRedoActionRef.current = true;
      setHistoryIndex(prevIdx);
      onChange(history[prevIdx]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      isUndoRedoActionRef.current = true;
      setHistoryIndex(nextIdx);
      onChange(history[nextIdx]);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const el = textareaRef?.current;
        if (el) {
          const start = el.selectionStart;
          const end = el.selectionEnd;
          const newValue = value.substring(0, start) + text + value.substring(end);
          onChange(newValue);
          
          setTimeout(() => {
            el.selectionStart = el.selectionEnd = start + text.length;
            el.focus();
          }, 0);
        } else {
          onChange(value + text);
        }
      }
    } catch (e) {
      alert("Please press Ctrl + V to paste. (Browser clipboard read permission blocked).");
    }
  };

  const handleClear = () => {
    if (window.confirm("Clear all code in this editor?")) {
      onChange("");
    }
  };

  const handleFormat = () => {
    const formatted = formatCodeString(value, language);
    onChange(formatted);
  };

  // Stats calculation
  const charCount = value.length;
  const lineCount = value ? value.split("\n").length : 0;

  const isDark = theme === "vs-dark";

  return (
    <div className={`w-full flex flex-col rounded-xl overflow-hidden border transition-all ${
      isDark ? "bg-slate-900 border-slate-700 text-slate-100" : "bg-white border-slate-200 text-slate-800"
    }`}>
      
      {/* Editor Header Toolbar Controls */}
      <div className={`px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b text-xs select-none ${
        isDark ? "bg-slate-800/80 border-slate-700" : "bg-slate-50 border-slate-200"
      }`}>
        
        {/* Undo/Redo & Actions group */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={handleCopy}
            type="button"
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-700/50 hover:bg-slate-700 text-white font-semibold transition"
            title="Copy Code"
          >
            {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
          
          <button
            onClick={handlePaste}
            type="button"
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-700/50 hover:bg-slate-700 text-white font-semibold transition"
            title="Paste Clipboard Content"
          >
            <Clipboard size={13} />
            <span>Paste</span>
          </button>

          <button
            onClick={handleClear}
            type="button"
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-700/50 hover:bg-red-900/50 text-white hover:text-red-300 font-semibold transition"
            title="Clear Editor"
          >
            <Trash2 size={13} />
            <span>Clear</span>
          </button>

          <div className="w-px h-4 bg-slate-700/80 mx-1"></div>

          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            type="button"
            className="p-1 rounded text-white disabled:opacity-40 hover:bg-slate-700/60 transition"
            title="Undo (Ctrl+Z)"
          >
            <RotateCcw size={14} />
          </button>

          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            type="button"
            className="p-1 rounded text-white disabled:opacity-40 hover:bg-slate-700/60 transition"
            title="Redo (Ctrl+Y)"
          >
            <RotateCw size={14} />
          </button>

          <button
            onClick={handleFormat}
            type="button"
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#76b900]/20 text-[#76b900] border border-[#76b900]/30 hover:bg-[#76b900]/35 font-bold transition"
            title="Format Spacing & Indentation"
          >
            <AlignLeft size={13} />
            <span>Format</span>
          </button>

          <button
            onClick={() => setWordWrap(!wordWrap)}
            type="button"
            className={`p-1 rounded transition border ${
              wordWrap 
                ? "bg-[#76b900]/10 border-[#76b900]/30 text-[#76b900]" 
                : "bg-slate-700/20 border-transparent text-slate-400 hover:text-white"
            }`}
            title="Toggle Word Wrap"
          >
            <WrapText size={14} />
          </button>
        </div>

        {/* Characters & Lines display */}
        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400">
          <span>LINES: <strong className={isDark ? "text-slate-200" : "text-slate-700"}>{lineCount}</strong></span>
          <span>CHARS: <strong className={isDark ? "text-slate-200" : "text-slate-700"}>{charCount}</strong></span>
        </div>

      </div>

      {/* Editor Body Textarea */}
      <div className="flex-1 w-full relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          onFocus={onFocus}
          placeholder={placeholder}
          spellCheck="false"
          wrap={wordWrap ? "soft" : "off"}
          style={{ lineHeight: 1.5 }}
          className={`w-full min-h-[350px] p-4 font-mono text-sm border-none focus:outline-none focus:ring-0 resize-none ${
            isDark 
              ? "bg-[#0b0f19] text-slate-200 placeholder-slate-600 focus:bg-[#080b12]" 
              : "bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:bg-white"
          }`}
        />
      </div>

    </div>
  );
};

export default SimpleCodeEditor;
