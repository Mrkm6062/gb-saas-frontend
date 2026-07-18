import React, { useRef, useEffect } from "react";
import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";

// Configure loader to use the locally bundled monaco-editor instance, bypassing CDN script injections
loader.config({ monaco });

const MonacoEditor = ({ 
  value, 
  onChange, 
  language = "html", 
  theme = "vs-dark", 
  wordWrap = "off",
  editorRefExposed // Optional ref to expose raw editor instance
}) => {
  const editorRef = useRef(null);

  const handleEditorDidMount = (editor, monacoInstance) => {
    editorRef.current = editor;
    if (editorRefExposed) {
      editorRefExposed.current = editor;
    }
    // Apply wordwrap option initially
    editor.updateOptions({ wordWrap });
  };

  // Sync Word Wrap option if updated from parent controls
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({ wordWrap });
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
      <div className="flex-1 w-full min-h-[350px]" style={{ height: "calc(100% - 38px)" }}>
        <Editor
          height="100%"
          language={language === "javascript" ? "javascript" : language}
          theme={theme}
          value={value}
          onChange={onChange}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            roundedSelection: true,
            scrollbar: {
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10
            }
          }}
          loading={<div className="p-4 text-slate-400 text-sm animate-pulse">Loading code editor...</div>}
        />
      </div>
    </div>
  );
};

export default MonacoEditor;
