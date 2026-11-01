"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteNoteAction } from "@/app/actions";

export default function NoteDeleteButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`ノート #${id} を削除`}
      onClick={() => startTransition(() => deleteNoteAction(id))}
      className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
    >
      <Trash2 size={16} aria-hidden="true" />
    </button>
  );
}
