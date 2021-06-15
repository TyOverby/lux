class Bbox {
    constructor(x1, y1, x2, y2){
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
    }

    eq(other) {
        this.x1 == other.x1 && 
        this.y1 == other.y1 && 
        this.x2 == other.x2 && 
        this.x2 == other.x2
    }

    get width() {
        return this.x2 - this.x1;
    }
    get height() {
        return this.y2 - this.y1;
    }

   intersects(other) {
      return !(
           other.x1 > this.x2
        || other.x2 < this.x1
        || other.y2 > this.y1
        || other.y1 < this.y2)
    }

    translate(dx, dy) {
        return new Bbox(this.x1 + dx, this.y1+dy, this.x2 + dx, this.y2+dy)
    }
}

class Scene {
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

    apply_transform() {
        this.ctx.resetTransform();
        
        let xrat = this._width / this.viewport.width;
        let yrat = this._height / this.viewport.height;

        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        this.ctx.translate(-this._viewport.x1, -this._viewport.y1);
        this.ctx.scale(xrat, yrat);

        // high-dpi
    }

    draw() {
        this.apply_transform();
        for (let [bbox, o] of this.scene.all()) {
            this.ctx.textBaseline='top';
            this.ctx.beginPath();
            this.ctx.rect(bbox.x1,bbox.y1, bbox.x2-bbox.x1, bbox.y2-bbox.y1);
            this.ctx.strokeStyle="red";
            this.ctx.stroke();
            this._renderer(o);
        }
    }
}


function renderer({text, x, y}) {
    lux.ctx.fillText(text, x, y);
}

let lux = new Lux(document.querySelector("#canvas"), renderer);
lux.width = 500;
lux.height = 100;
lux.viewport = new Bbox(0, 0, 100, 100);

function draw_text(lux, text, x, y) {
    let measured = lux.ctx.measureText(text);
    let w = measured.width;
    let h = measured.actualBoundingBoxAscent + measured.actualBoundingBoxDescent;
    return [ new Bbox(x, y, x + w, y + h), {text, x, y}];
}

lux.add(...draw_text(lux, "hello", 10, 10));

lux.draw();

//lux.ctx.scale(3,3);
lux.ctx.fillText("" + devicePixelRatio, 50,50);

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

    target.addEventListener('mousedown', function (event) {
        startX = event.screenX;
        startY = event.screenY;
        document.body.style["user-select"] = "none";
        event.stopPropagation();
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

let btn = document.querySelector("#draw");
btn.onclick = (_ => {
    console.log("draw!");
    lux.draw();
});

mouseMoveWhilstDown(lux.canvas, function(dx, dy){
    lux.viewport = lux.viewport.translate(-dx, -dy);
});

function loop(){
    lux.ctx.clearRect(0, 0, lux._width, lux._height);
    lux.draw();
    requestAnimationFrame(loop);
}
loop();