import { useEffect, useRef } from "react";
import { AMERICAS, CORRIDOR_CITIES } from "@/components/landing/americas";

/**
 * Dotted Americas with the payment corridors arcing out of the United States.
 * Land dots come from a simplified Natural Earth outline, tested once.
 */
export function CoverageGlobe() {
	const host = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = host.current;
		if (!el) return;

		let cancel = false;
		let teardown = () => {};

		void mountGlobe(el, {
			cancelled: () => cancel,
			onReady: (dispose) => {
				teardown = dispose;
			},
		});

		return () => {
			cancel = true;
			teardown();
		};
	}, []);

	return (
		<div
			ref={host}
			className="coverage-stage"
			role="img"
			aria-label="Dotted globe of the Americas with payment corridors arcing from the United States to Mexico, Colombia, Brazil and Argentina."
		/>
	);
}

function isLand(lon: number, lat: number) {
	let inside = false;
	for (const ring of AMERICAS) {
		let hit = false;
		for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
			const [xi, yi] = ring[i];
			const [xj, yj] = ring[j];
			if (
				yi > lat !== yj > lat &&
				lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
			) {
				hit = !hit;
			}
		}
		if (hit) inside = !inside;
	}
	return inside;
}

async function mountGlobe(
	el: HTMLDivElement,
	life: { cancelled: () => boolean; onReady: (dispose: () => void) => void },
) {
	const THREE = await import("three");
	if (life.cancelled()) return;

	const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	const DEG = Math.PI / 180;

	const latLon = (lat: number, lon: number, radius: number) => {
		const phi = (90 - lat) * DEG;
		const theta = (lon + 180) * DEG;
		return new THREE.Vector3(
			-radius * Math.sin(phi) * Math.cos(theta),
			radius * Math.cos(phi),
			radius * Math.sin(phi) * Math.sin(theta),
		);
	};

	const renderer = new THREE.WebGLRenderer({
		antialias: true,
		alpha: true,
		powerPreference: "high-performance",
	});
	renderer.setClearColor(0x000000, 0);
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.domElement.style.display = "block";
	renderer.domElement.style.width = "100%";
	renderer.domElement.style.height = "100%";
	el.appendChild(renderer.domElement);

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
	camera.position.set(0.05, 0.42, 4.25);
	camera.lookAt(0, 0, 0);

	const globe = new THREE.Group();
	globe.scale.setScalar(0.9);
	scene.add(globe);

	const land: number[] = [];
	for (let lat = -56; lat <= 72; lat += 1.7) {
		const cos = Math.max(0.28, Math.cos(lat * DEG));
		const step = 1.7 / cos;
		for (let lon = -168; lon <= -28; lon += step) {
			if (!isLand(lon, lat)) continue;
			const p = latLon(lat, lon, 1);
			land.push(p.x, p.y, p.z);
		}
	}
	const landGeom = new THREE.BufferGeometry();
	landGeom.setAttribute("position", new THREE.Float32BufferAttribute(land, 3));
	globe.add(
		new THREE.Points(
			landGeom,
			new THREE.PointsMaterial({
				color: 0xffff67,
				size: 0.03,
				transparent: true,
				opacity: 0.95,
				depthWrite: false,
				sizeAttenuation: true,
			}),
		),
	);

	const grid: number[] = [];
	for (let lat = -75; lat <= 75; lat += 12) {
		for (let lon = -180; lon < 180; lon += 6) {
			const p = latLon(lat, lon, 0.992);
			grid.push(p.x, p.y, p.z);
		}
	}
	for (let lon = -180; lon < 180; lon += 15) {
		for (let lat = -75; lat <= 75; lat += 6) {
			const p = latLon(lat, lon, 0.992);
			grid.push(p.x, p.y, p.z);
		}
	}
	const gridGeom = new THREE.BufferGeometry();
	gridGeom.setAttribute("position", new THREE.Float32BufferAttribute(grid, 3));
	globe.add(
		new THREE.Points(
			gridGeom,
			new THREE.PointsMaterial({
				color: 0x6a6840,
				size: 0.012,
				transparent: true,
				opacity: 0.45,
				depthWrite: false,
				sizeAttenuation: true,
			}),
		),
	);

	const city = (name: string) =>
		CORRIDOR_CITIES.find((entry) => entry.name === name);
	const origin = city("United States");
	const destinations = ["Mexico", "Colombia", "Brazil", "Argentina"]
		.map((name) => city(name))
		.filter((entry) => entry != null);

	const curves: Array<{
		curve: THREE.CatmullRomCurve3;
		pulse: THREE.Mesh;
	}> = [];
	const node = new THREE.SphereGeometry(0.022, 16, 16);
	const nodeMat = new THREE.MeshBasicMaterial({ color: 0xffff67 });

	const place = (at: THREE.Vector3) => {
		const marker = new THREE.Mesh(node, nodeMat);
		marker.position.copy(at);
		globe.add(marker);
	};

	if (origin) {
		const from = latLon(origin.lat, origin.lon, 1);
		place(from);

		for (const dest of destinations) {
			const to = latLon(dest.lat, dest.lon, 1);
			place(to);

			const points: THREE.Vector3[] = [];
			for (let i = 0; i <= 48; i++) {
				const t = i / 48;
				const dot = THREE.MathUtils.clamp(from.dot(to), -1, 1);
				const omega = Math.acos(dot);
				const p =
					omega < 1e-4
						? from.clone()
						: from
								.clone()
								.multiplyScalar(Math.sin((1 - t) * omega) / Math.sin(omega))
								.add(
									to
										.clone()
										.multiplyScalar(Math.sin(t * omega) / Math.sin(omega)),
								);
				p.normalize().multiplyScalar(1.015 + Math.sin(Math.PI * t) * 0.22);
				points.push(p);
			}
			const curve = new THREE.CatmullRomCurve3(points);
			globe.add(
				new THREE.Mesh(
					new THREE.TubeGeometry(curve, 56, 0.0045, 6, false),
					new THREE.MeshBasicMaterial({
						color: 0xffff67,
						transparent: true,
						opacity: 0.9,
					}),
				),
			);
			const pulse = new THREE.Mesh(
				new THREE.SphereGeometry(0.016, 12, 12),
				new THREE.MeshBasicMaterial({ color: 0xfffff0 }),
			);
			globe.add(pulse);
			curves.push({ curve, pulse });
		}
	}

	const resize = () => {
		const width = el.clientWidth;
		const height = el.clientHeight;
		if (width === 0 || height === 0) return;
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
		renderer.setSize(width, height, false);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
	};
	resize();
	const resizeObserver = new ResizeObserver(resize);
	resizeObserver.observe(el);

	let visible = true;
	const visibility = new IntersectionObserver(([entry]) => {
		visible = entry?.isIntersecting ?? true;
	});
	visibility.observe(el);

	const clock = new THREE.Clock();
	let frame = 0;
	const draw = () => {
		if (!reduce) frame = requestAnimationFrame(draw);
		if (!visible && !reduce) return;
		const t = clock.getElapsedTime();
		globe.rotation.y = reduce ? 0.15 : 0.15 + t * 0.42;
		curves.forEach((entry, index) => {
			const along = reduce ? 0.45 : (t * 0.13 + index * 0.23) % 1;
			entry.pulse.position.copy(entry.curve.getPoint(along));
		});
		renderer.render(scene, camera);
	};
	draw();

	const dispose = () => {
		cancelAnimationFrame(frame);
		resizeObserver.disconnect();
		visibility.disconnect();
		scene.traverse((obj) => {
			const mesh = obj as THREE.Mesh;
			if (mesh.geometry) mesh.geometry.dispose();
			const materials =
				mesh.material == null
					? []
					: Array.isArray(mesh.material)
						? mesh.material
						: [mesh.material];
			for (const material of materials) material.dispose();
		});
		renderer.dispose();
		if (renderer.domElement.parentElement === el) {
			el.removeChild(renderer.domElement);
		}
	};

	if (life.cancelled()) {
		dispose();
		return;
	}
	life.onReady(dispose);
}
