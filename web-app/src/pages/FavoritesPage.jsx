import React, { useMemo, useState } from 'react';
import { Card, CardBody, Button, Chip, Select, SelectItem } from "@nextui-org/react";
import { ArrowLeft, Download, ExternalLink, Calendar, BookOpen, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import NavBar from "../components/NavBar";

const FavoritesPage = () => {
    const [favorites, setFavorites] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('favorite_papers') || '[]');
        } catch {
            return [];
        }
    });
    const [collections, setCollections] = useState(() => getCollections());
    const [activeCollection, setActiveCollection] = useState("All papers");

    const visibleFavorites = useMemo(
        () => activeCollection === "All papers"
            ? favorites
            : favorites.filter((paper) => (paper.collection || "All papers") === activeCollection),
        [activeCollection, favorites],
    );

    const removeFavorite = (url) => {
        const newFavorites = favorites.filter(paper => paper.url !== url);
        setFavorites(newFavorites);
        localStorage.setItem('favorite_papers', JSON.stringify(newFavorites));
    };

    const updateCollection = (url, collection) => {
        const next = favorites.map((paper) => paper.url === url ? { ...paper, collection } : paper);
        setFavorites(next);
        localStorage.setItem('favorite_papers', JSON.stringify(next));
    };

    const addCollection = () => {
        const name = window.prompt("Name this collection");
        if (!name?.trim()) return;
        const cleanName = name.trim();
        const next = [...new Set([...collections, cleanName])];
        setCollections(next);
        localStorage.setItem("paper_collections", JSON.stringify(next));
    };

    const exportPapers = (format) => {
        const content = format === "bibtex"
            ? visibleFavorites.map(toBibtex).join("\n\n")
            : visibleFavorites.map((paper) => `## ${paper.title}\n\n- Authors: ${paper.authors || "Not listed"}\n- Year: ${paper.year || "Not listed"}\n- URL: ${paper.url}\n\n${paper.abstract || ""}`).join("\n\n");
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `search-me-${activeCollection.toLowerCase().replaceAll(" ", "-")}.${format === "bibtex" ? "bib" : "md"}`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    return (
        <div className="min-h-screen">
            <NavBar />
            <div className="mx-auto max-w-7xl space-y-8 px-6 py-10 md:px-12 md:py-14">
                {/* Header */}
                <div className="relative z-10 flex flex-col gap-4">
                    <Link to="/research" className="inline-flex items-center text-sm text-default-500 hover:text-primary transition-colors">
                        <ArrowLeft size={16} className="mr-2" />
                        Back to Search
                    </Link>
                    <div>
                        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                            My Favorites
                        </h1>
                        <p className="text-default-500 mt-2">{favorites.length} saved papers</p>
                        <div className="flex flex-wrap items-center gap-2">
                            <Select
                                aria-label="Filter saved papers by collection"
                                className="w-44"
                                selectedKeys={[activeCollection]}
                                size="sm"
                                onSelectionChange={(keys) => setActiveCollection([...keys][0] || "All papers")}
                            >
                                {collections.map((collection) => <SelectItem key={collection}>{collection}</SelectItem>)}
                            </Select>
                            <Button size="sm" startContent={<Plus size={15} />} variant="flat" onPress={addCollection}>New collection</Button>
                            <Button isDisabled={!visibleFavorites.length} size="sm" startContent={<Download size={15} />} variant="light" onPress={() => exportPapers("bibtex")}>BibTeX</Button>
                            <Button isDisabled={!visibleFavorites.length} size="sm" variant="light" onPress={() => exportPapers("markdown")}>Markdown</Button>
                        </div>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 gap-6">
                    {visibleFavorites.length === 0 ? (
                        <div className="text-center py-20 rounded-3xl border border-default-200/70 bg-content1/80 shadow-sm backdrop-blur">
                            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                                <BookOpen size={32} />
                            </div>
                            <h3 className="text-xl font-semibold text-foreground">
                                {favorites.length ? "No papers in this collection" : "No favorites yet"}
                            </h3>
                            <p className="text-default-500 mt-2 max-w-sm mx-auto">
                                Start by searching for papers and click the heart icon to save them here.
                            </p>
                            <Button
                                as={Link}
                                to="/research"
                                color="primary"
                                variant="flat"
                                className="mt-6"
                            >
                                Browse Papers
                            </Button>
                        </div>
                    ) : (
                        visibleFavorites.map((paper, index) => (
                            <FavoriteCard
                                key={index}
                                paper={paper}
                                onRemove={() => removeFavorite(paper.url)}
                            collections={collections}
                            onCollectionChange={updateCollection}
                        />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

const FavoriteCard = ({ paper, onRemove, collections, onCollectionChange }) => {
    // Helper to safely parse lists
    const parseListString = (str) => {
        if (Array.isArray(str)) return str;
        if (!str) return [];
        try {
            // Handle string representation of list like "['a', 'b']"
            const cleaned = str.replaceAll("[", "").replaceAll("]", "").replaceAll("'", "");
            return cleaned.split(",").map(s => s.trim()).filter(Boolean);
        } catch {
            return [str];
        }
    };

    const authors = parseListString(paper.authors);
    const tags = parseListString(paper.keyphrases_extracted);

    return (
        <Card className="paper-card border border-default-200/70 shadow-sm bg-content1/80 backdrop-blur group">
            <CardBody className="p-6">
                <div className="flex flex-col gap-4">
                    {/* Tags */}
                    <div className="flex flex-wrap gap-2">
                        {tags.slice(0, 3).map((tag, i) => (
                            <Chip key={i} size="sm" variant="flat" className="bg-primary/10 text-primary border-none">
                                {tag}
                            </Chip>
                        ))}
                    </div>

                    {/* Title */}
                    <div className="flex justify-between items-start gap-4">
                        <a href={paper.url} target="_blank" rel="noopener noreferrer" className="group-hover:text-blue-600 transition-colors">
                            <h3 className="text-xl font-bold text-foreground leading-tight">
                                {paper.title}
                            </h3>
                        </a>
                        <Button
                            isIconOnly
                            variant="light"
                            color="danger"
                            onPress={onRemove}
                            className="min-w-10 h-10"
                        >
                            <Trash2 size={20} />
                        </Button>
                    </div>

                    {/* Abstract / Explanation */}
                    <p className="text-default-600 text-sm leading-relaxed line-clamp-3">
                        {paper.abstract}
                    </p>

                    {/* Footer */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-default-400 mt-2 border-t border-default-200/70 pt-4">
                        <div className="flex items-center gap-2 truncate max-w-full md:max-w-[50%]">
                            <span className="font-medium text-default-600">Authors:</span>
                            {authors.join(", ")}
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar size={14} />
                            <span>{paper.year !== "nan" ? paper.year : "N/A"}</span>
                        </div>
                        <div className="ml-auto">
                            <a
                                href={paper.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-primary hover:text-primary-600 font-medium"
                            >
                                Read Paper <ExternalLink size={14} />
                            </a>
                        </div>
                        <Select
                            aria-label={`Collection for ${paper.title}`}
                            className="w-40"
                            selectedKeys={[paper.collection || "All papers"]}
                            size="sm"
                            onSelectionChange={(keys) => onCollectionChange(paper.url, [...keys][0] || "All papers")}
                        >
                            {collections.map((collection) => <SelectItem key={collection}>{collection}</SelectItem>)}
                        </Select>
                    </div>
                </div>
            </CardBody>
        </Card>
    );
};

function getCollections() {
    try {
        const saved = JSON.parse(localStorage.getItem("paper_collections") || "[]");
        return ["All papers", ...saved.filter((item) => item !== "All papers")];
    } catch {
        return ["All papers"];
    }
}

function toBibtex(paper, index) {
    const key = `${String(paper.title || "paper").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`;
    return `@article{${key},\n  title = {${paper.title || "Untitled paper"}},\n  author = {${paper.authors || "Unknown"}},\n  year = {${paper.year || ""}},\n  url = {${paper.url || ""}}\n}`;
}

export default FavoritesPage;
