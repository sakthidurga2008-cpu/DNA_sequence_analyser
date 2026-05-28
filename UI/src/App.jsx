import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes, NavLink } from "react-router-dom";


function Home() {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Home</h2>
      <p>Welcome to the DNA SA Application.</p>
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
      setMessageColor("text-red-500");
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
        setMessageColor("text-green-600");
        setName("");
        setAge("");
        setSeq("");
      } else {
        setMessage(`Error: ${data.detail || 'Unknown error'}`);
        setMessageColor("text-red-500");
      }
    } catch (err) {
      setMessage(`Network error: ${err.message}`);
      setMessageColor("text-red-500");
    }
  };
  
  return (
    <div className="p-4 max-w-md mx-auto bg-white shadow-md rounded-lg mt-4">
      <h2 className="text-2xl font-bold mb-4">Upload DNA</h2>
      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <label className="block mb-1 font-medium">Name</label>
          <input
            type="text"
            required
            className="w-full p-2 border border-gray-300 rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label className="block mb-1 font-medium">Age</label>
          <input
            type="number"
            min="0"
            required
            className="w-full p-2 border border-gray-300 rounded"
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />
        </div>
        <div className="mb-4">
          <label className="block mb-1 font-medium">DNA Sequence</label>
          <input
            type="text"
            required
            pattern="[ACGTacgt]+"
            title="Only A,C,G,T characters allowed"
            className="w-full p-2 border border-gray-300 rounded"
            value={seq}
            onChange={(e) => setSeq(e.target.value)}
          />
        </div>
        <button className="bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700" type="submit">SUBMIT</button>
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
      setResult(data);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto bg-white shadow-md rounded-lg mt-4">
      <h2 className="text-2xl font-bold mb-4">Analyse DNA</h2>
      <input
        type="text"
        placeholder="Enter ID"
        value={inputId}
        onChange={(e) => setInputId(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded mb-4"
      />
      <button onClick={handleAnalyse} className="bg-purple-600 text-white font-bold py-2 px-4 rounded hover:bg-purple-700">Analyse</button>
      {error && <p className="text-red-500 mt-4">{error}</p>}
      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <pre className="whitespace-pre-wrap break-words">{JSON.stringify(result, null, 2)}</pre>
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
      setData(d);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto bg-white shadow-md rounded-lg mt-4">
      <h2 className="text-2xl font-bold mb-4">View DNA Data</h2>
      <input
        type="text"
        placeholder="Enter ID"
        value={inputId}
        onChange={(e) => setInputId(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded mb-4"
      />
      <button onClick={handleView} className="bg-green-600 text-white font-bold py-2 px-4 rounded hover:bg-green-700">View</button>
      {error && <p className="text-red-500 mt-4">{error}</p>}
      {data && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <pre className="whitespace-pre-wrap break-words">{JSON.stringify(data, null, 2)}</pre>
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
    <div className="p-4 max-w-6xl mx-auto bg-white shadow-md rounded-lg mt-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">List DNA Data</h2>
        <button
          onClick={fetchAllData}
          className="bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700"
        >
          Refresh
        </button>
      </div>

      {loading && <p className="text-gray-600">Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-4 py-2 text-left">ID</th>
                <th className="border px-4 py-2 text-left">Name</th>
                <th className="border px-4 py-2 text-left">Age</th>
                <th className="border px-4 py-2 text-left">Sequence</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="border px-4 py-2 text-center" colSpan={4}>
                    No data found
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td className="border px-4 py-2">{row.id}</td>
                    <td className="border px-4 py-2">{row.name}</td>
                    <td className="border px-4 py-2">{row.age}</td>
                    <td className="border px-4 py-2 break-all">{row.seq}</td>
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

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100">
        <nav className="bg-white shadow p-4 flex justify-center space-x-6">
          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive
                ? "text-blue-600 font-bold border-b-2 border-blue-600"
                : "text-gray-600 hover:text-blue-600"
            }
            end
          >
            Home
          </NavLink>
          <NavLink
            to="/upload"
            className={({ isActive }) =>
              isActive
                ? "text-blue-600 font-bold border-b-2 border-blue-600"
                : "text-gray-600 hover:text-blue-600"
            }
          >
            Upload
          </NavLink>
          <NavLink
            to="/analyse"
            className={({ isActive }) =>
              isActive
                ? "text-blue-600 font-bold border-b-2 border-blue-600"
                : "text-gray-600 hover:text-blue-600"
            }
          >
            Analyse
          </NavLink>
          <NavLink
            to="/view"
            className={({ isActive }) =>
              isActive
                ? "text-blue-600 font-bold border-b-2 border-blue-600"
                : "text-gray-600 hover:text-blue-600"
            }
          >
            View
          </NavLink>
          <NavLink
            to="/list"
            className={({ isActive }) =>
              isActive
                ? "text-blue-600 font-bold border-b-2 border-blue-600"
                : "text-gray-600 hover:text-blue-600"
            }
          >
            List
          </NavLink>
        </nav>
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
    </Router>
  );
}
