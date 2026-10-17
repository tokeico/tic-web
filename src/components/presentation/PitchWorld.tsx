import { useEffect, useRef } from "react";
import type * as T from "three";
import { AMERICAS } from "@/components/landing/americas";

/**
 * The 3D layer behind the pitch deck: the Corredor coin, a dotted Americas
 * globe with the Miami corridors, and a drifting field of dust. One renderer,
 * one camera; each slide picks a "shot" and everything eases toward it.
 *
 * Slides steer it through `world` (a plain mutable object) so the deck can
 * change the Brazil corridor's state in step with its own timeline without
 * re-rendering React.
 */

export type BrazilState = "ok" | "blocked" | "rerouted";

type WorldState = {
	shot: number;
	brazil: BrazilState;
	/** 0..1, bumps the dust and packet speed for a beat on slide change */
	surge: number;
};

// Kept on globalThis so a hot reload of this module and the deck's import
// still share one object; otherwise the scene stops following the slides.
const g = globalThis as { __pitchWorld?: WorldState };
g.__pitchWorld ??= { shot: 0, brazil: "ok", surge: 0 };
export const world: WorldState = g.__pitchWorld;

type Shot = {
	cam: [number, number, number];
	look: [number, number, number];
	coin: { pos: [number, number, number]; scale: number };
	globe: {
		pos: [number, number, number];
		scale: number;
		lon: number;
		lat: number;
		alpha: number;
	};
	ring: number;
	bloom: number;
};

// One shot per slide. Units are world space; the camera sits on +Z.
const SHOTS: Shot[] = [
	// 0 · title: the coin owns the right half, the globe glows far behind it
	{
		cam: [0, 0, 9],
		look: [0, 0, 0],
		coin: { pos: [3.0, 0.3, 0], scale: 1.85 },
		globe: { pos: [3.4, -0.4, -7], scale: 3.4, lon: -78, lat: 8, alpha: 0.35 },
		ring: 1,
		bloom: 0.7,
	},
	// 1 · problem: Miami → Colombia, low on the right, behind the stats
	{
		cam: [0, 0, 9],
		look: [0, 0, 0],
		coin: { pos: [7.5, 4.5, -4], scale: 0.0001 },
		globe: {
			pos: [3.6, -1.2, -1.5],
			scale: 2.6,
			lon: -76,
			lat: 14,
			alpha: 0.28,
		},
		ring: 0,
		bloom: 0.63,
	},
	// 2 · why now: Brazil front and centre-right, the corridor that breaks
	{
		cam: [0, 0, 9],
		look: [0, 0, 0],
		coin: { pos: [7.5, 4.5, -4], scale: 0.0001 },
		globe: { pos: [3.0, -0.2, -1], scale: 2.7, lon: -62, lat: -6, alpha: 0.45 },
		ring: 0,
		bloom: 0.7,
	},
	// 3 · live demo: globe pulled back so the product UI reads
	{
		cam: [0, 0.2, 9.5],
		look: [0, 0, 0],
		coin: { pos: [-7, -4, -6], scale: 0.0001 },
		globe: { pos: [0, -3.4, -5], scale: 3.6, lon: -62, lat: -8, alpha: 0.22 },
		ring: 0,
		bloom: 0.59,
	},
	// 4 · how it works: the globe rises behind the cards as a horizon
	{
		cam: [0, -0.3, 9],
		look: [0, 0, 0],
		coin: { pos: [-7, -4, -6], scale: 0.0001 },
		globe: { pos: [0, -6.4, -3], scale: 5.2, lon: -70, lat: -2, alpha: 0.3 },
		ring: 0,
		bloom: 0.63,
	},
	// 5 · close: the coin comes back, ring and all
	{
		cam: [0, 0, 9],
		look: [0, 0, 0],
		coin: { pos: [3.6, -0.6, -0.5], scale: 1.75 },
		globe: { pos: [3.6, -0.6, -6], scale: 3.2, lon: -70, lat: 0, alpha: 0.3 },
		ring: 1,
		bloom: 0.73,
	},
	// 6 · backup money math
	{
		cam: [0, 0, 9],
		look: [0, 0, 0],
		coin: { pos: [5.4, 0.9, -3], scale: 0.85 },
		globe: {
			pos: [-5.2, -3.4, -6],
			scale: 3.2,
			lon: -70,
			lat: -4,
			alpha: 0.16,
		},
		ring: 0.6,
		bloom: 0.59,
	},
];

