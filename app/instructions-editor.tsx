"use client";

import { useImperativeHandle, type Ref } from "react";
import { EditorContent, useEditor, useEditorState, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import { Bold, Heading2, Italic, List, ListOrdered, Redo2, Strikethrough, Underline, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export type InstructionsContent = string | JSONContent;

export type InstructionsEditorHandle = {
  read: () => { document: JSONContent; text: string } | undefined;
};

const extensions = [StarterKit.configure({ heading: { levels: [3] }, link: false })];

function asDocument(content?: InstructionsContent): JSONContent | undefined {
  if (typeof content !== "string") return content;
  return {
    type: "doc",
    content: content.split(/\r\n|\n|\r/).map((line) => ({
      type: "paragraph",
      content: line ? [{ type: "text", text: line }] : undefined,
    })),
  };
}

export function InstructionsEditor({
  initialContent,
  ref,
}: {
  initialContent?: InstructionsContent;
  ref: Ref<InstructionsEditorHandle>;
}) {
  const editor = useEditor({
    extensions,
    content: asDocument(initialContent),
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "recipe-instructions min-h-36 px-3 py-3 outline-none",
        role: "textbox",
        "aria-multiline": "true",
        "aria-required": "true",
        "aria-labelledby": "instructions-label",
        "data-placeholder": "Ghi các bước sơ chế và nấu món ăn",
      },
    },
  });

  useImperativeHandle(ref, () => ({
    read: () => editor ? { document: editor.getJSON(), text: editor.getText().trim() } : undefined,
  }), [editor]);

  const state = useEditorState({
    editor,
    selector: ({ editor }) => editor ? {
      heading: editor.isActive("heading"),
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      underline: editor.isActive("underline"),
      strike: editor.isActive("strike"),
      bulletList: editor.isActive("bulletList"),
      orderedList: editor.isActive("orderedList"),
      canUndo: editor.can().undo(),
      canRedo: editor.can().redo(),
    } : null,
  });

  const tools = [
    { label: "Tiêu đề", Icon: Heading2, active: state?.heading, run: () => editor?.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: "In đậm", Icon: Bold, active: state?.bold, run: () => editor?.chain().focus().toggleBold().run() },
    { label: "In nghiêng", Icon: Italic, active: state?.italic, run: () => editor?.chain().focus().toggleItalic().run() },
    { label: "Gạch chân", Icon: Underline, active: state?.underline, run: () => editor?.chain().focus().toggleUnderline().run() },
    { label: "Gạch ngang", Icon: Strikethrough, active: state?.strike, run: () => editor?.chain().focus().toggleStrike().run() },
    { label: "Danh sách dấu đầu dòng", Icon: List, active: state?.bulletList, run: () => editor?.chain().focus().toggleBulletList().run() },
    { label: "Danh sách đánh số", Icon: ListOrdered, active: state?.orderedList, run: () => editor?.chain().focus().toggleOrderedList().run() },
    { label: "Hoàn tác", Icon: Undo2, disabled: !state?.canUndo, run: () => editor?.chain().focus().undo().run() },
    { label: "Làm lại", Icon: Redo2, disabled: !state?.canRedo, run: () => editor?.chain().focus().redo().run() },
  ];

  return (
    <div className="grid min-w-0 gap-2">
      <p id="instructions-label" className="text-sm font-medium">Cách làm *</p>
      <div className="overflow-hidden rounded-lg border border-[#dedfd6] bg-[#fdfdf9] focus-within:border-[#55745b] focus-within:ring-2 focus-within:ring-[#55745b]/25">
        <div role="group" aria-label="Định dạng cách làm" className="flex flex-wrap gap-1 border-b border-[#dedfd6] bg-[#edf0e7] p-1.5">
          {tools.map(({ label, Icon, active, disabled, run }) => (
            <Button
              key={label}
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-[#34513d] hover:bg-[#dee8d8] aria-pressed:bg-[#d4e3cf]"
              aria-label={label}
              aria-pressed={active}
              title={label}
              disabled={!editor || disabled}
              onMouseDown={(event) => event.preventDefault()}
              onClick={run}
            >
              <Icon aria-hidden="true" />
            </Button>
          ))}
        </div>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export function InstructionsPreview({ content }: { content: InstructionsContent }) {
  return (
    <div className="recipe-instructions text-[#4d5d50]">
      {typeof content === "string"
        ? <p className="whitespace-pre-wrap">{content}</p>
        : renderToReactElement({ extensions, content })}
    </div>
  );
}
