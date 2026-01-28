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

let currentFadeFrame = null; // NEW: Tracks the fade animation to kill it
let currentAnimFrame = null; // (Existing: Tracks camera movement)

const nextBtn = document.createElement('button');
nextBtn.innerText = "Go to Next Floor";
nextBtn.id = "next-floor-btn";
Object.assign(nextBtn.style, {
    position: 'absolute',
    bottom: '30px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '12px 24px',
    fontSize: '18px',
    fontWeight: 'bold',
    backgroundColor: '#ff9900',
    color: 'white',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
    display: 'none', // Hidden by default
    zIndex: '9999'
});
document.body.appendChild(nextBtn);

// State variables for step-by-step navigation
let globalPathSegments = [];
let currentSegmentIndex = 0;

nextBtn.addEventListener('click', () => {
    loadNextPathSegment();
});

const FLOOR_MODELS = {
    13: { name: "丁棟7F", url: './floors/13F.glb' },
    12: { name: "丁棟6F+圖書館2F", url: './floors/12F.glb' },
    11: { name: "丁棟5F+圖書館1F", url: './floors/11F.glb' },
    10: { name: "丁棟4F+乙棟7F", url: './floors/10F.glb' },
    9:  { name: "丁棟3F+乙棟6F", url: './floors/9F.glb' },
    8:  { name: "丁棟2F+乙棟5F", url: './floors/8F.glb' },
    7:  { name: "丁棟1F+乙棟4F", url: './floors/7F.glb' },
    // Add other floors here...
};

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
                    'background-color': '#ffffff'
                }
            }
        ],
        // CRITICAL: We need this URL to download fonts for your text labels
        // This uses the reliable OpenMapTiles font server
        'glyphs': 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf'
    },
    // style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    center: [121.584167, 24.992288],
    zoom: 16.11,
    pitch: 67.76,
    maxPitch: 85,
    bearing: -20.71,
    antialias: true,
    doubleClickZoom: false
});


    // ==========================================
    // 5. NODES LOGIC
    // ==========================================

    // Simulating a path through a building
    // #node
    const NAVIGATION_NODES = [
        //13F=30.0 12F=21.0 11F=12.0 10F(校門)=3.0 9F=-6.0 8F=-15.0
        //id 1~33丁棟右上棟 34~54丁棟左上棟 55~59丁棟右樓梯 60~66丁棟中樓梯 丁棟右下棟 丁棟左下棟
        //-------------13樓-------------
        { id: 1, name: "韋格納", coords: [121.586024, 24.987772, 30.0], neighbors: [2], story: 13, building: 4 },
        { id: 2, name: "柯西", coords: [121.586125, 24.987733, 30.0], neighbors: [1,3], story: 13, building: 4 },
        { id: 3, name: "數學科辦公室(一)", coords: [121.586201, 24.987696, 30.0], neighbors: [2,4], story: 13, building: 4 },
        { id: 4, name: "南丁格爾", coords: [121.586238, 24.987628, 30.0], neighbors: [3,5], story: 13, building: 4 },
        { id: 5, name: "孫子", coords: [121.586280, 24.987516, 30.0], neighbors: [4], story: 13, building: 4 },
        //樓梯
        { id: 55, name: "丁棟右樓梯(7F)", coords: [121.586225, 24.987475, 30.0], neighbors: [5,56], story: 13, building: 4, stair: 1 },
        { id: 60, name: "丁棟中樓梯(7F)", coords: [121.585821, 24.987704, 30.0], neighbors: [1], story: 13, building: 4, stair: 1 },
        //-------------12樓-------------
        { id: 6, name: "李清照", coords: [121.586024, 24.987772, 21.0], neighbors: [7,61], story: 12, building: 4 },
        { id: 7, name: "胡適", coords: [121.586125, 24.987733, 21.0], neighbors: [6,8], story: 12, building: 4 },
        { id: 8, name: "自然科辦公室(一)", coords: [121.586201, 24.987696, 21.0], neighbors: [7,9], story: 12, building: 4 },
        { id: 9, name: "笛卡爾", coords: [121.586238, 24.987628, 21.0], neighbors: [8,10], story: 12, building: 4 },
        { id: 10, name: "高斯",  coords: [121.586280, 24.987516, 21.0], neighbors: [9,11,56], story: 12, building: 4 },
        { id: 11, name: "道爾吞", coords: [121.586269 , 24.987412, 21.0], neighbors: [10,12,56], story: 12, building: 4 },
        { id: 12, name: "拉瓦節(化學實驗室)", coords: [121.586247, 24.987289, 21.0], neighbors: [11], story: 12, building: 4 },
        //樓梯
        { id: 56, name: "丁棟右樓梯(6F)", coords: [121.586225, 24.987475, 21.0], neighbors: [10,11,55,57], story: 12, building: 4, stair: 1 },
        { id: 61, name: "丁棟中樓梯(6F)", coords: [121.585821, 24.987704, 21.0], neighbors: [6,60,62], story: 12, building: 4, stair: 1 },
        //...
        //-------------11樓-------------
        { id: 13, name: "曹雪芹", coords: [121.586024, 24.987772, 12.0], neighbors: [14,36,62], story: 11, building: 4 },
        { id: 14, name: "張愛玲", coords: [121.586125, 24.987733, 12.0], neighbors: [13,15], story: 11, building: 4 },
        { id: 15, name: "數學科辦公室(二)", coords: [121.586201, 24.987696, 12.0], neighbors: [14,16], story: 11, building: 4 },
        { id: 16, name: "海佩蒂雅", coords: [121.586238, 24.987628, 12.0], neighbors: [15,17], story: 11, building: 4 },
        { id: 17, name: "尤拉", coords: [121.586280, 24.987516, 12.0], neighbors: [16,18,57], story: 11, building: 4 },
        { id: 18, name: "吳健雄", coords: [121.586269 , 24.987412, 12.0], neighbors: [17,19,57], story: 11, building: 4 },
        { id: 19, name: "亞佛加厥(理化實驗室)", coords: [121.586247, 24.987289, 12.0], neighbors: [18], story: 11, building: 4 },

        { id: 34, name: "英文科辦公室(一)", coords: [121.585748, 24.988078, 12.0], neighbors: [35], story: 11, building: 4 },
        { id: 35, name: "Shakespeare", coords: [121.585792, 24.988017, 12.0], neighbors: [34,36], story: 11, building: 4 },
        { id: 36, name: "Yeats", coords: [121.585834, 24.987900, 12.0], neighbors: [13,35,62], story: 11, building: 4 },
        //樓梯
        { id: 57, name: "丁棟右樓梯(5F)", coords: [121.586225, 24.987475, 12.0], neighbors: [17,18,56,58], story: 11, building: 4, stair: 1 },
        { id: 62, name: "丁棟中樓梯(5F)", coords: [121.585821, 24.987704, 12.0], neighbors: [13,36,61,63], story: 11, building: 4, stair: 1 },
        //...
        //-------------10樓-------------
        { id: 20, name: "李白", coords: [121.586024, 24.987772, 3.0], neighbors: [], story: 10, building: 4 },
        { id: 21, name: "蘇東坡", coords: [121.586125, 24.987733, 3.0], neighbors: [], story: 10, building: 4 },
        { id: 22, name: "國文科辦公室(一)", coords: [121.586201, 24.987696, 3.0], neighbors: [], story: 10, building: 4 },
        { id: 23, name: "祖沖之", coords: [121.586238, 24.987628, 3.0], neighbors: [], story: 10, building: 4 },
        { id: 24, name: "福利社", coords: [121.586280, 24.987516, 3.0], neighbors: [], story: 10, building: 4 },
        { id: 25, name: "伽利略(物理實驗室)", coords: [121.586269 , 24.987412, 3.0], neighbors: [], story: 10, building: 4 },
        { id: 26, name: "愛因斯坦(物理實驗室)", coords: [121.586247, 24.987289, 3.0], neighbors: [], story: 10, building: 4 },

        { id: 37, name: "徐霞客", coords: [121.585587, 24.988160, 3.0], neighbors: [], story: 10, building: 4 },
        { id: 38, name: "洪堡德", coords: [121.585667, 24.988123, 3.0], neighbors: [], story: 10, building: 4 },
        { id: 39, name: "英文科辦公室(二)", coords: [121.585748, 24.988078, 3.0], neighbors: [], story: 10, building: 4 },
        { id: 40, name: "Chomsky", coords: [121.585792, 24.988017, 3.0], neighbors: [], story: 10, building: 4 },
        { id: 41, name: "Woolf", coords: [121.585834, 24.987900, 3.0], neighbors: [], story: 10, building: 4 },
        //樓梯
        { id: 58, name: "丁棟右樓梯(4F)", coords: [121.586225, 24.987475, 3.0], neighbors: [57,59], story: 10, building: 4, stair: 1 },
        { id: 63, name: "丁棟中樓梯(4F)", coords: [121.585821, 24.987704, 3.0], neighbors: [62,64], story: 10, building: 4, stair: 1 },

        { id: 67, name: "校門口", coords: [121.586012, 24.986974, 3.0], neighbors: [], story: 10, building: 4 },
        { id: 68, name: "學務處", coords: [121.585874, 24.987540, 3.0], neighbors: [], story: 10, building: 4 },
        //...
        //-------------9樓-------------
        { id: 27, name: "莊子", coords: [121.586024, 24.987772, -6.0], neighbors: [], story: 9, building: 4 },
        { id: 28, name: "孔子", coords: [121.586125, 24.987733, -6.0], neighbors: [], story: 9, building: 4 },
        { id: 29, name: "生物科準備室", coords: [121.586201, 24.987696, -6.0], neighbors: [], story: 9, building: 4 },
        { id: 30, name: "牛頓", coords: [121.586238, 24.987628, -6.0], neighbors: [], story: 9, building: 4 },
        { id: 31, name: "杜聰明", coords: [121.586280, 24.987516, -6.0], neighbors: [], story: 9, building: 4 },
        { id: 32, name: "虎克(生物實驗室)", coords: [121.586269 , 24.987412, -6.0], neighbors: [], story: 9, building: 4 },
        { id: 33, name: "孟德爾(生物實驗室)", coords: [121.586247, 24.987289, -6.0], neighbors: [], story: 9, building: 4 },

        { id: 42, name: "希羅多德", coords: [121.585587, 24.988160, -6.0], neighbors: [], story: 9, building: 4 },
        { id: 43, name: "李特爾", coords: [121.585667, 24.988123, -6.0], neighbors: [], story: 9, building: 4 },
        { id: 44, name: "教學研究室", coords: [121.585748, 24.988078, -6.0], neighbors: [], story: 9, building: 4 },
        { id: 45, name: "Hawthorne", coords: [121.585792, 24.988017, -6.0], neighbors: [], story: 9, building: 4 },
        { id: 46, name: "Dickinson", coords: [121.585834, 24.987900, -6.0], neighbors: [], story: 9, building: 4 },
        //樓梯
        { id: 59, name: "丁棟右樓梯(3F)", coords: [121.586225, 24.987475, -6.0], neighbors: [58], story: 9, building: 4, stair: 1 },
        { id: 64, name: "丁棟中樓梯(3F)", coords: [121.585821, 24.987704, -6.0], neighbors: [63,65], story: 9, building: 4, stair: 1 },
        //...
        //-------------8樓-------------
        { id: 47, name: "梁啟超", coords: [121.585587, 24.988160, -15.0], neighbors: [], story: 8, building: 4 },
        { id: 48, name: "司馬遷", coords: [121.585667, 24.988123, -15.0], neighbors: [], story: 8, building: 4 },
        { id: 49, name: "國文科辦公室(二)", coords: [121.585748, 24.988078, -15.0], neighbors: [], story: 8, building: 4 },
        { id: 50, name: "孫逸仙", coords: [121.585792, 24.988017, -15.0], neighbors: [], story: 8, building: 4 },
        { id: 51, name: "涂林", coords: [121.585834, 24.987900, -15.0], neighbors: [], story: 8, building: 4 },
        //樓梯
        { id: 65, name: "丁棟中樓梯(2F)", coords: [121.585821, 24.987704, -15.0], neighbors: [64,66], story: 8, building: 4, stair: 1 },
        //...
        //-------------7樓-------------
        { id: 52, name: "健康中心", coords: [121.585748, 24.988078, -24.0], neighbors: [], story: 7, building: 4 },
        { id: 53, name: "貝登堡", coords: [121.585792, 24.988017, -24.0], neighbors: [], story: 7, building: 4 },
        { id: 54, name: "討論室", coords: [121.585834, 24.987900, -24.0], neighbors: [], story: 7, building: 4 },
        //樓梯
        { id: 66, name: "丁棟中樓梯(1F)", coords: [121.585821, 24.987704, -24.0], neighbors: [65], story: 7, building: 4, stair: 1 },
        //...
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

    (function makeGraphUndirected() {
        const nodeMap = {};
        // 1. Map IDs to Nodes for O(1) lookup
        NAVIGATION_NODES.forEach(node => nodeMap[node.id] = node);

        // 2. Iterate and back-link
        NAVIGATION_NODES.forEach(node => {
            if (!node.neighbors) node.neighbors = []; // Safety check

            node.neighbors.forEach(neighborId => {
                const neighbor = nodeMap[neighborId];
                
                // If neighbor exists and doesn't already list this node...
                if (neighbor && !neighbor.neighbors.includes(node.id)) {
                    neighbor.neighbors.push(node.id);
                }
            });
        });
        console.log("[Graph] Edges converted to undirected.");
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

        // 1. Load MAIN Building
        this.mainBuildingGroup = new THREE.Group(); // Create a group to hold the main building
        this.sceneModel.add(this.mainBuildingGroup);
        
        // Group to hold the specific floor model when loaded
        this.currentFloorGroup = new THREE.Group();
        this.sceneModel.add(this.currentFloorGroup);

        const loader = new THREE.GLTFLoader();
        loader.load('./building.glb', (gltf) => {
            gltf.scene.traverse((child) => {
                if (child.isMesh) {
                    const oldMat = child.material;
                    // NEW: Enable transparent flag so we can fade it later
                    child.material = new THREE.MeshBasicMaterial({
                        map: oldMat.map || null,
                        color: oldMat.color || 0xffffff,
                        side: THREE.DoubleSide,
                        transparent: true, // CRITICAL for fading
                        opacity: 1.0       // Start fully visible
                    });
                    
                    // Add edges
                    const edges = new THREE.EdgesGeometry(child.geometry, 15);
                    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 1.0 }));
                    child.add(line);
                }
            });
            this.mainBuildingGroup.add(gltf.scene);
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
                name: node.name,
                story: node.story
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

function filterNodesByStory(targetStory) {
    if (!window.threeLayer || !window.threeLayer.sceneNodes) return;

    window.threeLayer.sceneNodes.children.forEach(child => {
        // Check if this object is a Node Sphere
        if (child.userData.isNode) {
            // Determine visibility
            // If targetStory is null, show everything. Otherwise match the story.
            const shouldShow = (targetStory === null) || (child.userData.story === targetStory);
            
            // 1. Hide/Show the Sphere
            child.visible = shouldShow;
            
            // 2. Hide/Show the text label (if it exists)
            if (child.userData.labelMesh) {
                child.userData.labelMesh.visible = shouldShow;
            }
        }
    });
    
    map.triggerRepaint();
}

// ==========================================
// NEW: PATH SEGMENTATION LOGIC
// ==========================================

function groupNodesByStory(nodePath) {
    if (!nodePath || nodePath.length === 0) return [];
    
    // 1. First, split the path into raw floor segments (Existing logic)
    const rawSegments = [];
    let currentSegment = [nodePath[0]];
    
    for (let i = 1; i < nodePath.length; i++) {
        const prevNode = nodePath[i-1];
        const currentNode = nodePath[i];

        // If story changes, close current segment and start new one
        if (prevNode.story !== currentNode.story) {
            rawSegments.push(currentSegment);
            currentSegment = [];
        }
        currentSegment.push(currentNode);
    }
    rawSegments.push(currentSegment);

    // 2. NEW: Filter out "Transit-Only" Floors
    // We keep a segment ONLY if:
    // A. It is the START floor (Index 0)
    // B. It is the DESTINATION floor (Last Index)
    // C. It contains at least one node that is NOT a stair (e.g. a hallway or room)
    
    const optimizedSegments = rawSegments.filter((segment, index) => {
        const isStart = (index === 0);
        const isEnd = (index === rawSegments.length - 1);
        
        // Check if this segment has any "useful" nodes (non-stairs)
        // Note: In your data, normal nodes don't have the 'stair' property, so !n.stair is true.
        // Stair nodes have 'stair: 1', so !n.stair is false.
        const hasActivity = segment.some(n => !n.stair);

        return isStart || isEnd || hasActivity;
    });
    
    return optimizedSegments;
}

function loadNextPathSegment() {
    currentSegmentIndex++;
    
    if (currentSegmentIndex >= globalPathSegments.length) {
        // End of journey
        nextBtn.style.display = 'none';
        document.getElementById('status-text').innerText = "Arrived at Destination.";
        return;
    }

    const segmentNodes = globalPathSegments[currentSegmentIndex];
    const targetStory = segmentNodes[0].story;
    const isLastSegment = (currentSegmentIndex === globalPathSegments.length - 1);

    // 1. Transition Floor Model
    transitionToFloor(targetStory);

    filterNodesByStory(targetStory);

    // 2. Update Button Text for the *next* step (if valid)
    if (!isLastSegment) {
        const currentStory = globalPathSegments[currentSegmentIndex][0].story;
        const nextStory = globalPathSegments[currentSegmentIndex + 1][0].story;
        const StoryDiff = nextStory - currentStory;
        if (StoryDiff > 0){
            nextBtn.innerText = `往上 ${StoryDiff} 層`;
        }
        else if (StoryDiff < 0){
            nextBtn.innerText = `往下 ${Math.abs(StoryDiff)} 層`;
        }
        nextBtn.style.display = 'block';
    } else {
        nextBtn.style.display = 'none'; // Reached final floor
    }

    // 3. Extract Coords for Visuals
    const coords = segmentNodes.map(n => n.coords);

    // 4. Move Camera to start of this segment
    const startCoord = coords[0];
    map.jumpTo({
        center: [startCoord[0], startCoord[1]],
        zoom: 16.3,
        bearing: map.getBearing(),
        pitch: 0
    });

    // 5. Draw Path & Animate
    updatePathVisuals(coords);

    const isCinematicEnabled = document.getElementById('anim-toggle').checked;

    if (isCinematicEnabled) {
        // Optional: Smooth and Animate
        const smoothPath = getSmoothPath(coords);
        animateCamera(smoothPath, 4000); // 4 seconds per floor
    }

    document.getElementById('status-text').innerText = `Navigating ${targetStory}F...`;
}

// ==========================================
// START BUTTON LISTENER (REPLACEMENT)
// ==========================================

document.getElementById('start-btn').addEventListener('click', () => {
    const startId = parseInt(document.getElementById('start-select').value);
    const endId = parseInt(document.getElementById('end-select').value);

    if (startId === endId) {
        alert("Start and Destination cannot be the same.");
        return;
    }

    // 1. Get Path (Now returns Nodes)
    const rawNodes = findPath(startId, endId);
    
    if (rawNodes.length > 0) {
        // 2. Reset Animation
        if (typeof currentAnimFrame !== 'undefined' && currentAnimFrame) {
            cancelAnimationFrame(currentAnimFrame);
            currentAnimFrame = null;
        }

        // 3. Process Segments
        globalPathSegments = groupNodesByStory(rawNodes);
        currentSegmentIndex = -1; // Reset index

        console.log("Path Segments:", globalPathSegments);

        // 4. Start the first segment immediately
        loadNextPathSegment();
    }
});

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
        const offsetDist = 0;
        const focusPoint = getDestination(currentLng, currentLat, offsetDist, smoothedBearing);

        // CHANGE: Switched back to jumpTo. 
        // 'flyTo' adds unwanted inertia that messes up the turning timing.
        map.jumpTo({
            center: focusPoint,
            bearing: smoothedBearing, 
            zoom: 16.3,
            pitch: 0
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
            toggleNetworkVisuals(true);
            requestAnimationFrame(devGameLoop);
        } else {
            console.log("Dev Mode: OFF");
            toggleNetworkVisuals(false);
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
        document.getElementById('hud-zoom').value = map.getZoom().toFixed(2);
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
        // === NEW CODE STARTS HERE ===
        // If the node was hidden by filterNodesByStory, skip it immediately
        if (!node.visible) return; 
        // === NEW CODE ENDS HERE ===

        // 1. Get local position
        const pos = node.position.clone();
        
        // 2. Project to NDC (Normalized Device Coordinates: -1 to +1)
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
    // Only run this logic if we are in Dev Mode
    if (!isDevMode) return; 

    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (window.threeLayer && window.threeLayer.camera) {
        const hit = getIntersects(mouse, window.threeLayer.camera);
        if (hit) {
            // Drag Logic
            selectedNode = hit;
            map.dragPan.disable();
            selectedNode.material.color.set(0xff0000);
            console.log(`Selected: ${selectedNode.userData.name}`);
        }
    }
});

map.on('click', (e) => {
    // If in Dev Mode, don't open popups (let mousedown handle selection)
    if (isDevMode) return;

    const mouse = new THREE.Vector2();
    const canvas = map.getCanvas();
    const rect = canvas.getBoundingClientRect();

    // Convert MapLibre screen point to NDC (-1 to +1)
    mouse.x = (e.point.x / rect.width) * 2 - 1;
    mouse.y = -(e.point.y / rect.height) * 2 + 1;

    // Check 3D Intersection
    if (window.threeLayer && window.threeLayer.camera) {
        const hit = getIntersects(mouse, window.threeLayer.camera);
        if (hit) {
            openPanorama(hit.userData);
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
        selectedNode.material.color.set(0xff9900);
        
        const finalAlt = selectedNode.position.z.toFixed(4);
        console.log(`NEW ALTITUDE for ${selectedNode.userData.name}: ${finalAlt}`);
        
        if (isDevMode) {
            toggleNetworkVisuals(true);
        }

        selectedNode = null;
        map.dragPan.enable(); 
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
    const nodeMap = {};
    NAVIGATION_NODES.forEach(n => nodeMap[n.id] = n);

    const startNode = nodeMap[startId];
    const endNode = nodeMap[endId];

    let openSet = [startNode];
    let cameFrom = {}; 
    let gScore = {}; 
    let fScore = {}; 

    NAVIGATION_NODES.forEach(n => {
        gScore[n.id] = Infinity;
        fScore[n.id] = Infinity;
    });

    gScore[startId] = 0;
    fScore[startId] = getDistance(startNode.coords, endNode.coords);

    while (openSet.length > 0) {
        let current = openSet.reduce((a, b) => fScore[a.id] < fScore[b.id] ? a : b);

        if (current.id === endId) {
            // [CHANGE] Now returns Node Objects, not just coordinates
            return reconstructPath(cameFrom, current.id, nodeMap);
        }

        openSet = openSet.filter(n => n.id !== current.id);

        current.neighbors.forEach(neighborId => {
            const neighbor = nodeMap[neighborId];
            const tentativeGScore = gScore[current.id] + getDistance(current.coords, neighbor.coords);

            if (tentativeGScore < gScore[neighborId]) {
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
    // [CHANGE] Returns array of NODE OBJECTS
    const totalPath = [nodeMap[currentId]];
    while (currentId in cameFrom) {
        currentId = cameFrom[currentId];
        totalPath.unshift(nodeMap[currentId]);
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

// ==========================================
// 8. FLOOR TRANSITION LOGIC
// ==========================================

let activeFloorMesh = null;

function transitionToFloor(story) {
    const layer = window.threeLayer;
    if (!layer || !FLOOR_MODELS[story]) return;

    // ===============================================
    // 1. KILL ZOMBIE ANIMATIONS (Critical Fix)
    // ===============================================
    if (typeof currentFadeFrame !== 'undefined' && currentFadeFrame) {
        cancelAnimationFrame(currentFadeFrame);
        currentFadeFrame = null;
    }

    // ===============================================
    // 2. INSTANTLY HIDE OLD BUILDING
    // ===============================================
    if (layer.mainBuildingGroup) {
        // Force visibility OFF
        layer.mainBuildingGroup.visible = false;
        
        // Double Tap: Traverse and force children off just in case
        layer.mainBuildingGroup.traverse(c => {
            if (c.isMesh) c.visible = false;
        });
    }

    // Force map to clear the old building NOW
    map.triggerRepaint();

    const floorConfig = FLOOR_MODELS[story];
    console.log(`Swapping to ${floorConfig.name} (Instant)...`);

    const loader = new THREE.GLTFLoader();
    
    loader.load(floorConfig.url, (gltf) => {
        // ===============================================
        // 3. SETUP NEW FLOOR (Solid & Visible)
        // ===============================================
        gltf.scene.traverse((child) => {
            if (child.isMesh) {
                const oldMat = child.material;
                
                // 1. Determine Opacity Settings from the Original Model
                // We check if the original material was transparent or if opacity is < 1
                const isTransparent = oldMat.transparent || (oldMat.opacity < 1.0);
                const originalOpacity = oldMat.opacity;

                // 2. Create Basic Material (Flat shading) using ORIGINAL transparency
                child.material = new THREE.MeshBasicMaterial({
                    map: oldMat.map || null,
                    color: oldMat.color || 0xffffff,
                    side: THREE.DoubleSide,
                    
                    // --- USE ORIGINAL SETTINGS ---
                    transparent: isTransparent,
                    opacity: originalOpacity, 
                    
                    // Use alphaTest if your texture has transparency (like fences/leaves)
                    alphaTest: oldMat.alphaTest || 0,
                    
                    // Only write to depth buffer if it's mostly opaque
                    // (Prevents transparent windows from hiding things behind them)
                    depthWrite: originalOpacity > 0.5 
                });

                // 3. Add Black Edges
                // Optional: Reduce edge opacity if the object itself is transparent (like glass)
                const edgeOpacity = originalOpacity < 0.5 ? 0.3 : 1.0;

                const edges = new THREE.EdgesGeometry(child.geometry, 15);
                const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ 
                    color: 0x000000, 
                    transparent: true, 
                    opacity: edgeOpacity, 
                    depthWrite: false // Edges shouldn't occlude other objects
                }));
                child.add(line);
            }
        });

        // ===============================================
        // 4. SWAP AND RENDER
        // ===============================================
        layer.currentFloorGroup.clear();
        layer.currentFloorGroup.add(gltf.scene);
        
        // Safety Check: Ensure Old Building didn't sneak back on
        if (layer.mainBuildingGroup) {
            layer.mainBuildingGroup.visible = false;
        }

        // Force map to show the new floor
        map.triggerRepaint();
    });
}

// Helper to reset view (Optional: call this if you want to go back to full view)
function resetToFullBuilding() {
    const layer = window.threeLayer;
    if(!layer) return;
    
    layer.mainBuildingGroup.visible = true;
    layer.currentFloorGroup.clear();
    
    layer.mainBuildingGroup.traverse(child => {
        if (child.material) child.material.opacity = 1.0;
    });
    map.triggerRepaint();
}

// ==========================================
// 5.9 DEV MODE VISUALS (NETWORK GRAPH)
// ==========================================

function toggleNetworkVisuals(show) {
    if (!window.threeLayer || !window.threeLayer.sceneNodes) return;
    const scene = window.threeLayer.sceneNodes;

    // 1. Always remove existing graph first to prevent duplicates
    const existingGraph = scene.children.find(c => c.name === 'dev-network-graph');
    if (existingGraph) {
        scene.remove(existingGraph);
        if (existingGraph.geometry) existingGraph.geometry.dispose();
    }

    // If turning off, just repaint and exit
    if (!show) {
        map.triggerRepaint();
        return;
    }

    // 2. Build new graph
    const points = [];
    const originMerc = maplibregl.MercatorCoordinate.fromLngLat(MODEL_ORIGIN, 0);
    const originScale = originMerc.meterInMercatorCoordinateUnits();

    // Helper: Project Lng/Lat/Alt to Three.js World Space
    const toVec3 = (coords) => {
        const nodeMerc = maplibregl.MercatorCoordinate.fromLngLat([coords[0], coords[1]], coords[2]);
        const x = (nodeMerc.x - originMerc.x) / originScale;
        const y = -(nodeMerc.y - originMerc.y) / originScale;
        const z = (nodeMerc.z - originMerc.z) / originScale;
        return new THREE.Vector3(x, y, z);
    };

    // Map for fast lookup
    const nodeMap = {};
    NAVIGATION_NODES.forEach(n => nodeMap[n.id] = n);

    // 3. Generate Lines for every neighbor connection
    NAVIGATION_NODES.forEach(node => {
        if (!node.neighbors || node.neighbors.length === 0) return;
        
        // We use the current Three.js position if the node has been initialized,
        // otherwise calculate from coords (fallback)
        let startVec;
        
        // Find the specific sphere mesh for this node to get its *current* dragged position
        const nodeMesh = scene.children.find(c => c.userData.id === node.id);
        if (nodeMesh) {
            startVec = nodeMesh.position.clone();
        } else {
            startVec = toVec3(node.coords);
        }

        node.neighbors.forEach(neighborId => {
            const neighbor = nodeMap[neighborId];
            if (neighbor) {
                let endVec;
                const neighborMesh = scene.children.find(c => c.userData.id === neighborId);
                
                if (neighborMesh) {
                    endVec = neighborMesh.position.clone();
                } else {
                    endVec = toVec3(neighbor.coords);
                }

                // Add pair of vertices for LineSegments
                points.push(startVec);
                points.push(endVec);
            }
        });
    });

    // 4. Create Mesh
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    // Neon Green color to distinguish from the blue path
    const material = new THREE.LineBasicMaterial({ 
        color: 0x39ff14, 
        linewidth: 1, 
        opacity: 0.6, 
        transparent: true 
    });
    
    const lineSegments = new THREE.LineSegments(geometry, material);
    lineSegments.name = 'dev-network-graph';

    scene.add(lineSegments);
    map.triggerRepaint();
}

// ==========================================
// 9. 360 PANORAMA LOGIC
// ==========================================

let panoViewer = null;

function openPanorama(nodeData) {
    const modal = document.getElementById('pano-modal');
    const title = document.getElementById('pano-title');
    
    // 1. Show Modal
    modal.style.display = 'flex';
    title.innerText = nodeData.name; // Display Node Name

    // 2. Destroy previous viewer if exists
    if (panoViewer) {
        panoViewer.destroy();
        panoViewer = null;
    }

    // 3. Construct Image Path
    // ASSUMPTION: Images are in 'images/' folder and named by ID (e.g., "1.jpg", "55.jpg")
    // If you want to use names, change to: `images/${nodeData.name}.jpg`
    const imagePath = `images/${nodeData.id}.jpg`; 

    console.log("Loading 360 Image:", imagePath);

    // 4. Initialize Pannellum
    // We wrap this in a try-catch or error handler in case image is missing
    try {
        panoViewer = pannellum.viewer('panorama-container', {
            type: 'equirectangular',
            panorama: imagePath,
            autoLoad: true,
            compass: true,
            showControls: true,
            theme: 'dark',
            errorMessage: "Image not found: " + imagePath // Custom error message
        });
    } catch (e) {
        console.error("Pannellum Error:", e);
    }
}

// Make this globally available so the HTML button can call it
window.closePanorama = function() {
    const modal = document.getElementById('pano-modal');
    modal.style.display = 'none';
    
    if (panoViewer) {
        panoViewer.destroy();
        panoViewer = null;
    }
};

// Close modal if clicking outside the content box
document.getElementById('pano-modal').addEventListener('click', (e) => {
    if (e.target.id === 'pano-modal') {
        window.closePanorama();
    }
});