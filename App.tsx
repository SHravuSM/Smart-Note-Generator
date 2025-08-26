import React, { useState, useCallback, useRef } from 'react';
import Header from './components/Header';
import Loader from './components/Loader';
import QuizCard from './components/QuizCard';
import MarkdownRenderer from './components/MarkdownRenderer';
import { digitizeNote, summarizeText, generateQuiz, translateText, generateTextbookChapter } from './services/geminiService';

const AppState = {
    IDLE: 'IDLE',
    GENERATING: 'GENERATING',
};

const ResultTab = {
    TEXT: 'TEXT',
    SUMMARY: 'SUMMARY',
    QUIZ: 'QUIZ',
    TRANSLATION: 'TRANSLATION',
    TEXTBOOK: 'TEXTBOOK',
};

const LANGUAGES = ['Spanish', 'French', 'German', 'Japanese', 'Mandarin Chinese', 'Korean', 'Italian'];

// --- Icon Components ---
const CopyIcon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
    </svg>
);
const CheckIcon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
);
const FileIcon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);
const SearchIcon = (props) => (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
);
const DownloadIcon = (props) => (
     <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);
const SpinnerIcon = (props) => (
    <svg {...props} className={`animate-spin ${props.className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// --- Helper Components ---
const HighlightedText = ({ text, highlight }) => {
    if (!highlight.trim()) {
        return <>{text}</>;
    }
    const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
        <span>
            {parts.map((part, i) =>
                regex.test(part) ? (
                    <mark key={i} className="bg-yellow-300 dark:bg-yellow-500 rounded px-1 text-black">
                        {part}
                    </mark>
                ) : (
                    <React.Fragment key={i}>{part}</React.Fragment>
                )
            )}
        </span>
    );
};

const TabButton = ({ isActive, onClick, disabled, isGenerating, children }) => {
    const baseClasses = "whitespace-nowrap flex items-center gap-x-2 py-3 px-4 font-medium text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900 rounded-t-md";
    const activeClasses = "border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-gray-800";
    const inactiveClasses = "border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200";
    const disabledClasses = "opacity-50 cursor-not-allowed";

    return (
        <button
            onClick={onClick}
            disabled={disabled || isGenerating}
            className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses} ${disabled || isGenerating ? disabledClasses : ''}`}
        >
            {isGenerating && <SpinnerIcon className="w-4 h-4" />}
            {children}
        </button>
    );
};


