import Lux from "./src/lux.js"
import Bbox from "./src/bbox.js"

function renderer({text, x, y}) {
    lux.ctx.fillText(text, x, y);
}

let lux = new Lux(document.querySelector("#canvas"), renderer);
lux.width = 500;
lux.height = 500;
lux.viewport = new Bbox(0, 0, 100, 100);

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
    box.value = {text, x, y}; 
    return box
}

var items = [];

for (let i = 0; i < 100; i++) {
    for (let k = 0; k < 100; k++) {
        items.push(draw_text(lux, "hello", 30 * k, 20 * i));
        items.push(draw_text(lux, "world", 30 * k, 20 * i + 10));
    }
}

lux.scene.addBulk(items);

function mouseMoveWhilstDown(target, whileMove) {
    function makeWhilst(down, move, up, getx, gety) {
        let startX = 0;
        let startY = 0;

        var moving = function (event) {
            let newx = getx(event);
            let newy = gety(event);
            let dx = newx - startX;
            let dy = newy - startY;
            startX = newx
            startY = newy
            whileMove(dx, dy);
        }

        var endMove = function () {
            window.removeEventListener(move, moving);
            window.removeEventListener(up, endMove);
            document.body.style["user-select"] = "auto";
        };

        target.oncontextmenu = function () {
            return false;
        }
        target.addEventListener(down, function (event) {
            event.stopPropagation();
            event.preventDefault();
            startX = getx(event);
            startY = gety(event);
            document.body.style["user-select"] = "none";
            window.addEventListener(move, moving);
            window.addEventListener(up, endMove);   
        });
    }
    makeWhilst('mousedown', 'mousemove', 'mouseup', event => event.screenX, event => event.screenY);
    makeWhilst('touchstart', 'touchmove', 'touchend', event=> event.changedTouches[0].screenX, event => event.changedTouches[0].screenY);
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