import React, { useEffect, useRef } from "react";
import * as monaco from "monaco-editor";

// Register web workers natively for Vite local bundling and syntax compilation
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') {
      return new jsonWorker();
    }
    if (label === 'css' || label === 'less' || label === 'scss') {
      return new cssWorker();
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new htmlWorker();
    }
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker();
    }
    return new editorWorker();
  },
};

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
    if (!containerRef.current) return;

    // Clean container to prepare for fresh instance
    containerRef.current.innerHTML = "";

    const editor = monaco.editor.create(containerRef.current, {
      value: value || "",
      language: language === "javascript" ? "javascript" : language,
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

    // Sync content updates
    editor.onDidChangeModelContent(() => {
      if (onChange && !isSettingValueRef.current) {
        onChange(editor.getValue());
      }
    });

    return () => {
      editor.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Sync value changes from parent components
  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.getValue()) {
      isSettingValueRef.current = true;
      editorRef.current.setValue(value || "");
      isSettingValueRef.current = false;
    }
  }, [value]);

  // Sync editor theme changes (Dark vs Light)
  useEffect(() => {
    monaco.editor.setTheme(theme);
  }, [theme]);

  // Sync word wrap options
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ wordWrap });
    }
  }, [wordWrap]);

  const triggerUndo = () => {
    if (editorRef.current) {
      editorRef.current.trigger("editor-action", "undo");
    }
  };

  const triggerRedo = () => {
    if (editorRef.current) {
      editorRef.current.trigger("editor-action", "redo");
    }
  };

  const formatCode = () => {
    if (editorRef.current) {
      editorRef.current.trigger("editor-action", "editor.action.formatDocument");
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
      <div ref={containerRef} className="flex-1 w-full min-h-[350px]" style={{ height: "calc(100% - 38px)" }} />
    </div>
  );
};

export default MonacoEditor;
