import { EditorView } from "@codemirror/view";
import { Extension } from "@codemirror/state";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";

export const hyperEditorTheme: Extension = [
  vscodeDark,
  EditorView.theme({
    "&": {
      fontSize: "var(--editor-font-size, 14px)",
      height: "100%",
    },
    ".cm-content": {
      padding: "16px",
      fontFamily: "var(--font-jetbrains-mono)",
    },
    ".cm-gutters": {
      backgroundColor: "hsl(var(--background))",
      color: "hsl(var(--muted-foreground))",
      border: "none",
      fontSize: "12px",
    },
    ".cm-lineNumbers": {
      minWidth: "48px",
      padding: "0 8px",
    },
    ".cm-line": {
      lineHeight: "1.6",
    },
    "&.cm-focused .cm-cursor": {
      borderLeftColor: "hsl(var(--primary))",
    },
    "&.cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor: "hsl(var(--primary) / 0.2)",
    },
    ".cm-activeLine": {
      backgroundColor: "hsl(var(--primary) / 0.05)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "hsl(var(--primary) / 0.1)",
    },
    // Hide keyboard shortcut hint boxes that show as white borders
    ".cm-button": {
      display: "none !important",
    },
    ".cm-textfield": {
      backgroundColor: "hsl(var(--background))",
      border: "1px solid hsl(var(--border))",
      color: "hsl(var(--foreground))",
    },
    ".cm-panel": {
      backgroundColor: "hsl(var(--background))",
      border: "1px solid hsl(var(--border))",
    },
  }),
];