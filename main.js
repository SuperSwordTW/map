// ==========================================
// 1. CONFIGURATION
// ==========================================

// Where the 3D model will be placed on the real world map
// Coordinates: [Longitude, Latitude]
// #model
const MODEL_ORIGIN = [121.58595, 24.9870];
const MODEL_ALTITUDE = 125;
const MODEL_ROTATE = [Math.PI / 2, -Math.PI / 6 + 0.05, 0];
const MODEL_SCALE = [30, 30, 30]; // Adjust based on your model's unit scale

// ==========================================
// 2. MAP INITIALIZATION
// ==========================================

const map = new maplibregl.Map({
    container: 'map',
    // NEW STYLE URL (Free, reliable, has fonts)
    style: {
        'version': 8,
        'sources': {},
        'layers': [
            {
                'id': 'background',
                'type': 'background',
                'paint': {
                    'background-color': '#ffffff' // Dark Gray/Black Background
                }
            }
        ],
        // CRITICAL: We need this URL to download fonts for your text labels
        // This uses the reliable OpenMapTiles font server
        'glyphs': 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf'
    },
    // style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    center: [121.585150, 24.989265],
    zoom: 17.81,
    pitch: 60,
    maxPitch: 85,
    bearing: -17.6,
    antialias: true,
    doubleClickZoom: false
});


    // ==========================================
    // 5. NODES LOGIC
    // ==========================================

    // Simulating a path through a building
    // #node
    const NAVIGATION_NODES = [
        { id: 1, name: "校門口",        coords: [121.586012, 24.986974, 3.80], neighbors: [4,2] },
        { id: 2, name: "福利社",        coords: [121.586088, 24.987667, 3.80], neighbors: [1] },
        { id: 3, name: "學務處",        coords: [121.585874, 24.987540, 3.80], neighbors: [4] },
        { id: 4, name: "校長室",        coords: [121.585305, 24.987318, 3.80], neighbors: [1,3] },
        { id: 5, name: "Intersection",  coords: [121.5859, 24.9873, 1.5], neighbors: [] },
        { id: 6, name: "Cafeteria",     coords: [121.5861, 24.9875, 1.5], neighbors: [] },
        { id: 7, name: "Gate 5",        coords: [121.5853, 24.9876, 1.5], neighbors: [] },
        { id: 8, name: "拉瓦節(化學實驗室)",        coords: [121.586247, 24.987289, 18.50], neighbors: [] },
        { id: 9, name: "亞佛加厥(理化實驗室)",      coords: [121.586247, 24.987289, 9.50], neighbors: [] },
        { id: 10, name: "愛因斯坦(物理實驗室)",     coords: [121.586247, 24.987289, 0.50], neighbors: [] },
        { id: 11, name: "孟德爾(生物實驗室)",     coords: [121.586247, 24.987289, -9.50], neighbors: [] },
        { id: 12, name: "道爾吞(116)",     coords: [121.586247, 24.987289, 18.50], neighbors: [] },
    ];

    // ==========================================
    // 5.5 AUTOMATIC NODE SCALING
    // ==========================================
    // This function automatically moves the nodes if you change MODEL_SCALE