const VOLT = 0xffff67;
const CORAL = 0xfc6054;
const DEG = Math.PI / 180;

const MIAMI = { lat: 25.76, lon: -80.19 };
const CITIES = [
	{ id: "mx", lat: 19.43, lon: -99.13 },
	{ id: "co", lat: 4.71, lon: -74.07 },
	{ id: "br", lat: -23.55, lon: -46.63 },
	{ id: "ar", lat: -34.6, lon: -58.38 },
];

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

export function PitchWorld() {
	const host = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = host.current;
		if (!el) return;
		let cancelled = false;
		let dispose = () => {};
		void mount(el).then((d) => {
			if (cancelled) d();
			else dispose = d;
		});
		return () => {
			cancelled = true;
			dispose();
		};
	}, []);

	return <div ref={host} className="pz-world" aria-hidden="true" />;
}

async function mount(el: HTMLDivElement) {
	const [
		THREE,
		{ EffectComposer },
		{ RenderPass },
		{ UnrealBloomPass },
		{ OutputPass },
		{ GLTFLoader },
		{ RoomEnvironment },
	] = await Promise.all([
		import("three"),
		import("three/examples/jsm/postprocessing/EffectComposer.js"),
		import("three/examples/jsm/postprocessing/RenderPass.js"),
		import("three/examples/jsm/postprocessing/UnrealBloomPass.js"),
		import("three/examples/jsm/postprocessing/OutputPass.js"),
		import("three/examples/jsm/loaders/GLTFLoader.js"),
		import("three/examples/jsm/environments/RoomEnvironment.js"),
	]);

	const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	const renderer = new THREE.WebGLRenderer({
		antialias: true,
		powerPreference: "high-performance",
	});
	renderer.setClearColor(0x000000, 1);
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 0.85;
	el.appendChild(renderer.domElement);

	const scene = new THREE.Scene();
	scene.fog = new THREE.FogExp2(0x000000, 0.045);
	const pmrem = new THREE.PMREMGenerator(renderer);
	const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
	scene.environment = envTex;

	const camera = new THREE.PerspectiveCamera(34, 16 / 9, 0.1, 80);
	camera.position.set(0, 0, 9);
	const look = new THREE.Vector3();

	scene.add(new THREE.AmbientLight(0xffffff, 0.25));
	const key = new THREE.DirectionalLight(0xfff6c8, 1.3);
	key.position.set(-3, 4, 6);
	scene.add(key);
	const rim = new THREE.PointLight(VOLT, 10, 20, 1.6);
	rim.position.set(5, -1, -2);
	scene.add(rim);

	// --- dust: a deep box of slow points, parallax to the pointer -------------
	const DUST = 1800;
	const dustPos = new Float32Array(DUST * 3);
	const dustSeed = new Float32Array(DUST);
	for (let i = 0; i < DUST; i++) {
		dustPos[i * 3] = (Math.random() - 0.5) * 34;
		dustPos[i * 3 + 1] = (Math.random() - 0.5) * 20;
		dustPos[i * 3 + 2] = -Math.random() * 28 + 4;
		dustSeed[i] = Math.random();
	}
	const dustGeom = new THREE.BufferGeometry();
	dustGeom.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
	const dust = new THREE.Points(
		dustGeom,
		new THREE.PointsMaterial({
			color: 0xbdbd8a,
			size: 0.035,
			transparent: true,
			opacity: 0.55,
			depthWrite: false,
			sizeAttenuation: true,
		}),
	);
	scene.add(dust);

	// --- globe ----------------------------------------------------------------
	const latLon = (lat: number, lon: number, r: number) => {
		const phi = (90 - lat) * DEG;
		const theta = (lon + 180) * DEG;
		return new THREE.Vector3(
			-r * Math.sin(phi) * Math.cos(theta),
			r * Math.cos(phi),
			r * Math.sin(phi) * Math.sin(theta),
		);
	};

	const globe = new THREE.Group();
	const spin = new THREE.Group(); // lon/lat orientation lives here
	globe.add(spin);
	scene.add(globe);
	const fadeables: Array<{
		mat: T.Material & { opacity: number };
		base: number;
	}> = [];
	const fade = <M extends T.Material & { opacity: number }>(
		mat: M,
		base: number,
	) => {
		mat.transparent = true;
		fadeables.push({ mat, base });
		return mat;
	};

	const land: number[] = [];
	for (let lat = -56; lat <= 72; lat += 1.35) {
		const step = 1.35 / Math.max(0.28, Math.cos(lat * DEG));
		for (let lon = -168; lon <= -28; lon += step) {
			if (!isLand(lon, lat)) continue;
			const p = latLon(lat, lon, 1);
			land.push(p.x, p.y, p.z);
		}
	}
	const landGeom = new THREE.BufferGeometry();
	landGeom.setAttribute("position", new THREE.Float32BufferAttribute(land, 3));
	spin.add(
		new THREE.Points(
			landGeom,
			fade(
				new THREE.PointsMaterial({
					color: VOLT,
					size: 0.024,
					depthWrite: false,
				}),
				1,
			),
		),
	);

	const grid: number[] = [];
	for (let lat = -80; lat <= 80; lat += 10)
		for (let lon = -180; lon < 180; lon += 3) {
			const p = latLon(lat, lon, 0.995);
			grid.push(p.x, p.y, p.z);
		}
	for (let lon = -180; lon < 180; lon += 15)
		for (let lat = -80; lat <= 80; lat += 3) {
			const p = latLon(lat, lon, 0.995);
			grid.push(p.x, p.y, p.z);
		}
	const gridGeom = new THREE.BufferGeometry();
	gridGeom.setAttribute("position", new THREE.Float32BufferAttribute(grid, 3));
	spin.add(
		new THREE.Points(
			gridGeom,
			fade(
				new THREE.PointsMaterial({
					color: 0x77754a,
					size: 0.009,
					depthWrite: false,
				}),
				0.5,
			),
		),
	);

	// dark core so the back hemisphere doesn't show through
	spin.add(
		new THREE.Mesh(
			new THREE.SphereGeometry(0.985, 48, 48),
			fade(new THREE.MeshBasicMaterial({ color: 0x030303 }), 0.92),
		),
	);
	// atmosphere: a fresnel shell
	const atmo = new THREE.ShaderMaterial({
		uniforms: {
			uAlpha: { value: 1 },
			uColor: { value: new THREE.Color(VOLT) },
		},
		vertexShader: `varying vec3 vN; varying vec3 vV;
			void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
		fragmentShader: `uniform float uAlpha; uniform vec3 uColor; varying vec3 vN; varying vec3 vV;
			void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 5.0); gl_FragColor = vec4(uColor, f * 0.16 * uAlpha); }`,
		transparent: true,
		depthWrite: false,
		side: THREE.BackSide,
		blending: THREE.AdditiveBlending,
	});
	const atmoMesh = new THREE.Mesh(new THREE.SphereGeometry(1.12, 48, 48), atmo);
	globe.add(atmoMesh);

	// corridors -----------------------------------------------------------------
	const arcCurve = (a: T.Vector3, b: T.Vector3, lift: number) => {
		const pts: T.Vector3[] = [];
		const omega = Math.acos(
			THREE.MathUtils.clamp(
				a.clone().normalize().dot(b.clone().normalize()),
				-1,
				1,
			),
		);
		for (let i = 0; i <= 64; i++) {
			const t = i / 64;
			const p = a
				.clone()
				.multiplyScalar(Math.sin((1 - t) * omega) / Math.sin(omega))
				.add(b.clone().multiplyScalar(Math.sin(t * omega) / Math.sin(omega)));
			p.normalize().multiplyScalar(1.01 + Math.sin(Math.PI * t) * lift);
			pts.push(p);
		}
		return new THREE.CatmullRomCurve3(pts);
	};

	type Arc = {
		id: string;
		curve: T.CatmullRomCurve3;
		mesh: T.Mesh<T.TubeGeometry, T.MeshBasicMaterial>;
		packets: T.Mesh<T.SphereGeometry, T.MeshBasicMaterial>[];
		draw: number;
		target: number;
	};
	const origin = latLon(MIAMI.lat, MIAMI.lon, 1);
	const node = new THREE.SphereGeometry(0.02, 16, 16);
	const packetGeom = new THREE.SphereGeometry(0.018, 12, 12);
	const mark = (p: T.Vector3, color = VOLT) => {
		const m = new THREE.Mesh(
			node,
			fade(new THREE.MeshBasicMaterial({ color }), 1),
		);
		m.position.copy(p);
		spin.add(m);
		// a halo ring that pulses outward
		const halo = new THREE.Mesh(
			new THREE.RingGeometry(0.03, 0.038, 32),
			fade(new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }), 0.8),
		);
		halo.position.copy(p.clone().multiplyScalar(1.002));
		halo.lookAt(p.clone().multiplyScalar(2));
		spin.add(halo);
		return halo;
	};
	const halos = [mark(origin)];

	const makeArc = (
		id: string,
		to: T.Vector3,
		lift: number,
		color: number,
	): Arc => {
		const curve = arcCurve(origin, to, lift);
		const geom = new THREE.TubeGeometry(curve, 96, 0.0055, 6, false);
		const mesh = new THREE.Mesh(
			geom,
			fade(new THREE.MeshBasicMaterial({ color }), 0.95),
		);
		spin.add(mesh);
		const packets = Array.from({ length: 3 }, () => {
			const p = new THREE.Mesh(
				packetGeom,
				fade(new THREE.MeshBasicMaterial({ color: 0xfffff0 }), 1),
			);
			spin.add(p);
			return p;
		});
		return { id, curve, mesh, packets, draw: 0, target: 1 };
	};
	const arcs: Arc[] = CITIES.map((c) => {
		const to = latLon(c.lat, c.lon, 1);
		halos.push(mark(to));
		return makeArc(c.id, to, c.id === "br" ? 0.26 : 0.18, VOLT);
	});
	const brArc = arcs.find((a) => a.id === "br") as Arc;
	// the licensed-VASP detour: same endpoints, a higher arc that draws in on reroute
	const reroute = makeArc("br-vasp", latLon(-23.55, -46.63, 1), 0.48, VOLT);
	reroute.target = 0;
	arcs.push(reroute);
	// the "X" where the eFX route breaks
	const breakPoint = brArc.curve.getPoint(0.55);
	const blockMark = new THREE.Mesh(
		new THREE.RingGeometry(0.05, 0.065, 40),
		new THREE.MeshBasicMaterial({
			color: CORAL,
			transparent: true,
			opacity: 0,
			side: THREE.DoubleSide,
		}),
	);
	blockMark.position.copy(breakPoint);
	blockMark.lookAt(breakPoint.clone().multiplyScalar(2));
	spin.add(blockMark);

	// --- coin -------------------------------------------------------------------
	const coin = new THREE.Group();
	const coinSpin = new THREE.Group();
	coin.add(coinSpin);
	scene.add(coin);

	// a procedural stand-in that shows instantly; the GLB replaces it on load
	const fallback = new THREE.Group();
	{
		const gold = new THREE.MeshStandardMaterial({
			color: 0xe8d94a,
			metalness: 1,
			roughness: 0.28,
		});
		const body = new THREE.Mesh(
			new THREE.CylinderGeometry(0.82, 0.82, 0.14, 96),
			gold,
		);
		body.rotation.x = Math.PI / 2;
		fallback.add(body);
		const face = new THREE.Mesh(
			new THREE.CylinderGeometry(0.68, 0.68, 0.15, 96),
			new THREE.MeshStandardMaterial({
				color: 0x4a4614,
				metalness: 0.9,
				roughness: 0.45,
			}),
		);
		face.rotation.x = Math.PI / 2;
		fallback.add(face);
	}
	coinSpin.add(fallback);

	new GLTFLoader().load("/models/hero-coin.glb", (gltf) => {
		const model = gltf.scene;
		model.traverse((o) => {
			const m = o as T.Mesh;
			if (!m.isMesh) return;
			const mat = m.material as T.MeshStandardMaterial;
			mat.metalness = 0.55;
			mat.roughness = 0.55;
			mat.envMapIntensity = 0.55;
		});
		const box = new THREE.Box3().setFromObject(model);
		const size = box.getSize(new THREE.Vector3());
		const center = box.getCenter(new THREE.Vector3());
		model.position.sub(center);
		const holder = new THREE.Group();
		holder.add(model);
		holder.scale.setScalar(1.7 / Math.max(size.x, size.y));
		coinSpin.remove(fallback);
		coinSpin.add(holder);
	});

	// accretion ring of particles around the coin
	const RING = 2400;
	const ringPos = new Float32Array(RING * 3);
	const ringMeta = new Float32Array(RING * 3); // radius, angle, speed
	for (let i = 0; i < RING; i++) {
		const r = 1.15 + Math.random() ** 1.8 * 1.1;
		ringMeta[i * 3] = r;
		ringMeta[i * 3 + 1] = Math.random() * Math.PI * 2;
		ringMeta[i * 3 + 2] = (0.25 + Math.random() * 0.35) / r;
		ringPos[i * 3 + 1] = (Math.random() - 0.5) * 0.05 * r;
	}
	const ringGeom = new THREE.BufferGeometry();
	ringGeom.setAttribute("position", new THREE.BufferAttribute(ringPos, 3));
	const ringMat = new THREE.PointsMaterial({
		color: VOLT,
		size: 0.012,
		transparent: true,
		opacity: 0.6,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
	});
	const ring = new THREE.Points(ringGeom, ringMat);
	ring.rotation.x = 1.22;
	ring.rotation.z = 0.18;
	coin.add(ring);

	// --- post -------------------------------------------------------------------
	const composer = new EffectComposer(renderer);
	composer.addPass(new RenderPass(scene, camera));
	const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.45, 0.82);
	composer.addPass(bloom);
	composer.addPass(new OutputPass());

	const resize = () => {
		const w = el.clientWidth || window.innerWidth;
		const h = el.clientHeight || window.innerHeight;
		const dpr = Math.min(window.devicePixelRatio, 1.75);
		renderer.setPixelRatio(dpr);
		renderer.setSize(w, h, false);
		composer.setPixelRatio(dpr);
		composer.setSize(w, h);
		camera.aspect = w / h;
		// keep the 16:9 composition on tall screens by widening the lens
		camera.fov = w / h < 16 / 9 ? 34 * Math.min(1.6, 16 / 9 / (w / h)) : 34;
		camera.updateProjectionMatrix();
	};
	resize();
	window.addEventListener("resize", resize);

	const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
	const onMove = (e: PointerEvent) => {
		pointer.x = e.clientX / window.innerWidth - 0.5;
		pointer.y = e.clientY / window.innerHeight - 0.5;
	};
	window.addEventListener("pointermove", onMove);

	// --- loop -------------------------------------------------------------------
	const s0 = SHOTS[0];
	const cur = {
		cam: new THREE.Vector3(...s0.cam),
		look: new THREE.Vector3(...s0.look),
		coinPos: new THREE.Vector3(...s0.coin.pos),
		coinScale: s0.coin.scale,
		globePos: new THREE.Vector3(...s0.globe.pos),
		globeScale: s0.globe.scale,
		lon: s0.globe.lon,
		lat: s0.globe.lat,
		alpha: 0,
		ring: s0.ring,
		bloom: s0.bloom,
		coral: 0,
	};
	const tmp = new THREE.Vector3();
	const coralC = new THREE.Color(CORAL);
	const voltC = new THREE.Color(VOLT);
	const clock = new THREE.Clock();
	let frame = 0;
	let lastShot = -1;

	const loop = () => {
		frame = requestAnimationFrame(loop);
		const dt = Math.min(clock.getDelta(), 0.05);
		const t = clock.elapsedTime;
		const shot = SHOTS[world.shot] ?? s0;
		if (world.shot !== lastShot) {
			lastShot = world.shot;
			world.surge = 1;
			// redraw the corridors whenever the globe takes a new pose
			for (const a of arcs) if (a !== reroute) a.draw = Math.min(a.draw, 0.05);
		}
		world.surge = Math.max(0, world.surge - dt * 0.9);
		const k = 1 - Math.exp(-dt * 2.2); // damping
		const kk = 1 - Math.exp(-dt * 1.4);

		cur.cam.lerp(tmp.set(...shot.cam), k);
		cur.look.lerp(tmp.set(...shot.look), k);
		cur.coinPos.lerp(tmp.set(...shot.coin.pos), k);
		cur.coinScale += (shot.coin.scale - cur.coinScale) * k;
		cur.globePos.lerp(tmp.set(...shot.globe.pos), kk);
		cur.globeScale += (shot.globe.scale - cur.globeScale) * kk;
		cur.lon += (shot.globe.lon - cur.lon) * kk;
		cur.lat += (shot.globe.lat - cur.lat) * kk;
		cur.alpha += (shot.globe.alpha - cur.alpha) * k;
		cur.ring += (shot.ring - cur.ring) * k;
		cur.bloom += (shot.bloom - cur.bloom) * k;

		// camera, with a little pointer parallax and breathing
		pointer.sx += (pointer.x - pointer.sx) * 0.05;
		pointer.sy += (pointer.y - pointer.sy) * 0.05;
		camera.position.set(
			cur.cam.x + pointer.sx * 0.6 + Math.sin(t * 0.21) * 0.08,
			cur.cam.y - pointer.sy * 0.4 + Math.sin(t * 0.17) * 0.06,
			cur.cam.z,
		);
		look.copy(cur.look);
		camera.lookAt(look);

		// dust drifts toward the camera, faster on a slide change
		const speed = (reduce ? 0 : 0.35) + world.surge * 6;
		const pos = dustGeom.attributes.position as T.BufferAttribute;
		for (let i = 0; i < DUST; i++) {
			let z = pos.getZ(i) + dt * speed * (0.4 + dustSeed[i]);
			if (z > 6) z -= 30;
			pos.setZ(i, z);
		}
		pos.needsUpdate = true;
		dust.rotation.z = Math.sin(t * 0.03) * 0.05;

		// globe pose: face the requested lon/lat, then a slow pendulum
		globe.position.copy(cur.globePos);
		globe.scale.setScalar(cur.globeScale);
		spin.rotation.set(
			cur.lat * DEG,
			(-cur.lon - 90) * DEG + (reduce ? 0 : Math.sin(t * 0.18) * 0.06),
			0,
			"XYZ",
		);
		for (const f of fadeables) f.mat.opacity = f.base * cur.alpha;
		atmo.uniforms.uAlpha.value = cur.alpha;
		globe.visible = cur.alpha > 0.01;

		// corridor states
		const blocked = world.brazil !== "ok";
		cur.coral += ((blocked ? 1 : 0) - cur.coral) * (1 - Math.exp(-dt * 6));
		brArc.mesh.material.color.copy(voltC).lerp(coralC, cur.coral);
		reroute.target = world.brazil === "rerouted" ? 1 : 0;
		(blockMark.material as T.MeshBasicMaterial).opacity =
			cur.coral * cur.alpha * (0.6 + 0.4 * Math.sin(t * 8));
		blockMark.scale.setScalar(1 + 0.15 * Math.sin(t * 8));

		for (const a of arcs) {
			const goal = a.target;
			a.draw +=
				(goal - a.draw) * (1 - Math.exp(-dt * (goal > a.draw ? 1.6 : 4)));
			const idx = a.mesh.geometry.index;
			const total = idx ? idx.count : 0;
			a.mesh.geometry.setDrawRange(0, Math.floor(total * a.draw));
			a.packets.forEach((p, i) => {
				let u = (t * (0.16 + world.surge * 0.4) + i / a.packets.length) % 1;
				// on the blocked eFX route, packets pile up at the break
				if (a === brArc && blocked) u = Math.min(u, 0.55 - i * 0.02);
				p.visible = a.draw > 0.98 && cur.alpha > 0.05;
				p.position.copy(a.curve.getPoint(u));
				p.material.color.set(a === brArc && blocked ? CORAL : 0xfffff0);
			});
		}
		halos.forEach((h, i) => {
			const ph = (t * 0.6 + i * 0.3) % 1;
			h.scale.setScalar(1 + ph * 1.3);
			(h.material as T.MeshBasicMaterial).opacity = (1 - ph) * 0.5 * cur.alpha;
		});

		// coin: float, slow turn, and a wobble so the light rakes across it
		coin.position.copy(cur.coinPos);
		coin.position.y += reduce ? 0 : Math.sin(t * 0.9) * 0.08;
		coin.scale.setScalar(Math.max(0.0001, cur.coinScale));
		coin.visible = cur.coinScale > 0.01;
		coinSpin.rotation.y = reduce
			? 0
			: Math.sin(t * 0.5) * 0.32 + world.surge * Math.PI * 2;
		coinSpin.rotation.x = reduce ? 0 : Math.sin(t * 0.37) * 0.1;
		rim.position.set(
			cur.coinPos.x + 2.4 * Math.cos(t * 0.6),
			cur.coinPos.y + 1,
			cur.coinPos.z + 2.4 * Math.sin(t * 0.6),
		);

		const rp = ringGeom.attributes.position as T.BufferAttribute;
		for (let i = 0; i < RING; i++) {
			const r = ringMeta[i * 3];
			const a =
				ringMeta[i * 3 + 1] + t * ringMeta[i * 3 + 2] * (1 + world.surge * 3);
			rp.setX(i, Math.cos(a) * r);
			rp.setZ(i, Math.sin(a) * r);
		}
		rp.needsUpdate = true;
		ringMat.opacity = 0.4 * cur.ring;
		ring.visible = cur.ring > 0.02;

		bloom.strength = cur.bloom * (1 + world.surge * 0.3);
		composer.render();
	};
	loop();

	return () => {
		cancelAnimationFrame(frame);
		window.removeEventListener("resize", resize);
		window.removeEventListener("pointermove", onMove);
		scene.traverse((obj) => {
			const mesh = obj as T.Mesh;
			mesh.geometry?.dispose();
			const mats =
				mesh.material == null
					? []
					: Array.isArray(mesh.material)
						? mesh.material
						: [mesh.material];
			for (const m of mats) m.dispose();
		});
		envTex.dispose();
		pmrem.dispose();
		composer.dispose();
		renderer.dispose();
		renderer.domElement.remove();
	};
}
