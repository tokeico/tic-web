import { Link } from "@tanstack/react-router";
import { Button } from "./ui/Button";
import { LogoLockup } from "./ui/Logo";

export default function Header() {
	return (
		<header className="site-header sticky top-0 z-50 px-4">
			<nav className="page-wrap-wide flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4">
				<h2 className="m-0 flex-shrink-0">
					<Link to="/" className="block">
						<LogoLockup layout="inline" />
					</Link>
				</h2>

				<div className="flex flex-wrap items-center gap-x-6 gap-y-2">
					<a className="nav-link" href="#how-it-works">
						How it works
					</a>
					<a className="nav-link" href="#confianza">
						Our name
					</a>
					<a className="nav-link" href="#why-now">
						Why now
					</a>
					<Button label="Come in" size="small" href="/app" />
				</div>
			</nav>
		</header>
	);
}
