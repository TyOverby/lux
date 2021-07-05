import Scene from "./scene.js"
import Bbox from "./bbox.js"

export default class Lux {
    constructor(canvas, renderer) {
        this.scene = new Scene();
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false });

        this.ctx.imageSmoothingEnabled = false;
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);

        this._renderer = renderer;
        this._width = 100;
        this._height = 100;
        this._prev_viewport = new Bbox(0,0,0,0);
        this._viewport = new Bbox(0, 0, 100, 100);
        this._dirty_boxes = [];
        this.ctx.textBaseline = 'bottom';

        this.set_size(this._width, this._height);
    }

    mark_totally_dirty () {
        this._dirty_boxes.push(this._viewport);
    }

    get renderer() {
        return this._renderer;
    }
    set renderer(f) {
        this._renderer = f;
        this.mark_totally_dirty();
    }

    set_size(width, height) {
        width = Math.floor(width);
        height = Math.floor(height);
        this._width = width;
        this._height = height;

        this.mark_totally_dirty();
        this.canvas.style.width = width + "px";
        this.canvas.style.height = height + "px";

        var scale = window.devicePixelRatio;
        this.canvas.width = Math.floor(width * scale);
        this.canvas.height = Math.floor(height * scale);
    }

    get width() {
        return this._width;
    }

    get height() {
        return this._height;
    }

    set width(width) {
        this.set_size(width, this._height)
    }

    set height(height) {
        this.set_size(this._width, height)
    }


    get viewport() {
        return this._viewport;
    }

    set viewport(next) {
        if (next.eq(this._viewport)) {
            return;
        }

        if (this._prev_viewport === null) {
            this._prev_viewport = this._viewport;            
        }
        this._viewport = next;
    }

    addBulk(items) {
        this.scene.addAll(items);
        this._dirty_boxes = this._dirty_boxes.concat(items);
    }

    add(bbox) {
        this.scene.add(bbox);
        if(this._viewport.intersects(bbox)) {
            this._dirty_boxes.push(bbox);
        }
    }

    remove(bbox) {
        this.scene.remove(bbox);
        if(this._viewport.intersects(bbox)) {
            this._dirty_boxes.push(bbox);
        }
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
    }

    draw_translated() {
        if (this._prev_viewport === this._viewport || this._prev_viewport.eq(this._viewport)) {
            return;
        }

        let dw = this._prev_viewport.width - this._viewport.width; 
        let dh = this._prev_viewport.height - this._viewport.height;
        if(Math.abs(dw) > 0.0001 || Math.abs(dh) > 0.0001) {
            this.mark_totally_dirty();
            return;
        } 

        let dx = this._viewport.minX - this._prev_viewport.minX;
        let dy = this._viewport.minY - this._prev_viewport.minY;

        if (dx < 0) {
            this._dirty_boxes.push(new Bbox(this._viewport.minX, this._viewport.minY, this._prev_viewport.minX, this._viewport.maxY));
        } else if (dx > 0) {
            this._dirty_boxes.push(new Bbox(this._prev_viewport.maxX, this._viewport.minY, this._viewport.maxX, this._viewport.maxY));
        }

        if (dy < 0) {
            this._dirty_boxes.push(new Bbox(this._viewport.minX, this._viewport.minY, this._viewport.maxX, this._prev_viewport.minY));
        } else if (dy > 0) {
            this._dirty_boxes.push(new Bbox(this._viewport.minX, this._prev_viewport.maxY, this._viewport.maxX, this._viewport.maxY));
        }

        let {xrat, yrat} = this.rats();
        dx *= xrat;
        dy *= yrat;

        let x = Math.round(window.devicePixelRatio * dx);
        let y = Math.round(window.devicePixelRatio * dy);

        this.ctx.drawImage(this.canvas, -x, -y);
    }

    fetch_dirty() {
        let original_length = this._dirty_boxes.length;
        let len = Math.min(original_length, Math.max(100, (Math.floor (Math.sqrt(1 + original_length)))));
        if (len != 0) {
            //console.log({original_length, len});
        }
        let first = this._dirty_boxes.slice(0, len);
        this._dirty_boxes = this._dirty_boxes.slice(len, original_length);
        return first;
    }

    draw() {
        this.scene.flush();
        this.draw_translated();

        this.ctx.save();
        this.apply_transform();
        this.ctx.textBaseline = 'top';

        let dirty_boxes = this.fetch_dirty();

        this.ctx.beginPath();
        for (var bbox of dirty_boxes) {
            bbox = bbox.expand(1);
            this.ctx.rect(bbox.minX, bbox.minY, bbox.maxX - bbox.minX, bbox.maxY - bbox.minY);
        }
        this.ctx.closePath();
        this.ctx.fillStyle="white";
        this.ctx.fill();

        this.ctx.fillStyle="black";

        this.ctx.beginPath();
        for (var bbox of dirty_boxes) {
            bbox = bbox.expand(1);
            this.ctx.rect (bbox.minX, bbox.minY, bbox.maxX - bbox.minX, bbox.maxY - bbox.minY);
        }
        this.ctx.clip();
        
        var seen = new Set();
        let to_draw = [];
        for (var bbox of dirty_boxes) {
            bbox = bbox.expand(1);
            var a = this.scene.intersecting(bbox);
            var l = a.length;
            for (var i = 0; i < l; i ++) {
                let element = a[i];
                if (!seen.has(element)) {
                    seen.add(element)
                    to_draw.push(a[i]);
                }
            }
        }

        this.ctx.save ();
        to_draw.sort((a, b) => a.idx - b.idx);
        for (var o of to_draw) {
            this._renderer(o);
        }
        this.ctx.restore();

        this.ctx.restore();
        this.ctx.resetTransform();
        this._prev_viewport = this.viewport;
    }
}