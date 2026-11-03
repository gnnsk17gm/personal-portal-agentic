import NoteCreateForm from "@/components/notes/NoteCreateForm";
import NoteList from "@/components/notes/NoteList";
import NoteSearchBar from "@/components/notes/NoteSearchBar";
import { searchNotes } from "@/services/searchService";

export const dynamic = "force-dynamic";

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = (await searchParams).q;
  const query = typeof raw === "string" ? raw.trim() : "";
  const notes = searchNotes(query);

  return (
    <div className="space-y-6">
      <NoteCreateForm />
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 space-y-3">
          <h2 className="text-base font-semibold text-slate-900">
            ノート一覧（{notes.length}件）
            {query ? <span className="ml-2 text-sm font-normal text-slate-500">「{query}」で検索中</span> : null}
          </h2>
          <NoteSearchBar query={query} />
        </div>
        <NoteList notes={notes} searching={query.length > 0} />
      </section>
    </div>
  );
}
