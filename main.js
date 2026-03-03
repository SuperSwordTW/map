// ==========================================
// 0. Priority Queue Implementation
// ==========================================
const parent = i => ((i + 1) >>> 1) - 1;
const left = i => (i << 1) + 1;
const right = i => (i + 1) << 1;

class PriorityQueue {
  #top = 0;

  constructor(comparator = (a, b) => a < b) {
    this._heap = [];
    this._comparator = comparator;
  }
  size() {
    return this._heap.length;
  }
  isEmpty() {
    return this.size() == 0;
  }
  peek() {
    return this._heap[this.#top];
  }
  push(...values) {
    values.forEach(value => {
      this._heap.push(value);
      this._siftUp();
    });
    return this.size();
  }
  pop() {
    const poppedValue = this.peek();
    const bottom = this.size() - 1;
    if (bottom > this.#top) {
      this._swap(this.#top, bottom);
    }
    this._heap.pop();
    this._siftDown();
    return poppedValue;
  }
  replace(value) {
    const replacedValue = this.peek();
    this._heap[this.#top] = value;
    this._siftDown();
    return replacedValue;
  }
  _greater(i, j) {
    return this._comparator(this._heap[i], this._heap[j]);
  }
  _swap(i, j) {
    [this._heap[i], this._heap[j]] = [this._heap[j], this._heap[i]];
  }
  _siftUp() {
    let node = this.size() - 1;
    while (node > this.#top && this._greater(node, parent(node))) {
      this._swap(node, parent(node));
      node = parent(node);
    }
  }
  _siftDown() {
    let node = this.#top;
    while (
      (left(node) < this.size() && this._greater(left(node), node)) ||
      (right(node) < this.size() && this._greater(right(node), node))
    ) {
      let maxChild = (right(node) < this.size() && this._greater(right(node), left(node))) ? right(node) : left(node);
      this._swap(node, maxChild);
      node = maxChild;
    }
  }
}


// ==========================================
// 1. CONFIGURATION
// ==========================================

// Where the 3D model will be placed on the real world map
// Coordinates: [Longitude, Latitude]
// #model
const MODEL_ORIGIN = [121.58595, 24.9870];
const MODEL_ALTITUDE = 1250;
const MODEL_ROTATE = [Math.PI / 2, -Math.PI / 6 + 0.05, 0];
const MODEL_SCALE = [30, 30, 30]; // Adjust based on your model's unit scale

let currentFocusAltitude = MODEL_ALTITUDE;
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
    6:  { name: "乙棟3F", url: './floors/6F.glb' },
    5:  { name: "乙棟2F", url: './floors/5F.glb' },
    4:  { name: "乙棟1F、體育館", url: './floors/4F.glb' },
    3:  { name: "游泳池看台", url: './floors/2F.glb' },
    2:  { name: "游泳池", url: './floors/2F.glb' },
    // Add other floors here...
};

const FLOOR_NAMES = {
    13: {name: "丁棟7F"},
    12: {name: "丁棟6F"},
    11: {name: "丁棟5F"},
    10: {name: "丁棟4F、乙棟7F"},
    9: {name: "丁棟3F、乙棟6F"},
    8: {name: "丁棟2F、乙棟5F"},
    7: {name: "丁棟1F、乙棟4F"},
    6: {name: "乙棟3F"},
    5: {name: "乙棟2F"},
    4: {name: "乙棟1F、體育館"},
    3: {name: "游泳池看台"},
    2: {name: "游泳池"},
}

// TODO: 6, 5, 4, 3, 2, 1F 的放大倍率還沒調整，因為我還沒拍到照片，先暫時放一樣的倍率。等拍到照片後再微調。
const FLOOR_ZOOMS = {
    100: 14.46, //Full view
    13:15.41,
    12:15.41,
    11:15.43,
    10:15.56,
    9:15.56,
    8:15.54,
    7:15.85,
    6:15.85,
    5:15.85,
    4:15.85,
    3:15.85,
    2:15.85,
    1:15.85,
};

const FLOOR_ZOOMS_MOBILE = {
    100: 13.53, //Full view
    13: 14.81, 
    12: 14.86,
    11: 14.92,
    10: 15.03,
    9:  15.05,
    8:  15.17,
    7:  15.15,
    6:  15.15,
    5:  15.15,
    4:  15.15,
    3:  15.15,
    2:  15.15,
    1:  15.15,
};

// ==========================================
// 2. MAP INITIALIZATION
// ==========================================

const isMobile = window.innerWidth < 768;

const zoomLevel = isMobile ? FLOOR_ZOOMS_MOBILE[100] : FLOOR_ZOOMS[100];
let maxZoomLevel = 20.0;
let minZoomLevel = isMobile ? 12.86 : 13.65;

const map = new maplibregl.Map({
    container: 'map',
    attributionControl: false,
    style: {
        'version': 8,
        'sources': {},
        'layers': [
            {
                'id': 'background',
                'type': 'background',
                'paint': {
                    'background-color': '#ffffff00'
                }
            }
        ],
        // CRITICAL: We need this URL to download fonts for your text labels
        // This uses the reliable OpenMapTiles font server
        'glyphs': 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf'
    },
    // style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    center: [121.573962, 25.015205],
    zoom: zoomLevel,
    pitch: 67.76,
    maxPitch: 85,
    maxZoom: maxZoomLevel,
    minZoom: minZoomLevel,
    bearing: -20.71,
    antialias: true,
    doubleClickZoom: false,
    dragRotate: false,
    dragPan: false,
});

map.getCanvasContainer().addEventListener('contextmenu', (e) => {
    e.preventDefault();
}, false);

const PAN_SENSITIVITY = 0.5; // 1.0 is normal, 0.4 is 40% speed. Adjust this!
let isDragging = false;
let prevPos = { x: 0, y: 0 };

const ROTATION_SENSITIVITY = 0.2; // 0.2 = 20% of original speed. Adjust this!
let isRightDragging = false;
let prevMousePos = { x: 0, y: 0 };

function getPoint(e) {
    if (e.originalEvent.touches && e.originalEvent.touches.length > 0) {
        return { x: e.originalEvent.touches[0].clientX, y: e.originalEvent.touches[0].clientY };
    }
    return { x: e.point.x, y: e.point.y };
}

map.on('touchstart', (e) => {
    // Disable default touch handling so it doesn't fight our script
    if (e.originalEvent.touches.length === 1) {
        isDragging = true;
        const point = getPoint(e);
        prevPos = { x: point.x, y: point.y };
    }
});

// 1. Listen for Right Mouse Down
map.on('mousedown', (e) => {
    if (e.originalEvent.button === 0 && !e.originalEvent.ctrlKey) {
        isDragging = true;
        prevPos = { x: e.point.x, y: e.point.y };
    }
    // Button 2 is Right Click. logical OR handles Ctrl+LeftClick (Mac style)
    if (e.originalEvent.button === 2 || (e.originalEvent.ctrlKey && e.originalEvent.button === 0)) {
        isRightDragging = true;
        prevMousePos = { x: e.point.x, y: e.point.y };
        
        // Visual feedback
        map.getCanvas().style.cursor = 'grabbing';
        
        // Prevent the browser context menu from popping up
        map.getCanvas().addEventListener('contextmenu', preventDefaultMenu);
    }
});

const handleMove = (e) => {
    // Handle Rotation (Right Click)
    if (isRightDragging) {
        const dx = e.point.x - prevMousePos.x;
        const dy = e.point.y - prevMousePos.y;

        map.jumpTo({
            bearing: map.getBearing() + (dx * ROTATION_SENSITIVITY),
            pitch: map.getPitch() - (dy * ROTATION_SENSITIVITY),
            animate: false
        });
        prevMousePos = { x: e.point.x, y: e.point.y };
        return; // Exit so we don't pan while rotating
    }

    // Handle Slow Panning (Left Click / Single Touch)
    if (isDragging) {
        const point = getPoint(e);
        const dx = (point.x - prevPos.x) * PAN_SENSITIVITY;
        const dy = (point.y - prevPos.y) * PAN_SENSITIVITY;

        const currentPoint = map.project(map.getCenter());
        const newCenter = map.unproject([
            currentPoint.x - dx, 
            currentPoint.y - dy
        ]);

        map.jumpTo({
            center: newCenter,
            animate: false
        });

        prevPos = { x: point.x, y: point.y };
    }
};

// 2. Event Listeners
map.on('mousemove', handleMove);
map.on('touchmove', handleMove);

// 3. Consolidated Stop Dragging
function stopDrag() {
    isDragging = false;
    if (isRightDragging) {
        isRightDragging = false;
        map.getCanvas().style.cursor = '';
        map.getCanvas().removeEventListener('contextmenu', preventDefaultMenu);
    }
}

map.on('mouseup', stopDrag);
map.on('touchend', stopDrag);
map.on('mouseout', stopDrag);

function preventDefaultMenu(e) {
    e.preventDefault();
}


    // ==========================================
    // 5. NODES LOGIC
    // ==========================================

    // Simulating a path through a building
    // #node
    const NAVIGATION_NODES = [
            //13F=30.0 12F=21.0 11F=12.0 10F(校門)=3.0 9F=-6.0 8F=-15.0
        /*id 1~33丁棟右上棟
            34~54丁棟左上棟
            55~59丁棟右樓梯
            60~66丁棟中樓梯
            67~74丁棟右下棟
            75~88丁棟左下棟
            89~93丁棟轉彎處
            94~109丙棟 
            110校門口
            111~116丙棟樓梯
            117~119丙棟中心
            120~122丙棟轉彎處
            123~129乙棟樓梯
            130~150乙棟
            151~157丁棟電梯
            158~163丙棟電梯
            164~170乙棟電梯
        */
        //-------------13樓-------------
        { id: 1, name: "韋格納", coords: [121.585997, 24.987735, 30.0], neighbors: [2], story: 13, building: 4 },
        { id: 2, name: "柯西", coords: [121.586070, 24.987698, 30.0], neighbors: [3], story: 13, building: 4 },
        { id: 3, name: "數學科辦公室(一)", coords: [121.586162, 24.987663, 30.0], neighbors: [4], story: 13, building: 4 },
        { id: 4, name: "南丁格爾", coords: [121.586200, 24.987595, 30.0], neighbors: [5], story: 13, building: 4 },
        { id: 5, name: "孫子", coords: [121.586224, 24.987540, 30.0], neighbors: [55], story: 13, building: 4 },

        { id: 75, name: "社會科辦公室", coords: [121.585695, 24.987695, 30.0], neighbors: [60], story: 13, building: 4 },

        { id: 89, name: "丁棟轉彎處(7F)", coords: [121.585871, 24.987789, 30.0], neighbors: [1,60], story: 13, building: 4, turn: 1 },
        
        //樓梯、電梯
        { id: 55, name: "丁棟中右樓梯(7F)", coords: [121.586225, 24.987475, 30.0], neighbors: [56], story: 13, building: 4, stair: 1 },
        { id: 60, name: "丁棟中左樓梯(7F)", coords: [121.585783, 24.987650, 30.0], neighbors: [89], story: 13, building: 4, stair: 1 },

        { id: 151, name: "丁棟電梯(7F)", coords: [121.585732, 24.987731, 30.0], neighbors: [60,75,89,152], story: 13, building: 4, elevator: 1 },
        //-------------12樓-------------
        { id: 6, name: "李清照", coords: [121.585997, 24.987735, 21.0], neighbors: [7], story: 12, building: 4 },
        { id: 7, name: "胡適", coords: [121.586070, 24.987698, 21.0], neighbors: [8], story: 12, building: 4 },
        { id: 8, name: "自然科辦公室(一)", coords: [121.586162, 24.987663, 21.0], neighbors: [9], story: 12, building: 4 },
        { id: 9, name: "笛卡爾", coords: [121.586200, 24.987595, 21.0], neighbors: [10], story: 12, building: 4 },
        { id: 10, name: "高斯",  coords: [121.586224, 24.987540, 21.0], neighbors: [11,56], story: 12, building: 4 },
        { id: 11, name: "道爾吞", coords: [121.586241, 24.987418, 21.0], neighbors: [12,56], story: 12, building: 4 },
        { id: 12, name: "拉瓦節(化學實驗室)", coords: [121.586209, 24.987327, 21.0], neighbors: [], story: 12, building: 4 },

        { id: 67, name: "亞當斯密", coords: [121.585933, 24.987558, 21.0], neighbors: [68], story: 12, building: 4 },
        { id: 68, name: "蘇格拉底", coords: [121.586020, 24.987470, 21.0], neighbors: [9,69], story: 12, building: 4 },
        { id: 69, name: "霍金", coords: [121.586018, 24.987332, 21.0], neighbors: [], story: 12, building: 4 },

        { id: 76, name: "自然科辦公室(二)", coords: [121.585695, 24.987695, 21.0], neighbors: [61], story: 12, building: 4 },

        { id: 90, name: "丁棟轉彎處(6F)", coords: [121.585871, 24.987789, 21.0], neighbors: [6,61], story: 12, building: 4, turn: 1 },
        //樓梯、電梯
        { id: 56, name: "丁棟中右樓梯(6F)", coords: [121.586225, 24.987475, 21.0], neighbors: [55,57], story: 12, building: 4, stair: 1 },
        { id: 61, name: "丁棟中左樓梯(6F)", coords: [121.585783, 24.987650, 21.0], neighbors: [60,62,67], story: 12, building: 4, stair: 1 },
        { id: 111, name: "丙棟樓梯(6F)", coords: [121.585413, 24.987089, 21.0], neighbors: [112], story: 12, building: 3, stair: 1 },

        { id: 152, name: "丁棟電梯(6F)", coords: [121.585732, 24.987731, 21.0], neighbors: [61,76,90,153], story: 12, building: 4, elevator: 1 },
        { id: 158, name: "丙棟電梯(6F)", coords: [121.585370, 24.987078, 21.0], neighbors: [159], story: 12, building: 3, elevator: 1 },
        //...
        //-------------11樓-------------
        { id: 13, name: "曹雪芹", coords: [121.585997, 24.987735, 12.0], neighbors: [14,36], story: 11, building: 4 },
        { id: 14, name: "張愛玲", coords: [121.586070, 24.987698, 12.0], neighbors: [15], story: 11, building: 4 },
        { id: 15, name: "數學科辦公室(二)", coords: [121.586162, 24.987663, 12.0], neighbors: [16], story: 11, building: 4 },
        { id: 16, name: "海佩蒂雅", coords: [121.586200, 24.987595, 12.0], neighbors: [17], story: 11, building: 4 },
        { id: 17, name: "尤拉", coords: [121.586224, 24.987540, 12.0], neighbors: [18,57], story: 11, building: 4 },
        { id: 18, name: "吳健雄", coords: [121.586241, 24.987418, 12.0], neighbors: [19,57], story: 11, building: 4 },
        { id: 19, name: "亞佛加厥(理化實驗室)", coords: [121.586209, 24.987327, 12.0], neighbors: [], story: 11, building: 4 },

        { id: 34, name: "英文科辦公室(一)", coords: [121.585699, 24.988053, 12.0], neighbors: [35], story: 11, building: 4 },
        { id: 35, name: "Shakespeare", coords: [121.585746, 24.987986, 12.0], neighbors: [36], story: 11, building: 4 },
        { id: 36, name: "Yeats", coords: [121.585809, 24.987907, 12.0], neighbors: [], story: 11, building: 4 },

        { id: 70, name: "湯姆林森", coords: [121.585933, 24.987558, 12.0], neighbors: [62,71], story: 11, building: 4 },
        { id: 71, name: "亞里斯多德", coords: [121.586020, 24.987470, 12.0], neighbors: [16,72], story: 11, building: 4 },
        { id: 72, name: "諾貝爾", coords: [121.586018, 24.987332, 12.0], neighbors: [], story: 11, building: 4 },

        { id: 77, name: "聯合社辦", coords: [121.585459, 24.987808, 12.0], neighbors: [78], story: 11, building: 4 },
        { id: 78, name: "戴維斯", coords: [121.585513, 24.987784, 12.0], neighbors: [79], story: 11, building: 4 },
        { id: 79, name: "布魯姆", coords: [121.585564, 24.987754, 12.0], neighbors: [62], story: 11, building: 4 },

        { id: 91, name: "丁棟轉彎處(5F)", coords: [121.585871, 24.987789, 12.0], neighbors: [13,36,62], story: 11, building: 4, turn: 1 },

        { id: 94, name: "圖書館", coords: [121.585556, 24.987457, 12.0], neighbors: [62], story: 11, building: 3 },
        //樓梯、電梯
        { id: 57, name: "丁棟中右樓梯(5F)", coords: [121.586225, 24.987475, 12.0], neighbors: [56,58], story: 11, building: 4, stair: 1 },
        { id: 62, name: "丁棟中左樓梯(5F)", coords: [121.585783, 24.987650, 12.0], neighbors: [61,63], story: 11, building: 4, stair: 1 },
        { id: 112, name: "丙棟樓梯(5F)", coords: [121.585413, 24.987089, 12.0], neighbors: [113], story: 11, building: 3, stair: 1 },

        { id: 153, name: "丁棟電梯(5F)", coords: [121.585732, 24.987731, 12.0], neighbors: [62,91,94,154], story: 11, building: 4, elevator: 1 },
        { id: 159, name: "丙棟電梯(5F)", coords: [121.585370, 24.987078, 12.0], neighbors: [160], story: 11, building: 3, elevator: 1 },
        //-------------10樓-------------
        { id: 20, name: "李白", coords: [121.585997, 24.987735, 3.0], neighbors: [21,41], story: 10, building: 4 },
        { id: 21, name: "蘇東坡", coords: [121.586070, 24.987698, 3.0], neighbors: [22], story: 10, building: 4 },
        { id: 22, name: "國文科辦公室(一)", coords: [121.586162, 24.987663, 3.0], neighbors: [23], story: 10, building: 4 },
        { id: 23, name: "祖沖之", coords: [121.586200, 24.987595, 3.0], neighbors: [24], story: 10, building: 4 },
        { id: 24, name: "福利社", coords: [121.586224, 24.987540, 3.0], neighbors: [25,58], story: 10, building: 4 },
        { id: 25, name: "伽利略(物理實驗室)", coords: [121.586241, 24.987418, 3.0], neighbors: [26,58], story: 10, building: 4 },
        { id: 26, name: "愛因斯坦(物理實驗室)", coords: [121.586209, 24.987327, 3.0], neighbors: [], story: 10, building: 4 },

        { id: 37, name: "徐霞客", coords: [121.585550, 24.988139, 3.0], neighbors: [38], story: 10, building: 4 },
        { id: 38, name: "洪堡德", coords: [121.585638, 24.988086, 3.0], neighbors: [39], story: 10, building: 4 },
        { id: 39, name: "英文科辦公室(二)", coords: [121.585699, 24.988053, 3.0], neighbors: [40], story: 10, building: 4 },
        { id: 40, name: "Chomsky", coords: [121.585746, 24.987986, 3.0], neighbors: [41], story: 10, building: 4 },
        { id: 41, name: "Woolf", coords: [121.585809, 24.987907, 3.0], neighbors: [], story: 10, building: 4 },

        { id: 73, name: "學務處", coords: [121.586020, 24.987470, 3.0], neighbors: [63], story: 10, building: 4 },

        { id: 80, name: "學生會辦", coords: [121.585459, 24.987808, 3.0], neighbors: [81], story: 10, building: 4 },
        { id: 81, name: "皮亞傑", coords: [121.585513, 24.987784, 3.0], neighbors: [82], story: 10, building: 4 },
        { id: 82, name: "杜威", coords: [121.585564, 24.987754, 3.0], neighbors: [63], story: 10, building: 4 },

        { id: 92, name: "丁棟轉彎處(4F)", coords: [121.585871, 24.987789, 3.0], neighbors: [20,41,63], story: 10, building: 4, turn: 1 },

        { id: 95, name: "校長室", coords: [121.585163, 24.987259, 3.0], neighbors: [117], story: 10, building: 3 },
        { id: 96, name: "簡報室", coords: [121.585227, 24.987232, 3.0], neighbors: [117], story: 10, building: 3 },
        { id: 97, name: "校史館", coords: [121.585286, 24.987191, 3.0], neighbors: [117], story: 10, building: 3 },
        { id: 98, name: "穿堂", coords: [121.585549, 24.987377, 3.0], neighbors: [117], story: 10, building: 3 },
        { id: 110, name: "校門口", coords: [121.586012, 24.986974, 3.0], neighbors: [98], story: 10, building: 4 },

        { id: 117, name: "丙棟中心(4F)", coords: [121.585338, 24.987269, 3.0], neighbors: [113], story: 10, building: 3, turn: 1 },
        { id: 120, name: "丙棟轉彎處(4F)", coords: [121.585564, 24.987538, 3.0], neighbors: [63,98,117], story: 10, building: 3, turn: 1 },

        { id: 130, name: "莫札特", coords: [121.584737, 24.987549, 3.0], neighbors: [131], story: 10, building: 2 },
        { id: 131, name: "藝能科辦公室", coords: [121.584889, 24.987494, 3.0], neighbors: [164], story: 10, building: 2 },
        { id: 132, name: "卓別林", coords: [121.584667, 24.987512, 3.0], neighbors: [164], story: 10, building: 2 },
        //樓梯、電梯
        { id: 58, name: "丁棟中右樓梯(4F)", coords: [121.586225, 24.987475, 3.0], neighbors: [57,59], story: 10, building: 4, stair: 1 },
        { id: 63, name: "丁棟中左樓梯(4F)", coords: [121.585783, 24.987650, 3.0], neighbors: [62,64], story: 10, building: 4, stair: 1 },
        { id: 113, name: "丙棟樓梯(4F)", coords: [121.585413, 24.987089, 3.0], neighbors: [114], story: 10, building: 3, stair: 1 },
        { id: 123, name: "乙棟樓梯(7F)", coords: [121.585025, 24.987388, 3.0], neighbors: [117,124], story: 10, building: 2, stair: 1 },

        { id: 154, name: "丁棟電梯(4F)", coords: [121.585732, 24.987731, 3.0], neighbors: [63,92,155], story: 10, building: 4, elevator: 1 },
        { id: 160, name: "丙棟電梯(4F)", coords: [121.585370, 24.987078, 3.0], neighbors: [117,161], story: 10, building: 3, elevator: 1 },
        { id: 164, name: "乙棟電梯(7F)", coords: [121.584913, 24.987409, 3.0], neighbors: [123,165], story: 10, building: 2, elevator: 1 },
        //-------------9樓-------------
        { id: 27, name: "莊子", coords: [121.585997, 24.987735, -6.0], neighbors: [28,46], story: 9, building: 4 },
        { id: 28, name: "孔子", coords: [121.586070, 24.987698, -6.0], neighbors: [29], story: 9, building: 4 },
        { id: 29, name: "生物科準備室", coords: [121.586162, 24.987663, -6.0], neighbors: [30], story: 9, building: 4 },
        { id: 30, name: "牛頓", coords: [121.586200, 24.987595, -6.0], neighbors: [31], story: 9, building: 4 },
        { id: 31, name: "杜聰明", coords: [121.586224, 24.987540, -6.0], neighbors: [32,59], story: 9, building: 4 },
        { id: 32, name: "虎克(生物實驗室)", coords: [121.586241, 24.987418, -6.0], neighbors: [33,59], story: 9, building: 4 },
        { id: 33, name: "孟德爾(生物實驗室)", coords: [121.586209, 24.987327, -6.0], neighbors: [], story: 9, building: 4 },

        { id: 42, name: "希羅多德", coords: [121.585550, 24.988139, -6.0], neighbors: [43], story: 9, building: 4 },
        { id: 43, name: "李特爾", coords: [121.585638, 24.988086, -6.0], neighbors: [44], story: 9, building: 4 },
        { id: 44, name: "教學研究室", coords: [121.585699, 24.988053, -6.0], neighbors: [45], story: 9, building: 4 },
        { id: 45, name: "Hawthorne", coords: [121.585746, 24.987986, -6.0], neighbors: [46], story: 9, building: 4 },
        { id: 46, name: "Dickinson", coords: [121.585809, 24.987907, -6.0], neighbors: [], story: 9, building: 4 },

        { id: 74, name: "桌球教室", coords: [121.585933, 24.987558, -6.0], neighbors: [64], story: 9, building: 4 },

        { id: 83, name: "海外辦公室", coords: [121.585513, 24.987784, -6.0], neighbors: [84], story: 9, building: 4 },
        { id: 84, name: "翻轉教室", coords: [121.585564, 24.987754, -6.0], neighbors: [64], story: 9, building: 4 },

        { id: 93, name: "丁棟轉彎處(3F)", coords: [121.585871, 24.987789, -6.0], neighbors: [27,46,64], story: 9, building: 4, turn: 1 },

        { id: 99, name: "教務處", coords: [121.585163, 24.987259, -6.0], neighbors: [118], story: 9, building: 3 },
        { id: 100, name: "總務處", coords: [121.585286, 24.987191, -6.0], neighbors: [118], story: 9, building: 3 },
        { id: 101, name: "會計室", coords: [121.585429, 24.987201, -6.0], neighbors: [118], story: 9, building: 3 },
        { id: 102, name: "總務處(二)", coords: [121.585460, 24.987264, -6.0], neighbors: [118], story: 9, building: 3 },
        { id: 103, name: "人事室", coords: [121.585549, 24.987377, -6.0], neighbors: [118], story: 9, building: 3 },
        { id: 104, name: "無名教室", coords: [121.585579, 24.987470, -6.0], neighbors: [118], story: 9, building: 3 },

        { id: 118, name: "丙棟中心(3F)", coords: [121.585338, 24.987269, -6.0], neighbors: [114], story: 9, building: 3, turn: 1 },
        { id: 121, name: "丙棟轉彎處(3F)", coords: [121.585564, 24.987538, -6.0], neighbors: [64,118], story: 9, building: 3, turn: 1 },

        { id: 133, name: "張大千", coords: [121.584737, 24.987549, -6.0], neighbors: [134], story: 9, building: 2 },
        { id: 134, name: "賽尚", coords: [121.584889, 24.987494, -6.0], neighbors: [165], story: 9, building: 2 },
        { id: 135, name: "陸羽軒", coords: [121.584667, 24.987512, -6.0], neighbors: [136], story: 9, building: 2 },
        { id: 136, name: "多功能教室", coords: [121.584811, 24.987445, -6.0], neighbors: [165], story: 9, building: 2 },
        //樓梯、電梯
        { id: 59, name: "丁棟中右樓梯(3F)", coords: [121.586225, 24.987475, -6.0], neighbors: [58], story: 9, building: 4, stair: 1 },
        { id: 64, name: "丁棟中左樓梯(3F)", coords: [121.585783, 24.987650, -6.0], neighbors: [63,65], story: 9, building: 4, stair: 1 },
        { id: 114, name: "丙棟樓梯(3F)", coords: [121.585413, 24.987089, -6.0], neighbors: [115], story: 9, building: 3, stair: 1 },
        { id: 124, name: "乙棟樓梯(6F)", coords: [121.585025, 24.987388, -6.0], neighbors: [118,125], story: 9, building: 2, stair: 1 },

        { id: 155, name: "丁棟電梯(3F)", coords: [121.585732, 24.987731, -6.0], neighbors: [64,93,156,118], story: 9, building: 4, elevator: 1 },
        { id: 161, name: "丙棟電梯(3F)", coords: [121.585370, 24.987078, -6.0], neighbors: [118,162], story: 9, building: 3, elevator: 1 },
        { id: 165, name: "乙棟電梯(6F)", coords: [121.584913, 24.987409, -6.0], neighbors: [124,166], story: 9, building: 2, elevator: 1 },
        //-------------8樓-------------
        { id: 47, name: "梁啟超", coords: [121.585550, 24.988139, -15.0], neighbors: [48], story: 8, building: 4 },
        { id: 48, name: "司馬遷", coords: [121.585638, 24.988086, -15.0], neighbors: [49], story: 8, building: 4 },
        { id: 49, name: "國文科辦公室(二)", coords: [121.585699, 24.988053, -15.0], neighbors: [50], story: 8, building: 4 },
        { id: 50, name: "孫逸仙", coords: [121.585746, 24.987986, -15.0], neighbors: [51], story: 8, building: 4 },
        { id: 51, name: "涂林", coords: [121.585809, 24.987907, -15.0], neighbors: [86], story: 8, building: 4 },

        { id: 85, name: "貝爾", coords: [121.585564, 24.987754, -15.0], neighbors: [65], story: 8, building: 4 },
        { id: 86, name: "迦納", coords: [121.585886, 24.987710, -15.0], neighbors: [65], story: 8, building: 4 },

        { id: 105, name: "教學媒體製作室", coords: [121.585163, 24.987259, -15.0], neighbors: [119], story: 8, building: 3 },
        { id: 106, name: "雙語教育教室", coords: [121.585286, 24.987191, -15.0], neighbors: [119], story: 8, building: 3 },
        { id: 107, name: "視聽教室", coords: [121.585429, 24.987201, -15.0], neighbors: [119], story: 8, building: 3 },
        { id: 108, name: "翻譯室", coords: [121.585460, 24.987264, -15.0], neighbors: [119], story: 8, building: 3 },
        { id: 109, name: "國際會議廳", coords: [121.585549, 24.987377, -15.0], neighbors: [119], story: 8, building: 3 },

        { id: 119, name: "丙棟中心(2F)", coords: [121.585338, 24.987269, -15.0], neighbors: [115], story: 8, building: 3, turn: 1 },
        { id: 122, name: "丙棟轉彎處(2F)", coords: [121.585564, 24.987538, -15.0], neighbors: [65,119], story: 8, building: 3, turn: 1 },

        { id: 137, name: "禮儀教室", coords: [121.584677, 24.987564, -15.0], neighbors: [138], story: 8, building: 2 },
        { id: 138, name: "畢昇", coords: [121.584737, 24.987549, -15.0], neighbors: [139], story: 8, building: 2 },
        { id: 139, name: "查德威克", coords: [121.584889, 24.987494, -15.0], neighbors: [166], story: 8, building: 2 },
        { id: 140, name: "伊尹", coords: [121.584667, 24.987512, -15.0], neighbors: [141], story: 8, building: 2 },
        { id: 141, name: "家長會辦", coords: [121.584811, 24.987445, -15.0], neighbors: [166], story: 8, building: 2 },
        //樓梯、電梯
        { id: 65, name: "丁棟中左樓梯(2F)", coords: [121.585783, 24.987650, -15.0], neighbors: [64,66], story: 8, building: 4, stair: 1 },
        { id: 115, name: "丙棟樓梯(2F)", coords: [121.585413, 24.987089, -15.0], neighbors: [116], story: 8, building: 3, stair: 1 },
        { id: 125, name: "乙棟樓梯(5F)", coords: [121.585025, 24.987388, -15.0], neighbors: [119,126], story: 8, building: 2, stair: 1 },

        { id: 156, name: "丁棟電梯(2F)", coords: [121.585732, 24.987731, -15.0], neighbors: [65,85,86,157], story: 8, building: 4, elevator: 1 },
        { id: 162, name: "丙棟電梯(2F)", coords: [121.585370, 24.987078, -15.0], neighbors: [119,163], story: 8, building: 3, elevator: 1 },
        { id: 166, name: "乙棟電梯(5F)", coords: [121.584913, 24.987409, -15.0], neighbors: [125,167], story: 8, building: 2, elevator: 1 },
        //-------------7樓-------------
        { id: 52, name: "健康中心", coords: [121.585699, 24.988053, -24.0], neighbors: [53], story: 7, building: 4 },
        { id: 53, name: "貝登堡", coords: [121.585746, 24.987986, -24.0], neighbors: [54], story: 7, building: 4 },
        { id: 54, name: "討論室", coords: [121.585809, 24.987907, -24.0], neighbors: [88], story: 7, building: 4 },

        { id: 87, name: "傑弗遜", coords: [121.585695, 24.987695, -24.0], neighbors: [66], story: 7, building: 4 },
        { id: 88, name: "教學研究室", coords: [121.585886, 24.987710, -24.0], neighbors: [66], story: 7, building: 4 },

        { id: 142, name: "羅吉斯、佛洛伊德", coords: [121.584667, 24.987512, -24.0], neighbors: [143], story: 7, building: 2 },
        { id: 143, name: "輔導室", coords: [121.584811, 24.987445, -24.0], neighbors: [167], story: 7, building: 2 },
        { id: 146, name: "演藝廳", coords: [121.584636, 24.987690, -24.0], neighbors: [142], story: 7, building: 1 },
        //樓梯、電梯
        { id: 66, name: "丁棟中左樓梯(1F)", coords: [121.585783, 24.987650, -24.0], neighbors: [65], story: 7, building: 4, stair: 1 },
        { id: 116, name: "丙棟汽車停車場", coords: [121.585413, 24.987089, -24.0], neighbors: [], story: 7, building: 3, stair: 1 },
        { id: 126, name: "乙棟樓梯(4F)", coords: [121.585025, 24.987388, -24.0], neighbors: [127], story: 7, building: 2, stair: 1 },

        { id: 157, name: "丁棟電梯(1F)", coords: [121.585732, 24.987731, -24.0], neighbors: [66,87,88], story: 7, building: 4, elevator: 1 },
        { id: 163, name: "丙棟電梯(1F)", coords: [121.585370, 24.987078, -24.0], neighbors: [], story: 7, building: 3, elevator: 1 },
        { id: 167, name: "乙棟電梯(4F)", coords: [121.584913, 24.987409, -24.0], neighbors: [126,168], story: 7, building: 2, elevator: 1 },
        //-------------6樓-------------
        { id: 144, name: "體育科辦公室", coords: [121.584667, 24.987512, -33.0], neighbors: [168], story: 6, building: 2 },
        { id: 147, name: "室內跑道", coords: [121.584294, 24.987892, -33.0], neighbors: [144], story: 6, building: 1 },
        //樓梯、電梯
        { id: 127, name: "乙棟樓梯(3F)", coords: [121.585025, 24.987388, -33.0], neighbors: [128], story: 6, building: 2, stair: 1 },

        { id: 168, name: "乙棟電梯(3F)", coords: [121.584913, 24.987409, -33.0], neighbors: [127,169], story: 6, building: 2, elevator: 1 },
        //-------------5樓-------------
        { id: 145, name: "樂活運動站", coords: [121.584811, 24.987445, -42.0], neighbors: [169], story: 5, building: 2 },
        //樓梯、電梯
        { id: 128, name: "乙棟樓梯(2F)", coords: [121.585025, 24.987388, -42.0], neighbors: [129], story: 5, building: 2, stair: 1 },

        { id: 169, name: "乙棟電梯(2F)", coords: [121.584913, 24.987409, -42.0], neighbors: [128,170,145], story: 5, building: 2, elevator: 1 },
        //-------------4樓-------------
        { id: 148, name: "聯合社辦", coords: [121.584594, 24.987990, -51.0], neighbors: [149], story: 4, building: 2 },
        { id: 149, name: "綜合技擊室", coords: [121.584638, 24.987602, -51.0], neighbors: [150], story: 4, building: 2 },
        { id: 150, name: "韻律教室", coords: [121.584619, 24.987551, -51.0], neighbors: [170], story: 4, building: 2 },
        //樓梯、電梯
        { id: 129, name: "乙棟樓梯(1F)", coords: [121.585025, 24.987388, -51.0], neighbors: [], story: 4, building: 2, stair: 1 },

        { id: 170, name: "乙棟電梯(1F)", coords: [121.584913, 24.987409, -51.0], neighbors: [129], story: 4, building: 2, elevator: 1 },
        //-------------3樓-------------
        //樓梯、電梯
        //-------------2樓-------------
        //樓梯、電梯 
        //-------------1樓-------------
        //樓梯、電梯
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

    (function readCSVfile() {
        fetch('class.csv')
            .then(response => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.text();
            })
            .then(data => {
                console.log("CSV loaded successfully");
                const rows = data.trim().split('\n');
                const headers = rows[0].split(',');
                
                rows.slice(1).forEach(row => {
                    const values = row.split(',');
                    const id = values[0];
                    const name = values[1];
                    const number = values[2];

                    const Node = NAVIGATION_NODES.find(n => n.id == parseInt(id)); // Parse ID
                    if (Node) {
                        Node.name = `${number} ${Node.name}`;
                    }
                });

                initDropdowns();

                refreshThreeJsLabels();
            })
            .catch(error => console.error('CSV Error:', error));
    })();

    function refreshThreeJsLabels() {
        if (!window.threeLayer || !window.threeLayer.sceneNodes) return;

        const svgPath = "M7,10H10M10,10H13M10,10V7M10,10V13M15,15L21,21M10,17C6.134,17 3,13.866 3,10C3,6.134 6.134,3 10,3C13.866,3 17,6.134 17,10C17,13.866 13.866,17 10,17Z";

        window.threeLayer.sceneNodes.children.forEach(child => {
            // Check if this is a sphere and if it has a label mesh attached
            if (child.userData.isNode && child.userData.labelMesh) {
                const labelMesh = child.userData.labelMesh;
                const nodeId = child.userData.id;
                
                // Find the updated node data
                const updatedNode = NAVIGATION_NODES.find(n => n.id === nodeId);
                if (!updatedNode) return;

                // Create a new canvas with the updated name
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

                const centerX = canvas.width / 2; // 1024
                context.strokeText(updatedNode.name, centerX, 180);
                context.fillText(updatedNode.name, centerX, 180);

                // #refresh
                if (!updatedNode.turn && !updatedNode.stair && !updatedNode.elevator) {
                    context.save();
                    context.strokeStyle = "#35ceb9";
                    context.lineJoin = "round";
                    context.lineCap = "round";

                    const iconScale = 12;
                    const iconWidth = 24 * iconScale; 
                    context.translate(centerX - (iconWidth / 2), 250); 
                    context.scale(iconScale, iconScale);
                    
                    context.lineWidth = 2;

                    const path = new Path2D(svgPath);
                    context.stroke(path);
                    context.restore();
                }
            
                
                // Dispose of old texture to save memory and apply new one
                labelMesh.material.map.dispose(); 
                labelMesh.material.map = new THREE.CanvasTexture(canvas);
                labelMesh.material.needsUpdate = true;

                // Update the user data name for consistency
                child.userData.name = updatedNode.name;
            }
        });
    
    if (window.threeLayer.map) window.threeLayer.map.triggerRepaint();
}

    function checkDuplicateIds(nodes) {
        const seenIds = new Set();
        const duplicates = [];

        nodes.forEach(node => {
            if (seenIds.has(node.id)) {
                duplicates.push(node);
            } else {
                seenIds.add(node.id);
            }
        });

        if (duplicates.length > 0) {
            console.error("❌ Duplicate IDs found in NAVIGATION_NODES:");
            duplicates.forEach(dup => {
                console.log(`ID: ${dup.id}, Name: "${dup.name}", Story: ${dup.story}`);
            });
        } else {
            console.log("✅ No duplicate IDs found.");
        }
    }

    checkDuplicateIds(NAVIGATION_NODES);

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

        const ambientLight = new THREE.AmbientLight(0x333333, 5.0); 
        this.sceneModel.add(ambientLight);

        // 2. Directional Light: Mimics the sun, provides structure and shine
        const dirLight = new THREE.DirectionalLight(0xffffff, 5.0);
        dirLight.position.set(500, 500, 500); // Positions the light above and to the right
        this.sceneModel.add(dirLight);

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
                    // 1. Keep the original PBR material from Blender
                    // but enable transparency so you can fade it later
                    child.material.transparent = true;
                    child.material.opacity = 1.0;
                    child.material.side = THREE.DoubleSide; // If you still need both sides visible

                    child.material.polygonOffset = true;
                    child.material.polygonOffsetFactor = 1;
                    child.material.polygonOffsetUnits = 1;

                    child.material.needsUpdate = true;

                    // 2. Add edges (Optional, keeping your current logic)
                    const edges = new THREE.EdgesGeometry(child.geometry, 15);
                    const line = new THREE.LineSegments(
                        edges, 
                        new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 1.0 })
                    );
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
            if (node.turn) return;
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

            const material = new THREE.MeshBasicMaterial({
                color: 0xff9900,
                toneMapped: false
            });
            
            if (node.stair || node.elevator) {
                material.color.set(0xcc62fc);
            }
            
            // TODO: Use node model to highlight the fact that it can be clicked.

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

            // #icon

            // if (!node.turn && !node.stair && !node.elevator) {
            //     const svgPath = "M7,10H10M10,10H13M10,10V7M10,10V13M15,15L21,21M10,17C6.134,17 3,13.866 3,10C3,6.134 6.134,3 10,3C13.866,3 17,6.134 17,10C17,13.866 13.866,17 10,17Z";

            //     context.save();
            //     context.strokeStyle = "#35ceb9";
            //     context.lineJoin = "round";
            //     context.lineCap = "round";

            //     context.translate(400, 130); 
            //     context.scale(15, 15);
            //     context.lineWidth = 2;

            //     const iconPath = new Path2D(svgPath);
            //     context.stroke(iconPath);
            //     context.restore();
            // }
            
            // context.font = "Bold 180px Arial";
            // context.fillStyle = "white";
            // context.textAlign = "left";
            // context.textBaseline = "middle";
            // context.strokeStyle = 'black';
            // context.lineWidth = 12;
            
            // const textX = 550;
            // context.strokeText(node.name, textX, 256);
            // context.fillText(node.name, textX, 256);
            
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
                side: THREE.DoubleSide,
                toneMapped: false
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

        this.map = map;
        this.renderer = new THREE.WebGLRenderer({
            canvas: map.getCanvas(),
            context: gl,
            antialias: true,
            logarithmicDepthBuffer: true
        });
        this.renderer.autoClear = false;

        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.5; // Increased from 0.5 to prevent "Black" look
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

        const pathMesh = window.threeLayer.sceneNodes.children.find(c => c.userData.isPathLine === true);
        if (pathMesh && pathMesh.material.map) {
            // Adjust speed here (negative for forward direction along the array)
            pathMesh.material.map.offset.x -= 0.01; 
            
            // Essential: Trigger a repaint to keep the animation running smooth
            map.triggerRepaint(); 
        }

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

    // initDropdowns();

    filterNodesByStory(0);

    const urlNodes = getNavParamsFromURL();

    if (urlNodes.start || urlNodes.end) {
        
        const startId = parseInt(urlNodes.start);
        const endId = parseInt(urlNodes.end);
        
        console.log(`URL Path requested: ${urlNodes.start} to ${urlNodes.end}`);

        if (startId === endId) {
            alert("Start and Destination cannot be the same.");
        }

        if (startId != endId && urlNodes.start != null && urlNodes.end != null){
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
        }

    }
    // Load the zoom level display
    const zoomPercent = 100 - ((map.getZoom() - minZoomLevel) / (maxZoomLevel - minZoomLevel) * 100).toFixed(0);
    document.getElementById('zoom-value').innerText = `${zoomPercent}%`;

    console.log("Map Layers Initialized");
});

