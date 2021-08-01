var Lux = (function () {
    'use strict';

    function quickselect(arr, k, left, right, compare) {
        quickselectStep(arr, k, left || 0, right || (arr.length - 1), compare || defaultCompare);
    }

    function quickselectStep(arr, k, left, right, compare) {

        while (right > left) {
            if (right - left > 600) {
                var n = right - left + 1;
                var m = k - left + 1;
                var z = Math.log(n);
                var s = 0.5 * Math.exp(2 * z / 3);
                var sd = 0.5 * Math.sqrt(z * s * (n - s) / n) * (m - n / 2 < 0 ? -1 : 1);
                var newLeft = Math.max(left, Math.floor(k - m * s / n + sd));
                var newRight = Math.min(right, Math.floor(k + (n - m) * s / n + sd));
                quickselectStep(arr, k, newLeft, newRight, compare);
            }

            var t = arr[k];
            var i = left;
            var j = right;

            swap(arr, left, k);
            if (compare(arr[right], t) > 0) swap(arr, left, right);

            while (i < j) {
                swap(arr, i, j);
                i++;
                j--;
                while (compare(arr[i], t) < 0) i++;
                while (compare(arr[j], t) > 0) j--;
            }

            if (compare(arr[left], t) === 0) swap(arr, left, j);
            else {
                j++;
                swap(arr, j, right);
            }

            if (j <= k) left = j + 1;
            if (k <= j) right = j - 1;
        }
    }

    function swap(arr, i, j) {
        var tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }

    function defaultCompare(a, b) {
        return a < b ? -1 : a > b ? 1 : 0;
    }

    class RBush {
        constructor(maxEntries = 9) {
            // max entries in a node is 9 by default; min node fill is 40% for best performance
            this._maxEntries = Math.max(4, maxEntries);
            this._minEntries = Math.max(2, Math.ceil(this._maxEntries * 0.4));
            this.clear();
        }

        compareMinX(a, b) { return a.minX - b.minX; }
        compareMinY(a, b) { return a.minY - b.minY; }

        all() {
            return this._all(this.data, []);
        }

        search(bbox) {
            let node = this.data;
            const result = [];

            if (!intersects(bbox, node)) return result;

            const toBBox = this.toBBox;
            const nodesToSearch = [];

            while (node) {
                for (let i = 0; i < node.children.length; i++) {
                    const child = node.children[i];
                    const childBBox = node.leaf ? toBBox(child) : child;

                    if (intersects(bbox, childBBox)) {
                        if (node.leaf) result.push(child);
                        else if (contains(bbox, childBBox)) this._all(child, result);
                        else nodesToSearch.push(child);
                    }
                }
                node = nodesToSearch.pop();
            }

            return result;
        }

        collides(bbox) {
            let node = this.data;

            if (!intersects(bbox, node)) return false;

            const nodesToSearch = [];
            while (node) {
                for (let i = 0; i < node.children.length; i++) {
                    const child = node.children[i];
                    const childBBox = node.leaf ? this.toBBox(child) : child;

                    if (intersects(bbox, childBBox)) {
                        if (node.leaf || contains(bbox, childBBox)) return true;
                        nodesToSearch.push(child);
                    }
                }
                node = nodesToSearch.pop();
            }

            return false;
        }

        load(data) {
            if (!(data && data.length)) return this;

            if (data.length < this._minEntries) {
                for (let i = 0; i < data.length; i++) {
                    this.insert(data[i]);
                }
                return this;
            }

            // recursively build the tree with the given data from scratch using OMT algorithm
            let node = this._build(data.slice(), 0, data.length - 1, 0);

            if (!this.data.children.length) {
                // save as is if tree is empty
                this.data = node;

            } else if (this.data.height === node.height) {
                // split root if trees have the same height
                this._splitRoot(this.data, node);

            } else {
                if (this.data.height < node.height) {
                    // swap trees if inserted one is bigger
                    const tmpNode = this.data;
                    this.data = node;
                    node = tmpNode;
                }

                // insert the small tree into the large tree at appropriate level
                this._insert(node, this.data.height - node.height - 1, true);
            }

            return this;
        }

        insert(item) {
            if (item) this._insert(item, this.data.height - 1);
            return this;
        }

        clear() {
            this.data = createNode([]);
            return this;
        }

        remove(item, equalsFn) {
            if (!item) return this;

            let node = this.data;
            const bbox = this.toBBox(item);
            const path = [];
            const indexes = [];
            let i, parent, goingUp;

            // depth-first iterative tree traversal
            while (node || path.length) {

                if (!node) { // go up
                    node = path.pop();
                    parent = path[path.length - 1];
                    i = indexes.pop();
                    goingUp = true;
                }

                if (node.leaf) { // check current node
                    const index = findItem(item, node.children, equalsFn);

                    if (index !== -1) {
                        // item found, remove the item and condense tree upwards
                        node.children.splice(index, 1);
                        path.push(node);
                        this._condense(path);
                        return this;
                    }
                }

                if (!goingUp && !node.leaf && contains(node, bbox)) { // go down
                    path.push(node);
                    indexes.push(i);
                    i = 0;
                    parent = node;
                    node = node.children[0];

                } else if (parent) { // go right
                    i++;
                    node = parent.children[i];
                    goingUp = false;

                } else node = null; // nothing found
            }

            return this;
        }

        toBBox(item) { return item; }


        toJSON() { return this.data; }

        fromJSON(data) {
            this.data = data;
            return this;
        }

        _all(node, result) {
            const nodesToSearch = [];
            while (node) {
                if (node.leaf) result.push(...node.children);
                else nodesToSearch.push(...node.children);

                node = nodesToSearch.pop();
            }
            return result;
        }

        _build(items, left, right, height) {

            const N = right - left + 1;
            let M = this._maxEntries;
            let node;

            if (N <= M) {
                // reached leaf level; return leaf
                node = createNode(items.slice(left, right + 1));
                calcBBox(node, this.toBBox);
                return node;
            }

            if (!height) {
                // target height of the bulk-loaded tree
                height = Math.ceil(Math.log(N) / Math.log(M));

                // target number of root entries to maximize storage utilization
                M = Math.ceil(N / Math.pow(M, height - 1));
            }

            node = createNode([]);
            node.leaf = false;
            node.height = height;

            // split the items into M mostly square tiles

            const N2 = Math.ceil(N / M);
            const N1 = N2 * Math.ceil(Math.sqrt(M));

            multiSelect(items, left, right, N1, this.compareMinX);

            for (let i = left; i <= right; i += N1) {

                const right2 = Math.min(i + N1 - 1, right);

                multiSelect(items, i, right2, N2, this.compareMinY);

                for (let j = i; j <= right2; j += N2) {

                    const right3 = Math.min(j + N2 - 1, right2);

                    // pack each entry recursively
                    node.children.push(this._build(items, j, right3, height - 1));
                }
            }

            calcBBox(node, this.toBBox);

            return node;
        }

        _chooseSubtree(bbox, node, level, path) {
            while (true) {
                path.push(node);

                if (node.leaf || path.length - 1 === level) break;

                let minArea = Infinity;
                let minEnlargement = Infinity;
                let targetNode;

                for (let i = 0; i < node.children.length; i++) {
                    const child = node.children[i];
                    const area = bboxArea(child);
                    const enlargement = enlargedArea(bbox, child) - area;

                    // choose entry with the least area enlargement
                    if (enlargement < minEnlargement) {
                        minEnlargement = enlargement;
                        minArea = area < minArea ? area : minArea;
                        targetNode = child;

                    } else if (enlargement === minEnlargement) {
                        // otherwise choose one with the smallest area
                        if (area < minArea) {
                            minArea = area;
                            targetNode = child;
                        }
                    }
                }

                node = targetNode || node.children[0];
            }

            return node;
        }

        _insert(item, level, isNode) {
            const bbox = isNode ? item : this.toBBox(item);
            const insertPath = [];

            // find the best node for accommodating the item, saving all nodes along the path too
            const node = this._chooseSubtree(bbox, this.data, level, insertPath);

            // put the item into the node
            node.children.push(item);
            extend(node, bbox);

            // split on node overflow; propagate upwards if necessary
            while (level >= 0) {
                if (insertPath[level].children.length > this._maxEntries) {
                    this._split(insertPath, level);
                    level--;
                } else break;
            }

            // adjust bboxes along the insertion path
            this._adjustParentBBoxes(bbox, insertPath, level);
        }

        // split overflowed node into two
        _split(insertPath, level) {
            const node = insertPath[level];
            const M = node.children.length;
            const m = this._minEntries;

            this._chooseSplitAxis(node, m, M);

            const splitIndex = this._chooseSplitIndex(node, m, M);

            const newNode = createNode(node.children.splice(splitIndex, node.children.length - splitIndex));
            newNode.height = node.height;
            newNode.leaf = node.leaf;

            calcBBox(node, this.toBBox);
            calcBBox(newNode, this.toBBox);

            if (level) insertPath[level - 1].children.push(newNode);
            else this._splitRoot(node, newNode);
        }

        _splitRoot(node, newNode) {
            // split root node
            this.data = createNode([node, newNode]);
            this.data.height = node.height + 1;
            this.data.leaf = false;
            calcBBox(this.data, this.toBBox);
        }

        _chooseSplitIndex(node, m, M) {
            let index;
            let minOverlap = Infinity;
            let minArea = Infinity;

            for (let i = m; i <= M - m; i++) {
                const bbox1 = distBBox(node, 0, i, this.toBBox);
                const bbox2 = distBBox(node, i, M, this.toBBox);

                const overlap = intersectionArea(bbox1, bbox2);
                const area = bboxArea(bbox1) + bboxArea(bbox2);

                // choose distribution with minimum overlap
                if (overlap < minOverlap) {
                    minOverlap = overlap;
                    index = i;

                    minArea = area < minArea ? area : minArea;

                } else if (overlap === minOverlap) {
                    // otherwise choose distribution with minimum area
                    if (area < minArea) {
                        minArea = area;
                        index = i;
                    }
                }
            }

            return index || M - m;
        }

        // sorts node children by the best axis for split
        _chooseSplitAxis(node, m, M) {
            node.leaf ? this.compareMinX : compareNodeMinX;
            node.leaf ? this.compareMinY : compareNodeMinY;
            const xMargin = this._allDistMargin(node, m, M, this.compareMinX);
            const yMargin = this._allDistMargin(node, m, M, this.compareMinY);

            // if total distributions margin value is minimal for x, sort by minX,
            // otherwise it's already sorted by minY
            if (xMargin < yMargin) node.children.sort(this.compareMinX);
        }

        // total margin of all possible split distributions where each node is at least m full
        _allDistMargin(node, m, M, compare) {
            node.children.sort(compare);

            const toBBox = this.toBBox;
            const leftBBox = distBBox(node, 0, m, toBBox);
            const rightBBox = distBBox(node, M - m, M, toBBox);
            let margin = bboxMargin(leftBBox) + bboxMargin(rightBBox);

            for (let i = m; i < M - m; i++) {
                const child = node.children[i];
                extend(leftBBox, node.leaf ? toBBox(child) : child);
                margin += bboxMargin(leftBBox);
            }

            for (let i = M - m - 1; i >= m; i--) {
                const child = node.children[i];
                extend(rightBBox, node.leaf ? toBBox(child) : child);
                margin += bboxMargin(rightBBox);
            }

            return margin;
        }

        _adjustParentBBoxes(bbox, path, level) {
            // adjust bboxes along the given tree path
            for (let i = level; i >= 0; i--) {
                extend(path[i], bbox);
            }
        }

        _condense(path) {
            // go through the path, removing empty nodes and updating bboxes
            for (let i = path.length - 1, siblings; i >= 0; i--) {
                if (path[i].children.length === 0) {
                    if (i > 0) {
                        siblings = path[i - 1].children;
                        siblings.splice(siblings.indexOf(path[i]), 1);

                    } else this.clear();

                } else calcBBox(path[i], this.toBBox);
            }
        }
    }

    function findItem(item, items, equalsFn) {
        if (!equalsFn) return items.indexOf(item);

        for (let i = 0; i < items.length; i++) {
            if (equalsFn(item, items[i])) return i;
        }
        return -1;
    }

    // calculate node's bbox from bboxes of its children
    function calcBBox(node, toBBox) {
        distBBox(node, 0, node.children.length, toBBox, node);
    }

    // min bounding rectangle of node children from k to p-1
    function distBBox(node, k, p, toBBox, destNode) {
        if (!destNode) destNode = createNode(null);
        destNode.minX = Infinity;
        destNode.minY = Infinity;
        destNode.maxX = -Infinity;
        destNode.maxY = -Infinity;

        for (let i = k; i < p; i++) {
            const child = node.children[i];
            extend(destNode, node.leaf ? toBBox(child) : child);
        }

        return destNode;
    }

    function extend(a, b) {
        a.minX = Math.min(a.minX, b.minX);
        a.minY = Math.min(a.minY, b.minY);
        a.maxX = Math.max(a.maxX, b.maxX);
        a.maxY = Math.max(a.maxY, b.maxY);
        return a;
    }

    function compareNodeMinX(a, b) { return a.minX - b.minX; }
    function compareNodeMinY(a, b) { return a.minY - b.minY; }

    function bboxArea(a)   { return (a.maxX - a.minX) * (a.maxY - a.minY); }
    function bboxMargin(a) { return (a.maxX - a.minX) + (a.maxY - a.minY); }

    function enlargedArea(a, b) {
        return (Math.max(b.maxX, a.maxX) - Math.min(b.minX, a.minX)) *
               (Math.max(b.maxY, a.maxY) - Math.min(b.minY, a.minY));
    }

    function intersectionArea(a, b) {
        const minX = Math.max(a.minX, b.minX);
        const minY = Math.max(a.minY, b.minY);
        const maxX = Math.min(a.maxX, b.maxX);
        const maxY = Math.min(a.maxY, b.maxY);

        return Math.max(0, maxX - minX) *
               Math.max(0, maxY - minY);
    }

    function contains(a, b) {
        return a.minX <= b.minX &&
               a.minY <= b.minY &&
               b.maxX <= a.maxX &&
               b.maxY <= a.maxY;
    }

    function intersects(a, b) {
        return b.minX <= a.maxX &&
               b.minY <= a.maxY &&
               b.maxX >= a.minX &&
               b.maxY >= a.minY;
    }

    function createNode(children) {
        return {
            children,
            height: 1,
            leaf: true,
            minX: Infinity,
            minY: Infinity,
            maxX: -Infinity,
            maxY: -Infinity
        };
    }

    // sort an array so that items come in groups of n unsorted items, with groups sorted between each other;
    // combines selection algorithm with binary divide & conquer approach

    function multiSelect(arr, left, right, n, compare) {
        const stack = [left, right];

        while (stack.length) {
            right = stack.pop();
            left = stack.pop();

            if (right - left <= n) continue;

            const mid = left + Math.ceil((right - left) / n / 2) * n;
            quickselect(arr, mid, left, right, compare);

            stack.push(left, mid, mid, right);
        }
    }

    class Scene {
        constructor () {
            this.tree = new RBush();
            this.add_queue = [];
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

    class Bbox {
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
           let [half_x, half_y] = this.midpoint();

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

    class Lux {
        constructor(canvas, renderer) {
            this.scene = new Scene();
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d', { alpha: false });

            this.ctx.imageSmoothingEnabled = false;
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);

            this._renderer = renderer;
            this._width = 100;
            this._height = 100;
            this._prev_viewport = new Bbox(0, 0, 0, 0);
            this._viewport = new Bbox(0, 0, 100, 100);
            this.prev_viewport = new Bbox(0, 0, 100, 100);
            this._dirty_tree = new RBush();
            this._dirty_priority = [];
            this._dirty_low_priority = [];
            this.ctx.textBaseline = 'bottom';

            this.set_size(this._width, this._height);
        }

        add_dirty(bbox, priority) {
            if (!this._viewport.intersects(bbox)) {
                return
            }

            if (priority === undefined) {
                for (var other_dirty of this._dirty_tree.search(bbox)) {
                    if (other_dirty.contains(bbox)) { return; }
                    if (bbox.contains(other_dirty)) { this._dirty_tree.remove(other_dirty); }
                }

                this._dirty_tree.insert(bbox);
            } else if (priority) {
                for (var f of this._dirty_priority) {
                    if (f.eq(bbox)) {
                        return;
                    }
                }
                this._dirty_priority.push(bbox);
            } else {
                this._dirty_low_priority.push(bbox);
            }
        }

        mark_totally_dirty() {
            if (this._viewport.intersects(this.scene.tree.data)) {
                let intersection = this._viewport.intersection(this.scene.tree.data);
                console.log(intersection);
                this._dirty_low_priority = intersection.divide(2);
            } else {
                this._dirty_low_priority = this._viewport.divide(2);
            }
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
            this.set_size(width, this._height);
        }

        set height(height) {
            this.set_size(this._width, height);
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
            this.add_dirty(bbox);
        }

        remove(bbox) {
            this.scene.remove(bbox);
            this.add_dirty(bbox);
        }

        rats() {
            let xrat = this._width / this.viewport.width;
            let yrat = this._height / this.viewport.height;
            return { xrat, yrat }
        }

        apply_transform() {
            this.ctx.resetTransform();
            let { xrat, yrat } = this.rats();

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

            let { xrat, yrat } = this.rats();
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
            let len = Math.min(original_length, Math.max(100, (Math.floor(Math.sqrt(1 + original_length)))));
            let first = this._dirty_boxes.slice(0, len);
            this._dirty_boxes = this._dirty_boxes.slice(len, original_length);
            return first;
        }

        distance_to_center(bbox) {
            let [px, py] = bbox.midpoint();
            let [cx, cy] = this._viewport.midpoint();
            let dx = px - cx;
            let dy = py - cy;
            return Math.sqrt(dx * dx + dy * dy);
        }

        lerp(v0, v1, t) {
            return (1 - t) * v0 + t * v1;
        }

        in_pixel_coords(x, y) {
            return [this.lerp(0, this.width, (x / this.viewport.width)),
            this.lerp(0, this.height, (y / this.viewport.height))]
        }

        to_screen_rect(r) {
            let [minX, minY] = this.in_pixel_coords(r.minX, r.minY);
            let [maxX, maxY] = this.in_pixel_coords(r.maxX, r.maxY);
            return Bbox(minX, minY, maxX, maxY);
        }


        draw() {
            this.scene.flush();
            this.draw_translated();

            this.ctx.save();
            this.ctx.textBaseline = 'top';

            //let dirty_boxes = this.fetch_dirty();

            var seen = new Set();
            let to_draw = [];
            let dirty_boxes = [];

            let process = (bbox, overflow) => {
                let {xrat,yrat} = this.rats();
                let expand = Math.max(1/xrat, 1/yrat);
                bbox = bbox.expand(expand);
                var a = this.scene.intersecting(bbox);
                var l = a.length;

                if (overflow && l + to_draw.length > 500) {
                    overflow(bbox);
                    return;
                }

                dirty_boxes.push(bbox);

                /*
                if ( to_draw.length + l > 500) {
                    for (let b of bbox.divide(1)) {
                        this.add_dirty(b);
                    }
                    return;
                }*/

                for (var i = 0; i < l; i++) {
                    let element = a[i];
                    if (!seen.has(element)) {
                        seen.add(element);
                        to_draw.push(a[i]);
                    }
                }
            };
            while (to_draw.length < 500 && this._dirty_priority.length > 0) {
                process(this._dirty_priority.shift());
            }
            let from_priority = to_draw.length;

            {
                this.ctx.beginPath();
                for (var bbox of this._dirty_priority) {
                bbox = new Bbox
                    ((Math.floor(((bbox.minX - this.viewport.minX) / this.viewport.width) * this.width * devicePixelRatio)),
                        (Math.floor(((bbox.minY - this.viewport.minY) / this.viewport.height) * this.height * devicePixelRatio)),
                        (Math.ceil(((bbox.maxX - this.viewport.minX) / this.viewport.width) * this.width * devicePixelRatio)),
                        (Math.ceil(((bbox.maxY - this.viewport.minY) / this.viewport.height) * this.height * devicePixelRatio)));
                    //console.log(bbox);
                    this.ctx.rect(bbox.minX, bbox.minY, bbox.width, bbox.height);
                }
                this.ctx.closePath();
                this.ctx.fillStyle = "white";
                this.ctx.fill();
            }

            let all_dirty = this._dirty_tree.all();
            this._dirty_tree.clear();
            while (all_dirty.length !== 0 && to_draw.length < 500) {
                process(all_dirty.pop());
                if (to_draw.length > 500) {
                    break;
                }
            }
            let from_main_queue = to_draw.length - from_priority;

            while (to_draw.length < 500 && this._dirty_low_priority.length > 0) {
                process(this._dirty_low_priority.pop(), bbox => {
                    for (let bb of bbox.quads()) {
                        this.add_dirty(bb);
                    }
                });
            }
            let from_low_queue = to_draw.length - from_main_queue - from_priority;
            this._dirty_tree.load(all_dirty);

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
                bbox = new Bbox
                    ((Math.floor(((bbox.minX - this.viewport.minX) / this.viewport.width) * this.width * devicePixelRatio)),
                     (Math.floor(((bbox.minY - this.viewport.minY) / this.viewport.height) * this.height * devicePixelRatio)),
                     (Math.ceil(((bbox.maxX - this.viewport.minX) / this.viewport.width) * this.width * devicePixelRatio)),
                     (Math.ceil(((bbox.maxY - this.viewport.minY) / this.viewport.height) * this.height * devicePixelRatio)));
                this.ctx.rect(bbox.minX - 0.5, bbox.minY-0.5, bbox.width+1.0, bbox.height + 1.0);
            }
            this.ctx.closePath();
            this.ctx.fillStyle = "white";
            this.ctx.fill();
            this.ctx.clip();
            this.ctx.fillStyle = "black";

            this.apply_transform();
            this.ctx.save();
            to_draw.sort((a, b) => a.idx - b.idx);
            for (var o of to_draw) {
                this._renderer(o, this.ctx);
            }
            console.log(`drawn: ${to_draw.length}, high: ${from_priority}, main: ${from_main_queue}, low: ${from_low_queue}`);
            this.ctx.restore();

            this.ctx.restore();
            this.ctx.resetTransform();
            this._prev_viewport = this.viewport;
        }
    }

    Lux.Bbox = Bbox;
    window.Lux = Lux;

    return Lux;

}());
