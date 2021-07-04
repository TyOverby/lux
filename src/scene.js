import RBush from "../external/rbrush.js"

export default class Scene {
    constructor () {
        this.tree = new RBush();
    }

    add(element) {
       this.tree.insert(element);
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