import RBush from "../external/rbrush.js"

export default class Scene {
    constructor () {
        this.tree = new RBush();
        this.add_queue = []
    }

    flush() {
        this.tree.load(this.add_queue);
        this.add_queue = [];
    }

    add(element) {
       this.add_queue.push(element);
    }

    addBulk(items) {
       this.tree.load(items);
    }

    remove(element) {
        this.tree.remove(element);
    }

    intersecting(bbox) {
        return this.tree.search(bbox);
    }
}