(function scaleNodesToModel() {
        const REF_SCALE = [3, 3, 3]; 

        // Check if scaling is needed
        if (MODEL_SCALE[0] === REF_SCALE[0] && 
            MODEL_SCALE[1] === REF_SCALE[1] && 
            MODEL_SCALE[2] === REF_SCALE[2]) return;

        console.log(`[Auto-Scale] Scaling nodes from ${REF_SCALE} to ${MODEL_SCALE}`);

        // 1. Use GROUND ZERO as the anchor for scaling calculations.
        // This prevents the "Deep Underground" bug when the model is floating.
        const originMerc = maplibregl.MercatorCoordinate.fromLngLat(MODEL_ORIGIN, 0);

        NAVIGATION_NODES.forEach(node => {
            // 2. Convert Node to Mercator
            const nodeMerc = maplibregl.MercatorCoordinate.fromLngLat(node.coords, node.coords[2]);

            // 3. Calculate Vector (Distance from Ground Origin)
            const dx = nodeMerc.x - originMerc.x;
            const dy = nodeMerc.y - originMerc.y;
            const dz = nodeMerc.z - originMerc.z;

            // 4. Calculate Ratios
            const ratioX = MODEL_SCALE[0] / REF_SCALE[0];
            const ratioY = MODEL_SCALE[1] / REF_SCALE[1];
            const ratioZ = MODEL_SCALE[2] / REF_SCALE[2];

            // 5. Apply Scale
            const newX = originMerc.x + (dx * ratioX);
            const newY = originMerc.y + (dy * ratioY);
            const newZ = originMerc.z + (dz * ratioZ);

            // 6. Convert back to Lng/Lat/Alt
            const newMerc = new maplibregl.MercatorCoordinate(newX, newY, newZ);
            const newLngLat = newMerc.toLngLat();
            const metersPerUnit = newMerc.meterInMercatorCoordinateUnits();
            const newAlt = newMerc.z / metersPerUnit;

            // 7. Update Node
            // console.log(`Node ${node.id} moved: Alt ${node.coords[2]} -> ${newAlt.toFixed(2)}`);
            node.coords = [newLngLat.lng, newLngLat.lat, newAlt];
        });
    })();


    // #path
    // We will use this path for the animation (based on the nodes above)
    const NAV_PATH = [
        // NAVIGATION_NODES[0].coords, // Entrance
        // NAVIGATION_NODES[1].coords, // Lobby
        // NAVIGATION_NODES[3].coords, // Hallway
        // NAVIGATION_NODES[4].coords, // Intersection
        // NAVIGATION_NODES[5].coords  // Gate 5
    ];


// ==========================================
// 3. THREE.JS CUSTOM LAYER
// ==========================================

// Calculate Mercator coordinates for the model placement
const modelAsMercator = maplibregl.MercatorCoordinate.fromLngLat(
    MODEL_ORIGIN,
    MODEL_ALTITUDE
);

// Transformation parameters to align Blender axis with MapLibre
const modelTransform = {
    translateX: modelAsMercator.x,
    translateY: modelAsMercator.y,
    translateZ: modelAsMercator.z,
    rotateX: MODEL_ROTATE[0],
    rotateY: MODEL_ROTATE[1],
    rotateZ: MODEL_ROTATE[2],
    scale: modelAsMercator.meterInMercatorCoordinateUnits()
};

