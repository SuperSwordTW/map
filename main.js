// ==========================================
// 1. CONFIGURATION
// ==========================================

// Where the 3D model will be placed on the real world map
// Coordinates: [Longitude, Latitude]
// #model
const MODEL_ORIGIN = [121.58595, 24.9870];
const MODEL_ALTITUDE = 125;
const MODEL_ROTATE = [Math.PI / 2, -Math.PI / 6 + 0.05, 0];
const MODEL_SCALE = [3, 3, 3]; // Adjust based on your model's unit scale

// ==========================================
// 2. MAP INITIALIZATION
// ==========================================

const map = new maplibregl.Map({
    container: 'map',
    // // NEW STYLE URL (Free, reliable, has fonts)
    // style: {
    //     'version': 8,
    //     'sources': {},
    //     'layers': [
    //         {
    //             'id': 'background',
    //             'type': 'background',
    //             'paint': {
    //                 'background-color': '#ffffff' // Dark Gray/Black Background
    //             }
    //         }
    //     ],
    //     // CRITICAL: We need this URL to download fonts for your text labels
    //     // This uses the reliable OpenMapTiles font server
    //     'glyphs': 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf'
    // },
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    center: [121.585150, 24.989265],
    zoom: 17.81,
    pitch: 60,
    bearing: -17.6,
    antialias: true
});


    // ==========================================
    // 5. NODES LOGIC
    // ==========================================

    // Simulating a path through a building
    // #node
    const NAVIGATION_NODES = [
        { id: 1, name: "校門口", coords: [121.586012, 24.986974, 3.80], neighbors: [2] },
        { id: 2, name: "Lobby",         coords: [121.5853, 24.9876, 1.5], neighbors: [1, 3, 4] },
        { id: 3, name: "Reception",     coords: [121.5855, 24.9875, 1.5], neighbors: [2] },
        { id: 4, name: "Hallway A",     coords: [121.5857, 24.9874, 1.5], neighbors: [2, 5] },
        { id: 5, name: "Intersection",  coords: [121.5859, 24.9873, 1.5], neighbors: [4, 6, 7] },
        { id: 6, name: "Cafeteria",     coords: [121.5861, 24.9872, 1.5], neighbors: [5] },
        { id: 7, name: "Gate 5",        coords: [121.5853, 24.9871, 1.5], neighbors: [5] }
    ];


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

        NAVIGATION_NODES.forEach(node => {
            // Calculate Position
            const nodeMerc = maplibregl.MercatorCoordinate.fromLngLat(
                [node.coords[0], node.coords[1]], 
                node.coords[2] 
            );
            
            const x = (nodeMerc.x - originMerc.x) / originScale;
            const y = -(nodeMerc.y - originMerc.y) / originScale; 
            const z = (nodeMerc.z - originMerc.z) / originScale;

            // Sphere
            const geometry = new THREE.SphereGeometry(1.2, 32, 32);
            const material = new THREE.MeshBasicMaterial({ color: 0xff9900 });
            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.set(x, y, z);
            // METADATA FOR RAYCASTING
            sphere.userData = { 
                isNode: true, 
                id: node.id, 
                name: node.name 
            };
            this.sceneNodes.add(sphere);

            // --- HIGH RES TEXT LABEL ---
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            // Resolution: 2048px width (Crisper Text)
            canvas.width = 2048;
            canvas.height = 512;
            
            context.font = "Bold 180px Arial"; // Much larger font size
            context.fillStyle = "white";
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.strokeStyle = 'black';
            context.lineWidth = 12; // Thicker outline
            
            context.strokeText(node.name, 1024, 256);
            context.fillText(node.name, 1024, 256);
            
            const texture = new THREE.CanvasTexture(canvas);
            // Critical: LinearFilter keeps it sharp when scaled down
            texture.minFilter = THREE.LinearFilter; 
            
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

            // Geometry: 12 meters wide
            const labelGeo = new THREE.PlaneGeometry(12, 3);
            const labelMesh = new THREE.Mesh(labelGeo, labelMat);
            
            // Lift it higher (z + 4.5) so it doesn't clip into the floor
            labelMesh.position.set(x, y, z + 4.5); 
            
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


    console.log("Map Layers Initialized");
});


// ==========================================
// 4. CINEMATIC CAMERA LOGIC
// ==========================================

document.getElementById('start-btn').addEventListener('click', () => {
    animateCamera(NAV_PATH, 5000); // Path, Duration in ms
});

function animateCamera(path, duration) {
    const start = performance.now();
    const pathLength = turf.length(turf.lineString(path), { units: 'kilometers' });

    // Use requestAnimationFrame for smooth loop
    function frame(time) {
        const elapsed = time - start;
        const progress = Math.min(elapsed / duration, 1); // 0.0 to 1.0

        // Calculate current position along the line using Turf.js
        // We find the point at distance = length * progress
        const distanceTraveled = pathLength * progress;
        const currentPoint = turf.along(turf.lineString(path), distanceTraveled, { units: 'kilometers' });
        const coords = currentPoint.geometry.coordinates;

        // Calculate Bearing (look ahead)
        // To make it cinematic, we look slightly ahead of our current position
        const lookAheadDistance = Math.min(distanceTraveled + 0.005, pathLength);
        const lookAheadPoint = turf.along(turf.lineString(path), lookAheadDistance, { units: 'kilometers' });
        const bearing = turf.bearing(currentPoint, lookAheadPoint);

        // Update Camera
        // 'center': The target the camera is looking at (current position on path)
        // 'zoom': Close up for indoor feel
        // 'pitch': Angled down slightly
        // 'bearing': Rotated to face the direction of the path
        map.jumpTo({
            center: coords,
            zoom: 20,
            pitch: 60,
            bearing: bearing
        });

        if (progress < 1) {
            requestAnimationFrame(frame);
        } else {
            console.log("Navigation Complete");
        }
    }

    requestAnimationFrame(frame);
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