import { Button, Card, CardBody } from "@nextui-org/react";
import { ArrowRight, Database, FileSearch, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";

export default function LandingPage() {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen bg-background">
            <NavBar />
            <main className="mx-auto max-w-6xl px-5 py-20 md:py-32">
                <section className="grid items-center gap-12 md:grid-cols-[1.2fr_0.8fr]">
                    <div>
                        <p className="mb-5 text-sm font-semibold uppercase tracking-[0.3em] text-primary">Semantic research workspace</p>
                        <h1 className="text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">Research less.<br /><span className="text-primary">Understand more.</span></h1>
                        <p className="mt-7 max-w-xl text-lg leading-8 text-default-500">Search Me turns your curated arXiv collection into a fast, visual research companion powered by local semantic search and automatic Groq synthesis.</p>
                        <Button className="mt-9 px-7 font-semibold" color="primary" size="lg" endContent={<ArrowRight size={18} />} onPress={() => navigate("/research")}>Start exploring</Button>
                    </div>
                    <div className="grid gap-4">
                        <Feature icon={<Database />} title="Curated local corpus" text="Search the corrected CSV metadata already included in this project." />
                        <Feature icon={<FileSearch />} title="Semantic retrieval" text="FAISS ranks papers from precomputed embeddings without live scraping." />
                        <Feature icon={<Sparkles />} title="Groq-powered analysis" text="Synthesize retrieved papers with the free Groq API and openai/gpt-oss-120b." />
                    </div>
                </section>
            </main>
        </div>
    );
}

function Feature({ icon, title, text }) {
    return <Card className="border border-default-200/70 bg-content1/70"><CardBody className="flex-row gap-4 p-5"><div className="rounded-xl bg-primary/10 p-3 text-primary">{icon}</div><div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm leading-6 text-default-500">{text}</p></div></CardBody></Card>;
}
