import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes, useLocation, useNavigate } from "react-router-dom";

const formatCodonIndex = (value) => {
  if (value === -1) {
    return "Not found";
  }
  return value ?? "-";
};

function IconHome({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5L12 3l9 7.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.5 9.8V20h13V9.8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 20v-5.2h4V20" />
    </svg>
  );
}

function IconUpload({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.5L12 4l4.5 4.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 14.5V19a2 2 0 002 2h12a2 2 0 002-2v-4.5" />
    </svg>
  );
}

function IconAnalyse({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 4c4 0 4 4 8 4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 20c4 0 4-4 8-4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 4c4 0 4 4 8 4" transform="matrix(1 0 0 -1 0 24)" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7h2M13 11h2M9 15h2M13 19h2" />
    </svg>
  );
}

function IconView({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.7 12s3.2-5.5 9.3-5.5 9.3 5.5 9.3 5.5-3.2 5.5-9.3 5.5S2.7 12 2.7 12z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  );
}

function IconList({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 6.5h12M8 12h12M8 17.5h12" />
      <circle cx="4.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="17.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}


function Home() {
  const helixRows = Array.from({ length: 14 });

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="bg-slate-50 backdrop-blur-sm shadow-md rounded-2xl p-8 border border-slate-300">
        <h2 className="text-3xl font-bold mb-3 text-slate-900">Home</h2>
        <p className="text-lg font-medium text-slate-700">Welcome to the DNA SA Application.</p>
        <p className="mt-3 text-slate-600 leading-relaxed">
          This platform helps you upload DNA sequences, store biological samples, and quickly analyze them
          for transcription and codon-level insights. It is designed for simple, interactive exploration of
          sequence data using a clean API-powered workflow.
        </p>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-teal-50 border border-teal-200 p-4">
            <p className="text-sm text-teal-700 font-semibold">Upload & Validate</p>
            <p className="text-slate-600 mt-1 text-sm">Accepts only valid nucleotides (`A`, `C`, `G`, `T`) and stores clean records.</p>
          </div>
          <div className="rounded-xl bg-violet-50 border border-violet-200 p-4">
            <p className="text-sm text-violet-700 font-semibold">Analyse Biology</p>
            <p className="text-slate-600 mt-1 text-sm">Computes mRNA transcription, complement strand, start codon and stop codon indices.</p>
          </div>
          <div className="rounded-xl bg-slate-100 border border-slate-200 p-4">
            <p className="text-sm text-lime-700 font-semibold">View & Track</p>
            <p className="text-slate-600 mt-1 text-sm">Fetch a single sample or list all entries for quick monitoring and comparisons.</p>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center">
          <p className="text-sm uppercase tracking-wider text-slate-500 mb-3">DNA motif</p>
          <div className="dna-helix" aria-hidden="true">
            {helixRows.map((_, index) => (
              <div
                className="dna-row"
                style={{ animationDelay: `${index * 0.12}s` }}
                key={`dna-row-${index}`}
              >
                <span className="dna-node dna-node-left" />
                <span className="dna-bridge" />
                <span className="dna-node dna-node-right" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


function Upload() {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [seq, setSeq] = useState("");
  const [message, setMessage] = useState("");
  const [messageColor, setMessageColor] = useState("");
  const [id, setId] = useState(null);

  const validateSeq = (sequence) => {
    return /^[ACGT]+$/i.test(sequence);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setId(null);

    if (!validateSeq(seq)) {
      setMessage("Invalid DNA sequence! Only A, C, G, T allowed.");
      setMessageColor("text-rose-600");
      return;
    }

    const payload = { name, age: Number(age), seq: seq.toUpperCase() };

    try {
      const allDataResponse = await fetch("http://127.0.0.1:8000/Data");
      let nextId = 1;
      if (allDataResponse.ok) {
        const allData = await allDataResponse.json();
        if (Array.isArray(allData) && allData.length > 0) {
          const maxId = Math.max(...allData.map((item) => Number(item.id) || 0));
          nextId = maxId + 1;
        }
      }

      const response = await fetch(`http://127.0.0.1:8000/Data/${nextId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage(`Success: ${data.message}`);
        setId(data.id);
        setMessageColor("text-lime-400");
        setName("");
        setAge("");
        setSeq("");
      } else {
        setMessage(`Error: ${data.detail || 'Unknown error'}`);
        setMessageColor("text-rose-600");
      }
    } catch (err) {
      setMessage(`Network error: ${err.message}`);
      setMessageColor("text-rose-600");
    }
  };
  
  return (
    <div className="p-4 max-w-md mx-auto bg-slate-50 border border-slate-300 shadow-md rounded-lg mt-4">
      <h2 className="text-2xl font-bold mb-4 text-slate-900">Upload DNA</h2>
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <label className="block mb-1 font-medium text-slate-700">Name</label>
          <input
            type="text"
            required
            className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded placeholder:text-slate-400"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label className="block mb-1 font-medium text-slate-700">Age</label>
          <input
            type="number"
            min="0"
            required
            className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded placeholder:text-slate-400"
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label className="block mb-1 font-medium text-slate-700">DNA Sequence</label>
          <input
            type="text"
            required
            pattern="[ACGTacgt]+"
            title="Only A,C,G,T characters allowed"
            className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded placeholder:text-slate-400"
            value={seq}
            onChange={(e) => setSeq(e.target.value)}
          />
        </div>
        <button className="bg-teal-600 text-slate-50 font-bold py-2 px-4 rounded hover:bg-teal-700" type="submit">SUBMIT</button>
      </form>
      {message && (
        <p className={`${messageColor} mt-4 font-semibold`}>{message} {id !== null && `ID: ${id}`}</p>
      )}
    </div>
  );
}

function Analyse() {
  const [inputId, setInputId] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleAnalyse = async () => {
    setResult(null);
    setError(null);
    if (!inputId) {
      setError("Please enter an ID");
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:8000/Data/analyse/${inputId}`);
      if (!response.ok) {
        throw new Error("ID not found or server error");
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setResult(data);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="p-4 max-w-3xl mx-auto bg-slate-50 border border-slate-300 shadow-md rounded-lg mt-4">
      <h2 className="text-2xl font-bold mb-4 text-slate-900">Analyse DNA</h2>
      <input
        type="text"
        placeholder="Enter ID"
        value={inputId}
        onChange={(e) => setInputId(e.target.value)}
        className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded mb-4 placeholder:text-slate-400"
      />
      <button onClick={handleAnalyse} className="bg-violet-700 text-slate-50 font-bold py-2 px-4 rounded hover:bg-violet-800">Analyse</button>
      {error && <p className="text-rose-600 mt-4">{error}</p>}
      {result && (
        <div className="mt-4 overflow-x-auto rounded border border-slate-300">
          <table className="min-w-full bg-white text-slate-800">
            <thead className="bg-slate-100 text-slate-900">
              <tr>
                <th className="border border-slate-300 px-4 py-2 text-left">Field</th>
                <th className="border border-slate-300 px-4 py-2 text-left">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr className="odd:bg-white even:bg-slate-50">
                <td className="border border-slate-300 px-4 py-2">Name</td>
                <td className="border border-slate-300 px-4 py-2">{result.name || "-"}</td>
              </tr>
              <tr className="odd:bg-white even:bg-slate-50">
                <td className="border border-slate-300 px-4 py-2">Age</td>
                <td className="border border-slate-300 px-4 py-2">{result.age ?? "-"}</td>
              </tr>
              <tr className="odd:bg-white even:bg-slate-50">
                <td className="border border-slate-300 px-4 py-2">DNA Sequence</td>
                <td className="border border-slate-300 px-4 py-2 break-all">{result.seq || "-"}</td>
              </tr>
              <tr className="odd:bg-white even:bg-slate-50">
                <td className="border border-slate-300 px-4 py-2">Transcribed (mRNA)</td>
                <td className="border border-slate-300 px-4 py-2 break-all">{result.transcribed || "-"}</td>
              </tr>
              <tr className="odd:bg-white even:bg-slate-50">
                <td className="border border-slate-300 px-4 py-2">Complement</td>
                <td className="border border-slate-300 px-4 py-2 break-all">{result.complement || "-"}</td>
              </tr>
              <tr className="odd:bg-white even:bg-slate-50">
                <td className="border border-slate-300 px-4 py-2">Start Codon Index (AUG)</td>
                <td className="border border-slate-300 px-4 py-2">{formatCodonIndex(result.start_codon_index)}</td>
              </tr>
              <tr className="odd:bg-white even:bg-slate-50">
                <td className="border border-slate-300 px-4 py-2">Stop Codon Index</td>
                <td className="border border-slate-300 px-4 py-2">{formatCodonIndex(result.stop_codon_index)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function View() {
  const [inputId, setInputId] = useState("");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const handleView = async () => {
    setData(null);
    setError(null);
    if (!inputId) {
      setError("Please enter an ID");
      return;
    }

    try {
      const response = await fetch(`http://127.0.0.1:8000/Data/${inputId}`);
      if (!response.ok) {
        throw new Error("ID not found or server error");
      }
      const d = await response.json();
      if (d.error) {
        throw new Error(d.error);
      }
      setData(d);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="p-4 max-w-3xl mx-auto bg-slate-50 border border-slate-300 shadow-md rounded-lg mt-4">
      <h2 className="text-2xl font-bold mb-4 text-slate-900">View DNA Data</h2>
      <input
        type="text"
        placeholder="Enter ID"
        value={inputId}
        onChange={(e) => setInputId(e.target.value)}
        className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded mb-4 placeholder:text-slate-400"
      />
      <button onClick={handleView} className="bg-teal-600 text-slate-50 font-bold py-2 px-4 rounded hover:bg-teal-700">View</button>
      {error && <p className="text-rose-600 mt-4">{error}</p>}
      {data && (
        <div className="mt-4 overflow-x-auto rounded border border-slate-300">
          <table className="min-w-full bg-white text-slate-800">
            <thead className="bg-slate-100 text-slate-900">
              <tr>
                <th className="border border-slate-300 px-4 py-2 text-left">Field</th>
                <th className="border border-slate-300 px-4 py-2 text-left">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr className="odd:bg-white even:bg-slate-50">
                <td className="border border-slate-300 px-4 py-2">ID</td>
                <td className="border border-slate-300 px-4 py-2">{inputId}</td>
              </tr>
              <tr className="odd:bg-white even:bg-slate-50">
                <td className="border border-slate-300 px-4 py-2">Name</td>
                <td className="border border-slate-300 px-4 py-2">{data.name || "-"}</td>
              </tr>
              <tr className="odd:bg-white even:bg-slate-50">
                <td className="border border-slate-300 px-4 py-2">Age</td>
                <td className="border border-slate-300 px-4 py-2">{data.age ?? "-"}</td>
              </tr>
              <tr className="odd:bg-white even:bg-slate-50">
                <td className="border border-slate-300 px-4 py-2">DNA Sequence</td>
                <td className="border border-slate-300 px-4 py-2 break-all">{data.seq || "-"}</td>
              </tr>
              <tr className="odd:bg-white even:bg-slate-50">
                <td className="border border-slate-300 px-4 py-2">Transcribed (mRNA)</td>
                <td className="border border-slate-300 px-4 py-2 break-all">{data.transcribed || "-"}</td>
              </tr>
              <tr className="odd:bg-white even:bg-slate-50">
                <td className="border border-slate-300 px-4 py-2">Complement</td>
                <td className="border border-slate-300 px-4 py-2 break-all">{data.complement || "-"}</td>
              </tr>
              <tr className="odd:bg-white even:bg-slate-50">
                <td className="border border-slate-300 px-4 py-2">Start Codon Index (AUG)</td>
                <td className="border border-slate-300 px-4 py-2">{formatCodonIndex(data.start_codon_index)}</td>
              </tr>
              <tr className="odd:bg-white even:bg-slate-50">
                <td className="border border-slate-300 px-4 py-2">Stop Codon Index</td>
                <td className="border border-slate-300 px-4 py-2">{formatCodonIndex(data.stop_codon_index)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function List() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchAllData = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("http://127.0.0.1:8000/Data");
      if (!response.ok) {
        throw new Error("Unable to fetch data");
      }
      const responseData = await response.json();
      if (Array.isArray(responseData)) {
        setRows(responseData);
      } else {
        setRows([]);
      }
    } catch (err) {
      setError(err.message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  return (
    <div className="p-4 max-w-6xl mx-auto bg-slate-50 border border-slate-300 shadow-md rounded-lg mt-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-slate-900">List DNA Data</h2>
        <button
          onClick={fetchAllData}
          className="bg-violet-700 text-slate-50 font-bold py-2 px-4 rounded hover:bg-violet-800"
        >
          Refresh
        </button>
      </div>

      {loading && <p className="text-slate-600">Loading...</p>}
      {error && <p className="text-rose-600">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-slate-300 bg-white text-slate-800">
            <thead className="bg-slate-100 text-slate-900">
              <tr>
                <th className="border px-4 py-2 text-left">ID</th>
                <th className="border px-4 py-2 text-left">Name</th>
                <th className="border px-4 py-2 text-left">Age</th>
                <th className="border px-4 py-2 text-left">Sequence</th>
                <th className="border px-4 py-2 text-left">Transcribed</th>
                <th className="border px-4 py-2 text-left">Complement</th>
                <th className="border px-4 py-2 text-left">Start Codon</th>
                <th className="border px-4 py-2 text-left">Stop Codon</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="border px-4 py-2 text-center" colSpan={8}>
                    No data found
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="odd:bg-white even:bg-slate-50">
                    <td className="border px-4 py-2">{row.id}</td>
                    <td className="border px-4 py-2">{row.name}</td>
                    <td className="border px-4 py-2">{row.age}</td>
                    <td className="border px-4 py-2 break-all">{row.seq}</td>
                    <td className="border px-4 py-2 break-all">{row.transcribed || "-"}</td>
                    <td className="border px-4 py-2 break-all">{row.complement || "-"}</td>
                    <td className="border px-4 py-2">{formatCodonIndex(row.start_codon_index)}</td>
                    <td className="border px-4 py-2">{formatCodonIndex(row.stop_codon_index)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const navItems = [
  { label: "Home", path: "/", icon: IconHome },
  { label: "Upload", path: "/upload", icon: IconUpload },
  { label: "Analyse", path: "/analyse", icon: IconAnalyse },
  { label: "View", path: "/view", icon: IconView },
  { label: "List", path: "/list", icon: IconList },
];

function NavigationBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (path) => {
    navigate(path);
  };

  return (
    <nav className="bg-slate-50 backdrop-blur-md shadow p-4 border-b border-slate-300">
      <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-3">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => handleNavigate(item.path)}
              className={`flex items-center gap-2 px-6 py-4 rounded-2xl text-lg font-semibold border transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
                isActive
                  ? "bg-teal-600 text-slate-50 border-teal-600"
                  : "bg-slate-700 text-slate-50 border-slate-600 hover:bg-slate-600 hover:border-teal-600"
              }`}
              aria-label={`Go to ${item.label}`}
            >
              <Icon className="w-5 h-5" aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#0b1120]">
      <NavigationBar />
      <div className="flex-grow container mx-auto p-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/analyse" element={<Analyse />} />
          <Route path="/view" element={<View />} />
          <Route path="/list" element={<List />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}
