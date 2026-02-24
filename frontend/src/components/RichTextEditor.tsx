import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { useEffect } from "react";
import { RichTextToolbar } from "./RichTextToolbar";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  editable: boolean;
  placeholder?: string;
}

export const RichTextEditor = ({
  content,
  onChange,
  editable,
  placeholder = "Écrivez ici...",
}: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: !editable,
        HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
      }),
      Image,
      Youtube.configure({
        inline: false,
        ccLanguage: "fr",
      }),
      Placeholder.configure({ placeholder }),
      Underline,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync editable prop changes
  useEffect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  // Sync content from outside (e.g. when switching skills)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [editor, content]);

  if (!editor) return null;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {editable && <RichTextToolbar editor={editor} />}
      <div className="flex-1 overflow-y-auto">
        <EditorContent
          editor={editor}
          className="prose dark:prose-invert max-w-none"
        />
      </div>
    </div>
  );
};