const customLayer = {
    id: '3d-model',
    type: 'custom',
    renderingMode: '3d',

    onAdd: function (map, gl) {
        this.camera = new THREE.Camera();
        this.sceneModel = new THREE.Scene(); 
        this.sceneNodes = new THREE.Scene();
        this.textLabels = [];
        window.threeLayer = this;

        // 1. Load 3D Model
        const loader = new THREE.GLTFLoader();
        loader.load('./building.glb', (gltf) => {
            gltf.scene.traverse((child) => {
                if (child.isMesh) {
                    const oldMat = child.material;
                    child.material = new THREE.MeshBasicMaterial({
                        map: oldMat.map || null,
                        color: oldMat.color || 0xffffff,
                        side: THREE.DoubleSide,
                        toneMapped: false
                    });
                    if (child.material.map) child.material.map.encoding = THREE.sRGBEncoding;

                    const edges = new THREE.EdgesGeometry(child.geometry, 15);
                    child.add(new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000 })));
                }
            });
            this.sceneModel.add(gltf.scene);
        });

        // 2. Create 3D Nodes
        const originMerc = maplibregl.MercatorCoordinate.fromLngLat(MODEL_ORIGIN, 0);
        const originScale = originMerc.meterInMercatorCoordinateUnits();

        // --- NEW: CALCULATE SCALE FACTOR ---
        // Your original sizes (1.2m radius) were designed for Scale 3.
        // We calculate 's' to multiply sizes if the model gets bigger.
        const REF_SCALE = 3; 
        const s = MODEL_SCALE[0] / REF_SCALE; 

        NAVIGATION_NODES.forEach(node => {
            // Calculate Position (Already handled by your auto-scaler, but we map it here)
            const nodeMerc = maplibregl.MercatorCoordinate.fromLngLat(
                [node.coords[0], node.coords[1]], 
                node.coords[2] 
            );
            
            const x = (nodeMerc.x - originMerc.x) / originScale;
            const y = -(nodeMerc.y - originMerc.y) / originScale; 
            const z = (nodeMerc.z - originMerc.z) / originScale;

            // --- SPHERE SCALING ---
            // Multiply radius (1.2) by 's'
            const geometry = new THREE.SphereGeometry(1.2 * s, 32, 32);
            const material = new THREE.MeshBasicMaterial({ color: 0xff9900 });
            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.set(x, y, z);
            
            sphere.userData = { 
                isNode: true, 
                id: node.id, 
                name: node.name 
            };
            this.sceneNodes.add(sphere);

            // --- HIGH RES TEXT LABEL ---
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            canvas.width = 2048;
            canvas.height = 512;
            
            context.font = "Bold 180px Arial";
            context.fillStyle = "white";
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.strokeStyle = 'black';
            context.lineWidth = 12;
            
            context.strokeText(node.name, 1024, 256);
            context.fillText(node.name, 1024, 256);
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.minFilter = THREE.LinearMipmapLinearFilter; 
            texture.magFilter = THREE.LinearFilter;
            texture.generateMipmaps = true;
            texture.anisotropy = 16;

            const labelMat = new THREE.MeshBasicMaterial({ 
                map: texture,
                transparent: true,
                depthTest: false,
                depthWrite: false,
                side: THREE.DoubleSide
            });

            // --- LABEL SCALING ---
            // Multiply Width (12) and Height (3) by 's'
            const labelGeo = new THREE.PlaneGeometry(12 * s, 3 * s);
            const labelMesh = new THREE.Mesh(labelGeo, labelMat);
            
            // --- OFFSET SCALING ---
            // Multiply the vertical lift (4.5) by 's'
            // Otherwise, on a huge model, the text would be inside the sphere
            labelMesh.position.set(x, y, z + (4.5 * s)); 
            
            this.textLabels.push(labelMesh);
            this.sceneNodes.add(labelMesh);

            sphere.userData.labelMesh = labelMesh;
        });

        // 3. Create Path Line
        const pathPoints = NAV_PATH.map(coord => {
            const nodeMerc = maplibregl.MercatorCoordinate.fromLngLat([coord[0], coord[1]], coord[2]);
            const x = (nodeMerc.x - originMerc.x) / originScale;
            const y = -(nodeMerc.y - originMerc.y) / originScale;
            const z = (nodeMerc.z - originMerc.z) / originScale;
            return new THREE.Vector3(x, y, z);
        });
        this.sceneNodes.add(new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(pathPoints),
            new THREE.LineBasicMaterial({ color: 0x00d2ff, linewidth: 3 })
        ));

        this.map = map;
        this.renderer = new THREE.WebGLRenderer({
            canvas: map.getCanvas(),
            context: gl,
            antialias: true
        });
        this.renderer.autoClear = false;
    },

    render: function (gl, matrix) {
        // --- ROTATION FIX ---
        const pitchRad = this.map.getPitch() * (Math.PI / 180);
        const bearingRad = this.map.getBearing() * (Math.PI / 180);

        this.textLabels.forEach(mesh => {
            // Reset
            mesh.rotation.set(0, 0, 0);

            // 1. Counter-rotate against the Map's bearing (Spin)
            mesh.rotateZ(-bearingRad);

            // 2. Rotate X to match the Map's Pitch (Tilt)
            // If Pitch is 0 (Looking down), text lies flat (Rotation 0)
            // If Pitch is 60 (Angled), text tilts up 60 degrees to face camera
            mesh.rotateX(pitchRad);
        });

        const m = new THREE.Matrix4().fromArray(matrix);
        
        // Matrix A: Building
        const lModel = new THREE.Matrix4()
            .makeTranslation(modelTransform.translateX, modelTransform.translateY, modelTransform.translateZ)
            .scale(new THREE.Vector3(modelTransform.scale * MODEL_SCALE[0], -modelTransform.scale * MODEL_SCALE[1], modelTransform.scale * MODEL_SCALE[2]))
            .multiply(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(1, 0, 0), modelTransform.rotateX))
            .multiply(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0, 1, 0), modelTransform.rotateY))
            .multiply(new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(0, 0, 1), modelTransform.rotateZ));

        // Matrix B: Nodes
        const lNodes = new THREE.Matrix4()
            .makeTranslation(modelTransform.translateX, modelTransform.translateY, modelTransform.translateZ)
            .scale(new THREE.Vector3(modelTransform.scale, -modelTransform.scale, modelTransform.scale));

        this.renderer.resetState();
        this.camera.projectionMatrix = m.clone().multiply(lModel);
        this.renderer.render(this.sceneModel, this.camera);
        this.camera.projectionMatrix = m.clone().multiply(lNodes);
        this.renderer.render(this.sceneNodes, this.camera);
        this.map.triggerRepaint();
    }
};

