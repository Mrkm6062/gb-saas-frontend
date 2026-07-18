import React, { useEffect, useRef } from "react";

const MonacoEditor = ({ 
  value, 
  onChange, 
  language = "html", 
  theme = "vs-dark", 
  wordWrap = "off",
  editorRefExposed // Optional ref to expose raw editor instance
}) => {
  const containerRef = useRef(null);
  const editorRef = useRef(null);
  const isSettingValueRef = useRef(false);

  useEffect(() => {
    // If monaco is already available, initialize right away
    if (window.monaco) {
      initEditor();
      return;
    }

    // Otherwise load the AMD loader dynamically
    const scriptId = "monaco-loader-script";
    let script = document.getElementById(scriptId);
    
    if (!script) {
      script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js";
      script.async = true;
      document.body.appendChild(script);
    }

    const checkAndInit = () => {
      if (window.require) {
        window.require.config({
          paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs" }
        });
        window.require(["vs/editor/editor.main"], () => {
          initEditor();
        });
      } else {
        setTimeout(checkAndInit, 50);
      }
    };

    script.addEventListener("load", checkAndInit);

    return () => {
      script.removeEventListener("load", checkAndInit);
      if (editorRef.current) {
        editorRef.current.dispose();
      }
    };

    function initEditor() {
      if (!containerRef.current) return;
      
      // Clear container loading state
      containerRef.current.innerHTML = "";

      const editor = window.monaco.editor.create(containerRef.current, {
        value: value || "",
        language: language,
        theme: theme,
        wordWrap: wordWrap,
        automaticLayout: true,
        minimap: { enabled: true },
        fontSize: 14,
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        roundedSelection: true,
        scrollbar: {
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10
        }
      });

      editorRef.current = editor;
      if (editorRefExposed) {
        editorRefExposed.current = editor;
      }

      // Track changes
      editor.onDidChangeModelContent(() => {
        if (onChange && !isSettingValueRef.current) {
          onChange(editor.getValue());
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Sync changes from parent value
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.getValue()) {
      isSettingValueRef.current = true;
      editorRef.current.setValue(value || "");
      isSettingValueRef.current = false;
    }
  }, [value]);

  // Sync theme
  useEffect(() => {
    if (window.monaco && editorRef.current) {
      window.monaco.editor.setTheme(theme);
    }
  }, [theme]);

  // Sync Word Wrap
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ wordWrap: wordWrap });
    }
  }, [wordWrap]);

  const triggerUndo = () => {
    if (editorRef.current) {
      editorRef.current.trigger("editor-interface", "undo");
    }
  };

  const triggerRedo = () => {
    if (editorRef.current) {
      editorRef.current.trigger("editor-interface", "redo");
    }
  };

  const formatCode = () => {
    if (editorRef.current) {
      editorRef.current.trigger("editor-interface", "editor.action.formatDocument");
    }
  };

  return (
    <div className="w-full h-full flex flex-col relative rounded-lg overflow-hidden border border-slate-700 bg-[#1e1e1e]">
      <div className="flex gap-2 p-2 bg-[#2d2d2d] text-white text-xs border-b border-slate-700 justify-end items-center shrink-0">
        <button 
          onClick={triggerUndo} 
          type="button"
          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded transition duration-150 active:scale-95"
        >
          Undo
        </button>
        <button 
          onClick={triggerRedo} 
          type="button"
          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded transition duration-150 active:scale-95"
        >
          Redo
        </button>
        <button 
          onClick={formatCode} 
          type="button"
          className="px-3 py-1 bg-[#76b900] hover:bg-[#639c00] text-white rounded font-bold transition duration-150 active:scale-95"
        >
          Format Code
        </button>
      </div>
      <div ref={containerRef} className="flex-1 w-full min-h-[350px]" style={{ height: "calc(100% - 38px)" }}>
        <div className="p-4 text-slate-400 text-sm animate-pulse">Loading code editor...</div>
      </div>
    </div>
  );
};

export default MonacoEditor;
