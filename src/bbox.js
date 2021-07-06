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
        return (
            this.minX == other.minX && 
            this.minY == other.minY && 
            this.maxX == other.maxX && 
            this.maxY == other.maxY)
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

    get area() {
        return this.width * this.height;
    }

    union (other) {
       return new Bbox(
           Math.min(this.minX, other.minX),
           Math.min(this.minY, other.minY),
           Math.max(this.maxX, other.maxX),
           Math.max(this.maxY, other.maxY))
    }

    midpoint() {
       let half_x = (this.minX + this.maxX) / 2;
       let half_y = (this.minY + this.maxY) / 2;
       return [half_x, half_y];
    }

   quads() {
       let [half_x, half_y] = this.midpoint()

       return [
           new Bbox(this.minX,this.minY, half_x, half_y),
           new Bbox(half_x,this.minY, this.maxX, half_y),
           new Bbox(this.minX,half_y, half_x, this.maxY),
           new Bbox(half_x,half_y, this.maxX, this.maxY)
       ]
   }

   divide(n) {
       let working = [this];
       for (var i = 0; i < n; i ++) {
          working = working.flatMap(x => x.quads());
       }

       return working;
   }


   expand(by) {
    return new Bbox(this.minX-by, this.minY-by, this.maxX + by, this.maxY + by);
   }

   intersection(other) {
       return new Bbox(
           Math.max(this.minX, other.minX),
           Math.max(this.minY, other.minY),
           Math.min(this.maxX, other.maxX),
           Math.min(this.maxY, other.maxY))
   }

   intersects(other) {
        var a = other.minX > this.maxX;
        var b = other.maxX < this.minX;
        var c = other.minY > this.maxY;
        var d = other.maxY < this.minY;

        return ! (a || b || c || d);
    }

    contains(b) {
        var a = this;
        return a.minX <= b.minX &&
               a.minY <= b.minY &&
               b.maxX <= a.maxX &&
               b.maxY <= a.maxY;
    }

    translate(dx, dy) {
        return new Bbox(this.minX + dx, this.minY+dy, this.maxX + dx, this.maxY+dy)
    }
}