map.on('load', () => {
    // 1. Add the 3D Building Layer FIRST
    map.addLayer(customLayer);

    // 3. Convert to GeoJSON
    const nodesGeoJSON = {
        type: 'FeatureCollection',
        features: NAVIGATION_NODES.map(node => ({
            type: 'Feature',
            properties: { title: node.name },
            geometry: { type: 'Point', coordinates: node.coords }
        }))
    };

    initDropdowns();

    console.log("Map Layers Initialized");
});


// ==========================================
// 4. CINEMATIC CAMERA LOGIC & PATH UPDATE
// ==========================================

// NEW: Helper to smooth jagged paths into curves
function getSmoothPath(geoCoords) {
    if (geoCoords.length < 2) return geoCoords;

    const smoothedVectors = [];

    // We simply draw straight lines between points, but break them into small chunks
    // so the animation loop has plenty of data to work with.
    for (let i = 0; i < geoCoords.length - 1; i++) {
        const start = geoCoords[i];
        const end = geoCoords[i + 1];

        // Create 20 points between each node for smooth camera movement
        // (Increase this number if nodes are very far apart)
        const segments = 20; 
        
        for (let j = 0; j < segments; j++) {
            const t = j / segments;
            
            // Linear Interpolation (Math for "Straight Line")
            const lng = start[0] + (end[0] - start[0]) * t;
            const lat = start[1] + (end[1] - start[1]) * t;
            const alt = start[2] + (end[2] - start[2]) * t;
            
            smoothedVectors.push([lng, lat, alt]);
        }
    }
    
    // Add the final point
    smoothedVectors.push(geoCoords[geoCoords.length - 1]);

    return smoothedVectors;
}

// Helper: Update the Blue Line in Three.js
function updatePathVisuals(newPathCoords) {
    if (!window.threeLayer || !window.threeLayer.sceneNodes) return;

    const layer = window.threeLayer;
    
    // 1. Find and remove old line
    const oldLine = layer.sceneNodes.children.find(c => c.type === 'Line');
    if (oldLine) layer.sceneNodes.remove(oldLine);

    // 2. Create new Geometry
    const originMerc = maplibregl.MercatorCoordinate.fromLngLat(MODEL_ORIGIN, 0);
    const originScale = originMerc.meterInMercatorCoordinateUnits();

    const pathPoints = newPathCoords.map(coord => {
        const nodeMerc = maplibregl.MercatorCoordinate.fromLngLat([coord[0], coord[1]], coord[2]);
        const x = (nodeMerc.x - originMerc.x) / originScale;
        const y = -(nodeMerc.y - originMerc.y) / originScale;
        const z = (nodeMerc.z - originMerc.z) / originScale;
        return new THREE.Vector3(x, y, z);
    });

    // 3. Add new Line
    const geometry = new THREE.BufferGeometry().setFromPoints(pathPoints);
    const material = new THREE.LineBasicMaterial({ color: 0x00d2ff, linewidth: 3 });
    const newLine = new THREE.Line(geometry, material);
    
    layer.sceneNodes.add(newLine);
    map.triggerRepaint();
}

