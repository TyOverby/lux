import Lux from "./src/lux.js"
import Bbox from "./src/bbox.js"
import current_sha from "./scripts/current_sha.js";

function renderer(object) {
    if (object.kind  === "text") {
        let {text, x, y} =  object;
        lux.ctx.fillText(text, x, y);
    } else if (object.kind  === "graph") { 
        lux.ctx.beginPath();
        let is_first = true;
        for (let {x,y} of object.points) {
            if (is_first) {
                lux.ctx.moveTo(x, y);
                is_first = false;
            } else {
                lux.ctx.lineTo(x, y);
            }
        }
        lux.ctx.strokeStyle = object.color;
        lux.ctx.stroke();
    }
}

let lux = new Lux(document.querySelector("#canvas"), renderer);
window.lux = lux;
lux.width = 500;
lux.height = 500;
lux.viewport = new Bbox(0, 0, 100, 100);

var object_idx = 0;

var text_cache = {};
function draw_text(lux, text, x, y) {
    let measured;
    let found = (text_cache[text]);
    if (found) {
        measured=found;
    } else {
        measured = lux.ctx.measureText(text);
        text_cache[text] = measured;
    }

    let w = measured.width;
    let h = measured.actualBoundingBoxAscent + measured.actualBoundingBoxDescent + 1;
    let box = new Bbox(x, y, x + w, y + h); 
    box.text = text;
    box.x = x;
    box.y = y;
    box.kind = "text";
    box.idx = object_idx++;
    return box
}

function draw_graph(lux, color, points) {
    let min_x = Infinity;
    let min_y = Infinity;
    let max_x = -Infinity;
    let max_y = -Infinity;
    for (let {x, y} of points) {
        min_x = Math.min(min_x, x);
        max_x = Math.max(max_x, x);
        min_y = Math.min(min_y, y);
        max_y = Math.max(max_y, y);
    }
    let box = new Bbox(min_x, min_y, max_x, max_y);
    box.kind="graph";
    box.points = points;
    box.color = color;
    box.idx = object_idx++;
    return box;
}

var items = [];

var to_add_and_remove = []

lux.add(draw_text(lux, current_sha, 0 , -30));
lux.add(draw_text(lux, "pixel-ratio: " + window.devicePixelRatio, 0 , -20));

for (var k = 0; k < 10; k ++) {
    let points = []
    for (var i = 0; i < 1000; i ++) {
        let y = Math.sin(((i + k) / 200) * 3.14) * 100;
        points.push({x:i, y});
        if (i % 20 == 0) {
            lux.add(draw_graph(lux, `hsl(${(k / 10)*360}, 100%, 50%)`, points));
            points = [{x:i, y}];
        }
    }
}

for (let i = 0; i < 100; i++) {
    for (let k = 0; k < 100; k++) {
        let hello = draw_text(lux, "hello", 30 * k, 20 * i);
        let world = draw_text(lux, "world", 30 * k, 20 * i + 2);

        if (i % 10 == 0) {
            to_add_and_remove.push(hello);
        }

        lux.add(hello);
        lux.add(world);
    }
}

let added = true;
setInterval(function () {
    for (var i of to_add_and_remove) {
        if (added) {
            lux.remove(i) 
        } else {
            lux.add(i) 
        }
    }
    added = !added;
}, 1000);

//lux.scene.addBulk(items);

function mouseMoveWhilstDown(target, whileMove) {
    function makeWhilst(down, move, up, getEvt) {
        let startX = 0;
        let startY = 0;
        let loss_x = 0;
        let loss_y = 0;

        var moving = function (event) {
            event = getEvt(event);
            if (event instanceof MouseEvent) {
                let dx = event.movementX / devicePixelRatio;
                let dy = event.movementY / devicePixelRatio;
                whileMove(dx, dy);
            } else {
                let dx = event.screenX - startX;
                let dy = event.screenY - startY;
                startX = event.screenX;
                startY = event.screenY;
                whileMove(dx, dy);
            }
        }

        var endMove = function () {
            window.removeEventListener(move, moving);
            window.removeEventListener(up, endMove);
            document.body.style["user-select"] = "auto";
            document.exitPointerLock();
        };

        target.oncontextmenu = function () {
            return false;
        }
        target.addEventListener(down, function (event) {
            if (event instanceof MouseEvent) {
                //console.log(lux.canvas.requestPointerLock());
            }
            event.stopPropagation();
            event.preventDefault();
            startX = getEvt(event).screenX;
            startY = getEvt(event).screenY;
            document.body.style["user-select"] = "none";
            window.addEventListener(move, moving);
            window.addEventListener(up, endMove);   
        });
    }
    makeWhilst('mousedown', 'mousemove', 'mouseup', event => event);
    makeWhilst('touchstart', 'touchmove', 'touchend', event => event.changedTouches[0]);
}


mouseMoveWhilstDown(lux.canvas, function(dx, dy){
    let {xrat, yrat} = lux.rats();
    dx /= xrat;
    dy /= yrat;

    lux.viewport = lux.viewport.translate(-dx, -dy);
});

var stopped = false;
function loop(){
    //lux.clear();
    lux.draw();
    if (!stopped) {
        requestAnimationFrame(loop);
    }
}
loop();

lux.canvas.addEventListener('wheel', function (event) {
    event.preventDefault();
    let scale = event.deltaY / 200;
    if (scale < 0) {
        scale = 0.9;
    } else {
        scale = 1 / 0.9;
    }
    let new_width = lux.viewport.width * scale; 
    let new_height = lux.viewport.width * scale; 
    let delta_w = lux.viewport.width - new_width;
    let delta_h = lux.viewport.height - new_height;
    let new_x = lux.viewport.minX + delta_w / 2;
    let new_y = lux.viewport.minY + delta_h / 2;

    lux.viewport = new Bbox(new_x, new_y, 0, 0);
    lux.viewport.width = new_width;
    lux.viewport.height = new_height;
    console.log(scale);
});


window.onresize = function () {
    lux.width = window.innerWidth;
    lux.height = window.innerHeight;
    let vp = lux.viewport.clone();
    vp.width = window.innerWidth / 5;
    vp.height = window.innerHeight / 5;
    lux.viewport = vp;
}
window.onresize();