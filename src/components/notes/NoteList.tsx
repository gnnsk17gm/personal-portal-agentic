import NoteDeleteButton from "@/components/notes/NoteDeleteButton";
import type { CapturePreview } from "@/types/portal";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
}

export default function NoteList({ notes, searching }: { notes: CapturePreview[]; searching: boolean }) {
  if (notes.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-slate-500">
        {searching ? "検索条件に一致するノートはありません" : "ノートはまだありません"}
      </p>
    );
  }
  return (
    <ul className="divide-y divide-slate-100">
      {notes.map((note) => (
        <li key={note.id} className="flex items-start justify-between gap-3 py-3">
          <div className="min-w-0 flex-1">
            <p className="whitespace-pre-wrap break-words text-sm text-slate-900">{note.content}</p>
            <time dateTime={note.createdAt} className="mt-1 block text-xs text-slate-500">
              {formatDate(note.createdAt)}
            </time>
          </div>
          <NoteDeleteButton id={note.id} />
        </li>
      ))}
    </ul>
  );
}