const App = () => {
    // --- State Management ---
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [digitizedText, setDigitizedText] = useState('');
    const [summary, setSummary] = useState('');
    const [quiz, setQuiz] = useState([]);
    const [translatedText, setTranslatedText] = useState('');
    const [textbookContent, setTextbookContent] = useState([]);
    const [targetLanguage, setTargetLanguage] = useState('Spanish');
    const [appState, setAppState] = useState(AppState.IDLE);
    // FIX: Add type to generatingFeatures state to resolve property access errors.
    const [generatingFeatures, setGeneratingFeatures] = useState<{ [key: string]: boolean }>({});
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState(ResultTab.TEXT);
    const [copiedStates, setCopiedStates] = useState({});
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    
    // --- Refs ---
    const textbookContainerRef = useRef(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isLoading = appState !== AppState.IDLE;
    
    // --- File Handling ---
    const processFile = (file) => {
        if (!file) return;
        setImageFile(file);

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => { setImagePreview(reader.result); };
            reader.readAsDataURL(file);
        } else {
            setImagePreview(null);
        }
        
        // Reset all generated content
        setDigitizedText('');
        setSummary('');
        setQuiz([]);
        setTranslatedText('');
        setTextbookContent([]);
        setError(null);
        setActiveTab(ResultTab.TEXT);
        setSearchQuery('');
        setCopiedStates({});
    };

    const handleSelectFile = useCallback(() => {
        if (isLoading) return;
        fileInputRef.current?.click();
    }, [isLoading]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            processFile(e.target.files[0]);
        }
        e.target.value = '';
    };

    const handleDragOver = (e) => { e.preventDefault(); if (!isLoading) setIsDraggingOver(true); };
    const handleDragLeave = (e) => { e.preventDefault(); setIsDraggingOver(false); };
    const handleDrop = (e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        if (isLoading) return;
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFile(e.dataTransfer.files[0]);
        }
    };
    
    // --- Core AI Handlers ---
    const handleCreateTextbook = useCallback(async () => {
        if (!imageFile) return;
        setAppState(AppState.GENERATING);
        setError(null);
        try {
            // Step 1: Digitize Note
            const text = await digitizeNote(imageFile);
            setDigitizedText(text);

            // Step 2: Generate Textbook Chapter
            const content = await generateTextbookChapter(text);
            setTextbookContent(content);
            setActiveTab(ResultTab.TEXTBOOK); // Default to textbook view
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setAppState(AppState.IDLE);
        }
    }, [imageFile]);

    const handleGenerateFeature = useCallback(async (feature, generatorFn) => {
        if (!digitizedText) return;
        setGeneratingFeatures(prev => ({...prev, [feature]: true}));
        setError(null);
        try {
            await generatorFn();
            setActiveTab(feature.toUpperCase());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
             setGeneratingFeatures(prev => ({...prev, [feature]: false}));
        }
    }, [digitizedText]);
    
    // --- Utility Functions ---
    const handleCopyToClipboard = (text, id) => {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            setCopiedStates(prev => ({ ...prev, [id]: true }));
            setTimeout(() => {
                setCopiedStates(prev => ({ ...prev, [id]: false }));
            }, 2000);
        });
    };
    
    const handleDownloadPdf = useCallback(async () => {
        const elementToCapture = textbookContainerRef.current;
        if (!elementToCapture) return;
    
        setIsGeneratingPdf(true);
        setError(null);

        const originalHeight = elementToCapture.style.height;
        const originalOverflow = elementToCapture.style.overflow;
        elementToCapture.style.height = 'auto';
        elementToCapture.style.overflow = 'visible';
        
        try {
            const { jsPDF } = (window as any).jspdf;
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'a4',
                putOnlyUsedFonts: true,
            });
    
            await pdf.html(elementToCapture, {
                callback: (doc) => {
                    doc.save('textbook-chapter.pdf');
                    // Restore styles and reset state AFTER save
                    elementToCapture.style.height = originalHeight;
                    elementToCapture.style.overflow = originalOverflow;
                    setIsGeneratingPdf(false);
                },
                margin: [15, 15, 15, 15],
                autoPaging: 'text',
                width: 210, // A4 width in mm
                windowWidth: elementToCapture.scrollWidth,
            });
    
        } catch (err) {
            console.error("Error generating PDF:", err);
            setError("Failed to generate PDF. Please try again.");
            // Restore styles and reset state on error
            elementToCapture.style.height = originalHeight;
            elementToCapture.style.overflow = originalOverflow;
            setIsGeneratingPdf(false);
        }
    }, []);

    const getLoaderMessage = () => {
        switch (appState) {
            case AppState.GENERATING: return 'Digitizing notes & building your textbook... This may take a moment as images are generated.';
            default: return '';
        }
    };
    
    // --- Render Logic ---
    const renderResultContent = () => {
        if (isLoading) return <div className="flex-grow flex items-center justify-center"><Loader message={getLoaderMessage()} /></div>;
        if (!digitizedText) return null;

        const resultViewStyles = "relative p-4 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg border border-t-0 border-gray-200 dark:border-gray-700";
        const copyButtonStyles = "absolute top-3 right-3 flex items-center space-x-1 bg-white dark:bg-gray-900/50 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-md text-xs font-medium transition-colors z-10";

        return (
             <div className="flex flex-col flex-grow">
                <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                    <nav className="-mb-px flex space-x-2" aria-label="Tabs">
                         {/* FIX: Add missing disabled and isGenerating props to TabButton to match component signature and prevent errors. */}
                         <TabButton isActive={activeTab === ResultTab.TEXT} onClick={() => setActiveTab(ResultTab.TEXT)} disabled={isLoading} isGenerating={false}>Digitized Text</TabButton>
                         {textbookContent.length > 0 && <TabButton isActive={activeTab === ResultTab.TEXTBOOK} onClick={() => setActiveTab(ResultTab.TEXTBOOK)} disabled={isLoading} isGenerating={false}>Textbook</TabButton>}
                         <TabButton isActive={activeTab === ResultTab.SUMMARY} isGenerating={generatingFeatures.summary} onClick={() => summary ? setActiveTab(ResultTab.SUMMARY) : handleGenerateFeature('summary', async () => setSummary(await summarizeText(digitizedText)))} disabled={isLoading}>Summary</TabButton>
                         <TabButton isActive={activeTab === ResultTab.QUIZ} isGenerating={generatingFeatures.quiz} onClick={() => quiz.length > 0 ? setActiveTab(ResultTab.QUIZ) : handleGenerateFeature('quiz', async () => setQuiz(await generateQuiz(digitizedText)))} disabled={isLoading}>Quiz</TabButton>
                         <TabButton isActive={activeTab === ResultTab.TRANSLATION} isGenerating={generatingFeatures.translation} onClick={() => translatedText ? setActiveTab(ResultTab.TRANSLATION) : handleGenerateFeature('translation', async () => setTranslatedText(await translateText(digitizedText, targetLanguage)))} disabled={isLoading}>
                            Translate
                            <select value={targetLanguage} onChange={(e) => { e.stopPropagation(); setTargetLanguage(e.target.value); }} className="ml-2 text-xs bg-transparent border-0 focus:ring-0 p-0 pr-4">
                                {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                            </select>
                         </TabButton>
                    </nav>
                </div>
                
                <div className="flex-grow">
                    {activeTab === ResultTab.TEXT && (
                        <div className="space-y-4 pt-4">
                             <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"> <SearchIcon className="h-5 w-5 text-gray-400" /> </div>
                                <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="block w-full rounded-md border-0 py-2 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm dark:bg-gray-700 dark:text-gray-200 dark:ring-gray-600 dark:focus:ring-indigo-500" placeholder="Search text..." />
                            </div>
                            <div className={`${resultViewStyles} rounded-lg`}>
                                <div className="w-full h-96 font-mono text-sm text-gray-800 dark:text-gray-200 overflow-auto whitespace-pre-wrap">
                                     <HighlightedText text={digitizedText} highlight={searchQuery} />
                                </div>
                                <button onClick={() => handleCopyToClipboard(digitizedText, 'text')} className={copyButtonStyles}>{copiedStates['text'] ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4" />}<span className="ml-1">{copiedStates['text'] ? 'Copied' : 'Copy'}</span></button>
                            </div>
                        </div>
                    )}
                    {activeTab === ResultTab.SUMMARY && summary && <div className={`${resultViewStyles} mt-[-1px]`}><div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap"><MarkdownRenderer content={summary}/></div><button onClick={() => handleCopyToClipboard(summary, 'summary')} className={copyButtonStyles}>{copiedStates['summary'] ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4" />}<span className="ml-1">{copiedStates['summary'] ? 'Copied' : 'Copy'}</span></button></div>}
                    {activeTab === ResultTab.QUIZ && quiz.length > 0 && <div className="pt-4">{quiz.map((q, i) => <QuizCard key={i} question={q} questionNumber={i + 1} />)}</div>}
                    {activeTab === ResultTab.TRANSLATION && translatedText && <div className={`${resultViewStyles} mt-[-1px]`}><div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">{translatedText}</div><button onClick={() => handleCopyToClipboard(translatedText, 'translation')} className={copyButtonStyles}>{copiedStates['translation'] ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CopyIcon className="w-4 h-4" />}<span className="ml-1">{copiedStates['translation'] ? 'Copied' : 'Copy'}</span></button></div>}
                    {activeTab === ResultTab.TEXTBOOK && textbookContent.length > 0 && (
                        <div className="space-y-4 pt-4">
                             <div className="flex justify-end">
                                <button onClick={handleDownloadPdf} disabled={isGeneratingPdf} className="inline-flex items-center gap-x-2 rounded-md bg-white dark:bg-gray-700 px-3.5 py-2.5 text-sm font-semibold text-gray-900 dark:text-gray-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50">
                                     {isGeneratingPdf ? <SpinnerIcon className="w-5 h-5" /> : <DownloadIcon className="h-5 w-5" />}
                                    {isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}
                                </button>
                            </div>
                            <div ref={textbookContainerRef} className="prose dark:prose-invert max-w-none p-6 bg-white dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700 h-96 overflow-auto">
                                {textbookContent.map((block, index) => {
                                    if (block.type === 'text') return <MarkdownRenderer key={index} content={block.content} />;
                                    if (block.type === 'image') return (
                                        <figure key={index} className="my-6">
                                            <img src={block.content} alt={block.alt} className="w-full rounded-lg shadow-md mx-auto" />
                                            <figcaption className="text-center text-sm text-gray-500 mt-2 italic">{block.alt}</figcaption>
                                        </figure>
                                    );
                                    return null;
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            <Header />
            <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,application/pdf" />
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    {/* --- Left Column: Upload --- */}
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 h-fit">
                        <h2 className="text-2xl font-bold mb-1 text-gray-800 dark:text-white">1. Upload Note</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Upload an image or document of your notes.</p>
                        <div 
                            onClick={handleSelectFile}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-300 ${
                                isDraggingOver 
                                ? 'border-indigo-500 bg-indigo-50 dark:bg-gray-700 scale-105' 
                                : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            {imagePreview ? (
                                <img src={imagePreview} alt="Note preview" className="w-full h-full object-contain rounded-lg p-2" />
                            ) : imageFile ? (
                                <div className="flex flex-col items-center justify-center text-center p-4 w-full">
                                    <FileIcon className="w-16 h-16 text-gray-400 dark:text-gray-500 mb-2" />
                                    <p className="font-semibold text-gray-700 dark:text-gray-300 truncate w-full px-2" title={imageFile.name}>{imageFile.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{Math.round(imageFile.size / 1024)} KB</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center text-gray-500 dark:text-gray-400">
                                    <svg className="w-10 h-10 mb-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/></svg>
                                    <p className="font-semibold"><span className="text-indigo-600 dark:text-indigo-400">Click to upload</span> or drag and drop</p>
                                    <p className="text-xs mt-1">Image or PDF file</p>
                                </div>
                            )}
                        </div>
                        {imageFile && (
                            <button onClick={handleCreateTextbook} disabled={isLoading || textbookContent.length > 0} className="mt-6 w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 dark:disabled:bg-indigo-800 disabled:cursor-not-allowed transition-all duration-200">
                                {textbookContent.length > 0 ? 'Textbook Created!' : '✨ Create Textbook'}
                            </button>
                        )}
                    </div>
                    {/* --- Right Column: Results --- */}
                    <div className="lg:col-span-3 flex flex-col">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col flex-grow">
                             <h2 className="text-2xl font-bold mb-1 text-gray-800 dark:text-white">2. Your Smart Note</h2>
                             <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Generate summaries, quizzes, and more from your text.</p>
                             {error && <div className="p-4 my-4 text-sm text-red-800 rounded-lg bg-red-100 dark:bg-gray-900 dark:text-red-400" role="alert">{error}</div>}
                            
                            {!digitizedText && !isLoading && (
                                 <div className="text-center text-gray-500 dark:text-gray-400 py-16 flex flex-col items-center justify-center h-full rounded-lg bg-gray-50 dark:bg-gray-800/50 mt-4">
                                    <FileIcon className="w-20 h-20 text-gray-300 dark:text-gray-600" />
                                    <p className="mt-4 font-medium">Your smart notes will appear here</p>
                                    <p className="text-sm">Upload a note and click "Create Textbook" to get started.</p>
                                </div>
                            )}
                            
                            {renderResultContent()}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;