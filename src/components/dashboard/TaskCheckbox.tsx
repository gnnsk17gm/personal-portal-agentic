"use client";

import { useTransition } from "react";
import { toggleTaskAction } from "@/app/actions";

interface TaskCheckboxProps {
  id: number;
  title: string;
  done: boolean;
}

export default function TaskCheckbox({ id, title, done }: TaskCheckboxProps) {
  const [pending, startTransition] = useTransition();
  return (
    <input
      type="checkbox"
      checked={done}
      disabled={pending}
      aria-label={`${title} を${done ? "未完了に戻す" : "完了にする"}`}
      onChange={() => startTransition(() => toggleTaskAction(id))}
      className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-indigo-600"
    />
  );
}