document.getElementById('start-btn').addEventListener('click', () => {
    // 1. Get User Selection
    const startId = parseInt(document.getElementById('start-select').value);
    const endId = parseInt(document.getElementById('end-select').value);

    if (startId === endId) {
        alert("Start and Destination cannot be the same.");
        return;
    }

    // 2. Run A* Algorithm (Get raw sharp path)
    const rawPath = findPath(startId, endId);
    
    if (rawPath.length > 0) {
        // 3. SMOOTH THE PATH
        // We convert the sharp A* path into a curved cinematic path
        const smoothPath = getSmoothPath(rawPath);

        // 4. Update Global Variable (and Visuals)
        NAV_PATH.length = 0; 
        smoothPath.forEach(p => NAV_PATH.push(p));

        // Update the Blue Line on the map
        updatePathVisuals(NAV_PATH);

        // 5. Start Camera Animation
        console.log("Starting Cinematic Route with points:", NAV_PATH.length);
        animateCamera([...NAV_PATH], 5000);
    }
});

let currentAnimFrame = null;

// --- NEW HELPER: Calculates a coordinate X meters away at a specific bearing ---
function getDestination(lng, lat, distanceMeters, bearing) {
    const R = 6371e3; // Earth radius in meters
    const angDist = distanceMeters / R;
    const radBearing = bearing * (Math.PI / 180);
    const radLat1 = lat * (Math.PI / 180);
    const radLng1 = lng * (Math.PI / 180);

    const radLat2 = Math.asin(Math.sin(radLat1) * Math.cos(angDist) +
                    Math.cos(radLat1) * Math.sin(angDist) * Math.cos(radBearing));
    
    const radLng2 = radLng1 + Math.atan2(Math.sin(radBearing) * Math.sin(angDist) * Math.cos(radLat1),
                             Math.cos(angDist) - Math.sin(radLat1) * Math.sin(radLat2));
    
    return [(radLng2 * 180 / Math.PI), (radLat2 * 180 / Math.PI)];
}

function animateCamera(path, duration) {
    if (typeof currentAnimFrame !== 'undefined' && currentAnimFrame) {
        cancelAnimationFrame(currentAnimFrame);
    }
    map.stop(); 

    const start = performance.now();
    const totalPoints = path.length - 1;

    let smoothedBearing = 0;
    if (path.length > 1) {
        smoothedBearing = calculateBearing(path[0][0], path[0][1], path[1][0], path[1][1]);
    }

    function frame(time) {
        const elapsed = time - start;
        const progress = Math.min(elapsed / duration, 1); 

        const currentFloatIndex = progress * totalPoints;
        const currentIndex = Math.floor(currentFloatIndex);
        
        if (!path[currentIndex]) return;

        const nextIndex = Math.min(currentIndex + 1, totalPoints);
        const ratio = currentFloatIndex - currentIndex;

        const p1 = path[currentIndex];
        const p2 = path[nextIndex];

        // 1. Position Interpolation
        const currentLng = p1[0] + (p2[0] - p1[0]) * ratio;
        const currentLat = p1[1] + (p2[1] - p1[1]) * ratio;
        
        // 2. TARGET BEARING (Where we WANT to look)
        // CHANGE: Reduced from 20 to 5.
        // This ensures the camera doesn't start turning until it is 
        // ~25% (5/20) of the way from the corner, preventing the "cutting corner" effect.
        const lookAheadIndex = Math.min(currentIndex + 5, totalPoints);
        
        const target = path[lookAheadIndex];
        const targetBearing = calculateBearing(currentLng, currentLat, target[0], target[1]);

        // 3. SMOOTHING LOGIC
        let diff = targetBearing - smoothedBearing;
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;

        // Slightly faster reaction (0.06) to compensate for the later trigger
        smoothedBearing += diff * 0.06; 

        // 4. RECALIBRATION
        const offsetDist = 400;
        const focusPoint = getDestination(currentLng, currentLat, offsetDist, smoothedBearing);

        // CHANGE: Switched back to jumpTo. 
        // 'flyTo' adds unwanted inertia that messes up the turning timing.
        map.jumpTo({
            center: focusPoint,
            bearing: smoothedBearing, 
            zoom: 17.1,
            pitch: 73
        });

        if (progress < 1) {
            currentAnimFrame = requestAnimationFrame(frame);
        } else {
            console.log("Cinematic Flight Complete");
            currentAnimFrame = null; 
        }
    }
    
    currentAnimFrame = requestAnimationFrame(frame);
}

