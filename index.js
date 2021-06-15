class Bbox {
    constructor(minX, minY, maxX, maxY){
        this.minX = minX;
        this.minY = minY;
        this.maxX = maxX;
        this.maxY = maxY;
    }

    clone() {
        return new Bbox(this.minX, this.minY, this.maxX, this.maxY);
    }

    eq(other) {
        this.minX == other.minX && 
        this.minY == other.minY && 
        this.maxX == other.maxX && 
        this.maxX == other.maxX
    }

    get width() {
        return this.maxX - this.minX;
    }
    get height() {
        return this.maxY - this.minY;
    }

   intersects(other) {
        var a = other.minX > this.maxX;
        var b = other.maxX < this.minX;
        var c = other.minY > this.maxY;
        var d = other.maxY < this.minY;

        return ! (a || b || c || d);
    }

    translate(dx, dy) {
        return new Bbox(this.minX + dx, this.minY+dy, this.maxX + dx, this.maxY+dy)
    }
}

class Scene {
    constructor () {
        this.tree = new RBush();
    }

    add(bbox, ele) {
       let x = bbox.clone();
       x.value = ele;
       this.tree.insert(x);
    }

    remove(bbox, ele) {
        this.tree.remove(bbox, function(a){ a === ele});
    }

    intersecting(bbox) {
        return this.tree.search(bbox);
    }

    all() {
        return this.tree.all().map(function (a){ return [a, a.value];});
    }
}

class _Scene {
    constructor () {
        this.elements = []
    }

    add(bbox, ele) {
        this.elements.push([bbox, ele]);
    }
    remove(bbox, ele) {
        this.elements = this.elements.filter(([b, e]) => 
          e === ele && bbox.eq(b));
    }
    intersecting (bbox) {
        return 
          this.elements
            .filter(([b, _]) => bbox.intersects(b))
            .map(([_, e]) => e)
    }

    all() {
        return this.elements;
    }
}

class Lux {
    constructor(canvas, renderer) {
        this.scene = new Scene();
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this._renderer = renderer;
        this._width = 100;
        this._height = 100;
        this._prev_viewport = null;
        this._viewport = new Bbox(0, 0, 100, 100);
        this._totally_dirty = false;
        this._dirty_boxes = [];

        this.set_size(this._width, this._height);
    }

    set renderer(f) {
        this._renderer = f;
        this._totally_dirty = true;
    }

    set_size(width, height) {
        width = Math.floor(width);
        height = Math.floor(height);
        this._width = width;
        this._height = height;

        this._totally_dirty = true;
        this.canvas.style.width = width + "px";
        this.canvas.style.height = height + "px";

        var scale = window.devicePixelRatio;
        this.canvas.width = Math.floor(width * scale);
        this.canvas.height = Math.floor(height * scale);
    }

    set width(width) {
        this.set_size(width, this._height)
    }

    set height(height) {
        this.set_size(this._width, height)
    }


    set viewport(next) {
        if (next.eq(this._viewport)) {
            return;
        }

        if (this._prev_viewport === null) {
            this._prev_viewport = this._viewport;            
        }

        this._totally_dirty = true;
        this._viewport = next;
    }

    get viewport() {
        return this._viewport;
    }

    add(bbox, ele) {
        this.scene.add(bbox, ele);
        this._dirty_boxes.push(bbox);
    }

    remove(bbox, ele) {
        this.scene.remove(bbox, ele);
        this._dirty_boxes.push(bbox);
    }

    clear() {
        this.ctx.clearRect(0,0, this._width *  window.devicePixelRatio, this._height * window.devicePixelRatio);
        this._totally_dirty = true;
    }

    rats() {
        let xrat = this._width / this.viewport.width;
        let yrat = this._height / this.viewport.height;
        return {xrat, yrat}
    }

    apply_transform() {
        this.ctx.resetTransform();
        let xrat = this._width / this.viewport.width;
        let yrat = this._height / this.viewport.height;

        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        this.ctx.scale(xrat, yrat);
        this.ctx.translate(-this._viewport.minX, -this._viewport.minY);

        // high-dpi
    }

    draw() {
        this.apply_transform();
        this.ctx.textBaseline='top';
        var drew = 0;
        var omitted = 0;

        var a = this.scene.intersecting(this._viewport);
        var l = a.length;

        for (var i = 0; i < l; i ++) {
            let bbox = a[i]
            let o = bbox.value;

            this.ctx.beginPath();
            this.ctx.rect(bbox.minX,bbox.minY, bbox.maxX-bbox.minX, bbox.maxY-bbox.minY);
            this.ctx.strokeStyle="red";
            this.ctx.lineWidth=0.1;
            this.ctx.stroke();
            this._renderer(o);
                drew++;
        }
        //console.log({drew, omitted});
        this.ctx.resetTransform();
    }
}


function renderer({text, x, y}) {
    lux.ctx.fillText(text, x, y);
}

let lux = new Lux(document.querySelector("#canvas"), renderer);
lux.width = 500;
lux.height = 500;
lux.viewport = new Bbox(0, 0, 100, 100);

function draw_text(lux, text, x, y) {
    let measured = lux.ctx.measureText(text);
    let w = measured.width;
    let h = measured.actualBoundingBoxAscent + measured.actualBoundingBoxDescent + 1;
    return [ new Bbox(x, y, x + w, y + h), {text, x, y}];
}

for (let i = 0; i < 100; i++) {
    for (let k = 0; k < 100; k++) {
        lux.add(...draw_text(lux, "hello", 30 * k, 20 * i));
        lux.add(...draw_text(lux, "world", 30 * k, 20 * i + 10));
    }
}

//lux.draw();

//lux.ctx.scale(3,3);
//lux.ctx.fillText("" + devicePixelRatio, 50,50);

function mouseMoveWhilstDown(target, whileMove) {
    let startX = 0;
    let startY = 0;

    var moving = function (event) {
        let dx = event.screenX - startX;
        let dy = event.screenY - startY;
        startX = event.screenX;
        startY = event.screenY;
        whileMove(dx, dy);
    }

    var endMove = function () {
        window.removeEventListener('mousemove', moving);
        window.removeEventListener('mouseup', endMove);
        document.body.style["user-select"] = "auto";
    };

    target.oncontextmenu = function () {
        return false;
    }
    target.addEventListener('mousedown', function (event) {
        event.stopPropagation();
        event.preventDefault();
        startX = event.screenX;
        startY = event.screenY;
        document.body.style["user-select"] = "none";
        window.addEventListener('mousemove', moving);
        window.addEventListener('mouseup', endMove);   
    });
}


let xa = document.querySelector("#xa");
xa.oninput = (event => {
  lux.viewport = lux.viewport.translate(+event.target.value, 0);
});

let ya = document.querySelector("#ya");
ya.oninput = (event => {
  lux.viewport = lux.viewport.translate(0, +event.target.value);
});


mouseMoveWhilstDown(lux.canvas, function(dx, dy){
    let {xrat, yrat} = lux.rats();
    dx /= xrat;
    dy /= yrat;

    lux.viewport = lux.viewport.translate(-dx, -dy);
});

var stopped = false;
function loop(){
    lux.clear();
    lux.draw();
    if (!stopped) {
        requestAnimationFrame(loop);
    }
}
loop();

let btn = document.querySelector("#draw");
btn.onclick = (_ => {
    console.log("draw!");
    stopped = true;
});