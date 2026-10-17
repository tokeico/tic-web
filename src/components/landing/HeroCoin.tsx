import { useEffect, useRef } from "react";

/**
 * The hero token. The mesh is the Meshy coin with the loose currency chips
 * and the arms behind the rim removed, so only the coin and the horse remain.
 * The back of that cut is open; the camera stays on the face.
 */
export function HeroCoin() {
	const host = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = host.current;
		if (!el) return;

		let cancel = false;
		let teardown = () => {};

		void mountHeroCoin(el, {
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
			className="hero-stage"
			role="img"
			aria-label="The Corredor token, a gold coin struck with a running horse."
		/>
	);
}

async function mountHeroCoin(
	el: HTMLDivElement,
	life: { cancelled: () => boolean; onReady: (dispose: () => void) => void },
) {
	const THREE = await import("three");
	const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
	const { RoomEnvironment } = await import(
		"three/addons/environments/RoomEnvironment.js"
	);
	if (life.cancelled()) return;

	const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	const renderer = new THREE.WebGLRenderer({
		antialias: true,
		alpha: true,
		powerPreference: "high-performance",
	});
	renderer.setClearColor(0x000000, 0);
	renderer.outputColorSpace = THREE.SRGBColorSpace;
	renderer.toneMapping = THREE.ACESFilmicToneMapping;
	renderer.toneMappingExposure = 1.5;
	renderer.domElement.style.display = "block";
	renderer.domElement.style.width = "100%";
	renderer.domElement.style.height = "100%";
	el.appendChild(renderer.domElement);

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 40);

	const pmrem = new THREE.PMREMGenerator(renderer);
	scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

	scene.add(new THREE.HemisphereLight(0xfff6c2, 0x141008, 0.55));

	const key = new THREE.DirectionalLight(0xfff3d0, 4.8);
	key.position.set(2.2, 3.6, 3.4);
	scene.add(key);

	const rim = new THREE.DirectionalLight(0xffff67, 2.6);
	rim.position.set(-4.2, 1.4, -1.6);
	scene.add(rim);

	const fill = new THREE.DirectionalLight(0xd5d8e6, 0.85);
	fill.position.set(-2.4, -1.2, 3.2);
	scene.add(fill);

	const kick = new THREE.PointLight(0xffe08a, 12, 8, 2);
	kick.position.set(0.4, 0.6, 2.2);
	scene.add(kick);

	const gltf = await new GLTFLoader().loadAsync("/models/hero-coin.glb");
	if (life.cancelled()) {
		renderer.dispose();
		pmrem.dispose();
		el.removeChild(renderer.domElement);
		return;
	}

	const coin = gltf.scene;
	coin.traverse((obj) => {
		const mesh = obj as THREE.Mesh;
		if (!mesh.isMesh) return;
		const materials = Array.isArray(mesh.material)
			? mesh.material
			: [mesh.material];
		for (const material of materials) {
			if (!("metalness" in material)) continue;
			const standard = material as THREE.MeshStandardMaterial;
			standard.metalness = 0.78;
			standard.roughness = 0.32;
			standard.envMapIntensity = 1.2;
		}
	});

	const box = new THREE.Box3().setFromObject(coin);
	const size = box.getSize(new THREE.Vector3());
	const center = box.getCenter(new THREE.Vector3());
	coin.position.sub(center);
	// The export faces +Z. Tip it so the reeded edge catches the key light
	// without rolling around to the open back.
	// Leave margin for the idle sway so the rim never clips the stage.
	coin.scale.setScalar(1.42 / Math.max(size.x, size.y));

	const rig = new THREE.Group();
	rig.add(coin);
	rig.rotation.x = 0.38;
	rig.rotation.z = -0.1;
	scene.add(rig);

	camera.position.set(0.02, -0.06, 3.05);
	camera.lookAt(0, -0.06, 0);

	const pointer = { x: 0, y: 0 };
	const onPointer = (event: PointerEvent) => {
		const rect = el.getBoundingClientRect();
		pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
		pointer.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
	};
	const onLeave = () => {
		pointer.x = 0;
		pointer.y = 0;
	};
	el.addEventListener("pointermove", onPointer);
	el.addEventListener("pointerleave", onLeave);

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
		const sway = reduce ? 0 : Math.sin(t * 0.45) * 0.12;
		const nod = reduce ? 0 : Math.sin(t * 0.28) * 0.025;
		rig.rotation.y = sway + pointer.x * 0.1;
		rig.rotation.x = 0.38 + nod - pointer.y * 0.06;
		renderer.render(scene, camera);
	};
	draw();

	const dispose = () => {
		cancelAnimationFrame(frame);
		resizeObserver.disconnect();
		visibility.disconnect();
		el.removeEventListener("pointermove", onPointer);
		el.removeEventListener("pointerleave", onLeave);
		scene.environment?.dispose();
		pmrem.dispose();
		coin.traverse((obj) => {
			const mesh = obj as THREE.Mesh;
			if (!mesh.isMesh) return;
			mesh.geometry?.dispose();
			const materials = Array.isArray(mesh.material)
				? mesh.material
				: [mesh.material];
			for (const material of materials) {
				const textured = material as THREE.MeshStandardMaterial;
				textured.map?.dispose();
				material.dispose();
			}
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
