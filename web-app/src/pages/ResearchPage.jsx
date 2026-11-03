import { Alert, Button, Card, CardBody, Chip, Input, Spinner } from "@nextui-org/react";
import { Bot, BookOpen, Check, Database, ExternalLink, Heart, Lightbulb, RefreshCw, Search, Send, Sparkles, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import NavBar from "../components/NavBar";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";
const RESEARCH_WORKSPACE_KEY = "research_workspace";

export default function ResearchPage() {
    const [savedWorkspace] = useState(loadResearchWorkspace);
    const [query, setQuery] = useState(() => savedWorkspace?.query || "");
    const [papers, setPapers] = useState(() => savedWorkspace?.papers || []);
    const [analyses, setAnalyses] = useState(() => savedWorkspace?.analyses || {});
    const [error, setError] = useState("");
    const [analysisError, setAnalysisError] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [compareSelection, setCompareSelection] = useState(() => savedWorkspace?.compareSelection || []);
    const [comparison, setComparison] = useState(() => savedWorkspace?.comparison || "");
    const [comparisonError, setComparisonError] = useState("");
    const [isComparing, setIsComparing] = useState(false);
    const [chatMessages, setChatMessages] = useState(() => savedWorkspace?.chatMessages || []);
    const [chatInput, setChatInput] = useState(() => savedWorkspace?.chatInput || "");
    const [chatError, setChatError] = useState("");
    const [isChatting, setIsChatting] = useState(false);
    const [pendingQuestion, setPendingQuestion] = useState("");
    const [isChatOpen, setIsChatOpen] = useState(() => Boolean(savedWorkspace?.isChatOpen));
    const chatEndRef = useRef(null);
    const chatDialogRef = useRef(null);
    const chatLauncherRef = useRef(null);
    const [selectedPaper, setSelectedPaper] = useState(() => savedWorkspace?.selectedPaper || null);
    const [cacheStats, setCacheStats] = useState(() => savedWorkspace?.cacheStats || { count: 0, total_bytes: 0 });
    const focusChatLauncher = useCallback(() => chatLauncherRef.current?.focus(), []);

    useEffect(() => {
        saveResearchWorkspace({
            query,
            papers,
            analyses,
            compareSelection,
            comparison,
            chatMessages,
            chatInput,
            isChatOpen,
            selectedPaper,
            cacheStats,
        });
    }, [query, papers, analyses, compareSelection, comparison, chatMessages, chatInput, isChatOpen, selectedPaper, cacheStats]);

    useEffect(() => {
        if (!isChatOpen) return;
        fetch(`${API_BASE}/cache/`)
            .then((response) => response.json())
            .then(setCacheStats)
            .catch(() => {});
    }, [isChatOpen]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, [chatMessages, pendingQuestion, isChatOpen]);

    useEffect(() => {
        if (!isChatOpen) return undefined;
        const dialog = chatDialogRef.current;
        dialog?.querySelector("input, button")?.focus();
        function closeOnEscape(event) {
            if (event.key === "Escape") {
                setIsChatOpen(false);
                return;
            }
            if (event.key !== "Tab" || !dialog) return;
            const focusable = [...dialog.querySelectorAll('button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])')];
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
        window.addEventListener("keydown", closeOnEscape);
        return () => {
            window.removeEventListener("keydown", closeOnEscape);
            focusChatLauncher();
        };
    }, [isChatOpen, focusChatLauncher]);

    async function analyzeResults(searchQuery, results) {
        if (!results.length) return;
        setIsAnalyzing(true);
        setAnalysisError("");
        try {
            const response = await fetch(`${API_BASE}/search/analyze/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: searchQuery, papers: results }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || data.error || "AI analysis failed.");
            setAnalyses(Object.fromEntries(
                (data.analyses || []).map((item) => [item.url, item]),
            ));
        } catch (requestError) {
            setAnalysisError(formatGroqError(requestError.message));
        } finally {
            setIsAnalyzing(false);
        }

    }

    async function search() {
        const searchQuery = query.trim();
        if (!searchQuery || isSearching) return;
        setIsSearching(true);
        setError("");
        setAnalysisError("");
        setAnalyses({});
        setComparison("");
        setCompareSelection([]);
        setChatMessages([]);
        setChatError("");
        setSelectedPaper(null);
        setIsChatOpen(false);
        const history = getLocal("search_history");
        const nextHistory = [searchQuery, ...history.filter((item) => item !== searchQuery)].slice(0, 8);
        localStorage.setItem("search_history", JSON.stringify(nextHistory));
        try {
            const response = await fetch(`${API_BASE}/search/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: searchQuery, top_k: 5 }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || data.error || "Search failed.");
            const results = data.results || [];
            setPapers(results);
            await analyzeResults(searchQuery, results);
        } catch (requestError) {
            setPapers([]);
            setError(requestError.message);
        } finally {
            setIsSearching(false);
        }

    }

    function refreshWorkspace() {
        localStorage.removeItem(RESEARCH_WORKSPACE_KEY);
        setQuery("");
        setPapers([]);
        setAnalyses({});
        setError("");
        setAnalysisError("");
        setCompareSelection([]);
        setComparison("");
        setComparisonError("");
        setChatMessages([]);
        setChatInput("");
        setChatError("");
        setIsChatOpen(false);
        setSelectedPaper(null);
    }

    const busy = isSearching || isAnalyzing;
    function toggleCompare(paper) {
        setCompareSelection((current) => current.some((item) => item.url === paper.url)
            ? current.filter((item) => item.url !== paper.url)
            : current.length < 5 ? [...current, paper] : current);
    }

    async function comparePapers() {
        if (compareSelection.length < 2 || isComparing) return;
        setIsComparing(true);
        setComparisonError("");
        try {
            const response = await fetch(`${API_BASE}/search/compare/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: query.trim(), papers: compareSelection }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || "Comparison failed.");
            setComparison(data.comparison || "");
        } catch (requestError) {
            setComparisonError(formatGroqError(requestError.message));
        } finally {
            setIsComparing(false);
        }
    }

    async function askChatbot() {
        const question = chatInput.trim();
        if (!question || !papers.length || isChatting) return;
        const userMessage = { role: "user", content: question };
        setChatError("");
        setPendingQuestion(question);
        setIsChatting(true);
        try {
            const contextPapers = papers.slice(0, 5).map((paper) => ({
                ...paper,
                analysis: analyses[paper.url]?.analysis || "",
            }));
            const response = await fetch(`${API_BASE}/search/chat/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: question,
                    research_query: query.trim(),
                    papers: contextPapers,
                    messages: chatMessages.slice(-6),
                }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.detail || "Chatbot request failed.");
            if (typeof data.answer !== "string" || !data.answer.trim()) {
                throw new Error("The assistant returned an empty reply. Please try again.");
            }
            setChatMessages((current) => [...current, userMessage, {
                role: "assistant",
                content: data.answer,
                keyPoints: data.key_points || [],
                sources: data.sources || [],
            }]);
            setChatInput("");
            fetch(`${API_BASE}/cache/`)
                .then((cacheResponse) => cacheResponse.ok ? cacheResponse.json() : null)
                .then((stats) => stats && setCacheStats(stats))
                .catch(() => {});
        } catch (requestError) {
            setChatError(formatGroqError(requestError.message));
        } finally {
            setPendingQuestion("");
            setIsChatting(false);
        }
    }

    return (
        <div className="min-h-screen bg-background">
            <NavBar />
            <div className={`mx-auto w-full px-5 md:px-8 ${isChatOpen ? "max-w-[1440px] lg:pr-[580px] xl:pr-[660px]" : "max-w-7xl"}`}>
            <main className="relative min-w-0 w-full pb-20 pt-10 transition-[padding] duration-300 md:pt-16">
                <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
                <div className="pointer-events-none absolute right-0 top-40 h-80 w-80 rounded-full bg-secondary/10 blur-3xl" />

                <section className="relative mb-10 animate-fade-up">
                    <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                        <Sparkles size={14} /> Semantic discovery
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-default-200/70 bg-background/50 px-3 py-2 text-xs text-default-500">
                        <span className="flex items-center gap-2"><Database size={14} /> Cached PDFs: {cacheStats.count} · {formatBytes(cacheStats.total_bytes)}</span>
                        <Button
                            isIconOnly
                            aria-label="Clear cached PDFs"
                            color="danger"
                            isDisabled={!cacheStats.count}
                            size="sm"
                            variant="light"
                            onPress={async () => {
                                await fetch(`${API_BASE}/cache/`, { method: "DELETE" });
                                setCacheStats({ count: 0, total_bytes: 0 });
                            }}
                        >
                            <Trash2 size={14} />
                        </Button>
                    </div>
                    <h1 className="max-w-4xl text-4xl font-bold leading-[1.05] tracking-tight md:text-7xl">
                        Find the papers that move your research <span className="text-gradient">forward.</span>
                    </h1>
                    <p className="mt-5 max-w-2xl text-base leading-7 text-default-500 md:text-lg">
                        Ask a question. Search Me finds the five closest papers locally, then
                        automatically creates a concise Groq analysis for each one.
                    </p>
                </section>

                <Card className="relative mb-12 overflow-visible border border-primary/20 bg-content1/75 shadow-2xl shadow-primary/5 backdrop-blur-xl animate-fade-up-delay">
                    <div className="absolute -inset-px -z-10 rounded-[inherit] bg-gradient-to-r from-primary/30 via-transparent to-secondary/30 opacity-70 blur-sm" />
                    <CardBody className="gap-5 p-5 md:p-7">
                        <div className="flex flex-col gap-3 md:flex-row">
                            <Input
                                aria-label="Research question"
                                className="flex-1"
                                classNames={{ inputWrapper: "bg-background/70 border border-default-200/50" }}
                                label="Research question"
                                placeholder="e.g. vision-language models for medical imaging"
                                startContent={<Search className="text-primary" size={19} />}
                                value={query}
                                onValueChange={setQuery}
                                onKeyDown={(event) => event.key === "Enter" && search()}
                            />
                            <Button
                                className="h-14 px-7 font-semibold shadow-lg shadow-primary/20 transition-transform hover:scale-[1.02]"
                                color="primary"
                                isLoading={isSearching}
                                startContent={!isSearching && <Search size={18} />}
                                onPress={search}
                            >
                                Search papers
                            </Button>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-default-500">
                            <span className="flex items-center gap-2">
                                <span className={`status-dot ${busy ? "status-dot-pulse" : ""}`} />
                                {isSearching ? "Searching the local index..." : isAnalyzing ? "Writing concise AI insights..." : papers.length ? `${papers.length} papers found` : "Ready when you are"}
                            </span>
                            <Button as={Link} to="/favorites" size="sm" variant="light" startContent={<Heart size={16} />}>
                                Saved papers
                            </Button>
                            <Button size="sm" variant="light" startContent={<RefreshCw size={15} />} onPress={refreshWorkspace}>
                                Refresh workspace
                            </Button>
                        </div>
                    </CardBody>
                </Card>

                {error && <Alert className="relative mb-6 animate-fade-up" color="danger" title={error} />}
                {analysisError && (
                    <Alert
                        className="relative mb-6 animate-fade-up"
                        color="warning"
                        title={`Papers loaded, but AI analysis is unavailable: ${analysisError}`}
                    />
                )}

                {isSearching && <SearchSkeleton />}

                {!isSearching && papers.length > 0 && (
                    <section className="relative space-y-5">
                        <div className="flex flex-col justify-between gap-3 border-b border-default-200/60 pb-5 sm:flex-row sm:items-end">
                            <div>
                                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">Your results</p>
                                <h2 className="text-2xl font-bold md:text-3xl">Relevant papers</h2>
                            </div>
                            {selectedPaper && (
                                <div className="fixed inset-0 z-[60] bg-black/60 p-3 backdrop-blur-sm sm:p-6" onClick={() => setSelectedPaper(null)}>
                                    <Card className="mx-auto flex h-full w-full max-w-6xl overflow-hidden border border-default-200/70 bg-content1 shadow-2xl" onClick={(event) => event.stopPropagation()}>
                                        <CardBody className="flex h-full flex-col gap-3 p-3 sm:p-5">
                                            <div className="flex items-center justify-between gap-3 border-b border-default-200/70 pb-3">
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <BookOpen className="shrink-0 text-primary" size={18} />
                                                    <h2 className="truncate font-semibold">{selectedPaper.title}</h2>
                                                </div>
                                                <Button isIconOnly aria-label="Close reading mode" variant="light" onPress={() => setSelectedPaper(null)}><X size={18} /></Button>
                                            </div>
                                            <iframe className="min-h-0 flex-1 rounded-xl bg-default-100" src={selectedPaper.url} title={`Reading ${selectedPaper.title}`} />
                                        </CardBody>
                                    </Card>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/15 bg-primary/5 p-3 text-sm">
                            <span className="text-default-600">Select 2–5 papers to compare with Groq.</span>
                            <Button
                                color="secondary"
                                isLoading={isComparing}
                                isDisabled={compareSelection.length < 2}
                                size="sm"
                                onPress={comparePapers}
                            >
                                Compare selected ({compareSelection.length}/5)
                            </Button>
                        </div>
                        {comparisonError && <Alert color="warning" title={comparisonError} />}
                        {comparison && (
                            <Card className="border border-secondary/20 bg-secondary/5">
                                <CardBody className="flex-row gap-3 p-4 text-sm leading-6">
                                    <Sparkles className="mt-1 shrink-0 text-secondary" size={17} />
                                    <div><strong className="text-secondary">Comparison:</strong> {comparison}</div>
                                    <Button isIconOnly aria-label="Close comparison" size="sm" variant="light" onPress={() => setComparison("")}><X size={16} /></Button>
                                </CardBody>
                            </Card>
                        )}
                        {papers.map((paper, index) => (
                            <PaperCard
                                key={`${paper.url}-${index}`}
                                analysis={analyses[paper.url]}
                                index={index}
                                isAnalyzing={isAnalyzing}
                                paper={paper}
                                isSelected={compareSelection.some((item) => item.url === paper.url)}
                                onToggleCompare={toggleCompare}
                                onOpenReadingMode={setSelectedPaper}
                            />
                        ))}
                    </section>
                )}

                {!isSearching && !papers.length && !error && <EmptyState />}
            </main>
            {papers.length > 0 && (
                <>
                    {!isChatOpen && (
                        <Button
                            ref={chatLauncherRef}
                            aria-label="Open paper assistant"
                            className="fixed bottom-6 right-6 z-40 gap-2 rounded-full px-5 font-semibold shadow-xl shadow-primary/25"
                            color="primary"
                            startContent={<Bot size={18} />}
                            onPress={() => setIsChatOpen(true)}
                        >
                            Paper assistant
                        </Button>
                    )}
                    {isChatOpen && (
                        <>
                        <button type="button" tabIndex={-1} aria-hidden="true" className="fixed inset-x-0 bottom-0 top-16 z-40 bg-black/50 lg:hidden" onClick={() => setIsChatOpen(false)} />
                        <aside ref={chatDialogRef} role="dialog" aria-modal="true" aria-labelledby="paper-assistant-title" className="fixed inset-x-0 bottom-0 top-16 z-50 animate-fade-up lg:left-auto lg:right-0 lg:w-[560px] lg:p-3 xl:w-[640px]">
                            <Card className="h-full overflow-hidden border border-primary/35 bg-content1 shadow-2xl shadow-primary/15 ring-1 ring-primary/15 backdrop-blur-xl lg:h-[calc(100vh-5.5rem)]">
                                <CardBody className="flex h-full flex-col gap-4 p-4 sm:p-5">
                                    <div className="flex items-start justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="rounded-xl bg-primary/10 p-2 text-primary"><Bot size={19} /></div>
                                            <div>
                                                <h3 id="paper-assistant-title" className="text-base font-bold">Paper assistant</h3>
                                                <p className="mt-0.5 text-xs text-default-500">Ask questions about your current results.</p>
                                            </div>
                                        </div>
                                        <Button isIconOnly aria-label="Close paper assistant" size="sm" variant="light" onPress={() => setIsChatOpen(false)}>
                                            <X size={18} />
                                        </Button>
                                    </div>
                                    <div className="flex items-center justify-between rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-xs">
                                        <span className="flex items-center gap-2 text-default-600"><span className="status-dot" /> PDF context ready on demand</span>
                                        <span className="font-semibold text-primary">{papers.slice(0, 5).length} papers</span>
                                    </div>
                                    {(chatMessages.length > 0 || pendingQuestion) && (
                                        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-xl bg-background/60 p-3">
                                            {chatMessages.map((message, index) => (
                                                <div key={`${message.role}-${index}`} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                                                    {message.role === "user" ? (
                                                        <p className="max-w-[88%] rounded-2xl bg-primary px-3 py-2 text-sm leading-6 text-primary-foreground">{message.content}</p>
                                                    ) : (
                                                        <ChatAnswer message={message} />
                                                    )}
                                                </div>
                                            ))}
                                            {pendingQuestion && <div className="flex justify-end"><p className="max-w-[88%] rounded-2xl bg-primary/70 px-3 py-2 text-sm text-primary-foreground">{pendingQuestion}</p></div>}
                                            {isChatting && <div className="flex items-center gap-2 px-2 text-xs text-default-500" role="status"><Spinner size="sm" /> Searching the selected papers…</div>}
                                            <div ref={chatEndRef} />
                                        </div>
                                    )}
                                    {chatMessages.length === 0 && !pendingQuestion && (
                                        <div className="flex min-h-0 flex-1 flex-col justify-center rounded-xl border border-dashed border-default-200 bg-background/40 p-5 text-center">
                                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Bot size={22} /></div>
                                            <p className="font-medium">Explore your research set</p>
                                            <p className="mt-1 text-xs leading-5 text-default-500">The assistant can read relevant passages from the five cached PDFs when you ask a question.</p>
                                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                                                {["Compare the methods", "What are the research gaps?"].map((prompt) => (
                                                    <Button key={prompt} size="sm" variant="flat" onPress={() => setChatInput(prompt)}>{prompt}</Button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {chatError && <Alert color="warning" title={chatError} />}
                                    <div className="flex items-end gap-2">
                                        <Input
                                            classNames={{ inputWrapper: "bg-background/70 border border-default-200/60" }}
                                            aria-label="Ask about the five best papers"
                                            placeholder="Ask about methods or gaps..."
                                            maxLength={500}
                                            value={chatInput}
                                            onValueChange={setChatInput}
                                            isDisabled={isChatting}
                                            onKeyDown={(event) => {
                                                if (event.key === "Enter" && !event.shiftKey) {
                                                    event.preventDefault();
                                                    askChatbot();
                                                }
                                            }}
                                        />
                                        <Button
                                            aria-label="Send chatbot question"
                                            color="primary"
                                            className="min-w-11"
                                            isDisabled={isChatting || !chatInput.trim()}
                                            isLoading={isChatting}
                                            onPress={askChatbot}
                                        >
                                            <Send size={17} />
                                        </Button>
                                    </div>
                                </CardBody>
                            </Card>
                        </aside>
                        </>
                    )}
                </>
            )}
            </div>
        </div>
    );
}

function SearchSkeleton() {
    return (
        <div className="relative space-y-4">
            <div className="skeleton h-8 w-52 rounded-lg" />
            {[1, 2, 3].map((item) => (
                <Card key={item} className="border border-default-200/60 bg-content1/60">
                    <CardBody className="gap-4 p-6">
                        <div className="skeleton h-5 w-3/4 rounded" />
                        <div className="skeleton h-16 w-full rounded" />
                        <div className="skeleton h-4 w-1/3 rounded" />
                    </CardBody>
                </Card>
            ))}
        </div>
    );
}

function EmptyState() {
    return (
        <div className="relative overflow-hidden rounded-3xl border border-dashed border-default-300/70 bg-content1/30 px-6 py-24 text-center animate-fade-up">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Search size={30} />
            </div>
            <h2 className="text-xl font-semibold">Your next discovery starts here</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-default-500">
                Search by research question, method, or topic to explore the curated local collection.
            </p>
        </div>
    );
}

function ChatAnswer({ message }) {
    return (
        <div className="w-full max-w-[96%] rounded-2xl border border-primary/15 bg-content1 px-4 py-3 text-sm leading-6 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                <Bot size={14} /> Assistant answer
            </div>
            <p className="text-default-700">{message.content}</p>
            {message.keyPoints?.length > 0 && (
                <div className="mt-3 border-t border-default-200/70 pt-2">
                    <p className="mb-1 text-xs font-semibold text-default-500">Key points</p>
                    <ul className="space-y-1 text-xs text-default-600">
                        {message.keyPoints.map((point, index) => <li key={index} className="flex gap-2"><span className="text-primary">•</span>{point}</li>)}
                    </ul>
                </div>
            )}
            {message.sources?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-default-200/70 pt-2">
                    {message.sources.map((source) => <Chip key={source} size="sm" variant="flat" color="secondary">{source}</Chip>)}
                </div>
            )}
        </div>
    );
}

function PaperCard({ paper, analysis, index, isAnalyzing, isSelected, onToggleCompare, onOpenReadingMode }) {
    const [saved, setSaved] = useState(() => getFavorites().some((item) => item.url === paper.url));
    const tags = parseList(paper.keyphrases_extracted).slice(0, 5);

    function toggleSaved() {
        const favorites = getFavorites();
        const next = saved ? favorites.filter((item) => item.url !== paper.url) : [...favorites, paper];
        localStorage.setItem("favorite_papers", JSON.stringify(next));
        setSaved(!saved);
    }

    return (
        <Card className="paper-card border border-default-200/70 bg-content1/70 backdrop-blur-sm animate-fade-up" style={{ animationDelay: `${index * 80}ms` }}>
            <CardBody className="gap-5 p-5 md:p-7">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <Chip className="font-semibold" size="sm" variant="flat" color="secondary">#{index + 1} · {Math.round(Number(paper.score || 0) * 100)}% match</Chip>
                            {tags.map((tag) => <Chip key={tag} size="sm" variant="flat" color="primary">{tag}</Chip>)}
                            {paper.duplicate_of && <Chip size="sm" variant="flat" color="warning">Similar to another result</Chip>}
                        </div>
                        <a className="block text-xl font-bold leading-tight transition-colors hover:text-primary md:text-2xl" href={paper.url} target="_blank" rel="noreferrer">
                            {paper.title}
                        </a>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        <Button
                            isIconOnly
                            aria-label={isSelected ? "Remove paper from comparison" : "Add paper to comparison"}
                            color={isSelected ? "secondary" : "default"}
                            variant={isSelected ? "flat" : "light"}
                            onPress={() => onToggleCompare(paper)}
                        >
                            {isSelected ? <Check size={18} /> : <span className="text-xs font-bold">+2</span>}
                        </Button>
                        <Button isIconOnly aria-label={saved ? "Remove from saved papers" : "Save paper"} color={saved ? "danger" : "default"} variant="light" onPress={toggleSaved}>
                            <Heart fill={saved ? "currentColor" : "none"} size={20} />
                        </Button>
                    </div>
                </div>
                <p className="line-clamp-3 text-sm leading-6 text-default-500">
                    {paper.abstract || "Abstract is not included in the preserved metadata for this paper."}
                </p>
                {isAnalyzing && !analysis && (
                    <div className="flex items-center gap-3 rounded-xl border border-secondary/20 bg-secondary/5 p-3 text-sm text-default-500">
                        <Spinner color="secondary" size="sm" /> Preparing concise Groq insight...
                    </div>
                )}
                {analysis && (
                    <div className="flex gap-3 rounded-xl border border-secondary/20 bg-secondary/5 p-4 text-sm leading-6">
                        <Lightbulb className="mt-0.5 shrink-0 text-secondary" size={17} />
                        <div className="space-y-1">
                            <p className="line-clamp-3"><strong className="text-secondary">AI insight:</strong> {analysis.analysis}</p>
                        </div>
                    </div>
                )}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-default-200 pt-4 text-sm text-default-500">
                    <span className="max-w-full truncate"><strong>Authors:</strong> {paper.authors || "Not listed"}</span>
                    <span><strong>Published:</strong> {paper.year || "Not listed"}</span>
                    <Button size="sm" variant="flat" startContent={<BookOpen size={14} />} onPress={() => onOpenReadingMode(paper)}>Reading mode</Button>
                    <a className="flex items-center gap-1 font-semibold text-primary transition-transform hover:translate-x-1" href={paper.url} target="_blank" rel="noreferrer">Open PDF <ExternalLink size={15} /></a>
                </div>
            </CardBody>
        </Card>
    );
}

function getFavorites() {
    try { return JSON.parse(localStorage.getItem("favorite_papers") || "[]"); } catch { return []; }
}

function getLocal(key) {
    try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}

function loadResearchWorkspace() {
    try {
        return JSON.parse(localStorage.getItem(RESEARCH_WORKSPACE_KEY) || "null");
    } catch {
        return null;
    }
}

function saveResearchWorkspace(workspace) {
    try {
        localStorage.setItem(RESEARCH_WORKSPACE_KEY, JSON.stringify(workspace));
    } catch {
        // Workspace persistence is best effort when browser storage is unavailable.
    }
}

function formatGroqError(message) {
    if (/rate limit|429/i.test(message)) {
        return "Groq free-tier rate limit reached. Please wait a moment before trying again.";
    }
    return message;
}

function formatBytes(bytes) {
    if (!bytes) return "0 MB";
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function parseList(value) {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    return String(value).replaceAll("[", "").replaceAll("]", "").replaceAll("'", "").split(",").map((item) => item.trim()).filter(Boolean);
}
