"use client";

import React, { useState, FormEvent, useRef } from "react";
export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [cloudinaryUrl, setCloudinaryUrl] = useState<string | null>(null);
  const [externalLinks, setExternalLinks] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const resetState = () => {
    setAnalysis(null);
    setCloudinaryUrl(null);
    setExternalLinks([]);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0] || null;
    if (f) setFile(f);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleRemoveFile = () => setFile(null);

  const handleCopyLink = async (url: string | null) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      
    } catch (err) {
      console.error("copy failed", err);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file || !jobDescription.trim()) {
      setError("Please provide both a resume and a job description.");
      return;
    }

    setLoading(true);
    resetState();

    try {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("jd", jobDescription);

      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Analysis failed");
      }

      const data = await res.json();
      setAnalysis(data.analysis);
      setCloudinaryUrl(data.cloudinaryUrl);
      setExternalLinks(data.externalLinks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return "bg-gradient-to-r from-emerald-500 to-green-600";
    if (score >= 60) return "bg-gradient-to-r from-yellow-400 to-yellow-600";
    return "bg-gradient-to-r from-red-400 to-pink-600";
  };

  const ScoreBadge = ({ score }: { score: number }) => (
    <div className={`inline-flex items-baseline gap-2 px-4 py-2 rounded-full text-white font-semibold shadow-sm ${getScoreGradient(score)}`}>
      <span className="text-lg">{score}</span>
      <span className="text-sm opacity-80">/100</span>
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4 z-30">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">Resume Analyzer</h1>
          <p className="mt-2 text-sm text-gray-600">Concise, actionable feedback to help your resume pass ATS and impress recruiters.</p>
        </header>

        <section className="bg-white rounded-2xl shadow-md p-6 md:p-8 mb-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="col-span-1 md:col-span-1 flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 hover:border-gray-300 transition-colors"
                aria-label="Drop area for resume"
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="sr-only"
                />

                <div className="w-full text-center">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M12 3v12" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M8 7l4-4 4 4" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-sm text-gray-700 font-medium">Upload or drop resume</span>
                  </button>

                  {file ? (
                    <div className="mt-3 w-full">
                      <div className="bg-white p-1 rounded-md border w-full overflow-hidden ">
                        {/* FILE INFO */}
                        <div className="mb-3 w-full">
                          <p
                            className="text-sm font-medium text-gray-800 leading-relaxed max-w-full"
                            style={{
                             
                              wordBreak: "break-word",      
                              overflowWrap: "anywhere",       
                              wordWrap: "break-word",
                            }}
                          >
                            {file.name}
                          </p>

                          <p className="text-xs text-gray-500 mt-1">
                            {(file.size / 1024).toFixed(1)} KB • {file.type || "unknown"}
                          </p>
                        </div>

                        
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <button
                            type="button"
                            onClick={handleRemoveFile}
                            className="text-sm text-red-600 hover:underline self-start"
                            aria-label="Remove uploaded file"
                          >
                            Remove
                          </button>

                         
                          {cloudinaryUrl && (
                            <div className="flex gap-1   mt-2 sm:mt-0 sm:ml-4 mr-4 ">
                              <button
                                type="button"
                                onClick={() => handleCopyLink(cloudinaryUrl)}
                                className="text-sm px-3 py-1 border rounded hover:bg-gray-50"
                              >
                                Copy link
                              </button>
                              <a
                                href={cloudinaryUrl}
                                download
                                className="text-sm px-3 py-3 border rounded hover:bg-gray-50"
                              >
                                Download
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-gray-500">Supported: PDF, DOC, DOCX. Max 5 MB recommended.</p>
                  )}


                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Job Description</label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={8}
                  placeholder="Paste the job description here..."
                  disabled={loading}
                  className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 placeholder-gray-400 resize-none"
                />

                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={loading || !file || !jobDescription.trim()}
                    className="inline-flex items-center gap-3 px-5 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold shadow-md hover:scale-[1.02] transition-transform disabled:opacity-60 disabled:cursor-not-allowed"
                    aria-busy={loading}
                  >
                    {loading ? (
                      <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={2} className="opacity-20" />
                        <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                      </svg>
                    ) : null}
                    <span>{loading ? "Analyzing" : "Analyze Resume"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setJobDescription("");
                      resetState();
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Reset
                  </button>

                  <div className="ml-auto text-xs text-gray-500">Tip: Use clear JD bullets for best results.</div>
                </div>
              </div>
            </div>

            {error && (
              <div role="alert" className="mt-2 p-3 bg-red-50 border-l-4 border-red-400 rounded">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </form>
        </section>

      
        {analysis && (
          <section className="grid grid-cols-1 gap-6">
            <div className="flex items-center justify-between bg-white p-5 rounded-xl shadow-sm">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Match overview</h2>
                <p className="text-sm text-gray-500">Aggregated score and model consensus</p>
              </div>
              <div className="flex items-center gap-4">
                <ScoreBadge score={analysis.score || 0} />
                {analysis.llm_count && <div className="text-sm text-gray-500">Consensus: {analysis.llm_count} models</div>}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Detailed breakdown</h3>
                <dl className="space-y-4">
                  {analysis.breakdown && Object.entries(analysis.breakdown).map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-xs text-gray-500 flex items-center justify-between">
                        <span className="capitalize">{k}</span>
                        <span className="font-semibold text-gray-700">{Number(v)}%</span>
                      </dt>
                      <dd className="mt-2">
                        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                          <div
                            className={`h-full ${Number(v) >= 80 ? "bg-emerald-500" : Number(v) >= 60 ? "bg-yellow-400" : "bg-red-400"}`}
                            style={{ width: `${Number(v)}%` }}
                            role="progressbar"
                            aria-valuenow={Number(v)}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          />
                        </div>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm space-y-4">
                {analysis.strengths && (
                  <div>
                    <h4 className="text-sm font-semibold text-green-700 mb-3">Key strengths</h4>
                    <ul className="space-y-2">
                      {analysis.strengths.map((s: string, i: number) => (
                        <li key={i} className="text-sm bg-green-50 p-3 rounded-md">{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.weaknesses && (
                  <div>
                    <h4 className="text-sm font-semibold text-orange-700 mb-3">Areas to improve</h4>
                    <ul className="space-y-2">
                      {analysis.weaknesses.map((w: string, i: number) => (
                        <li key={i} className="text-sm bg-orange-50 p-3 rounded-md">{w}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {analysis.suggested_keywords && (
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Suggested keywords (ATS)</h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.suggested_keywords.map((kw: string, i: number) => (
                    <span key={i} className="text-xs px-3 py-1 border rounded-full bg-gray-50">{kw}</span>
                  ))}
                </div>
              </div>
            )}

            {analysis.highlight_pairs && analysis.highlight_pairs.length > 0 && (
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Key matches</h3>
                <div className="space-y-4">
                  {analysis.highlight_pairs.map((pair: any, idx: number) => (
                    <article key={idx} className="p-4 border rounded-md">
                      <p className="text-xs text-gray-500 font-semibold">Job requirement</p>
                      <p className="mt-1 text-sm text-gray-800 italic">{pair.jd_phrase}</p>
                      <hr className="my-3" />
                      <p className="text-xs text-gray-500 font-semibold">Resume excerpt</p>
                      <p className="mt-1 text-sm text-gray-800 italic">{pair.resume_excerpt}</p>
                    </article>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              {externalLinks.length > 0 && (
                <div className="bg-white p-4 rounded-xl shadow-sm w-full md:w-1/2">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">External links analyzed</h4>
                  <ul className="text-sm space-y-2">
                    {externalLinks.map((l, i) => (
                      <li key={i} className="truncate">
                        <a href={l} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline break-words">{l}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {cloudinaryUrl && (
                <div className="bg-white p-4 rounded-xl shadow-sm w-full md:w-1/2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Uploaded resume</p>
                    <a href={cloudinaryUrl} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 hover:underline">Open</a>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleCopyLink(cloudinaryUrl)} className="text-sm px-3 py-2 border rounded hover:bg-gray-50">Copy link</button>
                    <a href={cloudinaryUrl} download className="text-sm px-3 py-2 border rounded hover:bg-gray-50">Download</a>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
