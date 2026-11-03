import {
    Navbar,
    NavbarBrand,
    NavbarContent,
    NavbarItem,
    NavbarMenu,
    NavbarMenuItem,
    NavbarMenuToggle,
    Button,
} from "@nextui-org/react";
import { BookOpen, Compass, Heart, Moon, Search, Sun } from "lucide-react";
import { createElement, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTheme } from "../context/useTheme";

const links = [
    { label: "Home", to: "/", icon: Compass, end: true },
    { label: "Explore papers", to: "/research", icon: Search },
    { label: "Saved papers", to: "/favorites", icon: Heart },
];

export default function NavBar() {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    function goTo(path) {
        setIsMenuOpen(false);
        navigate(path);
    }

    const linkClass = ({ isActive }) =>
        `relative inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
            isActive
                ? "bg-primary/10 text-primary"
                : "text-default-600 hover:bg-default-100 hover:text-foreground"
        }`;

    return (
        <Navbar
            isMenuOpen={isMenuOpen}
            onMenuOpenChange={setIsMenuOpen}
            maxWidth="xl"
            className="border-b border-default-200/70 bg-background/75 backdrop-blur-xl"
            classNames={{ wrapper: "px-5 md:px-8" }}
        >
            <NavbarContent justify="start">
                <NavbarMenuToggle
                    aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                    className="sm:hidden"
                />
                <NavbarBrand className="w-auto cursor-pointer gap-2" onClick={() => goTo("/")}>
                    <span className="rounded-xl bg-primary/10 p-2 text-primary">
                        <BookOpen className="h-5 w-5" />
                    </span>
                    <p className="text-lg font-bold tracking-tight text-foreground">Search Me</p>
                </NavbarBrand>
            </NavbarContent>

            <NavbarContent className="hidden gap-1 sm:flex" justify="center">
                {links.map(({ label, to, end }) => (
                    <NavbarItem key={to}>
                        <NavLink className={linkClass} end={end} to={to}>
                            {label}
                        </NavLink>
                    </NavbarItem>
                ))}
            </NavbarContent>

            <NavbarContent justify="end">
                <NavbarItem>
                    <Button
                        isIconOnly
                        variant="light"
                        onPress={toggleTheme}
                        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
                        title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
                    >
                        {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </Button>
                </NavbarItem>
                <NavbarItem className="hidden sm:flex">
                    <Button
                        color="primary"
                        variant="flat"
                        className="font-semibold"
                        onPress={() => goTo("/research")}
                    >
                        Start exploring
                    </Button>
                </NavbarItem>
            </NavbarContent>

            <NavbarMenu className="border-t border-default-200/70 bg-background/95 pt-4">
                {links.map(({ label, to, icon, end }) => (
                    <NavbarMenuItem key={to}>
                        <NavLink
                            className={({ isActive }) =>
                                `${linkClass({ isActive })} w-full justify-start text-base`
                            }
                            end={end}
                            to={to}
                            onClick={() => setIsMenuOpen(false)}
                        >
                            {createElement(icon, { className: "h-4 w-4" })}
                            {label}
                        </NavLink>
                    </NavbarMenuItem>
                ))}
                <NavbarMenuItem className="mt-2 border-t border-default-200/70 pt-3">
                    <Button
                        className="w-full font-semibold"
                        color="primary"
                        onPress={() => goTo("/research")}
                    >
                        Start exploring
                    </Button>
                </NavbarMenuItem>
            </NavbarMenu>
        </Navbar>
    );
}
