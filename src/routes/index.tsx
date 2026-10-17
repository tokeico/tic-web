import { createFileRoute } from "@tanstack/react-router";
import Close from "../components/landing/Close";
import Confianza from "../components/landing/Confianza";
import CorridorTicker from "../components/landing/CorridorTicker";
import Hero from "../components/landing/Hero";
import HowItWorks from "../components/landing/HowItWorks";
import RouteCard from "../components/landing/RouteCard";
import WeKeepWatch from "../components/landing/WeKeepWatch";
import WhyCorredor from "../components/landing/WhyCorredor";
import WhyNow from "../components/landing/WhyNow";

export const Route = createFileRoute("/")({ component: LandingPage });

function LandingPage() {
	return (
		<main>
			<Hero />
			<CorridorTicker />
			<RouteCard />
			<Confianza />
			<WeKeepWatch />
			<HowItWorks />
			<WhyNow />
			<WhyCorredor />
			<Close />
		</main>
	);
}
