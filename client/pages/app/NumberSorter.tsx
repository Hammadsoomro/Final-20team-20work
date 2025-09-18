import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";

export default function NumberSorter() {
  const { user } = useAuth();
  const [raw, setRaw] = useState("");

  const canUse = user?.role === "admin" || user?.role === "scrapper";
  if (!canUse)
    return <div className="text-sm text-muted-foreground">Access denied</div>;

  const stats = useMemo(() => {
    const lines = raw
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    function keyForLine(line: string) {
      const words = line.split(/\s+/).filter(Boolean);
      return words.slice(0, 15).join(" ").toLowerCase();
    }

    const byKey = new Map<string, string>();
    for (const line of lines) {
      const k = keyForLine(line);
      if (!byKey.has(k)) byKey.set(k, line);
    }

    const uniqByKey = Array.from(byKey.values());

    return {
      raw: lines.length,
      unique: uniqByKey.length,
      dup: Math.max(lines.length - uniqByKey.length, 0),
      sorted: uniqByKey,
    };
  }, [raw]);

  async function addToQueue() {
    if (!stats.sorted.length) return;
    await fetch("/api/sorter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines: stats.sorted }),
    });
    setRaw("");
  }

  return (
    <div className="max-w-[1280px] h-full">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect width="16" height="20" x="4" y="2" rx="2" />
                <line x1="8" x2="16" y1="6" y2="6" />
                <line x1="16" x2="16" y1="14" y2="18" />
                <path d="M16 10h.01" />
                <path d="M12 10h.01" />
                <path d="M8 10h.01" />
                <path d="M12 14h.01" />
                <path d="M8 14h.01" />
                <path d="M12 18h.01" />
                <path d="M8 18h.01" />
              </svg>
            </div>
            <div className="ml-3">
              <h2 className="text-2xl font-bold text-gray-900">Number Sorter</h2>
              <p className="text-gray-600">Auto-sort and remove duplicates</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6" style={{ height: "502.75px" }}>
        <div className="col-span-1">
          <Card className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b p-4">
              <div className="flex items-center">
                <svg
                  className="h-5 w-5 text-gray-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect width="16" height="20" x="4" y="2" rx="2" />
                  <line x1="8" x2="16" y1="6" y2="6" />
                  <line x1="16" x2="16" y1="14" y2="18" />
                  <path d="M16 10h.01" />
                  <path d="M12 10h.01" />
                  <path d="M8 10h.01" />
                  <path d="M12 14h.01" />
                  <path d="M8 14h.01" />
                  <path d="M12 18h.01" />
                  <path d="M8 18h.01" />
                </svg>
                <span className="ml-3 font-medium text-gray-900">Number Input</span>
              </div>
              <div className="flex items-center text-sm text-gray-700">
                <span>Raw Lines: {stats.raw}</span>
                <span className="ml-4">Unique: {stats.unique}</span>
                <span className="ml-4">Duplicates: {stats.dup}</span>
              </div>
            </div>
            <div className="flex flex-1">
              <div className="flex flex-1 flex-col border-r">
                <div className="border-b bg-gray-50 p-3">
                  <h4 className="text-sm font-medium text-gray-700">Raw Input</h4>
                </div>
                <Textarea
                  placeholder="Enter numbers here, one per line..."
                  value={raw}
                  onChange={(e) => setRaw(e.target.value)}
                  className="h-full flex-1 font-mono"
                />
              </div>
              <div className="flex flex-1 flex-col">
                <div className="border-b bg-emerald-50 p-3">
                  <h4 className="text-sm font-medium text-emerald-700">Deduplicated (first 15 words)</h4>
                </div>
                <div className="flex-1 overflow-auto">
                  <div className="flex">
                    <div className="w-12 border-r bg-gray-50 p-2 text-right text-xs text-gray-500 font-mono">
                      {stats.sorted.map((_, i) => (
                        <div key={i}>{i + 1}</div>
                      ))}
                    </div>
                    <div className="flex-1 p-4 text-sm font-mono">
                      {stats.sorted.length ? (
                        stats.sorted.map((v, i) => (
                          <div key={i} className="text-gray-800">
                            {v}
                          </div>
                        ))
                      ) : (
                        <p className="italic text-gray-500">Unique numbers will appear here...</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t bg-gray-50 p-4">
              <div className="flex items-center justify-end text-xs text-gray-600">
                <Button variant="secondary" onClick={addToQueue}>
                  Add to Queue
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