// Keep your existing calculateBearing function below this
function calculateBearing(startLng, startLat, destLng, destLat) {
    const startLatRad = startLat * (Math.PI / 180);
    const startLngRad = startLng * (Math.PI / 180);
    const destLatRad = destLat * (Math.PI / 180);
    const destLngRad = destLng * (Math.PI / 180);

    const y = Math.sin(destLngRad - startLngRad) * Math.cos(destLatRad);
    const x = Math.cos(startLatRad) * Math.sin(destLatRad) -
              Math.sin(startLatRad) * Math.cos(destLatRad) * Math.cos(destLngRad - startLngRad);
    
    const brng = Math.atan2(y, x);
    return (brng * 180 / Math.PI + 360) % 360;
}

// ==========================================
// 6. DEVELOPER FLIGHT MODE (WASD + Space/Shift)
// ==========================================

const devHud = document.getElementById('dev-hud');
let isDevMode = false;

// Configuration
const FLY_SPEED = 3;      // Pan speed (pixels per frame)
const ZOOM_SPEED = 0.01;   // Vertical speed (zoom levels per frame)

// Track keys
const keysPressed = {
    w: false, a: false, s: false, d: false,
    space: false, shift: false
};

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    
    // Toggle: Shift + D
    // Note: We check this first to allow toggling even if Shift is held for flying
    if (e.shiftKey && key === 'd') {
        isDevMode = !isDevMode;
        if(devHud) devHud.style.display = isDevMode ? 'block' : 'none';
        
        if (isDevMode) {
            console.log("Dev Mode: ON");
            requestAnimationFrame(devGameLoop);
        } else {
            console.log("Dev Mode: OFF");
        }
        return; // Stop processing 'd' as a movement key during toggle
    }

    if (!isDevMode) return;

    // Map keys to our state object
    if (['w','a','s','d'].includes(key)) keysPressed[key] = true;
    if (e.code === 'Space') keysPressed.space = true;
    if (e.key === 'Shift')  keysPressed.shift = true;
});

window.addEventListener('keyup', (e) => {
    if (!isDevMode) return;
    
    const key = e.key.toLowerCase();
    if (['w','a','s','d'].includes(key)) keysPressed[key] = false;
    if (e.code === 'Space') keysPressed.space = false;
    if (e.key === 'Shift')  keysPressed.shift = false;
});

function devGameLoop() {
    if (!isDevMode) return;

    // 1. Horizontal Movement (Pan)
    let dx = 0;
    let dy = 0;

    if (keysPressed.w) dy -= FLY_SPEED; // Forward (Up on screen)
    if (keysPressed.s) dy += FLY_SPEED; // Backward (Down on screen)
    if (keysPressed.a) dx -= FLY_SPEED; // Left
    if (keysPressed.d) dx += FLY_SPEED; // Right

    if (dx !== 0 || dy !== 0) {
        map.panBy([dx, dy], { duration: 0, animate: false });
    }

    // 2. Vertical Movement (Zoom / Altitude)
    // Space = Up (Ascend) = Zoom OUT (Lower zoom number)
    // Shift = Down (Descend) = Zoom IN (Higher zoom number)
    let currentZoom = map.getZoom();
    
    if (keysPressed.space) {
        map.setZoom(currentZoom - ZOOM_SPEED); 
    }
    if (keysPressed.shift) {
        map.setZoom(currentZoom + ZOOM_SPEED);
    }

    // 3. Update HUD
    const center = map.getCenter();
    const pitch = map.getPitch().toFixed(2);
    const bearing = map.getBearing().toFixed(2);

    // Update the inputs
    const lngInput = document.getElementById('hud-lng');
    if (lngInput) {
        document.getElementById('hud-lng').value = center.lng.toFixed(6);
        document.getElementById('hud-lat').value = center.lat.toFixed(6);
        
        document.getElementById('hud-pitch').value = pitch;
        document.getElementById('hud-bear').value = bearing;
    }

    requestAnimationFrame(devGameLoop);
}

