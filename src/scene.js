import RBush from "../external/rbrush.js"

export default class Scene {
    constructor () {
        this.tree = new RBush();
        this.add_queue = []
    }

    flush() { 
        if (this.add_queue.length !== 0) {
            this.tree.load(this.add_queue);
            this.add_queue = [];
        }
    }

    add(element) {
       this.add_queue.push(element);
    }

    addBulk(items) {
       this.flush();
       this.tree.load(items);
    }

    remove(element) {
        this.flush();
        this.tree.remove(element);
    }

    intersecting(bbox) {
        this.flush();
        return this.tree.search(bbox);
    }
}