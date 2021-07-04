import Scene from "./scene.js"
import Bbox from "./bbox.js"

export default class Lux {
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

    addBulk(items) {
        this.scene.addAll(items);
        for (let item of items) {
            this._dirty_boxes.push(item);
        }
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
        console.log(this._totally_dirty);
        if(!this._totally_dirty) {
            return;
        }

        if (!this._prev_viewport.eq(this._viewport)) {
            if(Math.abs(this._prev_viewport.width - this._viewport.width) < 0.0001 && Math.abs(this._prev_viewport.height - this._viewport.height) < 0.001) {
                let dx = this._viewport.minX - this._prev_viewport.minX;
                let dy = this._viewport.minY - this._prev_viewport.minY;

                let {xrat, yrat} = this.rats();
                dx *= xrat;
                dy *= yrat;

                this.ctx.globalCompositeOperation = "copy";
                this.ctx.drawImage(this.canvas, -Math.round(2 * dx), -Math.round(2 * dy));
                console.log("translating");

                this._prev_viewport = this.viewport;
                this._totally_dirty = false;
                return;
            } else {
                let dx = this._viewport.width - this._prev_viewport.width;
                let dy = this._viewport.height - this._prev_viewport.height;
                console.log({dx, dy})
            }
        }

        this.ctx.clearRect(0,0, this._width *  window.devicePixelRatio, this._height * window.devicePixelRatio);
        this.apply_transform();
        this.ctx.textBaseline='top';

        console.log("drawing");

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
        }
        this.ctx.resetTransform();

        this._prev_viewport = this.viewport;
        this._totally_dirty = false;
    }
}