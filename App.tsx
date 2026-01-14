
import React, { useState, useEffect, useRef } from 'react';
import { Question, Subject } from './types';
import { parseExamFile } from './services/geminiService';

interface FileProcessingStatus {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  attempt: number;
}

// Components
const Sidebar = ({ currentView, setView, counts }: { currentView: string, setView: (v: string) => void, counts: Record<string, number> }) => (
  <div className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 overflow-y-auto z-10 hidden md:block">
    <div className="p-6">
      <h1 className="text-xl font-bold flex items-center gap-2">
        <i className="fas fa-brain text-indigo-400"></i>
        ExamDigitizer
      </h1>
    </div>
    <nav className="mt-4 px-4">
      <div className="space-y-1">
        <button 
          onClick={() => setView('dashboard')}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${currentView === 'dashboard' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
        >
          <span className="flex items-center gap-3">
            <i className="fas fa-th-large"></i> Dashboard
          </span>
        </button>
        <button 
          onClick={() => setView('upload')}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${currentView === 'upload' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
        >
          <span className="flex items-center gap-3">
            <i className="fas fa-file-pdf"></i> New Scan/PDF
          </span>
        </button>
      </div>

      <div className="mt-10">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4">Subjects</h3>
        <div className="mt-4 space-y-1">
          {Object.values(Subject).map(sub => (
            <button 
              key={sub}
              onClick={() => setView(`subject-${sub}`)}
              className={`w-full flex items-center justify-between px-4 py-2 rounded-lg text-sm transition-colors ${currentView === `subject-${sub}` ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
            >
              <span>{sub}</span>
              <span className="text-xs bg-slate-700 px-2 py-0.5 rounded-full">{counts[sub] || 0}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  </div>
);

const QuestionCard = ({ question, onDelete }: { question: Question, onDelete: (id: string) => void }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 transition-all hover:shadow-md group">
    <div className="flex justify-between items-start mb-4">
      <div className="flex gap-2">
        <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${
          question.subject === Subject.PHYSICS ? 'bg-blue-100 text-blue-700' :
          question.subject === Subject.CHEMISTRY ? 'bg-orange-100 text-orange-700' :
          question.subject === Subject.MATH ? 'bg-green-100 text-green-700' :
          'bg-slate-100 text-slate-700'
        }`}>
          {question.subject}
        </span>
        {question.imageUrl && (
          <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold border border-indigo-100">
            <i className="fas fa-image mr-1"></i> Diagram Ref
          </span>
        )}
      </div>
      <button 
        onClick={() => onDelete(question.id)}
        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <i className="fas fa-trash-alt"></i>
      </button>
    </div>
    <p className="text-slate-800 font-medium mb-6 leading-relaxed">
      {question.text}
    </p>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {question.options.map((opt, idx) => (
        <div 
          key={opt.id} 
          className={`p-3 rounded-lg border flex items-center gap-3 ${
            opt.isCorrect 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-slate-50 border-slate-100 text-slate-600'
          }`}
        >
          <span className="w-6 h-6 flex items-center justify-center rounded-full bg-white border border-inherit text-xs font-bold">
            {String.fromCharCode(65 + idx)}
          </span>
          <span className="text-sm">{opt.text}</span>
          {opt.isCorrect && <i className="fas fa-check-circle ml-auto text-emerald-500"></i>}
        </div>
      ))}
    </div>
    {question.explanation && (
      <div className="mt-6 pt-4 border-t border-slate-100 italic text-slate-500 text-sm">
        <i className="fas fa-magic text-indigo-400 mr-2" title="AI Generated Explanation"></i>
        {question.explanation}
      </div>
    )}
  </div>
);

const JsonViewer = ({ data, onClose }: { data: any, onClose: () => void }) => {
  const jsonStr = JSON.stringify(data, null, 2);
  
  const downloadJson = () => {
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exam-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <i className="fas fa-code text-indigo-500"></i>
            Extracted JSON Data
          </h3>
          <div className="flex gap-2">
            <button 
              onClick={downloadJson}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
            >
              <i className="fas fa-download"></i> Download
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-slate-900 p-6">
          <pre className="text-emerald-400 text-xs font-mono leading-relaxed">
            {jsonStr}
          </pre>
        </div>
      </div>
    </div>
  );
};

const ProcessingModal = ({ files, onFinish }: { files: FileProcessingStatus[], onFinish: () => void }) => {
  const completedCount = files.filter(f => f.status === 'completed').length;
  const progress = files.length > 0 ? (completedCount / files.length) * 100 : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
        <div className="p-6 bg-indigo-600 text-white">
          <h3 className="text-xl font-bold flex items-center gap-3">
            <i className="fas fa-sparkles"></i>
            Digitizing Exams
          </h3>
          <p className="text-indigo-100 text-sm mt-1">
            Extracting content and generating AI explanations...
          </p>
          <div className="mt-4 bg-indigo-800 rounded-full h-2 w-full overflow-hidden">
            <div 
              className="bg-white h-full transition-all duration-500 ease-out" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
          {files.map(file => (
            <div key={file.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${
                  file.status === 'completed' ? 'bg-emerald-100 text-emerald-600' :
                  file.status === 'failed' ? 'bg-rose-100 text-rose-600' :
                  file.status === 'retrying' ? 'bg-amber-100 text-amber-600' :
                  'bg-indigo-50 text-indigo-500'
                }`}>
                  <i className={`fas ${
                    file.status === 'completed' ? 'fa-check' :
                    file.status === 'failed' ? 'fa-times' :
                    file.status === 'retrying' ? 'fa-redo fa-spin' :
                    'fa-spinner fa-spin'
                  }`}></i>
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-semibold text-slate-700 truncate">{file.name}</p>
                  <p className="text-xs text-slate-500">
                    {file.status === 'pending' ? 'Waiting...' :
                     file.status === 'processing' ? 'Processing content...' :
                     file.status === 'retrying' ? `Auto-retry attempt ${file.attempt}/3...` :
                     file.status === 'completed' ? 'Success!' : 'Could not parse file.'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        {progress === 100 && (
          <div className="p-4 border-t border-slate-100 flex justify-center">
             <button 
              onClick={onFinish}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors"
             >
               View Results
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState('dashboard');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingQueue, setProcessingQueue] = useState<FileProcessingStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showJsonViewer, setShowJsonViewer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persistence
  useEffect(() => {
    const saved = localStorage.getItem('exam_questions');
    if (saved) {
      setQuestions(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('exam_questions', JSON.stringify(questions));
  }, [questions]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const initialQueue: FileProcessingStatus[] = files.map(f => ({
      id: Math.random().toString(36).substr(2, 9),
      name: f.name,
      status: 'pending',
      attempt: 0
    }));

    setProcessingQueue(initialQueue);
    setIsProcessing(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const statusId = initialQueue[i].id;

        setProcessingQueue(prev => prev.map(f => f.id === statusId ? { ...f, status: 'processing' } : f));

        const reader = new FileReader();
        const mimeType = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/png');
        
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
        });
        reader.readAsDataURL(file);
        const base64 = await base64Promise;
        
        try {
          const result = await parseExamFile(
            base64, 
            mimeType, 
            (attempt) => {
              setProcessingQueue(prev => prev.map(f => 
                f.id === statusId ? { ...f, status: 'retrying', attempt } : f
              ));
            }
          );
          setQuestions(prev => [...(result.questions as Question[]), ...prev]);
          setProcessingQueue(prev => prev.map(f => f.id === statusId ? { ...f, status: 'completed' } : f));
        } catch (error) {
          setProcessingQueue(prev => prev.map(f => f.id === statusId ? { ...f, status: 'failed' } : f));
        }
      }
    } catch (error) {
      console.error(error);
      setIsProcessing(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteQuestion = (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const subjectCounts = questions.reduce((acc, q) => {
    acc[q.subject] = (acc[q.subject] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.text.toLowerCase().includes(searchQuery.toLowerCase());
    if (view.startsWith('subject-')) {
      const targetSub = view.replace('subject-', '');
      return matchesSearch && q.subject === targetSub;
    }
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar currentView={view} setView={setView} counts={subjectCounts} />

      <main className="flex-1 md:ml-64 p-4 md:p-8">
        {isProcessing && (
          <ProcessingModal 
            files={processingQueue} 
            onFinish={() => {
              setIsProcessing(false);
              setProcessingQueue([]);
              setView('dashboard');
            }} 
          />
        )}

        {showJsonViewer && <JsonViewer data={questions} onClose={() => setShowJsonViewer(false)} />}

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              {view === 'dashboard' ? 'Question Bank' : 
               view === 'upload' ? 'New Digitization' : 
               view.replace('subject-', '')}
            </h2>
            <p className="text-slate-500 text-sm">Organizing {questions.length} questions</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
              <input 
                type="text" 
                placeholder="Search..." 
                className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-56 bg-white text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <button 
              onClick={() => setShowJsonViewer(true)}
              className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2"
              disabled={questions.length === 0}
            >
              <i className="fas fa-file-code"></i> Export JSON
            </button>

            <button 
              onClick={() => setView('upload')}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2 shadow-sm shadow-indigo-100"
            >
              <i className="fas fa-plus"></i> New Scan
            </button>
          </div>
        </header>

        {/* Content */}
        {view === 'upload' || (questions.length === 0 && view === 'dashboard') ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-2xl mx-auto mt-10 shadow-sm">
            <div className="flex justify-center gap-4 mb-8">
               <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center text-3xl rotate-3 shadow-inner">
                  <i className="fas fa-image"></i>
               </div>
               <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center text-3xl -rotate-3 shadow-inner">
                  <i className="fas fa-file-pdf"></i>
               </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-4">
              Import Exam Content
            </h3>
            <p className="text-slate-500 mb-10 leading-relaxed text-lg">
              Upload files to extract MCQs. Gemini 3 will automatically generate explanations for answers and handle diagram references for you.
            </p>
            
            <input 
              type="file" 
              multiple 
              accept="image/*,.pdf" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileUpload}
            />
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-indigo-600 text-white px-10 py-5 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center gap-4 mx-auto text-lg"
            >
              <i className="fas fa-upload"></i>
              Choose Exam Files
            </button>
            
            <div className="mt-12 pt-8 border-t border-slate-100 grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-indigo-600 font-bold mb-1">OCR</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-tighter">Text Extraction</div>
              </div>
              <div className="text-center">
                <div className="text-indigo-600 font-bold mb-1">AI Gen</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-tighter">Explanations</div>
              </div>
              <div className="text-center">
                <div className="text-indigo-600 font-bold mb-1">JSON</div>
                <div className="text-[10px] text-slate-400 uppercase tracking-tighter">Structured Output</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
            {filteredQuestions.map(q => (
              <QuestionCard key={q.id} question={q} onDelete={deleteQuestion} />
            ))}
            {filteredQuestions.length === 0 && (
              <div className="col-span-full py-24 text-center">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <i className="fas fa-search-minus text-3xl"></i>
                </div>
                <h4 className="text-slate-600 font-bold">No matches found</h4>
                <p className="text-slate-400 text-sm">Try adjusting your search query or subject filters.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mobile Fab */}
      <button 
        onClick={() => setView('upload')}
        className="md:hidden fixed bottom-6 right-6 w-16 h-16 bg-indigo-600 text-white rounded-2xl shadow-2xl shadow-indigo-300 flex items-center justify-center text-xl z-50 active:scale-90 transition-transform"
      >
        <i className="fas fa-file-upload"></i>
      </button>
    </div>
  );
}