// ==========================================
// 4. CINEMATIC CAMERA LOGIC & PATH UPDATE
// ==========================================

// TODO; When clicking "下樓" or "上樓", we should ideally jump to the next segment immediately instead of waiting for the current animation to finish. This requires a bit of state management to interrupt the current animation and start the next one.

// NEW: Helper to smooth jagged paths into curves
function getSmoothPath(geoCoords) {
    if (geoCoords.length < 2) return geoCoords;

    // 1. Convert to Vector3 using raw Mercator units (0 to 1 range)
    // We don't need the 1,000,000 multiplier here; CatmullRom works fine with decimals.
    const vectorPoints = geoCoords.map(p => {
        const merc = maplibregl.MercatorCoordinate.fromLngLat([p[0], p[1]], p[2]);
        return new THREE.Vector3(merc.x, merc.y, merc.z);
    });

    // 2. Create the Curve
    const curve = new THREE.CatmullRomCurve3(vectorPoints);
    curve.curveType = 'centripetal'; 
    
    // 3. Resample
    const totalPoints = (geoCoords.length - 1) * 30;
    const smoothedVectors = curve.getPoints(totalPoints);

    // 4. Convert back to [Lng, Lat, Alt]
    return smoothedVectors.map(v => {
        // Create a temporary Mercator object from the smoothed vectors
        const tempMerc = new maplibregl.MercatorCoordinate(v.x, v.y, v.z);
        
        // Convert back to LngLat
        const lngLat = tempMerc.toLngLat();
        
        // Safety check: if projection fails, return original if possible
        if (isNaN(lngLat.lng) || isNaN(lngLat.lat)) {
            console.warn("Smoothing produced NaN coordinates, skipping point.");
            return null; 
        }

        // Correctly calculate altitude from Mercator Z
        const metersPerUnit = tempMerc.meterInMercatorCoordinateUnits();
        const alt = v.z / metersPerUnit;

        return [lngLat.lng, lngLat.lat, alt];
    }).filter(p => p !== null); // Clean up any failed projections
}

function getFlowTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; 
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    
    // Create Gradient: Transparent -> Cyan -> Purple -> Transparent
    // This creates a "pulse" or "comet" look
    const gradient = ctx.createLinearGradient(0, 0, 256, 0);
    gradient.addColorStop(0.0, 'rgba(0, 210, 255, 0)');
    gradient.addColorStop(0.1, 'rgba(0, 210, 255, 1)');
    gradient.addColorStop(0.5, 'rgba(150, 0, 255, 1)');
    gradient.addColorStop(1.0, 'rgba(150, 0, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 1);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping; // Allows the texture to loop
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
}

// Helper: Update the Blue Line in Three.js
function updatePathVisuals(newPathCoords) {
    if (!window.threeLayer || !window.threeLayer.sceneNodes) return;

    const layer = window.threeLayer;

    // 1. Remove old mesh if it exists
    const oldMesh = layer.sceneNodes.children.find(c => c.userData.isPathLine === true);
    if (oldMesh) {
        if (oldMesh.geometry) oldMesh.geometry.dispose();
        if (oldMesh.material) {
            if (oldMesh.material.map) oldMesh.material.map.dispose();
            oldMesh.material.dispose();
        }
        layer.sceneNodes.remove(oldMesh);
    }

    // 2. Prepare Data
    const smoothedCoords = getSmoothPath(newPathCoords);
    if (smoothedCoords.length < 2) return;

    const originMerc = maplibregl.MercatorCoordinate.fromLngLat(MODEL_ORIGIN, 0);
    const originScale = originMerc.meterInMercatorCoordinateUnits();

    // 3. Convert to Local Vector3 (Meters)
    const pathPoints = smoothedCoords.map(coord => {
        const nodeMerc = maplibregl.MercatorCoordinate.fromLngLat([coord[0], coord[1]], coord[2] || 0);
        
        // Convert Mercator delta to Meters
        const x = (nodeMerc.x - originMerc.x) / originScale;
        const y = -(nodeMerc.y - originMerc.y) / originScale;
        
        // Lift the line 0.5 meters above the floor to avoid z-fighting/clipping
        const z = ((nodeMerc.z - originMerc.z) / originScale) + 0.5;
        
        return new THREE.Vector3(x, y, z);
    });

    // 4. Create Geometry
    // CatmullRomCurve3 creates the smooth spine of the tube
    const curve = new THREE.CatmullRomCurve3(pathPoints);
    
    // FIX: Set radius directly in meters (0.4m = ~40cm thick)
    // We do NOT divide by originScale here because the scene is already in meters.
    const radius = 1.6; 
    
    // Geometry: (curve, tubularSegments, radius, radialSegments, closed)
    const geometry = new THREE.TubeGeometry(curve, pathPoints.length * 8, radius, 8, false);

    // 5. Create Material
    const flowTexture = getFlowTexture(); // Ensure this helper function exists in your code!
    
    const material = new THREE.MeshBasicMaterial({ 
        map: flowTexture,
        transparent: true,
        opacity: 1.0,
        side: THREE.DoubleSide,
        depthTest: false, // Key: Draws the line "on top" of everything
        blending: THREE.AdditiveBlending // Optional: Makes the colors glow/pop more
    });

    const newMesh = new THREE.Mesh(geometry, material);
    newMesh.userData.isPathLine = true; 
    newMesh.renderOrder = 999; // Ensure it draws last (on top)

    layer.sceneNodes.add(newMesh);
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
        if (isEnd) console.log("Evaluating END segment:", segment.map(n => n.name));
        
        // Check if this segment has any "useful" nodes (non-stairs)
        // Note: In your data, normal nodes don't have the 'stair' property, so !n.stair is true.
        // Stair nodes have 'stair: 1', so !n.stair is false.
        const hasActivity = segment.some(n => (!n.stair && !n.elevator)) || segment.length > 1;

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

    // Check if screen width is less than 768px (Standard Mobile Breakpoint)
    
    // Select the appropriate array
    const zoomLevel = isMobile ? FLOOR_ZOOMS_MOBILE[targetStory] : FLOOR_ZOOMS[targetStory];

    const directedBearing = coords.length > 1 ? calculateBearing(coords[0][0], coords[0][1], coords[1][0], coords[1][1]) : 0;

    map.flyTo({
        center: [startCoord[0], startCoord[1]],
        zoom: zoomLevel,
        bearing: directedBearing,
        pitch: 0
    });

    // 5. Draw Path & Animate
    updatePathVisuals(coords);

    const isCinematicEnabled = document.getElementById('anim-toggle').checked;

    if (typeof currentAnimFrame !== 'undefined' && currentAnimFrame) {
        cancelAnimationFrame(currentAnimFrame);
    }

    map.once('moveend', () => {

        if (isCinematicEnabled) {
            // Optional: Smooth and Animate
            const smoothPath = getSmoothPath(coords);
            const MS_PER_METER = 10; 
            let totalDistance = 0;

            for (let i = 0; i < smoothPath.length - 1; i++) {
                const p1 = smoothPath[i]; // [lng, lat, alt]
                const p2 = smoothPath[i+1];

                // 1. Haversine distance (Horizontal meters)
                const R = 6371e3; // Earth radius in meters
                const phi1 = p1[1] * Math.PI / 180;
                const phi2 = p2[1] * Math.PI / 180;
                const deltaPhi = (p2[1] - p1[1]) * Math.PI / 180;
                const deltaLambda = (p2[0] - p1[0]) * Math.PI / 180;

                const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                        Math.cos(phi1) * Math.cos(phi2) *
                        Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const horizontalDist = R * c;

                // 2. Vertical distance
                const verticalDist = Math.abs(p2[2] - p1[2]);

                // 3. Total 3D distance
                totalDistance += Math.sqrt(horizontalDist * horizontalDist + verticalDist * verticalDist);
            }

            // Ensure a minimum duration (e.g., 2000ms) so very short paths aren't instant
            const dynamicDuration = Math.max(2000, totalDistance * MS_PER_METER);

            console.log(`Path Length: ${totalDistance.toFixed(2)}m | Duration: ${dynamicDuration}ms`);
            
            animateCamera(smoothPath, dynamicDuration, targetStory);
        }
        minZoomLevel = isMobile ? 14.16 : 14.81;
        map.setMinZoom(minZoomLevel);
    });


    document.getElementById('status-text').innerText = `Navigating ${targetStory}F...`;
}

function closeMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
        menuToggle.checked = false;
    }
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

    isElevator = !document.getElementById('elev-toggle').checked;

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

    closeMenu();
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

function animateCamera(path, duration, targetStory) {
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
    
        // Select the appropriate array
        const zoomLevel = isMobile ? FLOOR_ZOOMS_MOBILE[targetStory] : FLOOR_ZOOMS[targetStory];

        // CHANGE: Switched back to jumpTo. 
        // 'flyTo' adds unwanted inertia that messes up the turning timing.
        map.jumpTo({
            center: focusPoint,
            bearing: smoothedBearing, 
            zoom: zoomLevel,
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
const START_IN_DEV_MODE = false; 
let isDevMode = START_IN_DEV_MODE;

if (isDevMode) {
    if(devHud) devHud.style.display = 'block';
    // Start the game loop immediately
    requestAnimationFrame(devGameLoop);
    // Wait for map/three.js to initialize before showing debug lines
    setTimeout(() => toggleNetworkVisuals(true), 1500);
}

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
            const node = NAVIGATION_NODES.find(n => n.id == hit.userData.id);
            if (node.stair != 1 && node.elevator != 1){
                openPanorama(hit.userData);
            }
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

// TODO: Add elevator interface(到幾樓)!

let isElevator = 1;

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

    const openSet = new PriorityQueue((a,b) => a[1] < b[1]);
    const closeSet = new Set();
    // let openSet = [startNode]; // Deprecated(replaced by binary heap)
    let cameFrom = {}; 
    let gScore = {}; 
    let fScore = {}; 
    
    NAVIGATION_NODES.forEach(n => {
        gScore[n.id] = Infinity;
        fScore[n.id] = Infinity;
    });
    
    gScore[startId] = 0;
    fScore[startId] = getDistance(startNode.coords, endNode.coords);

    openSet.push([startNode, fScore[startNode]]);

    while (openSet.size() > 0) {
        // let current = openSet.reduce((a, b) => fScore[a.id] < fScore[b.id] ? a : b);
        let current = openSet.pop()[0];

        if (current.id === endId) {
            // [CHANGE] Now returns Node Objects, not just coordinates
            return reconstructPath(cameFrom, current.id, nodeMap);
        }

        closeSet.add(current);

        // openSet = openSet.filter(n => n.id !== current.id);

        current.neighbors.forEach(neighborId => {
            const neighbor = nodeMap[neighborId];
            let movementCost = getDistance(current.coords, neighbor.coords);
            if ((isElevator && neighbor.stair) ||(!isElevator && neighbor.elevator)){
                movementCost *= 10;
            }
            
            let tentativeGScore = gScore[current.id] + movementCost;

            if (tentativeGScore < gScore[neighborId] && !closeSet.has(neighbor)) {
                cameFrom[neighborId] = current.id;
                gScore[neighborId] = tentativeGScore;
                fScore[neighborId] = gScore[neighborId] + getDistance(neighbor.coords, endNode.coords);

                if (!closeSet.has(neighbor)) {
                    openSet.push([neighbor, fScore[neighborId]]);
                }
                // if (!openSet.includes(neighbor)){
                //     openSet.push(neighbor);
                // }
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

function getNavParamsFromURL() {
    const params = new URLSearchParams(window.location.search);
    return {
        start: params.get('start'), // returns the ID string or null
        end: params.get('end')     
    };
}

// Populate UI Dropdowns
function initDropdowns() {
    const startSel = document.getElementById('start-select');
    const endSel = document.getElementById('end-select');

    const groups = {};
    NAVIGATION_NODES.forEach(node => {
        if (node.stair == 1 || node.turn == 1) return;
        const floor = node.story;
        if (!groups[floor]) {
            groups[floor] = [];
        }
        groups[floor].push(node);
    });

    // 2. Function to populate a select element with optgroups
    const populate = (selector) => {
        // Clear existing options
        selector.innerHTML = '';
        
        // Sort floors numerically (highest to lowest)
        const sortedFloors = Object.keys(groups).sort((a, b) => parseInt(b) - parseInt(a));

        sortedFloors.forEach(floor => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = FLOOR_NAMES[floor].name;
            
            groups[floor].forEach(node => {
                const opt = new Option(node.name, node.id);
                optgroup.appendChild(opt);
            });
            selector.appendChild(optgroup);
        });
    };

    populate(startSel);
    populate(endSel);

    $(document).ready(function() {
        $('#start-select').select2({
        });
        $('#end-select').select2({
        });
    });


    const urlNodes = getNavParamsFromURL();

    if (urlNodes.start != null || urlNodes.end != null) {
        const startId = parseInt(urlNodes.start);
        const endId = parseInt(urlNodes.end);

        startSel.value = startId;
        endSel.value = endId;
    }
    else{
        // Defaults
        startSel.value = 1;
        endSel.value = 2;
    }

    

    $('#start-select, #end-select').trigger('change');
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

function getGroundTarget(lngLatOrigin, altitude, pitch, bearing) {
    if (pitch === 0 || altitude === 0) return lngLatOrigin;

    // 1. Calculate how far we need to shift the center behind the model
    // Basic Trignometry: tan(pitch) = dist / altitude
    const pitchRad = pitch * (Math.PI / 180);
    const offsetMeters = altitude * Math.tan(pitchRad);

    // 2. Move the center point "forward" in the direction of the bearing
    // We use your existing getDestination helper
    return getDestination(lngLatOrigin[0], lngLatOrigin[1], offsetMeters, bearing);
}

let activeFloorMesh = null;

function transitionToFloor(story) {
    const layer = window.threeLayer;
    if (!layer || !FLOOR_MODELS[story]) return;

    const floorNode = NAVIGATION_NODES.find(n => n.story == story);
    if (floorNode) {
        currentFocusAltitude = floorNode.coords[2]; // Use the node's Z height
        console.log(`Pivot Altitude updated to: ${currentFocusAltitude}m`);
    } else {
        currentFocusAltitude = MODEL_ALTITUDE; // Fallback
    }

    
    
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

        console.log("Old building hidden immediately.");
    }

    // Force map to clear the old building NOW
    map.triggerRepaint();

    const floorConfig = FLOOR_MODELS[story];
    console.log(`Swapping to ${floorConfig.name} (Instant)... ${story}`);

    const loader = new THREE.GLTFLoader();
    
    loader.load(floorConfig.url, (gltf) => {
        // ===============================================
        // 3. SETUP NEW FLOOR (Solid & Visible)
        // ===============================================
        gltf.scene.traverse((child) => {
            if (child.isMesh) {
                // 1. Get a reference to the material exported from Blender for THIS specific block
                const mat = child.material;

                // 2. Enable transparency globally for all blocks that need it
                // We check if the opacity is less than 1 or if the flag is already set
                if (mat.opacity < 1.0 || mat.transparent) {
                    mat.transparent = true;
                    
                    // Adjust depthWrite: Opaque-ish things write to depth, 
                    // very transparent things (like glass) do not to avoid glitches
                    mat.depthWrite = mat.opacity > 0.5; 
                }

                // 3. Preserve the specific PBR values for this individual block
                // This ensures Block A stays shiny (Roughness 0.1) while Block B can stay matte
                mat.roughness = mat.roughness !== undefined ? mat.roughness : 0.5;
                mat.metalness = mat.metalness !== undefined ? mat.metalness : 0.0;
                
                // 4. Handle lighting for every block
                mat.side = THREE.DoubleSide; // Ensure we see both sides of every block
                child.castShadow = true;      // Every block can cast shadows
                child.receiveShadow = true;   // Every block can receive shadows

                // 5. Texture Orientation (Safe for all blocks)
                // If a block happens to have a map, we fix it; if not, this loop just skips it
                const textureKeys = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap'];
                textureKeys.forEach((key) => {
                    if (mat[key] && mat[key].isTexture) {
                        mat[key].flipY = false; // Standard for GLB imports
                        if (key === 'map' || key === 'emissiveMap') {
                            mat[key].colorSpace = THREE.SRGBColorSpace;
                        }
                    }
                });

                mat.needsUpdate = true;
            }
        });

        // ===============================================
        // 4. SWAP AND RENDER
        // ===============================================
        layer.currentFloorGroup.clear();
        layer.currentFloorGroup.add(gltf.scene);

        layer.renderer.outputColorSpace = THREE.SRGBColorSpace;
        layer.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        layer.renderer.toneMappingExposure = 0.5;
        layer.renderer.shadowMap.enabled = true;
        layer.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
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
    
    if (panoViewer) {
        if (panoViewer.tempObjectURL) {
            URL.revokeObjectURL(panoViewer.tempObjectURL);
        }
        // Destroy the WebGL instance
        panoViewer.destroy();
        panoViewer = null;
    }

    // Show Modal
    modal.style.display = 'flex';
    title.innerText = nodeData.name; // Display Node Name

    const imagePath = isMobile? `images/Optimized_Panoramas/${nodeData.id}.jpg` : `images/${nodeData.id}.jpg`;

    console.log("Loading 360 Image:", imagePath);

    // Initialize Pannellum
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

window.closePanorama = function() {
    const modal = document.getElementById('pano-modal');
    modal.style.display = 'none';
    
    if (panoViewer) {
        panoViewer.destroy();
        panoViewer = null;
    }
    const container = document.getElementById('panorama-container');
    if (container) {
        container.innerHTML = ''; 
    }
};

function copyRouteLink() {
    const startId = document.getElementById('start-select').value;
    const endId = document.getElementById('end-select').value;

    if (!startId || !endId) {
        alert("Please select a start and destination first.");
        return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set('start', startId);
    url.searchParams.set('end', endId);
    const fullUrl = url.toString();

    // --- Robust Copy Logic ---
    if (navigator.clipboard && window.isSecureContext) {
        // Modern approach for HTTPS/Localhost
        navigator.clipboard.writeText(fullUrl).then(() => {
            showCopyFeedback();
        }).catch(err => {
            console.error('Modern copy failed:', err);
            fallbackCopy(fullUrl);
        });
    } else {
        // Fallback approach for HTTP or non-secure contexts
        fallbackCopy(fullUrl);
    }
}

// Fallback using a hidden textarea
function fallbackCopy(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Ensure the textarea is not visible or disruptive
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    document.body.appendChild(textArea);
    
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showCopyFeedback();
        } else {
            alert("Unable to copy. Please copy manually: " + text);
        }
    } catch (err) {
        console.error('Fallback copy failed:', err);
        alert("Manual link: " + text);
    }

    document.body.removeChild(textArea);
}

// Helper for visual feedback on the button
function showCopyFeedback() {
    const shareBtn = document.getElementById('share-btn');
    const btnText = shareBtn?.querySelector('span');
    if (!shareBtn || !btnText) return;

    const originalText = btnText.innerText;
    
    // 1. Change text and add "success" state
    btnText.innerText = "連結已複製!";
    shareBtn.classList.add('copy-success');

    setTimeout(() => {
        // 2. Restore text and remove "success" state
        btnText.innerText = originalText;
        shareBtn.classList.remove('copy-success');
    }, 2000);
}

// Attachment (remains largely the same, but calling showCopyFeedback inside copyRouteLink)
const shareBtnElement = document.getElementById('share-btn');
if (shareBtnElement) {
    shareBtnElement.addEventListener('click', () => {
        // I assume copyRouteLink is your function that handles the clipboard logic
        if (typeof copyRouteLink === "function") copyRouteLink(); 
        showCopyFeedback();
    });
}


const liveBtn = document.getElementById('live-view-btn');
const closeCamBtn = document.getElementById('close-camera');
const cameraOverlay = document.getElementById('camera-overlay');
const video = document.getElementById('webcam');
const camcanvas = document.getElementById('snapshot');
const context = camcanvas.getContext('2d');

let isStreaming = false;

// 1. Toggle Camera View
liveBtn.addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "environment",
                width: {ideal: 1920},
                height: {ideal: 1080},
                frameRate: {ideal: 30}
             }, 
            audio: false 
        });
        video.srcObject = stream;
        cameraOverlay.style.display = 'block';
        isStreaming = true;
        sendFrameLoop(); // Start sending JPGs
    } catch (err) {
        alert("Camera access denied or not available.");
        console.error(err);
    }
});

// 2. Stop Camera
closeCamBtn.addEventListener('click', () => {
    const stream = video.srcObject;
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    cameraOverlay.style.display = 'none';
    isStreaming = false;
});

// 3. Send JPEG frames to your Python backend
async function sendFrameLoop() {
    if (!isStreaming) return;

    // DEBUG: Check if video has dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.warn("Video not ready yet...");
        requestAnimationFrame(sendFrameLoop);
        return;
    }

    camcanvas.width = video.videoWidth;
    camcanvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, camcanvas.width, camcanvas.height);

    // Check if the canvas is entirely black
    const imageData = context.getImageData(0, 0, camcanvas.width, camcanvas.height);
    const data = imageData.data;
    let isBlackScreen = true;

    for (let i = 0; i < data.length; i += 4) {
        // Check if any pixel has non-zero RGB values
        if (data[i] > 10 || data[i + 1] > 10 || data[i + 2] > 10) {
            isBlackScreen = false;
            break;
        }
    }

    if (isBlackScreen) {
        console.warn("Black screen detected, skipping frame...");
        if (isStreaming) setTimeout(sendFrameLoop, 500);
        return;
    }


    camcanvas.toBlob(async (blob) => {
        if (!blob) {
            console.error("Blob failed to generate"); 
            return;
        }
        
        console.log("Blob generated, size:", blob.size);
        
        const formData = new FormData();
        formData.append('image', blob, 'live_frame.jpg');

        try {
            console.log("Attempting fetch...");
            
            const response = await fetch('https://onionlike-empathic-rayne.ngrok-free.dev/process', {
                method: 'POST',
                headers: {
                    'ngrok-skip-browser-warning': '69420', 
                    'Authorization': 'Bearer h5BfWP16uq6OfjZC',
                },
                body: formData
            });
            
            if (!response.ok) {
                console.error("Server Error:", response.status, response.statusText);
            } else {
                const data = await response.json();
                const result = data;
                if (result.status == "success") {
                    console.log("Nearest Node ID:", result.nearest_node);
                    console.log("Score:", result.inliers);
                    // Navigate to the detected node
                    if (result.nearest_node) {
                        const nodeId = parseInt(result.nearest_node.split('_')[0]);
                        const node = NAVIGATION_NODES.find(n => n.id === nodeId);
                        if (node) {
                            console.log("Detected location:", node.name);
                            // Optional: Update UI to show detected location
                            document.getElementById('status-text').innerText = `Detected: ${node.name}`;
                            $('#start-select').val(node.id).trigger('change');
                        }
                    }
                    console.log("Success:", data);
                    const stream = video.srcObject;
                    if (stream) {
                        stream.getTracks().forEach(track => track.stop());
                    }
                    cameraOverlay.style.display = 'none';
                    isStreaming = false;
                }
            }
        } catch (error) {
            console.error("Fetch failed entirely:", error);
        }

        if (isStreaming) setTimeout(sendFrameLoop, 5000);
    }, 'image/jpeg', 0.7);
}


// ==========================================
// Zoom Percentage Display Logic
// ==========================================

map.on('zoom', () => {
    const zoomPercent = 100 - ((map.getZoom() - minZoomLevel) / (maxZoomLevel - minZoomLevel) * 100).toFixed(0);
    document.getElementById('zoom-value').innerText = `${zoomPercent}%`;
});

// ==========================================
// Return to origin
// ==========================================

const flagBtn = document.getElementById('flag-action-btn');

flagBtn.addEventListener('click', function() {

    const segmentNodes = globalPathSegments[currentSegmentIndex];

    const targetStory = segmentNodes[0].story;

    const coords = segmentNodes.map(n => n.coords);

    const startCoord = coords[0];
    
    const zoomLevel = isMobile ? FLOOR_ZOOMS_MOBILE[targetStory] : FLOOR_ZOOMS[targetStory];

    const directedBearing = calculateBearing(coords[0][0], coords[0][1], coords[1][0], coords[1][1]);

    map.flyTo({
        center: [startCoord[0], startCoord[1]],
        zoom: zoomLevel,
        bearing: directedBearing,
        pitch: 0
    });
    
});