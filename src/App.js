import { useState, useRef } from "react";

const SYSTEM_PROMPT = `You are an expert SAP ABAP developer and code quality analyst. Your job is to review SAP ABAP code and simulate the results of ATC (ABAP Test Cockpit) Checks and Code Inspector Checks.

Analyze for:
- ATC Checks: SELECT * usage, missing authority checks, nested SELECTs, missing SY-SUBRC checks, hardcoded values, obsolete statements
- Code Inspector: Unused variables, dead code, missing documentation, naming convention violations, performance anti-patterns, security issues

Respond ONLY in this exact JSON format (no markdown, no extra text, no backticks):
{
  "summary": {
    "totalIssues": 0,
    "errors": 0,
    "warnings": 0,
    "info": 0,
    "overallRating": "Poor",
    "ratingScore": 0
  },
  "issues": [
    {
      "id": 1,
      "checkType": "ATC",
      "priority": "Error",
      "category": "Performance",
      "codeSection": "brief code snippet",
      "description": "explanation of the issue",
      "recommendation": "how to fix it"
    }
  ],
  "positives": ["what is good about the code"],
  "overallComment": "overall assessment"
}`;

export default function App() {
  const [file, setFile] = useState(null);
  const [codeText, setCodeText] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [inputMode, setInputMode] = useState("manual");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [apiKey, setApiKey] = useState("process.env.REACT_APP_GROQ_KEY");
  const fileRef = useRef();

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    setError("");
    setResult(null);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await import("xlsx");
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const extracted = rows.map((row) => row.join("\t")).join("\n").trim();
        setCodeText(extracted);
      } catch (err) {
        setError("Failed to read Excel file. Please check the format.");
      }
    };
    reader.readAsArrayBuffer(uploadedFile);
  };

  const handleReview = async () => {
    const codeToReview = inputMode === "excel" ? codeText : manualCode;
    if (!codeToReview.trim()) {
      setError("Please provide ABAP code to review.");
      return;
    }
    if (!apiKey.trim()) {
      setError("Please enter your Groq API key.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey.trim()}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              {
                role: "system",
                content: SYSTEM_PROMPT,
              },
              {
                role: "user",
                content: "Review this SAP ABAP code:\n\n" + codeToReview,
              },
            ],
            temperature: 0.2,
            max_tokens: 2048,
          }),
        }
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      const raw = data.choices?.[0]?.message?.content || "";
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setResult(parsed);
      setActiveTab("all");
    } catch (err) {
      setError("Review failed: " + err.message + ". Please check your Groq API key.");
    } finally {
      setLoading(false);
    }
  };

  const pc = (p) => p === "Error" ? "#ff4757" : p === "Warning" ? "#ffa502" : "#2ed573";
  const pb = (p) => p === "Error" ? "#2d0a0a" : p === "Warning" ? "#2d1a00" : "#0a2d0a";
  const ci = (c) => ({ Performance: "⚡", Security: "🔒", Maintainability: "🔧", Robustness: "🛡️", Style: "✨", Syntax: "📝" }[c] || "📋");
  const rc = (s) => s >= 80 ? "#2ed573" : s >= 60 ? "#ffa502" : s >= 40 ? "#ff6b35" : "#ff4757";

  const filteredIssues = result?.issues?.filter(
    (i) =>
      activeTab === "all" ||
      i.priority.toLowerCase() === activeTab ||
      i.checkType.toLowerCase().includes(activeTab)
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0a0e1a", color: "#e0e6f0", fontFamily: "'Courier New', monospace", padding: "0" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #001529, #002d5c, #001529)", borderBottom: "1px solid #003d7a", padding: "20px 32px", display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ width: 48, height: 48, background: "linear-gradient(135deg, #0066cc, #00aaff)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", fontWeight: "bold", color: "#fff" }}>S</div>
        <div>
          <div style={{ fontSize: "20px", fontWeight: "700", color: "#00aaff" }}>SAP ABAP Code Review AI</div>
          <div style={{ fontSize: "12px", color: "#5580aa" }}>ATC + Code Inspector — Powered by Groq AI (Free)</div>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <span style={{ background: "#003d7a33", border: "1px solid #2ed57344", borderRadius: "4px", padding: "3px 10px", fontSize: "11px", color: "#2ed573" }}>FREE ✅</span>
        </div>
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "32px 24px" }}>

        {/* API Key Input */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ fontSize: "13px", color: "#5580aa", marginBottom: "6px" }}>
            🔑 Enter Groq API Key:
          </div>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="gsk_..."
            style={{ width: "100%", padding: "12px", background: "#0d1526", border: "1px solid #1a3050", borderRadius: "8px", color: "#7abcff", fontFamily: "monospace", fontSize: "13px", outline: "none", boxSizing: "border-box" }}
          />
          <div style={{ fontSize: "11px", color: "#2ed57388", marginTop: "4px" }}>
            ✅ Free key from: console.groq.com → API Keys → Create API Key (Gmail only, no billing!)
          </div>
        </div>

        {/* Input Mode Toggle */}
        <div style={{ display: "flex", marginBottom: "20px", borderRadius: "8px", overflow: "hidden", border: "1px solid #003d7a" }}>
          {[["excel", "📊 Upload Excel"], ["manual", "⌨️ Paste Code"]].map(([mode, label]) => (
            <button key={mode} onClick={() => { setInputMode(mode); setError(""); setResult(null); }} style={{ flex: 1, padding: "12px", border: "none", cursor: "pointer", background: inputMode === mode ? "linear-gradient(135deg, #0066cc, #0044aa)" : "#0a1628", color: inputMode === mode ? "#fff" : "#5580aa", fontFamily: "inherit", fontSize: "14px", fontWeight: "600" }}>
              {label}
            </button>
          ))}
        </div>

        {/* Input Area */}
        <div style={{ background: "#0d1526", border: "1px solid #1a3050", borderRadius: "12px", padding: "24px", marginBottom: "20px" }}>
          {inputMode === "excel" ? (
            <div>
              <div style={{ marginBottom: "12px", fontSize: "13px", color: "#5580aa" }}>
                📋 Put ABAP code in Column A or B of Sheet 1. Upload the Excel file below.
              </div>
              <div onClick={() => fileRef.current?.click()} style={{ border: "2px dashed #003d7a", borderRadius: "10px", padding: "40px", textAlign: "center", cursor: "pointer", background: "#080e1a" }}>
                <div style={{ fontSize: "36px", marginBottom: "10px" }}>{file ? "✅" : "📂"}</div>
                <div style={{ color: file ? "#2ed573" : "#4477aa", fontSize: "14px" }}>
                  {file ? `${file.name} loaded successfully!` : "Click to upload Excel file (.xlsx)"}
                </div>
              </div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFileUpload} style={{ display: "none" }} />
              {codeText && (
                <div style={{ marginTop: "12px", background: "#060c18", border: "1px solid #1a2a3a", borderRadius: "8px", padding: "12px", maxHeight: "120px", overflowY: "auto", fontSize: "12px", color: "#4a7a9b" }}>
                  <div style={{ color: "#2ed57388", marginBottom: "4px", fontSize: "11px" }}>▶ CODE PREVIEW</div>
                  <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{codeText.slice(0, 500)}{codeText.length > 500 ? "\n..." : ""}</pre>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: "8px", fontSize: "13px", color: "#5580aa" }}>⌨️ Paste your ABAP code below:</div>
              <textarea
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder={"REPORT Z_EXAMPLE.\nSELECT * FROM MARA INTO TABLE @DATA(LT_MARA).\nLOOP AT LT_MARA ASSIGNING FIELD-SYMBOL(<LS>).\n  WRITE: / <LS>-MATNR.\nENDLOOP."}
                style={{ width: "100%", minHeight: "200px", background: "#060c18", border: "1px solid #1a3050", borderRadius: "8px", color: "#7abcff", fontFamily: "monospace", fontSize: "13px", padding: "16px", resize: "vertical", outline: "none", lineHeight: "1.7", boxSizing: "border-box" }}
              />
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: "#2d0a0a", border: "1px solid #ff475744", borderRadius: "8px", padding: "12px 16px", color: "#ff6b6b", fontSize: "13px", marginBottom: "16px" }}>
            ⚠️ {error}
          </div>
        )}

        {/* Review Button */}
        <button onClick={handleReview} disabled={loading} style={{ width: "100%", padding: "16px", background: loading ? "#1a2a3a" : "linear-gradient(135deg, #0066cc, #0044aa)", border: "none", borderRadius: "10px", color: loading ? "#4477aa" : "#fff", fontSize: "15px", fontWeight: "700", fontFamily: "inherit", cursor: loading ? "not-allowed" : "pointer", marginBottom: "32px" }}>
          {loading ? "⏳ ANALYZING CODE..." : "🔍 RUN ATC + CODE INSPECTOR REVIEW"}
        </button>

        {/* Results */}
        {result && (
          <div>
            {/* Score Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px", marginBottom: "24px" }}>
              {[
                { label: "Score", value: `${result.summary.ratingScore}/100`, color: rc(result.summary.ratingScore) },
                { label: "Rating", value: result.summary.overallRating, color: rc(result.summary.ratingScore) },
                { label: "Total Issues", value: result.summary.totalIssues, color: "#7aabcc" },
                { label: "Errors", value: result.summary.errors, color: "#ff4757" },
                { label: "Warnings", value: result.summary.warnings, color: "#ffa502" },
                { label: "Info", value: result.summary.info, color: "#2ed573" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: "#0d1526", border: `1px solid ${color}33`, borderRadius: "10px", padding: "16px", textAlign: "center" }}>
                  <div style={{ fontSize: "22px", fontWeight: "800", color }}>{value}</div>
                  <div style={{ fontSize: "12px", color: "#4477aa", marginTop: "4px" }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Overall Comment */}
            <div style={{ background: "#0d1a2d", border: "1px solid #0044aa44", borderRadius: "10px", padding: "16px", marginBottom: "20px", color: "#7aabcc", fontSize: "13px", lineHeight: "1.7" }}>
              <span style={{ color: "#4499ff", fontWeight: "700" }}>📊 AI ASSESSMENT: </span>{result.overallComment}
            </div>

            {/* Positives */}
            {result.positives?.length > 0 && (
              <div style={{ background: "#0a1f0a", border: "1px solid #2ed57333", borderRadius: "10px", padding: "16px", marginBottom: "20px" }}>
                <div style={{ color: "#2ed573", fontWeight: "700", marginBottom: "8px", fontSize: "13px" }}>✅ WHAT IS GOOD</div>
                {result.positives.map((p, i) => <div key={i} style={{ color: "#5aaa7a", fontSize: "13px", marginBottom: "4px" }}>• {p}</div>)}
              </div>
            )}

            {/* Filter Tabs */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
              {[["all", "All Issues"], ["error", "Errors"], ["warning", "Warnings"], ["info", "Info"], ["atc", "ATC"], ["code inspector", "Code Inspector"]].map(([tab, label]) => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: "6px 14px", border: `1px solid ${activeTab === tab ? "#0066cc" : "#1a3050"}`, borderRadius: "6px", background: activeTab === tab ? "#0066cc22" : "transparent", color: activeTab === tab ? "#4499ff" : "#4477aa", fontFamily: "inherit", fontSize: "12px", cursor: "pointer" }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Issues List */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {filteredIssues?.map((issue) => (
                <div key={issue.id} style={{ background: pb(issue.priority), border: `1px solid ${pc(issue.priority)}33`, borderLeft: `3px solid ${pc(issue.priority)}`, borderRadius: "10px", padding: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
                    <span style={{ background: `${pc(issue.priority)}22`, color: pc(issue.priority), padding: "2px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: "700" }}>{issue.priority}</span>
                    <span style={{ background: "#0044aa22", color: "#4499cc", padding: "2px 10px", borderRadius: "4px", fontSize: "11px" }}>{issue.checkType}</span>
                    <span>{ci(issue.category)}</span>
                    <span style={{ color: "#4477aa", fontSize: "12px" }}>{issue.category}</span>
                  </div>
                  {issue.codeSection && (
                    <div style={{ background: "#060c18", borderRadius: "6px", padding: "8px 12px", fontFamily: "monospace", fontSize: "12px", color: "#5599cc", marginBottom: "10px" }}>
                      📌 {issue.codeSection}
                    </div>
                  )}
                  <div style={{ color: "#c0d4e8", fontSize: "13px", marginBottom: "8px", lineHeight: "1.6" }}>
                    <strong style={{ color: "#7aabcc" }}>Issue:</strong> {issue.description}
                  </div>
                  <div style={{ color: "#5aaa7a", fontSize: "13px", lineHeight: "1.6" }}>
                    <strong style={{ color: "#4aaa6a" }}>Fix:</strong> {issue.recommendation}
                  </div>
                </div>
              ))}
              {filteredIssues?.length === 0 && (
                <div style={{ textAlign: "center", color: "#33557788", padding: "32px", fontSize: "14px" }}>No issues in this category.</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
