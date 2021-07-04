export default class Bbox {
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
    set width(w) {
        this.maxX = this.minX + w;
    }
    set height(h) {
        this.maxY= this.minY + h;
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