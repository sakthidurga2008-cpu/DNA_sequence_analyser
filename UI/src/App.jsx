import { useEffect, useMemo, useRef, useState } from 'react'
import { jsPDF } from 'jspdf'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

const features = [
  {
    title: 'Multi-format support',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Real-time analysis',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 12h5l3-6 4 12 2-6h4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Downloadable report',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 4v10m0 0 4-4m-4 4-4-4M5 19h14" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

const loadingSteps = [
  'Parsing sequence format...',
  'Validating nucleotide composition...',
  'Detecting ORFs...',
  'Computing GC content...',
  'Mapping codon frequencies...',
  'Finalising report...',
]

const maximumFiles = 15

const toBackendDna = (payload) => payload.toUpperCase().replace(/U/g, 'T')
const isBackendValidDna = (payload) => /^[ACGT]+$/.test(payload)

const bytesToSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** index
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`
}

const extractSequencePayload = (inputText) => {
  const text = inputText.trim()
  if (!text) return ''

  if (text.startsWith('>')) {
    return text
      .split('\n')
      .filter((line) => !line.startsWith('>'))
      .join('')
      .replace(/\s+/g, '')
      .toUpperCase()
  }

  if (/^@/m.test(text) && /\n\+/m.test(text)) {
    const lines = text.split('\n')
    const chunks = []
    for (let i = 0; i < lines.length; i += 4) {
      if (lines[i]?.startsWith('@') && lines[i + 1]) {
        chunks.push(lines[i + 1].trim())
      }
    }
    return chunks.join('').replace(/\s+/g, '').toUpperCase()
  }

  if (/LOCUS|ORIGIN|FEATURES/i.test(text)) {
    return text
      .replace(/LOCUS|ORIGIN|FEATURES|\/\/|\d+/gi, ' ')
      .replace(/[^A-Za-z]/g, '')
      .toUpperCase()
  }

  return text.replace(/\s+/g, '').toUpperCase()
}

const detectFormat = (text, fileName = '') => {
  const value = text.trim()
  if (!value && !fileName) return 'Unknown'

  const lowerFileName = fileName.toLowerCase()
  if (value.startsWith('>') || lowerFileName.endsWith('.fasta') || lowerFileName.endsWith('.fa')) return 'FASTA'
  if ((/^@/m.test(value) && /\n\+/m.test(value)) || lowerFileName.endsWith('.fastq')) return 'FASTQ'
  if (/LOCUS|ORIGIN|FEATURES/i.test(value) || lowerFileName.endsWith('.gb') || lowerFileName.endsWith('.gbk')) {
    return 'GenBank'
  }
  return 'Raw DNA'
}

const validateSequence = (payload) => {
  if (!payload) return { isValid: false, molecule: 'Unknown', invalid: false }

  const hasU = /U/.test(payload)
  const hasT = /T/.test(payload)

  if (hasU && hasT) {
    return { isValid: false, molecule: 'Mixed', invalid: true }
  }

  if (hasU) {
    const isValid = /^[ACGUN]+$/.test(payload)
    return { isValid, molecule: 'RNA', invalid: !isValid }
  }

  const isValid = /^[ACGTN]+$/.test(payload)
  return { isValid, molecule: 'DNA', invalid: !isValid }
}

const DnaHelix = ({ className = '' }) => (
  <svg viewBox="0 0 220 380" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M60 20C145 60 145 120 60 160C-25 200 -25 260 60 300C145 340 145 360 60 360"
      stroke="#1D9E75"
      strokeWidth="3"
      strokeDasharray="8 10"
      className="helix-path"
    />
    <path
      d="M160 20C75 60 75 120 160 160C245 200 245 260 160 300C75 340 75 360 160 360"
      stroke="#8B5CF6"
      strokeWidth="3"
      strokeDasharray="8 10"
      className="helix-path-reverse"
    />
    {[30, 80, 130, 180, 230, 280, 330].map((y) => (
      <g key={y}>
        <circle cx="60" cy={y} r="4" fill="#1D9E75" className="helix-node" />
        <circle cx="160" cy={y} r="4" fill="#8B5CF6" className="helix-node" />
        <line x1="60" y1={y} x2="160" y2={y} stroke="rgba(240,244,248,0.15)" strokeWidth="1" />
      </g>
    ))}
  </svg>
)

function App() {
  const [activeTab, setActiveTab] = useState('paste')
  const [sequenceInput, setSequenceInput] = useState('')
  const [dragging, setDragging] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [homologyTab, setHomologyTab] = useState('paste')
  const [homologyInput, setHomologyInput] = useState('')
  const [homologyDragging, setHomologyDragging] = useState(false)
  const [homologyFiles, setHomologyFiles] = useState([])
  const [homologyLoading, setHomologyLoading] = useState(false)
  const [homologyError, setHomologyError] = useState('')
  const [homologySuccess, setHomologySuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [completedSteps, setCompletedSteps] = useState([])
  const [typingStepIndex, setTypingStepIndex] = useState(-1)
  const [typedText, setTypedText] = useState('')
  const [analysisResults, setAnalysisResults] = useState([])
  const [analysisError, setAnalysisError] = useState('')
  const [analysisDone, setAnalysisDone] = useState(false)
  const [loadingVisualDone, setLoadingVisualDone] = useState(false)
  const fileInputRef = useRef(null)
  const homologyFileInputRef = useRef(null)

  const scrollToSectionTwo = () => {
    document.getElementById('section-2')?.scrollIntoView({ behavior: 'smooth' })
  }

  const detectedFormat = useMemo(() => detectFormat(sequenceInput), [sequenceInput])
  const sequencePayload = useMemo(() => extractSequencePayload(sequenceInput), [sequenceInput])
  const validation = useMemo(() => validateSequence(sequencePayload), [sequencePayload])
  const homologyPayload = useMemo(() => extractSequencePayload(homologyInput), [homologyInput])
  const homologyValidation = useMemo(() => validateSequence(homologyPayload), [homologyPayload])

  const statsText = `${sequencePayload.length} characters · ${validation.molecule} · ${validation.isValid ? 'valid' : 'invalid'}`
  const hasInput = sequenceInput.trim().length > 0 || uploadedFiles.length > 0
  const homologyStatsText = `${homologyPayload.length} characters · ${homologyValidation.molecule} · ${homologyValidation.isValid ? 'valid' : 'invalid'}`
  const hasHomologyInput = homologyInput.trim().length > 0 || homologyFiles.length > 0

  const postAndAnalyse = async ({ name, seq }) => {
    const postResponse = await fetch(`${API_BASE}/Data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        age: 0,
        seq,
      }),
    })

    const postJson = await postResponse.json()
    if (!postResponse.ok || postJson.error) {
      throw new Error(postJson.error || 'Failed to submit sequence.')
    }

    const createdId = postJson.id
    if (!createdId) {
      throw new Error('Backend did not return record id.')
    }

    const analyseResponse = await fetch(`${API_BASE}/Data/analyse/${createdId}`)
    const analyseJson = await analyseResponse.json()
    if (!analyseResponse.ok || analyseJson.error) {
      throw new Error(analyseJson.error || 'Failed to analyse sequence.')
    }

    return { id: createdId, result: analyseJson }
  }

  const enrichFiles = async (files) => {
    const availableSlots = maximumFiles - uploadedFiles.length
    const selectedFiles = files.slice(0, availableSlots)

    const mapped = await Promise.all(
      selectedFiles.map(async (file) => {
        const text = await file.text()
        const payload = extractSequencePayload(text)
        const result = validateSequence(payload)

        return {
          id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          size: file.size,
          format: detectFormat(text, file.name),
          isValid: result.isValid,
          molecule: result.molecule,
          payload,
        }
      }),
    )

    setUploadedFiles((prev) => [...prev, ...mapped])
  }

  const onFileSelect = async (event) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    await enrichFiles(files)
    event.target.value = ''
  }

  const onDrop = async (event) => {
    event.preventDefault()
    setDragging(false)
    const files = Array.from(event.dataTransfer.files || [])
    if (!files.length) return
    await enrichFiles(files)
  }

  const removeFile = (id) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== id))
  }

  const enrichHomologyFiles = async (files) => {
    const availableSlots = maximumFiles - homologyFiles.length
    const selectedFiles = files.slice(0, availableSlots)

    const mapped = await Promise.all(
      selectedFiles.map(async (file) => {
        const text = await file.text()
        const payload = extractSequencePayload(text)
        const result = validateSequence(payload)

        return {
          id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          size: file.size,
          format: detectFormat(text, file.name),
          isValid: result.isValid,
          molecule: result.molecule,
          payload,
        }
      }),
    )

    setHomologyFiles((prev) => [...prev, ...mapped])
  }

  const onHomologyFileSelect = async (event) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    await enrichHomologyFiles(files)
    event.target.value = ''
  }

  const onHomologyDrop = async (event) => {
    event.preventDefault()
    setHomologyDragging(false)
    const files = Array.from(event.dataTransfer.files || [])
    if (!files.length) return
    await enrichHomologyFiles(files)
  }

  const removeHomologyFile = (id) => {
    setHomologyFiles((prev) => prev.filter((file) => file.id !== id))
  }

  const triggerDownloadFromBlob = (blob, fileName) => {
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.URL.revokeObjectURL(url)
  }

  const fetchHomologyReport = async ({ seq, fileName }) => {
    const homologyResponse = await fetch(`${API_BASE}/Data/homology/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ seq }),
    })

    if (!homologyResponse.ok) {
      let message = 'Failed to run homology search.'
      try {
        const errorJson = await homologyResponse.json()
        message = errorJson.detail || errorJson.error || message
      } catch {
        message = 'Failed to run homology search.'
      }
      throw new Error(message)
    }

    const reportBlob = await homologyResponse.blob()
    triggerDownloadFromBlob(reportBlob, fileName)
  }

  const runHomologySearch = () => {
    setHomologyError('')
    setHomologySuccess('')
    setHomologyLoading(true)

    const execute = async () => {
      try {
        if (homologyTab === 'paste') {
          const preparedSequence = toBackendDna(extractSequencePayload(homologyInput))
          if (!preparedSequence) {
            throw new Error('Please paste a sequence before running homology search.')
          }
          if (!isBackendValidDna(preparedSequence)) {
            throw new Error('Only A, C, G, T (or RNA U) are supported for homology search.')
          }

          await fetchHomologyReport({
            seq: preparedSequence,
            fileName: 'blast_results_pasted.txt',
          })
          setHomologySuccess('Homology report downloaded successfully.')
          return
        }

        const validFiles = homologyFiles
          .map((file) => ({
            ...file,
            backendSequence: toBackendDna(file.payload || ''),
          }))
          .filter((file) => isBackendValidDna(file.backendSequence))

        if (!validFiles.length) {
          throw new Error('No valid DNA file found. Files must contain only A, C, G, T (or RNA U).')
        }

        for (const file of validFiles) {
          const safeName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '_')
          await fetchHomologyReport({
            seq: file.backendSequence,
            fileName: `blast_results_${safeName}.txt`,
          })
        }

        setHomologySuccess(`Downloaded ${validFiles.length} homology report(s).`)
      } catch (error) {
        setHomologyError(error instanceof Error ? error.message : 'Homology search failed. Please try again.')
      } finally {
        setHomologyLoading(false)
      }
    }

    void execute()
  }

  const downloadAnalysisReport = () => {
    if (!analysisResults.length) return

    const doc = new jsPDF({ unit: 'pt', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const left = 40
    const right = pageWidth - 40
    const maxTextWidth = right - left
    let y = 40

    const ensureSpace = (requiredHeight = 18) => {
      if (y + requiredHeight > pageHeight - 40) {
        doc.addPage()
        y = 40
      }
    }

    const writeLine = (text, size = 10, bold = false) => {
      const fontName = 'helvetica'
      doc.setFont(fontName, bold ? 'bold' : 'normal')
      doc.setFontSize(size)
      const lines = doc.splitTextToSize(String(text), maxTextWidth)
      lines.forEach((line) => {
        ensureSpace(size + 8)
        doc.text(line, left, y)
        y += size + 4
      })
    }

    writeLine('DNA Sequence Analysis Report', 16, true)
    writeLine(`Generated: ${new Date().toLocaleString()}`, 9)
    y += 8

    analysisResults.forEach((entry, index) => {
      const r = entry.result || {}

      ensureSpace(24)
      writeLine(`${index + 1}. Source: ${entry.source}`, 13, true)
      writeLine(`Record ID: ${entry.id}`, 10)
      y += 4

      writeLine('1) Input sequence and length', 11, true)
      writeLine(`Length: ${r.length ?? '-'}`)
      writeLine(`Sequence: ${r.seq || '-'}`)

      writeLine('2) Reverse complement', 11, true)
      writeLine(r.reverse_complement || '-')

      writeLine('3) Nucleotide counts (A, T, C, G)', 11, true)
      writeLine(`A: ${r.Acount ?? '-'} | T: ${r.Tcount ?? '-'} | C: ${r.Ccount ?? '-'} | G: ${r.Gcount ?? '-'}`)

      writeLine('4) GC and AT content', 11, true)
      writeLine(`GC content: ${typeof r.gccontent === 'number' ? `${r.gccontent.toFixed(2)}%` : '-'}`)
      writeLine(`AT content: ${typeof r.atcontent === 'number' ? `${r.atcontent.toFixed(2)}%` : '-'}`)

      writeLine('5) Transcribed sequence', 11, true)
      writeLine(r.transcribed || '-')

      writeLine('6) Start and stop codons found', 11, true)
      writeLine(`Start codons: ${r.start_codon_count ?? '-'}`)
      writeLine(`Stop codons: ${r.stop_codon_count ?? '-'}`)

      writeLine('7) ORF frames listed', 11, true)
      if (Array.isArray(r.orf_frames) && r.orf_frames.length) {
        r.orf_frames.forEach((frame, frameIndex) => {
          writeLine(
            `ORF ${frameIndex + 1} | Frame ${frame.frame} | Start ${frame.start} | Stop ${frame.stop} | Sequence: ${frame.orf || '-'}`,
          )
        })
      } else {
        writeLine('No ORFs found')
      }

      writeLine('8) Translated ORFs', 11, true)
      if (Array.isArray(r.translated_orfs) && r.translated_orfs.length) {
        r.translated_orfs.forEach((protein, proteinIndex) => {
          writeLine(`ORF ${proteinIndex + 1}: ${protein || '-'}`)
        })
      } else {
        writeLine('No translated ORFs found')
      }

      y += 12
    })

    doc.save(`dna-analysis-report-${Date.now()}.pdf`)
  }

  const runAnalysis = () => {
    if (!hasInput) return

    setAnalysisError('')
    setAnalysisResults([])
    setIsLoading(true)
    setAnalysisDone(false)
    setLoadingVisualDone(false)
    setCompletedSteps([])
    setTypingStepIndex(0)
    setTypedText('')

    const execute = async () => {
      try {
        if (activeTab === 'paste') {
          const preparedSequence = toBackendDna(sequencePayload)
          if (!preparedSequence) {
            throw new Error('Please paste a sequence before running analysis.')
          }
          if (!isBackendValidDna(preparedSequence)) {
            throw new Error('Only A, C, G, T (or RNA U) are supported for backend analysis.')
          }

          const analysed = await postAndAnalyse({
            name: 'Pasted Sequence',
            seq: preparedSequence,
          })

          setAnalysisResults([{ source: 'Pasted Sequence', ...analysed }])
          return
        }

        const validFiles = uploadedFiles
          .map((file) => ({
            ...file,
            backendSequence: toBackendDna(file.payload || ''),
          }))
          .filter((file) => isBackendValidDna(file.backendSequence))

        if (!validFiles.length) {
          throw new Error('No valid DNA file found. Files must contain only A, C, G, T (or RNA U).')
        }

        const results = []
        for (const file of validFiles) {
          const analysed = await postAndAnalyse({
            name: file.name,
            seq: file.backendSequence,
          })
          results.push({ source: file.name, ...analysed })
        }

        setAnalysisResults(results)
      } catch (error) {
        setAnalysisError(error instanceof Error ? error.message : 'Analysis failed. Please try again.')
      } finally {
        setAnalysisDone(true)
      }
    }

    void execute()
  }

  useEffect(() => {
    if (!isLoading || typingStepIndex < 0) return

    if (typingStepIndex >= loadingSteps.length) {
      setLoadingVisualDone(true)
      setTypingStepIndex(-1)
      setTypedText('')
      return
    }

    const fullText = loadingSteps[typingStepIndex]
    let charIndex = 0
    setTypedText('')

    const typeTimer = setInterval(() => {
      charIndex += 1
      setTypedText(fullText.slice(0, charIndex))

      if (charIndex >= fullText.length) {
        clearInterval(typeTimer)
        setCompletedSteps((prev) => [...prev, fullText])
        setTimeout(() => {
          setTypingStepIndex((prev) => prev + 1)
        }, 600)
      }
    }, 28)

    return () => clearInterval(typeTimer)
  }, [isLoading, typingStepIndex])

  useEffect(() => {
    if (isLoading && analysisDone && loadingVisualDone) {
      setIsLoading(false)
    }
  }, [isLoading, analysisDone, loadingVisualDone])

  return (
    <main className="bg-[#0A0F1E] text-[#F0F4F8]">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center gap-12 px-6 py-16 lg:flex-row lg:items-center lg:px-10">
        <div className="w-full lg:w-3/5">
          <span className="inline-flex items-center rounded-full border border-[#1D9E75]/40 bg-[#1D9E75]/20 px-4 py-2 text-xs font-semibold tracking-wide text-[#42d5a7] transition-all duration-300">
            Bioinformatics · Sequence Analysis
          </span>

          <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-[#F0F4F8] md:text-5xl">
            Decode your sequences. Understand your genome.
          </h1>

          <p className="mt-5 max-w-3xl text-base leading-relaxed text-slate-300 md:text-lg">
            Upload a DNA or RNA sequence in any format — FASTA, FASTQ, GenBank, or plain text — and get instant
            analysis: ORF detection, GC content, codon usage, alignment, and a downloadable lab-grade report. No
            account needed.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {features.map((feature) => (
              <span
                key={feature.title}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#111827]/80 px-4 py-2 text-sm text-slate-200 backdrop-blur-md transition-all duration-300 hover:border-[#1D9E75]/40 hover:text-[#9be8cf]"
              >
                <span className="text-[#1D9E75]">{feature.icon}</span>
                {feature.title}
              </span>
            ))}
          </div>

          <button
            type="button"
            onClick={scrollToSectionTwo}
            className="mt-10 inline-flex items-center rounded-full bg-[#1D9E75] px-8 py-4 text-base font-semibold text-white shadow-lg shadow-[#1D9E75]/30 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#22b485]"
          >
            Start Analysing →
          </button>
        </div>

        <div className="w-full lg:w-2/5">
          <div className="h-[300px] rounded-3xl border border-white/10 bg-[#111827]/60 p-6 backdrop-blur-md transition-all duration-300 md:h-[420px]">
            <div className="flex h-full items-center justify-center">
              <DnaHelix className="h-full w-full max-w-[260px] helix-pulse" />
            </div>
          </div>
        </div>
      </section>

      <section id="section-2" className="mx-auto min-h-screen w-full max-w-7xl px-6 py-16 lg:px-10">
        <div className="mx-auto w-full max-w-[720px] rounded-[1.5rem] border border-white/10 bg-[#111827]/80 p-6 text-slate-300 backdrop-blur-md md:p-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#1D9E75]/20 text-[#49d6aa]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M7 4c4 0 4 4 8 4M7 20c4 0 4-4 8-4M7 4v16M15 4v16" strokeLinecap="round" />
              </svg>
            </span>
            <h2 className="text-xl font-semibold text-[#F0F4F8] md:text-2xl">Upload or paste your sequence</h2>
          </div>

          <div className="mb-5 inline-flex rounded-full border border-white/10 bg-[#0B1222] p-1">
            {['paste', 'upload'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition-all duration-300 ${
                  activeTab === tab
                    ? 'bg-[#1D9E75] text-white shadow-lg shadow-[#1D9E75]/25'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {tab === 'paste' ? 'Paste Sequence' : 'Upload File'}
              </button>
            ))}
          </div>

          {activeTab === 'paste' ? (
            <div>
              <div className="relative">
                <span
                  className={`absolute right-3 top-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                    validation.isValid
                      ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300'
                      : 'border-red-400/40 bg-red-500/10 text-red-300'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${validation.isValid ? 'bg-emerald-300' : 'bg-red-300'}`}
                  />
                  Detected: {detectedFormat}
                </span>
                <textarea
                  value={sequenceInput}
                  onChange={(event) => setSequenceInput(event.target.value)}
                  placeholder="Paste your raw sequence, FASTA, or GenBank text here..."
                  className="h-56 w-full resize-none rounded-2xl border border-white/10 bg-[#0B1222] p-4 pr-36 font-mono text-sm text-slate-100 outline-none transition-all duration-300 placeholder:text-slate-500 focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/30"
                />
              </div>
              <p className="mt-3 text-sm text-slate-400">{statsText}</p>
            </div>
          ) : (
            <div>
              {uploadedFiles.length === 0 ? (
                <div
                  onDragOver={(event) => {
                    event.preventDefault()
                    setDragging(true)
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  className={`rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
                    dragging ? 'border-[#1D9E75] bg-[#1D9E75]/10' : 'border-[#1D9E75]/70 bg-[#0B1222]'
                  }`}
                >
                  <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#1D9E75]/15 text-[#1D9E75]">
                    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M12 4v10m0 0 4-4m-4 4-4-4M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-lg font-medium text-[#F0F4F8]">Drag and drop your file here</p>
                  <p className="my-2 text-sm text-slate-400">or</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-full border border-[#1D9E75] px-5 py-2 text-sm font-medium text-[#66dcb8] transition-all duration-300 hover:bg-[#1D9E75]/15"
                  >
                    Browse files
                  </button>
                  <p className="mt-4 text-xs tracking-wide text-slate-400">FASTA · FASTQ · GenBank · .txt</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-[#0B1222] p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 text-emerald-300">
                          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-100">{file.name}</p>
                          <p className="text-xs text-slate-400">{bytesToSize(file.size)}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-[#1D9E75]/30 bg-[#1D9E75]/10 px-2.5 py-1 text-xs text-[#8ce6ca]">
                              {file.format}
                            </span>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs ${
                                file.isValid
                                  ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300'
                                  : 'border-red-400/40 bg-red-500/10 text-red-300'
                              }`}
                            >
                              {file.molecule} · {file.isValid ? 'valid' : 'invalid'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFile(file.id)}
                        className="rounded-full border border-white/15 p-1.5 text-slate-400 transition-all duration-300 hover:border-red-300/50 hover:text-red-300"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <p className="text-right text-xs text-slate-400">{uploadedFiles.length} / 15 files loaded</p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".fasta,.fa,.fastq,.gb,.gbk,.txt"
                onChange={onFileSelect}
                className="hidden"
              />
            </div>
          )}

          <div className="mt-6">
            {!isLoading ? (
              <div className="space-y-3">
                <button
                  type="button"
                  disabled={!hasInput}
                  onClick={runAnalysis}
                  className={`flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-base font-semibold text-white transition-all duration-300 ${
                    hasInput
                      ? 'bg-gradient-to-r from-[#1D9E75] to-[#1bbd89] shadow-lg shadow-[#1D9E75]/30 hover:-translate-y-0.5'
                      : 'cursor-not-allowed bg-slate-700 text-slate-400'
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Run Analysis →
                </button>

                {analysisResults.length > 0 && !analysisError && (
                  <button
                    type="button"
                    onClick={downloadAnalysisReport}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-[#1D9E75]/50 bg-[#1D9E75]/15 px-5 py-3 text-sm font-semibold text-[#9be8cf] transition-all duration-300 hover:bg-[#1D9E75]/25"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 20h16" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Download Full Report (PDF)
                  </button>
                )}
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0B1222] p-4 md:p-5">
                <div className="pointer-events-none absolute inset-0 opacity-20">
                  <DnaHelix className="mx-auto h-full w-full max-w-[200px] helix-pulse" />
                </div>

                <div className="relative z-10 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div className="progress-indeterminate h-full w-1/3 rounded-full bg-gradient-to-r from-[#1D9E75] to-[#66dcb8]" />
                </div>

                <div className="relative z-10 mt-4 space-y-2">
                  {completedSteps.map((step) => (
                    <p key={step} className="flex items-center gap-2 text-sm text-slate-400">
                      <span className="text-[#1D9E75]">✓</span>
                      {step}
                    </p>
                  ))}

                  {typingStepIndex >= 0 && typingStepIndex < loadingSteps.length && (
                    <p className="flex items-center gap-2 text-sm text-[#9be8cf]">
                      <span className="text-[#1D9E75]">•</span>
                      <span className="typewriter-cursor">{typedText}</span>
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {(analysisError || analysisResults.length > 0) && (
            <div className="mt-6 space-y-3">
              {analysisError && (
                <div className="rounded-2xl border border-red-400/35 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {analysisError}
                </div>
              )}

              {analysisResults.map((entry) => {
                const r = entry.result
                const sequenceLength = Number(r.length)
                const showDerivedSequences = Number.isNaN(sequenceLength) || sequenceLength <= 20
                return (
                  <article
                    key={`${entry.source}-${entry.id}`}
                    className="rounded-2xl border border-white/10 bg-[#0B1222]/90 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-[#F0F4F8]">{entry.source}</h3>
                      <span className="rounded-full border border-[#1D9E75]/35 bg-[#1D9E75]/15 px-2.5 py-1 text-xs text-[#8ce6ca]">
                        ID: {entry.id}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-3">
                      <p className="rounded-xl bg-white/5 px-3 py-2 text-slate-300">Length: {r.length ?? '-'}</p>
                      <p className="rounded-xl bg-white/5 px-3 py-2 text-slate-300">A: {r.Acount ?? '-'}</p>
                      <p className="rounded-xl bg-white/5 px-3 py-2 text-slate-300">C: {r.Ccount ?? '-'}</p>
                      <p className="rounded-xl bg-white/5 px-3 py-2 text-slate-300">G: {r.Gcount ?? '-'}</p>
                      <p className="rounded-xl bg-white/5 px-3 py-2 text-slate-300">T: {r.Tcount ?? '-'}</p>
                      <p className="rounded-xl bg-white/5 px-3 py-2 text-slate-300">
                        GC: {typeof r.gccontent === 'number' ? `${r.gccontent.toFixed(2)}%` : '-'}
                      </p>
                      <p className="rounded-xl bg-white/5 px-3 py-2 text-slate-300">
                        AT: {typeof r.atcontent === 'number' ? `${r.atcontent.toFixed(2)}%` : '-'}
                      </p>
                      <p className="rounded-xl bg-white/5 px-3 py-2 text-slate-300">
                        Start codon: {r.start_codon_index ?? '-'}
                      </p>
                      <p className="rounded-xl bg-white/5 px-3 py-2 text-slate-300">
                        Stop codon: {r.stop_codon_index ?? '-'}
                      </p>
                    </div>

                    <div className="mt-3 space-y-2 text-xs">
                      <p className="rounded-xl bg-white/5 px-3 py-2 text-slate-300">ORF: {r.orf || 'Not found'}</p>
                      {showDerivedSequences && (
                        <>
                          <p className="rounded-xl bg-white/5 px-3 py-2 text-slate-300 break-all">
                            Complement: {r.complement || '-'}
                          </p>
                          <p className="rounded-xl bg-white/5 px-3 py-2 text-slate-300 break-all">
                            Transcribed: {r.transcribed || '-'}
                          </p>
                          <p className="rounded-xl bg-white/5 px-3 py-2 text-slate-300 break-all">
                            Protein: {r.protein_seq || '-'}
                          </p>
                        </>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>

      <section id="section-3" className="mx-auto min-h-screen w-full max-w-7xl px-6 py-16 lg:px-10">
        <div className="mx-auto w-full max-w-[720px] rounded-[1.5rem] border border-white/10 bg-[#111827]/80 p-6 text-slate-300 backdrop-blur-md md:p-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#1D9E75]/20 text-[#49d6aa]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 12h5l3-6 4 12 2-6h4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h2 className="text-xl font-semibold text-[#F0F4F8] md:text-2xl">Find Homology</h2>
          </div>

          <p className="mb-5 text-sm text-slate-400">
            Paste a sequence or upload files to run NCBI BLAST and download the result as `blast_results.txt`.
          </p>

          <div className="mb-5 inline-flex rounded-full border border-white/10 bg-[#0B1222] p-1">
            {['paste', 'upload'].map((tab) => (
              <button
                key={`homology-${tab}`}
                type="button"
                onClick={() => setHomologyTab(tab)}
                className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition-all duration-300 ${
                  homologyTab === tab
                    ? 'bg-[#1D9E75] text-white shadow-lg shadow-[#1D9E75]/25'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {tab === 'paste' ? 'Paste Sequence' : 'Upload File'}
              </button>
            ))}
          </div>

          {homologyTab === 'paste' ? (
            <div>
              <div className="relative">
                <span
                  className={`absolute right-3 top-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                    homologyValidation.isValid
                      ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300'
                      : 'border-red-400/40 bg-red-500/10 text-red-300'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${homologyValidation.isValid ? 'bg-emerald-300' : 'bg-red-300'}`}
                  />
                  Detected: {detectFormat(homologyInput)}
                </span>
                <textarea
                  value={homologyInput}
                  onChange={(event) => setHomologyInput(event.target.value)}
                  placeholder="Paste sequence for homology search..."
                  className="h-56 w-full resize-none rounded-2xl border border-white/10 bg-[#0B1222] p-4 pr-36 font-mono text-sm text-slate-100 outline-none transition-all duration-300 placeholder:text-slate-500 focus:border-[#1D9E75] focus:ring-2 focus:ring-[#1D9E75]/30"
                />
              </div>
              <p className="mt-3 text-sm text-slate-400">{homologyStatsText}</p>
            </div>
          ) : (
            <div>
              {homologyFiles.length === 0 ? (
                <div
                  onDragOver={(event) => {
                    event.preventDefault()
                    setHomologyDragging(true)
                  }}
                  onDragLeave={() => setHomologyDragging(false)}
                  onDrop={onHomologyDrop}
                  className={`rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 ${
                    homologyDragging ? 'border-[#1D9E75] bg-[#1D9E75]/10' : 'border-[#1D9E75]/70 bg-[#0B1222]'
                  }`}
                >
                  <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#1D9E75]/15 text-[#1D9E75]">
                    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M12 4v10m0 0 4-4m-4 4-4-4M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-lg font-medium text-[#F0F4F8]">Drag and drop homology input files here</p>
                  <p className="my-2 text-sm text-slate-400">or</p>
                  <button
                    type="button"
                    onClick={() => homologyFileInputRef.current?.click()}
                    className="rounded-full border border-[#1D9E75] px-5 py-2 text-sm font-medium text-[#66dcb8] transition-all duration-300 hover:bg-[#1D9E75]/15"
                  >
                    Browse files
                  </button>
                  <p className="mt-4 text-xs tracking-wide text-slate-400">FASTA · FASTQ · GenBank · .txt</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {homologyFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-[#0B1222] p-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 text-emerald-300">
                          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="m5 12 4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-100">{file.name}</p>
                          <p className="text-xs text-slate-400">{bytesToSize(file.size)}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-[#1D9E75]/30 bg-[#1D9E75]/10 px-2.5 py-1 text-xs text-[#8ce6ca]">
                              {file.format}
                            </span>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs ${
                                file.isValid
                                  ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300'
                                  : 'border-red-400/40 bg-red-500/10 text-red-300'
                              }`}
                            >
                              {file.molecule} · {file.isValid ? 'valid' : 'invalid'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeHomologyFile(file.id)}
                        className="rounded-full border border-white/15 p-1.5 text-slate-400 transition-all duration-300 hover:border-red-300/50 hover:text-red-300"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="m6 6 12 12M18 6 6 18" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  <p className="text-right text-xs text-slate-400">{homologyFiles.length} / 15 files loaded</p>
                </div>
              )}

              <input
                ref={homologyFileInputRef}
                type="file"
                multiple
                accept=".fasta,.fa,.fastq,.gb,.gbk,.txt"
                onChange={onHomologyFileSelect}
                className="hidden"
              />
            </div>
          )}

          <div className="mt-6 space-y-3">
            <button
              type="button"
              disabled={homologyLoading || !hasHomologyInput}
              onClick={runHomologySearch}
              className={`flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-base font-semibold text-white transition-all duration-300 ${
                homologyLoading || !hasHomologyInput
                  ? 'cursor-not-allowed bg-slate-700 text-slate-400'
                  : 'bg-gradient-to-r from-[#1D9E75] to-[#1bbd89] shadow-lg shadow-[#1D9E75]/30 hover:-translate-y-0.5'
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              {homologyLoading ? 'Running Homology Search...' : 'Run Homology Search →'}
            </button>

            {homologyError && (
              <div className="rounded-2xl border border-red-400/35 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {homologyError}
              </div>
            )}

            {homologySuccess && (
              <div className="rounded-2xl border border-emerald-400/35 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {homologySuccess}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
