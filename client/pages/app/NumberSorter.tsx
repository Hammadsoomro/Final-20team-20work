import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";

export default function NumberSorter() {
  const [raw, setRaw] = useState("");
  const nums = raw
    .split(/\s|,|\n|\r|\t/g)
    .map((n) => Number(n))
    .filter((n) => !Number.isNaN(n));
  const sorted = [...nums].sort((a, b) => a - b);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <h2 className="text-xl font-semibold mb-2">Input Numbers</h2>
        <Textarea
          placeholder="Enter numbers separated by comma or space"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
        />
      </div>
      <div>
        <h2 className="text-xl font-semibold mb-2">Sorted Result</h2>
        <div className="rounded-lg border p-3 min-h-[80px] text-sm">{sorted.join(", ")}</div>
      </div>
    </div>
  );
}