document.querySelectorAll('#dev-hud input').forEach(input => {
    input.addEventListener('click', function() {
        this.select();
    });
});

// ==========================================
// 7. INTERACTIVE NODE DRAGGING (DEV MODE)
// ==========================================

// We don't use Raycaster because the Camera Matrix is custom-baked for MapLibre.
// Instead, we project the 3D Node positions to 2D Screen Space to check for clicks.

const mouse = new THREE.Vector2();
let selectedNode = null;
const canvas = map.getCanvas();

// Helper: Check if a 3D object is under the mouse
function getIntersects(mouseNDC, camera) {
    if (!window.threeLayer || !window.threeLayer.sceneNodes) return null;
    
    // Filter only the node spheres
    const nodes = window.threeLayer.sceneNodes.children.filter(obj => obj.userData.isNode);
    let closestNode = null;
    let minDistance = Infinity;

    // Threshold: How close the mouse must be (0.05 is ~5% of screen width)
    const HIT_RADIUS = 0.05; 

    nodes.forEach(node => {
        // 1. Get local position
        const pos = node.position.clone();
        
        // 2. Project to NDC (Normalized Device Coordinates: -1 to +1)
        // We rely on the fact that 'camera.projectionMatrix' was set to the 
        // node layer's matrix in the last render frame.
        pos.applyMatrix4(camera.projectionMatrix);

        // 3. Check if it's in front of the camera (z < 1) and visible
        if (pos.z < 1 && pos.z > -1) {
            // Calculate distance to mouse in 2D screen space
            const dx = pos.x - mouseNDC.x;
            const dy = pos.y - mouseNDC.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist < HIT_RADIUS && dist < minDistance) {
                minDistance = dist;
                closestNode = node;
            }
        }
    });

    return closestNode;
}

// 1. MOUSE DOWN - Select Node
canvas.addEventListener('mousedown', (e) => {
    if (!isDevMode) return;

    // Convert mouse pixels to NDC (-1 to +1)
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Find clicked node
    if (window.threeLayer && window.threeLayer.camera) {
        const hit = getIntersects(mouse, window.threeLayer.camera);

        if (hit) {
            selectedNode = hit;
            map.dragPan.disable(); // Stop map panning
            
            // Visual Feedback
            selectedNode.material.color.set(0xff0000); 
            console.log(`Selected: ${selectedNode.userData.name}`);
        }
    }
});

// 2. MOUSE MOVE - Drag Node Vertically
canvas.addEventListener('mousemove', (e) => {
    if (!isDevMode || !selectedNode) return;

    // Sensitivity
    const DRAG_SENSITIVITY = 0.5; 

    // Move Up/Down
    selectedNode.position.z -= e.movementY * DRAG_SENSITIVITY;

    // Update Label Position
    if (selectedNode.userData.labelMesh) {
        selectedNode.userData.labelMesh.position.z = selectedNode.position.z + 4.5;
    }

    // UPDATE HUD - Show the raw node altitude (matching the array definition)
    const hudAlt = document.getElementById('hud-alt');
    if (hudAlt) {
        // We use position.z directly, which corresponds to the 'coords[2]' value
        hudAlt.value = selectedNode.position.z.toFixed(2);
    }
});

