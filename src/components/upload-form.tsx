"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface LocationResult {
  location: string;
  staffCreated: number;
  staffMatched: number;
  rowsScored: number;
  error?: string;
}

interface UploadResponse {
  results?: LocationResult[];
  rowErrors?: { row: number; message: string }[];
  error?: string;
}

export function UploadForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<UploadResponse | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!formRef.current) return;
    setLoading(true);
    setResponse(null);

    const formData = new FormData(formRef.current);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data: UploadResponse = await res.json();
    setResponse(data);
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Monthly Report</CardTitle>
        </CardHeader>
        <CardContent>
          <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Upload the monthly &quot;Final Report&quot;-shaped export (.csv or .xlsx) — same
              columns as the existing Zenoti/HRMS consolidated report. Rows are automatically
              grouped by Center and scored per the current KPI config.
            </p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="period">Period</Label>
              <Input id="period" name="period" type="month" required className="max-w-xs" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="file">Report file</Label>
              <Input id="file" name="file" type="file" accept=".csv,.xlsx,.xls" required />
            </div>
            <Button type="submit" disabled={loading} className="w-fit">
              {loading ? "Processing..." : "Upload and calculate scores"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {response?.error && (
        <Card className="border-destructive">
          <CardContent className="pt-6 text-sm text-destructive">{response.error}</CardContent>
        </Card>
      )}

      {response?.results && response.results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {response.results.map((r) => (
              <div key={r.location} className="flex items-center justify-between border-b pb-2 text-sm last:border-0">
                <span className="font-medium">{r.location}</span>
                {r.error ? (
                  <Badge variant="destructive">{r.error}</Badge>
                ) : (
                  <span className="text-muted-foreground">
                    {r.rowsScored} scored · {r.staffCreated} new staff · {r.staffMatched} matched
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {response?.rowErrors && response.rowErrors.length > 0 && (
        <Card className="border-amber-400">
          <CardHeader>
            <CardTitle className="text-base">Skipped Rows</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
            {response.rowErrors.map((e, i) => (
              <div key={i}>
                Row {e.row}: {e.message}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
