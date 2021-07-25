'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function quickselect(arr, k, left, right, compare) {
    quickselectStep(arr, k, left || 0, right || arr.length - 1, compare || defaultCompare);
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
            while (compare(arr[i], t) < 0) {
                i++;
            }while (compare(arr[j], t) > 0) {
                j--;
            }
        }

        if (compare(arr[left], t) === 0) swap(arr, left, j);else {
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

var RBush = function () {
    function RBush() {
        var maxEntries = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 9;

        _classCallCheck(this, RBush);

        // max entries in a node is 9 by default; min node fill is 40% for best performance
        this._maxEntries = Math.max(4, maxEntries);
        this._minEntries = Math.max(2, Math.ceil(this._maxEntries * 0.4));
        this.clear();
    }

    _createClass(RBush, [{
        key: 'compareMinX',
        value: function compareMinX(a, b) {
            return a.minX - b.minX;
        }
    }, {
        key: 'compareMinY',
        value: function compareMinY(a, b) {
            return a.minY - b.minY;
        }
    }, {
        key: 'all',
        value: function all() {
            return this._all(this.data, []);
        }
    }, {
        key: 'search',
        value: function search(bbox) {
            var node = this.data;
            var result = [];

            if (!intersects(bbox, node)) return result;

            var toBBox = this.toBBox;
            var nodesToSearch = [];

            while (node) {
                for (var i = 0; i < node.children.length; i++) {
                    var child = node.children[i];
                    var childBBox = node.leaf ? toBBox(child) : child;

                    if (intersects(bbox, childBBox)) {
                        if (node.leaf) result.push(child);else if (contains(bbox, childBBox)) this._all(child, result);else nodesToSearch.push(child);
                    }
                }
                node = nodesToSearch.pop();
            }

            return result;
        }
    }, {
        key: 'collides',
        value: function collides(bbox) {
            var node = this.data;

            if (!intersects(bbox, node)) return false;

            var nodesToSearch = [];
            while (node) {
                for (var i = 0; i < node.children.length; i++) {
                    var child = node.children[i];
                    var childBBox = node.leaf ? this.toBBox(child) : child;

                    if (intersects(bbox, childBBox)) {
                        if (node.leaf || contains(bbox, childBBox)) return true;
                        nodesToSearch.push(child);
                    }
                }
                node = nodesToSearch.pop();
            }

            return false;
        }
    }, {
        key: 'load',
        value: function load(data) {
            if (!(data && data.length)) return this;

            if (data.length < this._minEntries) {
                for (var i = 0; i < data.length; i++) {
                    this.insert(data[i]);
                }
                return this;
            }

            // recursively build the tree with the given data from scratch using OMT algorithm
            var node = this._build(data.slice(), 0, data.length - 1, 0);

            if (!this.data.children.length) {
                // save as is if tree is empty
                this.data = node;
            } else if (this.data.height === node.height) {
                // split root if trees have the same height
                this._splitRoot(this.data, node);
            } else {
                if (this.data.height < node.height) {
                    // swap trees if inserted one is bigger
                    var tmpNode = this.data;
                    this.data = node;
                    node = tmpNode;
                }

                // insert the small tree into the large tree at appropriate level
                this._insert(node, this.data.height - node.height - 1, true);
            }

            return this;
        }
    }, {
        key: 'insert',
        value: function insert(item) {
            if (item) this._insert(item, this.data.height - 1);
            return this;
        }
    }, {
        key: 'clear',
        value: function clear() {
            this.data = createNode([]);
            return this;
        }
    }, {
        key: 'remove',
        value: function remove(item, equalsFn) {
            if (!item) return this;

            var node = this.data;
            var bbox = this.toBBox(item);
            var path = [];
            var indexes = [];
            var i = void 0,
                parent = void 0,
                goingUp = void 0;

            // depth-first iterative tree traversal
            while (node || path.length) {

                if (!node) {
                    // go up
                    node = path.pop();
                    parent = path[path.length - 1];
                    i = indexes.pop();
                    goingUp = true;
                }

                if (node.leaf) {
                    // check current node
                    var index = findItem(item, node.children, equalsFn);

                    if (index !== -1) {
                        // item found, remove the item and condense tree upwards
                        node.children.splice(index, 1);
                        path.push(node);
                        this._condense(path);
                        return this;
                    }
                }

                if (!goingUp && !node.leaf && contains(node, bbox)) {
                    // go down
                    path.push(node);
                    indexes.push(i);
                    i = 0;
                    parent = node;
                    node = node.children[0];
                } else if (parent) {
                    // go right
                    i++;
                    node = parent.children[i];
                    goingUp = false;
                } else node = null; // nothing found
            }

            return this;
        }
    }, {
        key: 'toBBox',
        value: function toBBox(item) {
            return item;
        }
    }, {
        key: 'toJSON',
        value: function toJSON() {
            return this.data;
        }
    }, {
        key: 'fromJSON',
        value: function fromJSON(data) {
            this.data = data;
            return this;
        }
    }, {
        key: '_all',
        value: function _all(node, result) {
            var nodesToSearch = [];
            while (node) {
                if (node.leaf) result.push.apply(result, _toConsumableArray(node.children));else nodesToSearch.push.apply(nodesToSearch, _toConsumableArray(node.children));

                node = nodesToSearch.pop();
            }
            return result;
        }
    }, {
        key: '_build',
        value: function _build(items, left, right, height) {

            var N = right - left + 1;
            var M = this._maxEntries;
            var node = void 0;

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

            var N2 = Math.ceil(N / M);
            var N1 = N2 * Math.ceil(Math.sqrt(M));

            multiSelect(items, left, right, N1, this.compareMinX);

            for (var i = left; i <= right; i += N1) {

                var right2 = Math.min(i + N1 - 1, right);

                multiSelect(items, i, right2, N2, this.compareMinY);

                for (var j = i; j <= right2; j += N2) {

                    var right3 = Math.min(j + N2 - 1, right2);

                    // pack each entry recursively
                    node.children.push(this._build(items, j, right3, height - 1));
                }
            }

            calcBBox(node, this.toBBox);

            return node;
        }
    }, {
        key: '_chooseSubtree',
        value: function _chooseSubtree(bbox, node, level, path) {
            while (true) {
                path.push(node);

                if (node.leaf || path.length - 1 === level) break;

                var minArea = Infinity;
                var minEnlargement = Infinity;
                var targetNode = void 0;

                for (var i = 0; i < node.children.length; i++) {
                    var child = node.children[i];
                    var area = bboxArea(child);
                    var enlargement = enlargedArea(bbox, child) - area;

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
    }, {
        key: '_insert',
        value: function _insert(item, level, isNode) {
            var bbox = isNode ? item : this.toBBox(item);
            var insertPath = [];

            // find the best node for accommodating the item, saving all nodes along the path too
            var node = this._chooseSubtree(bbox, this.data, level, insertPath);

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

    }, {
        key: '_split',
        value: function _split(insertPath, level) {
            var node = insertPath[level];
            var M = node.children.length;
            var m = this._minEntries;

            this._chooseSplitAxis(node, m, M);

            var splitIndex = this._chooseSplitIndex(node, m, M);

            var newNode = createNode(node.children.splice(splitIndex, node.children.length - splitIndex));
            newNode.height = node.height;
            newNode.leaf = node.leaf;

            calcBBox(node, this.toBBox);
            calcBBox(newNode, this.toBBox);

            if (level) insertPath[level - 1].children.push(newNode);else this._splitRoot(node, newNode);
        }
    }, {
        key: '_splitRoot',
        value: function _splitRoot(node, newNode) {
            // split root node
            this.data = createNode([node, newNode]);
            this.data.height = node.height + 1;
            this.data.leaf = false;
            calcBBox(this.data, this.toBBox);
        }
    }, {
        key: '_chooseSplitIndex',
        value: function _chooseSplitIndex(node, m, M) {
            var index = void 0;
            var minOverlap = Infinity;
            var minArea = Infinity;

            for (var i = m; i <= M - m; i++) {
                var bbox1 = distBBox(node, 0, i, this.toBBox);
                var bbox2 = distBBox(node, i, M, this.toBBox);

                var overlap = intersectionArea(bbox1, bbox2);
                var area = bboxArea(bbox1) + bboxArea(bbox2);

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

    }, {
        key: '_chooseSplitAxis',
        value: function _chooseSplitAxis(node, m, M) {
            node.leaf ? this.compareMinX : compareNodeMinX;
            node.leaf ? this.compareMinY : compareNodeMinY;
            var xMargin = this._allDistMargin(node, m, M, this.compareMinX);
            var yMargin = this._allDistMargin(node, m, M, this.compareMinY);

            // if total distributions margin value is minimal for x, sort by minX,
            // otherwise it's already sorted by minY
            if (xMargin < yMargin) node.children.sort(this.compareMinX);
        }

        // total margin of all possible split distributions where each node is at least m full

    }, {
        key: '_allDistMargin',
        value: function _allDistMargin(node, m, M, compare) {
            node.children.sort(compare);

            var toBBox = this.toBBox;
            var leftBBox = distBBox(node, 0, m, toBBox);
            var rightBBox = distBBox(node, M - m, M, toBBox);
            var margin = bboxMargin(leftBBox) + bboxMargin(rightBBox);

            for (var i = m; i < M - m; i++) {
                var child = node.children[i];
                extend(leftBBox, node.leaf ? toBBox(child) : child);
                margin += bboxMargin(leftBBox);
            }

            for (var _i = M - m - 1; _i >= m; _i--) {
                var _child = node.children[_i];
                extend(rightBBox, node.leaf ? toBBox(_child) : _child);
                margin += bboxMargin(rightBBox);
            }

            return margin;
        }
    }, {
        key: '_adjustParentBBoxes',
        value: function _adjustParentBBoxes(bbox, path, level) {
            // adjust bboxes along the given tree path
            for (var i = level; i >= 0; i--) {
                extend(path[i], bbox);
            }
        }
    }, {
        key: '_condense',
        value: function _condense(path) {
            // go through the path, removing empty nodes and updating bboxes
            for (var i = path.length - 1, siblings; i >= 0; i--) {
                if (path[i].children.length === 0) {
                    if (i > 0) {
                        siblings = path[i - 1].children;
                        siblings.splice(siblings.indexOf(path[i]), 1);
                    } else this.clear();
                } else calcBBox(path[i], this.toBBox);
            }
        }
    }]);

    return RBush;
}();

function findItem(item, items, equalsFn) {
    if (!equalsFn) return items.indexOf(item);

    for (var i = 0; i < items.length; i++) {
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

    for (var i = k; i < p; i++) {
        var child = node.children[i];
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

function compareNodeMinX(a, b) {
    return a.minX - b.minX;
}
function compareNodeMinY(a, b) {
    return a.minY - b.minY;
}

function bboxArea(a) {
    return (a.maxX - a.minX) * (a.maxY - a.minY);
}
function bboxMargin(a) {
    return a.maxX - a.minX + (a.maxY - a.minY);
}

function enlargedArea(a, b) {
    return (Math.max(b.maxX, a.maxX) - Math.min(b.minX, a.minX)) * (Math.max(b.maxY, a.maxY) - Math.min(b.minY, a.minY));
}

function intersectionArea(a, b) {
    var minX = Math.max(a.minX, b.minX);
    var minY = Math.max(a.minY, b.minY);
    var maxX = Math.min(a.maxX, b.maxX);
    var maxY = Math.min(a.maxY, b.maxY);

    return Math.max(0, maxX - minX) * Math.max(0, maxY - minY);
}

function contains(a, b) {
    return a.minX <= b.minX && a.minY <= b.minY && b.maxX <= a.maxX && b.maxY <= a.maxY;
}

function intersects(a, b) {
    return b.minX <= a.maxX && b.minY <= a.maxY && b.maxX >= a.minX && b.maxY >= a.minY;
}

function createNode(children) {
    return {
        children: children,
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
    var stack = [left, right];

    while (stack.length) {
        right = stack.pop();
        left = stack.pop();

        if (right - left <= n) continue;

        var mid = left + Math.ceil((right - left) / n / 2) * n;
        quickselect(arr, mid, left, right, compare);

        stack.push(left, mid, mid, right);
    }
}

var Scene = function () {
    function Scene() {
        _classCallCheck(this, Scene);

        this.tree = new RBush();
        this.add_queue = [];
    }

    _createClass(Scene, [{
        key: 'flush',
        value: function flush() {
            if (this.add_queue.length !== 0) {
                this.tree.load(this.add_queue);
                this.add_queue = [];
            }
        }
    }, {
        key: 'add',
        value: function add(element) {
            this.add_queue.push(element);
        }
    }, {
        key: 'addBulk',
        value: function addBulk(items) {
            this.tree.load(items);
        }
    }, {
        key: 'remove',
        value: function remove(element) {
            this.flush();
            this.tree.remove(element);
        }
    }, {
        key: 'intersecting',
        value: function intersecting(bbox) {
            return this.tree.search(bbox);
        }
    }]);

    return Scene;
}();

var Bbox = function () {
    function Bbox(minX, minY, maxX, maxY) {
        _classCallCheck(this, Bbox);

        this.minX = minX;
        this.minY = minY;
        this.maxX = maxX;
        this.maxY = maxY;
    }

    _createClass(Bbox, [{
        key: 'clone',
        value: function clone() {
            return new Bbox(this.minX, this.minY, this.maxX, this.maxY);
        }
    }, {
        key: 'eq',
        value: function eq(other) {
            return this.minX == other.minX && this.minY == other.minY && this.maxX == other.maxX && this.maxY == other.maxY;
        }
    }, {
        key: 'union',
        value: function union(other) {
            return new Bbox(Math.min(this.minX, other.minX), Math.min(this.minY, other.minY), Math.max(this.maxX, other.maxX), Math.max(this.maxY, other.maxY));
        }
    }, {
        key: 'midpoint',
        value: function midpoint() {
            var half_x = (this.minX + this.maxX) / 2;
            var half_y = (this.minY + this.maxY) / 2;
            return [half_x, half_y];
        }
    }, {
        key: 'quads',
        value: function quads() {
            var _midpoint = this.midpoint(),
                _midpoint2 = _slicedToArray(_midpoint, 2),
                half_x = _midpoint2[0],
                half_y = _midpoint2[1];

            return [new Bbox(this.minX, this.minY, half_x, half_y), new Bbox(half_x, this.minY, this.maxX, half_y), new Bbox(this.minX, half_y, half_x, this.maxY), new Bbox(half_x, half_y, this.maxX, this.maxY)];
        }
    }, {
        key: 'divide',
        value: function divide(n) {
            var working = [this];
            for (var i = 0; i < n; i++) {
                working = working.flatMap(function (x) {
                    return x.quads();
                });
            }

            return working;
        }
    }, {
        key: 'expand',
        value: function expand(by) {
            return new Bbox(this.minX - by, this.minY - by, this.maxX + by, this.maxY + by);
        }
    }, {
        key: 'intersection',
        value: function intersection(other) {
            return new Bbox(Math.max(this.minX, other.minX), Math.max(this.minY, other.minY), Math.min(this.maxX, other.maxX), Math.min(this.maxY, other.maxY));
        }
    }, {
        key: 'intersects',
        value: function intersects(other) {
            var a = other.minX > this.maxX;
            var b = other.maxX < this.minX;
            var c = other.minY > this.maxY;
            var d = other.maxY < this.minY;

            return !(a || b || c || d);
        }
    }, {
        key: 'contains',
        value: function contains(b) {
            var a = this;
            return a.minX <= b.minX && a.minY <= b.minY && b.maxX <= a.maxX && b.maxY <= a.maxY;
        }
    }, {
        key: 'translate',
        value: function translate(dx, dy) {
            return new Bbox(this.minX + dx, this.minY + dy, this.maxX + dx, this.maxY + dy);
        }
    }, {
        key: 'width',
        get: function get() {
            return this.maxX - this.minX;
        },
        set: function set(w) {
            this.maxX = this.minX + w;
        }
    }, {
        key: 'height',
        set: function set(h) {
            this.maxY = this.minY + h;
        },
        get: function get() {
            return this.maxY - this.minY;
        }
    }, {
        key: 'area',
        get: function get() {
            return this.width * this.height;
        }
    }]);

    return Bbox;
}();

var Lux = function () {
    function Lux(canvas, renderer) {
        _classCallCheck(this, Lux);

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

    _createClass(Lux, [{
        key: 'add_dirty',
        value: function add_dirty(bbox, priority) {
            if (!this._viewport.intersects(bbox)) {
                return;
            }

            if (priority === undefined) {
                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                    for (var _iterator = this._dirty_tree.search(bbox)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var other_dirty = _step.value;

                        if (other_dirty.contains(bbox)) {
                            return;
                        }
                        if (bbox.contains(other_dirty)) {
                            this._dirty_tree.remove(other_dirty);
                        }
                    }
                } catch (err) {
                    _didIteratorError = true;
                    _iteratorError = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion && _iterator.return) {
                            _iterator.return();
                        }
                    } finally {
                        if (_didIteratorError) {
                            throw _iteratorError;
                        }
                    }
                }

                this._dirty_tree.insert(bbox);
            } else if (priority) {
                var _iteratorNormalCompletion2 = true;
                var _didIteratorError2 = false;
                var _iteratorError2 = undefined;

                try {
                    for (var _iterator2 = this._dirty_priority[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                        var f = _step2.value;

                        if (f.eq(bbox)) {
                            return;
                        }
                    }
                } catch (err) {
                    _didIteratorError2 = true;
                    _iteratorError2 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion2 && _iterator2.return) {
                            _iterator2.return();
                        }
                    } finally {
                        if (_didIteratorError2) {
                            throw _iteratorError2;
                        }
                    }
                }

                this._dirty_priority.push(bbox);
            } else {
                this._dirty_low_priority.push(bbox);
            }
        }
    }, {
        key: 'mark_totally_dirty',
        value: function mark_totally_dirty() {
            if (this._viewport.intersects(this.scene.tree.data)) {
                var intersection = this._viewport.intersection(this.scene.tree.data);
                console.log(intersection);
                this._dirty_low_priority = intersection.divide(2);
            } else {
                this._dirty_low_priority = this._viewport.divide(2);
            }
        }
    }, {
        key: 'set_size',
        value: function set_size(width, height) {
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
    }, {
        key: 'addBulk',
        value: function addBulk(items) {
            this.scene.addAll(items);
            var _iteratorNormalCompletion3 = true;
            var _didIteratorError3 = false;
            var _iteratorError3 = undefined;

            try {
                for (var _iterator3 = items[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                    var b = _step3.value;

                    this.add_dirty(b);
                }
            } catch (err) {
                _didIteratorError3 = true;
                _iteratorError3 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion3 && _iterator3.return) {
                        _iterator3.return();
                    }
                } finally {
                    if (_didIteratorError3) {
                        throw _iteratorError3;
                    }
                }
            }
        }
    }, {
        key: 'add',
        value: function add(bbox) {
            this.scene.add(bbox);
            this.add_dirty(bbox);
        }
    }, {
        key: 'remove',
        value: function remove(bbox) {
            this.scene.remove(bbox);
            this.add_dirty(bbox);
        }
    }, {
        key: 'rats',
        value: function rats() {
            var xrat = this._width / this.viewport.width;
            var yrat = this._height / this.viewport.height;
            return { xrat: xrat, yrat: yrat };
        }
    }, {
        key: 'apply_transform',
        value: function apply_transform() {
            this.ctx.resetTransform();

            var _rats = this.rats(),
                xrat = _rats.xrat,
                yrat = _rats.yrat;

            this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            this.ctx.scale(xrat, yrat);
            this.ctx.translate(-this._viewport.minX, -this._viewport.minY);
        }
    }, {
        key: 'draw_translated',
        value: function draw_translated() {
            if (this._prev_viewport === this._viewport || this._prev_viewport.eq(this._viewport)) {
                return;
            }

            var d_min_x = this._viewport.minX - this._prev_viewport.minX;
            var d_max_x = this._viewport.maxX - this._prev_viewport.maxX;
            var d_min_y = this._viewport.minY - this._prev_viewport.minY;
            var d_max_y = this._viewport.maxY - this._prev_viewport.maxY;

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

            var _rats2 = this.rats(),
                xrat = _rats2.xrat,
                yrat = _rats2.yrat;

            var dx = d_min_x * xrat;
            var dy = d_min_y * yrat;

            var x = Math.round(window.devicePixelRatio * dx);
            var y = Math.round(window.devicePixelRatio * dy);

            var wf = this._prev_viewport.width / this._viewport.width;
            var hf = this._prev_viewport.height / this._viewport.height;

            if (Math.abs(wf - 1) < 0.0001 && Math.abs(hf - 1) < 0.0001) {
                this.ctx.drawImage(this.canvas, -x, -y);
            } else {
                this.mark_totally_dirty();
                this.ctx.drawImage(this.canvas, -x, -y, this.canvas.width * wf, this.canvas.height * hf);
            }
        }
    }, {
        key: 'fetch_dirty',
        value: function fetch_dirty() {
            var original_length = this._dirty_boxes.length;
            var len = Math.min(original_length, Math.max(100, Math.floor(Math.sqrt(1 + original_length))));
            var first = this._dirty_boxes.slice(0, len);
            this._dirty_boxes = this._dirty_boxes.slice(len, original_length);
            return first;
        }
    }, {
        key: 'distance_to_center',
        value: function distance_to_center(bbox) {
            var _bbox$midpoint = bbox.midpoint(),
                _bbox$midpoint2 = _slicedToArray(_bbox$midpoint, 2),
                px = _bbox$midpoint2[0],
                py = _bbox$midpoint2[1];

            var _viewport$midpoint = this._viewport.midpoint(),
                _viewport$midpoint2 = _slicedToArray(_viewport$midpoint, 2),
                cx = _viewport$midpoint2[0],
                cy = _viewport$midpoint2[1];

            var dx = px - cx;
            var dy = py - cy;
            return Math.sqrt(dx * dx + dy * dy);
        }
    }, {
        key: 'lerp',
        value: function lerp(v0, v1, t) {
            return (1 - t) * v0 + t * v1;
        }
    }, {
        key: 'in_pixel_coords',
        value: function in_pixel_coords(x, y) {
            return [this.lerp(0, this.width, x / this.viewport.width), this.lerp(0, this.height, y / this.viewport.height)];
        }
    }, {
        key: 'to_screen_rect',
        value: function to_screen_rect(r) {
            var _in_pixel_coords = this.in_pixel_coords(r.minX, r.minY),
                _in_pixel_coords2 = _slicedToArray(_in_pixel_coords, 2),
                minX = _in_pixel_coords2[0],
                minY = _in_pixel_coords2[1];

            var _in_pixel_coords3 = this.in_pixel_coords(r.maxX, r.maxY),
                _in_pixel_coords4 = _slicedToArray(_in_pixel_coords3, 2),
                maxX = _in_pixel_coords4[0],
                maxY = _in_pixel_coords4[1];

            return Bbox(minX, minY, maxX, maxY);
        }
    }, {
        key: 'draw',
        value: function draw() {
            var _this = this;

            this.scene.flush();
            this.draw_translated();

            this.ctx.save();
            this.ctx.textBaseline = 'top';

            //let dirty_boxes = this.fetch_dirty();

            var seen = new Set();
            var to_draw = [];
            var dirty_boxes = [];

            var process = function process(bbox, overflow) {
                var _rats3 = _this.rats(),
                    xrat = _rats3.xrat,
                    yrat = _rats3.yrat;

                var expand = Math.max(1 / xrat, 1 / yrat);
                bbox = bbox.expand(expand);
                var a = _this.scene.intersecting(bbox);
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
                    var element = a[i];
                    if (!seen.has(element)) {
                        seen.add(element);
                        to_draw.push(a[i]);
                    }
                }
            };
            while (to_draw.length < 500 && this._dirty_priority.length > 0) {
                process(this._dirty_priority.shift());
            }
            var from_priority = to_draw.length;

            {
                this.ctx.beginPath();
                var _iteratorNormalCompletion4 = true;
                var _didIteratorError4 = false;
                var _iteratorError4 = undefined;

                try {
                    for (var _iterator4 = this._dirty_priority[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                        var bbox = _step4.value;

                        bbox = new Bbox(Math.floor((bbox.minX - this.viewport.minX) / this.viewport.width * this.width * devicePixelRatio), Math.floor((bbox.minY - this.viewport.minY) / this.viewport.height * this.height * devicePixelRatio), Math.ceil((bbox.maxX - this.viewport.minX) / this.viewport.width * this.width * devicePixelRatio), Math.ceil((bbox.maxY - this.viewport.minY) / this.viewport.height * this.height * devicePixelRatio));
                        //console.log(bbox);
                        this.ctx.rect(bbox.minX, bbox.minY, bbox.width, bbox.height);
                    }
                } catch (err) {
                    _didIteratorError4 = true;
                    _iteratorError4 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion4 && _iterator4.return) {
                            _iterator4.return();
                        }
                    } finally {
                        if (_didIteratorError4) {
                            throw _iteratorError4;
                        }
                    }
                }

                this.ctx.closePath();
                this.ctx.fillStyle = "white";
                this.ctx.fill();
            }

            var all_dirty = this._dirty_tree.all();
            this._dirty_tree.clear();
            while (all_dirty.length !== 0 && to_draw.length < 500) {
                process(all_dirty.pop());
                if (to_draw.length > 500) {
                    break;
                }
            }
            var from_main_queue = to_draw.length - from_priority;

            while (to_draw.length < 500 && this._dirty_low_priority.length > 0) {
                process(this._dirty_low_priority.pop(), function (bbox) {
                    var _iteratorNormalCompletion5 = true;
                    var _didIteratorError5 = false;
                    var _iteratorError5 = undefined;

                    try {
                        for (var _iterator5 = bbox.quads()[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                            var bb = _step5.value;

                            _this.add_dirty(bb);
                        }
                    } catch (err) {
                        _didIteratorError5 = true;
                        _iteratorError5 = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion5 && _iterator5.return) {
                                _iterator5.return();
                            }
                        } finally {
                            if (_didIteratorError5) {
                                throw _iteratorError5;
                            }
                        }
                    }
                });
            }
            var from_low_queue = to_draw.length - from_main_queue - from_priority;
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
            var _iteratorNormalCompletion6 = true;
            var _didIteratorError6 = false;
            var _iteratorError6 = undefined;

            try {
                for (var _iterator6 = dirty_boxes[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
                    var bbox = _step6.value;

                    bbox = new Bbox(Math.floor((bbox.minX - this.viewport.minX) / this.viewport.width * this.width * devicePixelRatio), Math.floor((bbox.minY - this.viewport.minY) / this.viewport.height * this.height * devicePixelRatio), Math.ceil((bbox.maxX - this.viewport.minX) / this.viewport.width * this.width * devicePixelRatio), Math.ceil((bbox.maxY - this.viewport.minY) / this.viewport.height * this.height * devicePixelRatio));
                    this.ctx.rect(bbox.minX, bbox.minY, bbox.width, bbox.height);
                }
            } catch (err) {
                _didIteratorError6 = true;
                _iteratorError6 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion6 && _iterator6.return) {
                        _iterator6.return();
                    }
                } finally {
                    if (_didIteratorError6) {
                        throw _iteratorError6;
                    }
                }
            }

            this.ctx.closePath();
            this.ctx.fillStyle = "white";
            this.ctx.fill();
            this.ctx.clip();
            this.ctx.fillStyle = "black";

            this.apply_transform();
            this.ctx.save();
            to_draw.sort(function (a, b) {
                return a.idx - b.idx;
            });
            var _iteratorNormalCompletion7 = true;
            var _didIteratorError7 = false;
            var _iteratorError7 = undefined;

            try {
                for (var _iterator7 = to_draw[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
                    var o = _step7.value;

                    this._renderer(o);
                }
            } catch (err) {
                _didIteratorError7 = true;
                _iteratorError7 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion7 && _iterator7.return) {
                        _iterator7.return();
                    }
                } finally {
                    if (_didIteratorError7) {
                        throw _iteratorError7;
                    }
                }
            }

            console.log('drawn: ' + to_draw.length + ', high: ' + from_priority + ', main: ' + from_main_queue + ', low: ' + from_low_queue);
            this.ctx.restore();

            this.ctx.restore();
            this.ctx.resetTransform();
            this._prev_viewport = this.viewport;
        }
    }, {
        key: 'renderer',
        get: function get() {
            return this._renderer;
        },
        set: function set(f) {
            this._renderer = f;
            this.mark_totally_dirty();
        }
    }, {
        key: 'width',
        get: function get() {
            return this._width;
        },
        set: function set(width) {
            this.set_size(width, this._height);
        }
    }, {
        key: 'height',
        get: function get() {
            return this._height;
        },
        set: function set(height) {
            this.set_size(this._width, height);
        }
    }, {
        key: 'viewport',
        get: function get() {
            return this._viewport;
        },
        set: function set(next) {
            if (next.eq(this._viewport)) {
                return;
            }

            if (this._prev_viewport === null) {
                this._prev_viewport = this._viewport;
            }
            this._viewport = next;
        }
    }]);

    return Lux;
}();

exports.default = Lux;