// 3. MOUSE UP - Release
canvas.addEventListener('mouseup', () => {
    if (selectedNode) {
        // Reset Color
        selectedNode.material.color.set(0xff9900);
        
        // Log final Altitude for copying
        const finalAlt = selectedNode.position.z.toFixed(4);
        console.log(`NEW ALTITUDE for ${selectedNode.userData.name}: ${finalAlt}`);
        
        selectedNode = null;
        map.dragPan.enable(); // Re-enable map
    }
});


// ==========================================
// 2.5 PATHFINDING LOGIC (A*)
// ==========================================

// Helper: Distance between two 3D points
function getDistance(coordA, coordB) {
    const dx = coordA[0] - coordB[0];
    const dy = coordA[1] - coordB[1];
    const dz = coordA[2] - coordB[2];
    return Math.sqrt(dx*dx + dy*dy + dz*dz);
}

// A* Algorithm
function findPath(startId, endId) {
    // 1. Setup Node Map for easy lookup
    const nodeMap = {};
    NAVIGATION_NODES.forEach(n => nodeMap[n.id] = n);

    const startNode = nodeMap[startId];
    const endNode = nodeMap[endId];

    // 2. Initialize Sets
    let openSet = [startNode];
    let cameFrom = {}; // To reconstruction path
    
    let gScore = {}; // Cost from start to node
    let fScore = {}; // Estimated total cost (g + h)

    NAVIGATION_NODES.forEach(n => {
        gScore[n.id] = Infinity;
        fScore[n.id] = Infinity;
    });

    gScore[startId] = 0;
    fScore[startId] = getDistance(startNode.coords, endNode.coords);

    while (openSet.length > 0) {
        // Get node with lowest fScore
        let current = openSet.reduce((a, b) => fScore[a.id] < fScore[b.id] ? a : b);

        if (current.id === endId) {
            return reconstructPath(cameFrom, current.id, nodeMap);
        }

        // Remove current from openSet
        openSet = openSet.filter(n => n.id !== current.id);

        // Check neighbors
        current.neighbors.forEach(neighborId => {
            const neighbor = nodeMap[neighborId];
            const tentativeGScore = gScore[current.id] + getDistance(current.coords, neighbor.coords);

            if (tentativeGScore < gScore[neighborId]) {
                // This path is better
                cameFrom[neighborId] = current.id;
                gScore[neighborId] = tentativeGScore;
                fScore[neighborId] = gScore[neighborId] + getDistance(neighbor.coords, endNode.coords);

                if (!openSet.includes(neighbor)) {
                    openSet.push(neighbor);
                }
            }
        });
    }
    
    alert("No path found!");
    return [];
}

function reconstructPath(cameFrom, currentId, nodeMap) {
    const totalPath = [nodeMap[currentId].coords];
    while (currentId in cameFrom) {
        currentId = cameFrom[currentId];
        totalPath.unshift(nodeMap[currentId].coords);
    }
    return totalPath;
}

// Populate UI Dropdowns
function initDropdowns() {
    const startSel = document.getElementById('start-select');
    const endSel = document.getElementById('end-select');
    
    NAVIGATION_NODES.forEach(node => {
        const opt1 = new Option(node.name, node.id);
        const opt2 = new Option(node.name, node.id);
        startSel.add(opt1);
        endSel.add(opt2);
    });

    // Defaults
    startSel.value = 1;
    endSel.value = 6;
}

function getLookAtQuaternion(eye, center, up = [0, 0, 1]) {
    const forward = new THREE.Vector3(center.x - eye.x, center.y - eye.y, center.z - eye.z).normalize();
    const upVec = new THREE.Vector3(up[0], up[1], up[2]).normalize();
    const right = new THREE.Vector3().crossVectors(forward, upVec).normalize();
    const actualUp = new THREE.Vector3().crossVectors(right, forward).normalize();
    const rotMat = new THREE.Matrix4().makeBasis(right, actualUp, forward.negate());
    return new THREE.Quaternion().setFromRotationMatrix(rotMat);
}