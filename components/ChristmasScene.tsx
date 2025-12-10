import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import GUI from 'lil-gui';
import { SceneMode } from '../types';

interface ChristmasSceneProps {
  onInteract: () => void;
}

const ChristmasScene: React.FC<ChristmasSceneProps> = ({ onInteract }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<SceneMode>(SceneMode.Tree);
  const clickTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- Configuration Params ---
    const params = {
      count: 2000,
      rotateSpeed: 1.0,
      lightIntensity: 4.0,
      ambientIntensity: 0.4,
      hemiIntensity: 1.5,
      bloomStrength: 1.5,
      bloomRadius: 0.5,
      bloomThreshold: 0.15,
      colors: {
        gold: '#FFD700',
        darkGold: '#B8860B',
        red: '#C41E3A',
        green: '#0B6623',
        star: '#FFFF88'
      }
    };

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#050505');
    scene.fog = new THREE.FogExp2(0x050505, 0.02);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 14);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.5;
    containerRef.current.appendChild(renderer.domElement);

    // --- Controls ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = params.rotateSpeed;
    controls.enablePan = false;

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, params.ambientIntensity);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffeeb1, 0x080820, params.hemiIntensity);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffd700, params.lightIntensity);
    dirLight.position.set(5, 10, 10);
    scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0xff0040, 3.0);
    backLight.position.set(-5, 5, -10);
    scene.add(backLight);

    const pointLight = new THREE.PointLight(0xffaa00, 5.0, 30);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    // --- Post Processing ---
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = params.bloomThreshold;
    bloomPass.strength = params.bloomStrength;
    bloomPass.radius = params.bloomRadius;

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // --- State Variables for Geometry ---
    let sphereMesh: THREE.InstancedMesh;
    let cubeMesh: THREE.InstancedMesh;
    let starMesh: THREE.Mesh;
    let group: THREE.Group;
    
    // Position Arrays
    let currentPositions: THREE.Vector3[] = [];
    let treePositions: THREE.Vector3[] = [];
    let explodePositions: THREE.Vector3[] = [];
    let textPositions: THREE.Vector3[] = [];

    // Color Type Arrays (to allow dynamic color updates)
    // 0: Gold, 1: Red (Spheres)
    // 2: Green, 3: DarkGold (Cubes)
    let sphereTypes: number[] = [];
    let cubeTypes: number[] = [];

    const dummy = new THREE.Object3D();
    const colorHelper = new THREE.Color();

    // --- Helpers ---
    const getTreePosition = (i: number, total: number) => {
      const h = 12;
      const y = (i / total) * h - h / 2;
      const radius = (1 - (y + h / 2) / h) * 3.5;
      const angle = i * 0.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const jitter = 0.3;
      return new THREE.Vector3(
        x + (Math.random() - 0.5) * jitter,
        y,
        z + (Math.random() - 0.5) * jitter
      );
    };

    const getExplodePosition = () => {
      return new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize().multiplyScalar(5 + Math.random() * 5);
    };

    const generateTextPositions = (text: string, count: number): THREE.Vector3[] => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return [];
      
      const width = 200;
      const height = 100;
      canvas.width = width;
      canvas.height = height;

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 30px "Playfair Display", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const lines = text.split('\n');
      lines.forEach((line, i) => {
          ctx.fillText(line, width / 2, height / 2 + (i - 0.5) * 35);
      });

      const imageData = ctx.getImageData(0, 0, width, height);
      const validPixels: THREE.Vector3[] = [];

      for (let y = 0; y < height; y += 2) {
        for (let x = 0; x < width; x += 2) {
          const alpha = imageData.data[(y * width + x) * 4];
          if (alpha > 128) {
             const px = (x / width - 0.5) * 12;
             const py = -(y / height - 0.5) * 6;
             validPixels.push(new THREE.Vector3(px, py, 0));
          }
        }
      }

      const result: THREE.Vector3[] = [];
      for (let i = 0; i < count; i++) {
        if (validPixels.length > 0) {
           const p = validPixels[i % validPixels.length];
           result.push(new THREE.Vector3(p.x, p.y, p.z));
        } else {
           result.push(new THREE.Vector3(0,0,0));
        }
      }
      return result;
    };

    // --- Build / Rebuild Scene ---
    const buildScene = () => {
      // Cleanup existing
      if (group) {
        scene.remove(group);
        group.clear(); // Removes children
      }
      if (sphereMesh) {
        sphereMesh.geometry.dispose();
        (sphereMesh.material as THREE.Material).dispose();
      }
      if (cubeMesh) {
        cubeMesh.geometry.dispose();
        (cubeMesh.material as THREE.Material).dispose();
      }

      const count = params.count;
      currentPositions = [];
      treePositions = [];
      explodePositions = [];
      sphereTypes = [];
      cubeTypes = [];
      
      const textData = generateTextPositions("MERRY\nCHRISTMAS", count);
      textPositions = textData;

      // Fill data arrays
      for (let i = 0; i < count; i++) {
        const treePos = getTreePosition(i, count);
        treePositions.push(treePos);
        explodePositions.push(getExplodePosition());
        currentPositions.push(treePos.clone());
      }

      // Create Material
      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.15,
        metalness: 0.9,
      });

      // Create Geometries
      const sphereGeo = new THREE.SphereGeometry(0.12, 16, 16);
      const cubeGeo = new THREE.BoxGeometry(0.18, 0.18, 0.18);

      // Create Instanced Meshes
      const sphereCount = Math.floor(count / 2);
      const cubeCount = count - sphereCount;
      
      sphereMesh = new THREE.InstancedMesh(sphereGeo, material, sphereCount);
      cubeMesh = new THREE.InstancedMesh(cubeGeo, material, cubeCount);
      
      sphereMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      cubeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

      // Create Star
      const starGeo = new THREE.OctahedronGeometry(0.6, 0);
      const starMat = new THREE.MeshBasicMaterial({ color: params.colors.star });
      starMesh = new THREE.Mesh(starGeo, starMat);
      starMesh.position.set(0, 6.2, 0);

      // Create Group
      group = new THREE.Group();
      group.add(sphereMesh);
      group.add(cubeMesh);
      group.add(starMesh);
      group.position.y = -1.5;
      scene.add(group);

      updateColors(); // Initial color paint
    };

    const updateColors = () => {
      if (!sphereMesh || !cubeMesh) return;
      
      const sphereCount = sphereMesh.count;
      const cubeCount = cubeMesh.count;

      // If we just rebuilt, types might be empty, fill them
      if (sphereTypes.length !== sphereCount) {
        sphereTypes = [];
        for (let i = 0; i < sphereCount; i++) {
          sphereTypes.push(Math.random() > 0.3 ? 0 : 1); // 0: Gold, 1: Red
        }
      }
      if (cubeTypes.length !== cubeCount) {
        cubeTypes = [];
        for (let i = 0; i < cubeCount; i++) {
            cubeTypes.push(Math.random() > 0.4 ? 2 : 3); // 2: Green, 3: DarkGold
        }
      }

      // Apply Colors
      for (let i = 0; i < sphereCount; i++) {
        if (sphereTypes[i] === 0) colorHelper.set(params.colors.gold);
        else colorHelper.set(params.colors.red);
        sphereMesh.setColorAt(i, colorHelper);
      }
      sphereMesh.instanceColor!.needsUpdate = true;

      for (let i = 0; i < cubeCount; i++) {
        if (cubeTypes[i] === 2) colorHelper.set(params.colors.green);
        else colorHelper.set(params.colors.darkGold);
        cubeMesh.setColorAt(i, colorHelper);
      }
      cubeMesh.instanceColor!.needsUpdate = true;
      
      // Update star color
      (starMesh.material as THREE.MeshBasicMaterial).color.set(params.colors.star);
    };

    // Initialize Scene
    buildScene();

    // --- GUI Setup ---
    const gui = new GUI({ title: 'Christmas Settings' });
    
    // Scene Settings
    const folderScene = gui.addFolder('Scene');
    folderScene.add(params, 'count', 500, 5000, 100).name('Particle Count').onFinishChange(buildScene);
    folderScene.add(params, 'rotateSpeed', 0, 5).name('Rotation Speed').onChange((v: number) => {
      controls.autoRotateSpeed = v;
    });
    
    // Lighting
    const folderLight = gui.addFolder('Lighting');
    folderLight.add(params, 'lightIntensity', 0, 10).name('Sun Intensity').onChange((v: number) => dirLight.intensity = v);
    folderLight.add(params, 'hemiIntensity', 0, 5).name('Fill Intensity').onChange((v: number) => hemiLight.intensity = v);
    folderLight.add(params, 'ambientIntensity', 0, 2).name('Ambient').onChange((v: number) => ambientLight.intensity = v);

    // Bloom
    const folderBloom = gui.addFolder('Post-Processing');
    folderBloom.add(params, 'bloomStrength', 0, 3).name('Bloom Strength').onChange((v: number) => bloomPass.strength = v);
    folderBloom.add(params, 'bloomRadius', 0, 1).name('Bloom Radius').onChange((v: number) => bloomPass.radius = v);
    folderBloom.add(params, 'bloomThreshold', 0, 1).name('Bloom Threshold').onChange((v: number) => bloomPass.threshold = v);

    // Colors
    const folderColors = gui.addFolder('Colors');
    folderColors.addColor(params.colors, 'gold').name('Gold').onChange(updateColors);
    folderColors.addColor(params.colors, 'red').name('Red').onChange(updateColors);
    folderColors.addColor(params.colors, 'green').name('Green').onChange(updateColors);
    folderColors.addColor(params.colors, 'darkGold').name('Dark Gold').onChange(updateColors);
    folderColors.addColor(params.colors, 'star').name('Star').onChange(updateColors);

    // --- Animation Loop ---
    const clock = new THREE.Clock();

    const animate = () => {
      requestAnimationFrame(animate);
      
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      controls.update();

      // Determine Target
      let targetArr: THREE.Vector3[] = treePositions;
      if (modeRef.current === SceneMode.Explode) targetArr = explodePositions;
      if (modeRef.current === SceneMode.Text) targetArr = textPositions;

      const speed = 3.0 * delta; 

      // Safety check in case of rebuild race condition
      const currentCount = currentPositions.length;
      const sphereLimit = sphereMesh ? sphereMesh.count : 0;
      const cubeLimit = cubeMesh ? cubeMesh.count : 0;

      for (let i = 0; i < currentCount; i++) {
        currentPositions[i].lerp(targetArr[i], speed);

        const isSphere = i < sphereLimit;
        const index = isSphere ? i : i - sphereLimit;
        const mesh = isSphere ? sphereMesh : cubeMesh;

        if (mesh) {
            dummy.position.copy(currentPositions[i]);
            dummy.rotation.set(time * 0.5 + i, time * 0.3 + i, 0);
            dummy.updateMatrix();
            mesh.setMatrixAt(index, dummy.matrix);
        }
      }

      if (sphereMesh) sphereMesh.instanceMatrix.needsUpdate = true;
      if (cubeMesh) cubeMesh.instanceMatrix.needsUpdate = true;

      // Handle Star
      if (starMesh) {
          if (modeRef.current === SceneMode.Tree) {
             starMesh.scale.lerp(new THREE.Vector3(1,1,1), speed);
             starMesh.rotation.y += delta;
          } else {
             starMesh.scale.lerp(new THREE.Vector3(0,0,0), speed);
          }
      }

      if (modeRef.current === SceneMode.Text && group) {
         const targetRot = new THREE.Quaternion(); 
         group.quaternion.slerp(targetRot, speed);
      }

      composer.render();
    };

    animate();

    // --- Interaction ---
    
    const handlePointerDown = () => {
        clickTimeRef.current = Date.now();
    };

    const handlePointerUp = (e: PointerEvent) => {
        // Prevent interaction if clicking on GUI
        if ((e.target as HTMLElement).closest('.lil-gui')) return;

        const diff = Date.now() - clickTimeRef.current;
        if (diff < 200) {
            handleTap();
        }
    };

    const handleTap = () => {
        onInteract(); 
        
        if (modeRef.current === SceneMode.Tree) {
            modeRef.current = SceneMode.Explode;
            controls.autoRotate = false; 
        } else if (modeRef.current === SceneMode.Explode) {
            modeRef.current = SceneMode.Text;
        } else {
            modeRef.current = SceneMode.Tree;
            controls.autoRotate = true;
        }
    };

    const canvasEl = renderer.domElement;
    canvasEl.addEventListener('pointerdown', handlePointerDown);
    canvasEl.addEventListener('pointerup', handlePointerUp);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvasEl.removeEventListener('pointerdown', handlePointerDown);
      canvasEl.removeEventListener('pointerup', handlePointerUp);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      composer.dispose();
      gui.destroy();
    };
  }, [onInteract]);

  return <div ref={containerRef} className="absolute inset-0 z-0" />;
};

export default ChristmasScene;