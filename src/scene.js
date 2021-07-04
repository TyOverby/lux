import RBush from "../external/rbrush.js"

export default class Scene {
    constructor () {
        this.tree = new RBush();
    }

    add(bbox, ele) {
       let x = bbox.clone();
       x.value = ele;
       this.tree.insert(x);
    }

    addBulk(items) {
       this.tree.load(items);
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