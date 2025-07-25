"use client";

import CodeMirror from "@uiw/react-codemirror";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { json, jsonParseLinter } from "@codemirror/lang-json";
import { yaml } from "@codemirror/lang-yaml";
import { xml } from "@codemirror/lang-xml";
import { languages } from "@codemirror/language-data";
import { linter, Diagnostic } from "@codemirror/lint";
import { hyperEditorTheme } from "./editor-theme";
import { autocompletion } from "@codemirror/autocomplete";
import { searchKeymap } from "@codemirror/search";
import { keymap } from "@codemirror/view";
import { bracketMatching } from "@codemirror/language";
import { closeBrackets } from "@codemirror/autocomplete";
import { highlightSelectionMatches } from "@codemirror/search";
import { ComponentErrorBoundary } from "@/components/error-boundary";
import { MinimalErrorFallback } from "@/components/error-boundary/error-fallbacks";

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
}

// YAML linter function
const yamlLinter = linter((view) => {
  const diagnostics: Diagnostic[] = [];
  const content = view.state.doc.toString();
  
  try {
    // Basic YAML validation - check for common issues
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      // Check for tabs (YAML doesn't allow tabs)
      if (line.includes('\t')) {
        diagnostics.push({
          from: view.state.doc.line(index + 1).from,
          to: view.state.doc.line(index + 1).to,
          severity: "error" as const,
          message: "YAML does not allow tab characters for indentation. Use spaces instead."
        });
      }
      
      // Check for inconsistent indentation
      const indentMatch = line.match(/^(\s*)/);
      if (indentMatch && indentMatch[1].length % 2 !== 0 && line.trim()) {
        diagnostics.push({
          from: view.state.doc.line(index + 1).from,
          to: view.state.doc.line(index + 1).from + indentMatch[1].length,
          severity: "warning" as const,
          message: "Inconsistent indentation. YAML typically uses 2-space indentation."
        });
      }
    });
  } catch {
    // Add generic YAML error
    diagnostics.push({
      from: 0,
      to: content.length,
      severity: "error" as const,
      message: "Invalid YAML syntax"
    });
  }
  
  return diagnostics;
});

// XML linter function
const xmlLinter = linter((view) => {
  const diagnostics: Diagnostic[] = [];
  const content = view.state.doc.toString();
  
  try {
    // Basic XML validation
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(content, "text/xml");
    const parseError = xmlDoc.getElementsByTagName("parsererror")[0];
    
    if (parseError) {
      diagnostics.push({
        from: 0,
        to: content.length,
        severity: "error" as const,
        message: "Invalid XML syntax: " + parseError.textContent
      });
    }
  } catch {
    diagnostics.push({
      from: 0,
      to: content.length,
      severity: "error" as const,
      message: "XML parsing error"
    });
  }
  
  return diagnostics;
});

const EditorComponent = ({ value, onChange, language = "Text" }: EditorProps) => {
  // Get language-specific extensions
  const getLanguageExtensions = () => {
    const baseExtensions = [
      autocompletion(),
      bracketMatching(),
      closeBrackets(),
      highlightSelectionMatches(),
      keymap.of(searchKeymap),
    ];

    switch (language.toLowerCase()) {
      case "javascript":
      case "js":
        return [
          ...baseExtensions,
          javascript(),
        ];
      
      case "python":
      case "py":
        return [
          ...baseExtensions,
          python(),
        ];
      
      case "json":
        return [
          ...baseExtensions,
          json(),
          linter(jsonParseLinter()),
        ];
      
      case "yaml":
      case "yml":
        return [
          ...baseExtensions,
          yaml(),
          yamlLinter,
        ];
      
      case "xml":
        return [
          ...baseExtensions,
          xml(),
          xmlLinter,
        ];
      
      case "markdown":
      case "md":
        return [
          ...baseExtensions,
          markdown({ base: markdownLanguage, codeLanguages: languages }),
        ];
      
      default:
        // For "Text" and any unrecognized languages, use basic markdown
        return [
          ...baseExtensions,
          markdown({ base: markdownLanguage, codeLanguages: languages }),
        ];
    }
  };

  return (
    <CodeMirror
      value={value}
      height="100%"
      theme={hyperEditorTheme}
      extensions={getLanguageExtensions()}
      onChange={onChange}
      className="h-full"
      basicSetup={{
        lineNumbers: true,
        foldGutter: true,
        dropCursor: false,
        allowMultipleSelections: true,
        indentOnInput: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: true,
        highlightSelectionMatches: true,
        searchKeymap: true,
      }}
    />
  );
};

// Export the Editor wrapped in an error boundary
export const Editor = (props: EditorProps) => (
  <ComponentErrorBoundary
    fallback={<MinimalErrorFallback />}
    resetKeys={[props.language || 'text', props.value]}
  >
    <EditorComponent {...props} />
  </ComponentErrorBoundary>
);