import Scene from "./scene.js"
import Bbox from "./bbox.js"
import RBush from "../external/rbrush.js";

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
        this._dirty_tree = new RBush();
        this._dirty_priority = [];
        this._dirty_low_priority = [];
        this.ctx.textBaseline = 'bottom';

        this.set_size(this._width, this._height);
    }

    add_dirty(bbox, priority) {
        if(!this._viewport.intersects(bbox)) {
            return
        }

        if (priority === undefined) {
            for (var other_dirty of this._dirty_tree.search(bbox)) {
                if (other_dirty.contains(bbox)) { return; }
                if (bbox.contains(other_dirty)) { this._dirty_tree.remove(other_dirty); }
            }

            this._dirty_tree.insert(bbox);
        } else if (priority) {
            this._dirty_priority.push(bbox);
        } else {
            this._dirty_low_priority.push(bbox);
        }
    }

    mark_totally_dirty () {
        this._dirty_low_priority = this._viewport.divide(2);
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
        for (var b of items) {
            this.add_dirty(b);
        }
    }

    add(bbox) {
        this.scene.add(bbox);
        this.add_dirty(bbox)
    }

    remove(bbox) {
        this.scene.remove(bbox);
        this.add_dirty(bbox);
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

        let d_min_x = this._viewport.minX - this._prev_viewport.minX;
        let d_max_x = this._viewport.maxX - this._prev_viewport.maxX;
        let d_min_y = this._viewport.minY - this._prev_viewport.minY;
        let d_max_y = this._viewport.maxY - this._prev_viewport.maxY;

        if (d_min_x < 0) {
            this.add_dirty(new Bbox(this._viewport.minX, this._viewport.minY, this._prev_viewport.minX, this._viewport.maxY), true);
        } else if (d_min_x > 0) {
            this.add_dirty(new Bbox(this._prev_viewport.maxX, this._viewport.minY, this._viewport.maxX, this._viewport.maxY), true);
        }

        if (d_max_x < 0) {
            this.add_dirty(new Bbox(this._viewport.maxX, this._viewport.minY, this._prev_viewport.maxX, this._viewport.maxY), true);
        } else if (d_max_x > 0) {
            this.add_dirty(new Bbox(this._prev_viewport.maxX, this._viewport.minY, this._viewport.maxX, this._viewport.maxY), true);
        }

        if (d_min_y < 0) {
            this.add_dirty(new Bbox(this._viewport.minX, this._viewport.minY, this._viewport.maxX, this._prev_viewport.minY), true);
        } else if (d_min_y > 0) {
            this.add_dirty(new Bbox(this._viewport.minX, this._prev_viewport.minY, this._viewport.maxX, this._viewport.minY), true);
        }

        if (d_max_y < 0) {
            this.add_dirty(new Bbox(this._viewport.minX, this._viewport.maxY, this._viewport.maxX, this._prev_viewport.maxY), true);
        } else if (d_max_y > 0) {
            this.add_dirty(new Bbox(this._viewport.minX, this._prev_viewport.maxY, this._viewport.maxX, this._viewport.maxY), true);
        }

        /*
        this.ctx.rect(bbox.minX, bbox.minY, bbox.maxX - bbox.minX, bbox.maxY - bbox.minY);
        this.ctx.closePath();
        this.ctx.fillStyle="white";
        this.ctx.fill();
        */

        let {xrat, yrat} = this.rats();
        let dx = d_min_x * xrat;
        let dy = d_min_y * yrat;

        let x = Math.round(window.devicePixelRatio * dx);
        let y = Math.round(window.devicePixelRatio * dy);
        
        let wf = this._prev_viewport.width / this._viewport.width;
        let hf = this._prev_viewport.height / this._viewport.height;

        if (Math.abs(wf - 1) < 0.0001 && Math.abs(hf - 1) < 0.0001) {
            this.ctx.drawImage(this.canvas, -x, -y);
        } else {
            this.mark_totally_dirty();
            this.ctx.drawImage(this.canvas, -x, -y, this.canvas.width * wf, this.canvas.height * hf);
        }

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

    distance_to_center(bbox) {
        let [px, py] = bbox.midpoint();
        let [cx, cy] = this._viewport.midpoint();
        let dx = px - cx;
        let dy = py - cy;
        Math.sqrt(dx * dx + dy * dy);
    }

    draw() {
        this.scene.flush();
        this.draw_translated();

        this.ctx.save();
        this.apply_transform();
        this.ctx.textBaseline = 'top';

        //let dirty_boxes = this.fetch_dirty();

        var seen = new Set();
        let to_draw = [];
        let dirty_boxes = [];

        let all_dirty = this._dirty_tree.all();
        all_dirty.sort((a, b) => this.distance_to_center(a) - this.distance_to_center(b));
        this._dirty_tree.clear();

        let process = bbox => {
            dirty_boxes.push(bbox);
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
        for (let bbox of this._dirty_priority) {
            process(bbox);
        }
        this._dirty_priority = [];
        while (all_dirty.length !== 0) { 
            process(all_dirty.pop())
            if (to_draw.length > 500) {
                break;
            }
        }
        this._dirty_tree.load(all_dirty);

        while (to_draw.length < 500 && this._dirty_low_priority.length > 0) {
            process(this._dirty_low_priority.pop());
        }

        /*
        this.ctx.beginPath();
        for (var bbox of all_dirty) {
            bbox = bbox.expand(1);
            this.ctx.rect(bbox.minX, bbox.minY, bbox.maxX - bbox.minX, bbox.maxY - bbox.minY);
        }
        this.ctx.closePath();
        this.ctx.fillStyle="rgba(0,0,0,0.1)";
        this.ctx.fill();
        */

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
        

        this.ctx.save ();
        to_draw.sort((a, b) => a.idx - b.idx);
        var drawn = 0;
        for (var o of to_draw) {
            this._renderer(o);
            drawn ++;
        }
        console.log("drawn: "+drawn);
        this.ctx.restore();

        this.ctx.restore();
        this.ctx.resetTransform();
        this._prev_viewport = this.viewport;
    }
}