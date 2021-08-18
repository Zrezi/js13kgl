const GL_VERTEX_SHADER = 35633;
const GL_FRAGMENT_SHADER = 35632;
const GL_ARRAY_BUFFER = 34962;
const GL_ELEMENT_ARRAY_BUFFER = 34963;
const GL_STATIC_DRAW = 35044;
const GL_DYNAMI_CDRAW = 35048;
const GL_RGBA = 6408;
const GL_UNSIGNED_BYTE = 5121;
const GL_FLOAT = 5126;
const GL_TRIANGLES = 4;
const GL_DEPTH_TEST = 2929;
const GL_LESS = 513;
const GL_LEQUAL = 515;
const GL_BLEND = 3042;
const GL_ZERO = 0;
const GL_ONE = 1;
const GL_SRC_ALPHA = 770;
const GL_ONE_MINUS_SRC_ALPHA = 771;
const GL_COLOR_BUFFER_BIT = 16384;
const GL_DEPTH_BUFFER_BIT = 256;
const GL_TEXTURE_2D = 3553;
const GL_NEAREST = 9728;
const GL_TEXTURE_MAG_FILTER = 10240;
const GL_TEXTURE_MIN_FILTER = 10241;
const rand = Math.random;

const maxBatch = 65535;
let depth = 1e5;
const nullFrame = { p: { t: 0 } };

const vertexShaderSource = `attribute vec2 g;
attribute vec2 a;
attribute vec2 t;
attribute float r;
attribute vec2 s;
attribute vec4 u;
attribute vec4 c;
attribute float z;
uniform mat4 m;
varying vec2 v;
varying vec4 i;
void main(){
v=u.xy+g*u.zw;
i=c.abgr;
vec2 p=(g-a)*s;
float q=cos(r);
float w=sin(r);
p=vec2(p.x*q-p.y*w,p.x*w+p.y*q);
p+=a+t;
gl_Position=m*vec4(p,z,1);}`;

const fragmentShaderSource = `precision mediump float;
uniform sampler2D x;
uniform float j;
uniform float f;
varying vec2 v;
varying vec4 i;
void main(){
vec4 c=texture2D(x,v);
gl_FragColor=c*i*vec4(f,f,f,f);
if(j>0.0){
if(c.a<j)discard;
gl_FragColor.a=1.0;};}`;

const List = () => {
    const Node = (list, data, nextNode) => {
        let node = {
            l: list,
            c: data,
            n: nextNode,
            p: null
        };
        node.r = () => {
            if (node.p) {
                node.p.n = node.n;
            } else {
                node.l.h = node.n;
            }
            node.n && (node.n.p = node.p);
        }
        return node;
    };
    let list = {
        h: null
    };
    list.add = (cargo) => {
        let node = Node(list, cargo, list.h);
        list.h && (list.h.p = node);
        list.h = node;
        return node;
    }
    list.iter = (fn) => {
        let node = list.h;
        while (node) {
            fn(node.c);
            node = node.n;
        }
    }
    return list;
};

const Vec2 = (x, y) => {
    return { x: +x || 0, y: +y == 0 ? 0 : +y || +x || 0 };
};

const Sprite = (frame, properties) => {
    let sprite = Object.assign({}, {
        frame,
        visible: true,
        pos: Vec2(),
        rot: 0,
        scale: Vec2(1),
        tint: 0xffffff,
        alpha: 1,
        layer: null,
        node: null
    }, properties);
    sprite.remove = () => {
        sprite.n && sprite.n.r();
        sprite.layer = null;
        sprite.n = null;
    }
    return sprite;
}

const Layer = (zIndex) => {
    let layer = {
        z: zIndex,
        o: List(),
        t: List()
    };
    layer.add = (sprite) => {
        sprite.remove();
        sprite.layer = layer;
        sprite.node = ((sprite.alpha !== 1 || sprite.frame.p.a === 0) ? layer.t : layer.o).add(sprite);
    }
    return layer;
}

const Renderer = (canvas, options) => {

    const zeroLayer = Layer(0);
    const layers = [zeroLayer];

    const floatSize = 2 + 2 + 1 + 2 + 4 + 1 + 1;
    const byteSize = floatSize * 4;
    const arrayBuffer = new ArrayBuffer(maxBatch * byteSize);
    const floatView = new Float32Array(arrayBuffer);
    const uintView = new Uint32Array(arrayBuffer);

    const opts = Object.assign({ antialias: false, alpha: false }, options);
    const blend = opts.alpha ? GL_ONE : GL_SRC_ALPHA;
    const scale = opts.scale || 1;
    delete opts.scale;
    const gl = canvas.getContext('webgl', opts);
    const ext = gl.getExtension('ANGLE_instanced_arrays');

    // Set up program
    const shaderProgram = gl.createProgram();
    const vertexShader = gl.createShader(GL_VERTEX_SHADER);
    const fragmentShader = gl.createShader(GL_FRAGMENT_SHADER);
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(vertexShader);
    gl.compileShader(fragmentShader);
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    const createBuffer = (type, src, usage) => {
        gl.bindBuffer(type, gl.createBuffer());
        gl.bufferData(type, src, usage || GL_STATIC_DRAW);
    };

    const bindAttrib = (name, size, stride, divisor, offset, type, norm) => {
        const location = gl.getAttribLocation(shaderProgram, name);
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, size, type || GL_FLOAT, !!norm, stride || 0, offset || 0);
        divisor && ext.vertexAttribDivisorANGLE(location, divisor);
    };

    // Indices Buffer
    createBuffer(GL_ELEMENT_ARRAY_BUFFER, new Uint8Array([0, 1, 2, 2, 1, 3]));

    // Vertex Buffer
    createBuffer(GL_ARRAY_BUFFER, new Float32Array([0, 0, 0, 1, 1, 0, 1, 1]));

    // Vertex Location
    bindAttrib('g', 2);

    // Dynamic Buffer
    createBuffer(GL_ARRAY_BUFFER, arrayBuffer, GL_DYNAMI_CDRAW);

    bindAttrib('a', 2, byteSize, 1);
    bindAttrib('s', 2, byteSize, 1, 8);
    bindAttrib('r', 1, byteSize, 1, 16);
    bindAttrib('t', 2, byteSize, 1, 20);
    bindAttrib('u', 4, byteSize, 1, 28);
    bindAttrib('c', 4, byteSize, 1, 44, GL_UNSIGNED_BYTE, true);
    bindAttrib('z', 1, byteSize, 1, 48);

    const getUniformLocation = name => gl.getUniformLocation(shaderProgram, name);
    const matrixLocation = getUniformLocation('m');
    const textureLocation = getUniformLocation('x');
    const fadeLocation = getUniformLocation('f');
    const alphaTestLocation = getUniformLocation('j');

    let width;
    let height;
    let count = 0;
    let currentFrame;
    let alphaTestMode;
    let onRenderFunctions = [];

    const resize = () => {
        width = canvas.clientWidth * scale | 0;
        height = canvas.clientHeight * scale | 0;
        canvas.width = width;
        canvas.height = height;
    };

    const flush = () => {
        if (!count) return;
        gl.blendFunc(alphaTestMode ? GL_ONE : blend, alphaTestMode ? GL_ZERO : GL_ONE_MINUS_SRC_ALPHA);
        gl.depthFunc(alphaTestMode ? GL_LESS : GL_LEQUAL);

        gl.bindTexture(GL_TEXTURE_2D, currentFrame.p.t);
        gl.uniform1i(textureLocation, currentFrame.p.t);
        gl.uniform1f(alphaTestLocation, alphaTestMode ? currentFrame.p.a : 0);

        gl.bufferSubData(GL_ARRAY_BUFFER, 0, floatView.subarray(0, count * floatSize));
        ext.drawElementsInstancedANGLE(GL_TRIANGLES, 6, GL_UNSIGNED_BYTE, 0, count);
        count = 0;
    };

    const _renderFunction = (function() {
        let functionId = 0;
        return (fn) => {
            return {
                id: functionId++,
                fn: fn,
                remove: function() {
                    onRenderFunctions = onRenderFunctions.filter(f => f.id != this.id)
                }
            }
        };
    })();

    const draw = (sprite) => {
        if (sprite.visible == false) {
            return;
        }

        if (count == maxBatch) {
            flush();
        }

        const { frame } = sprite;
        const { uvs } = frame;

        if (currentFrame.p.t !== frame.p.t) {
            currentFrame.p.t && flush();
            currentFrame = frame;
        }

        let i = count * floatSize;

        floatView[i++] = frame.anchor.x;
        floatView[i++] = frame.anchor.y;
        floatView[i++] = sprite.scale.x * frame.size.x;
        floatView[i++] = sprite.scale.y * frame.size.y;
        floatView[i++] = sprite.rot;
        floatView[i++] = sprite.pos.x;
        floatView[i++] = sprite.pos.y;
        floatView[i++] = uvs[0];
        floatView[i++] = uvs[1];
        floatView[i++] = uvs[2];
        floatView[i++] = uvs[3];
        uintView[i++] = (((sprite.tint & 0xffffff) << 8) | ((sprite.alpha * 255) & 255)) >>> 0;
        floatView[i] = sprite.layer.z;

        count++;
    };

    const _Renderer = {
        canvas,
        gl,
        camera: {
            at: Vec2(),
            to: Vec2(0.5),
            angle: 0,
            follow: null
        },
        glsl: {
            fade: 1
        },
        background: (r, g, b, a) => { gl.clearColor(r, g, b, a === 0 ? 0 : (a || 1)) },
        add: (sprite) => zeroLayer.add(sprite),
        texture: (src, alpha, smooth, mipmap) => {
            const srcWidth = src.width;
            const srcHeight = src.height;
            const t = gl.createTexture();

            gl.bindTexture(GL_TEXTURE_2D, t);
            gl.texParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST | +smooth);
            gl.texParameteri(GL_TEXTURE_2D, GL_TEXTURE_MIN_FILTER, GL_NEAREST | +smooth | (+mipmap << 8) | (+mipmap << 1));
            gl.texImage2D(GL_TEXTURE_2D, 0, GL_RGBA, GL_RGBA, GL_UNSIGNED_BYTE, src);
            mipmap && gl.generateMipmap(GL_TEXTURE_2D);

            return {
                size: Vec2(srcWidth, srcHeight),
                anchor: Vec2(),
                frame: (origin, size, anchor) => {
                    return {
                        size,
                        anchor: anchor || Vec2(0.5, 0.5),
                        uvs: [
                            origin.x / srcWidth,
                            origin.y / srcHeight,
                            size.x / srcWidth,
                            size.y / srcHeight
                        ],
                        p: {
                            t,
                            a: alpha === 0 ? 0 : (alpha || 1)
                        }
                    }
                }
            }
        },
        resize,
        addFunction: (fn) => {
            onRenderFunctions.push(_renderFunction(fn))
        },
        render: function() {
            resize();
            onRenderFunctions.forEach(renderFunction => {
                renderFunction.fn(this);
            });

            if (this.camera.follow) {
                this.camera.at = this.camera.follow.pos;
            }

            const { at, to, angle } = this.camera;
            const x = at.x - width * to.x;
            const y = at.y - height * to.y;

            const c = Math.cos(angle);
            const s = Math.sin(angle);

            const w = 2 / width;
            const h = -2 / height;

            const projection = [
                c * w, s * h, 0, 0, -s * w, c * h, 0, 0,
                0, 0, -1 / depth, 0,
                (at.x * (1 - c) + at.y * s) * w - 2 * x / width - 1,
                (at.y * (1 - c) - at.x * s) * h + 2 * y / height + 1,
                0, 1,
            ];

            gl.useProgram(shaderProgram);
            gl.enable(GL_BLEND);
            gl.enable(GL_DEPTH_TEST);

            gl.uniformMatrix4fv(matrixLocation, false, projection);
            gl.uniform1f(fadeLocation, this.glsl.fade);
            gl.viewport(0, 0, width, height);
            gl.clear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

            currentFrame = nullFrame;

            alphaTestMode = true;
            layers.forEach(layer => layer.o.iter(draw));
            flush();

            alphaTestMode = false;
            for (let l = layers.length - 1; l >= 0; l--) {
                layers[l].t.iter(draw);
            }
            flush();
        }
    }

    resize();

    return _Renderer;
};

const Shake = function(times, speed, amountStart, amountEnd, onComplete) {
    return (() => {
        let count = 0,
            t = 50,
            dir = rand() < 0.5 ? 1 : -1,
            steps = [],
            offset,
            stepAmount,
            i,
            _blend = (t) => {
                square = t * t;
                return square / (2.0 * (square - t) + 1.0);
            }
        if (amountEnd) {
            stepAmount = (amountEnd - amountStart) / (times * 5);
            for (i = 0; i < times * 5 + 1; i++) {
                steps.push(amountStart + stepAmount * i);
            }
        }
        return function(renderer) {
            if (amountEnd) {
                amountStart = steps[count];
            }
            t = Math.floor(t + dir * speed);
            if (t <= 0 || t >= 100) {
                dir *= -1;
                count++;
            }
            offset = _blend(t / 100) / amountStart - (0.5 / amountStart);
            if (count == times * 5 && !offset) {
                this.remove();
                if (onComplete) onComplete();
            }
            renderer.camera.to = Vec2(offset + 0.5, 0.5);
        }
    })()
};

const Fade = function(framesToFade, shouldFadeIn, onComplete) {
    return (() => {
        let fadeAmountPerFrame = 1.0 / framesToFade,
            frameCount = 0;
        return function(renderer) {
            renderer.glsl.fade = +shouldFadeIn ? fadeAmountPerFrame * frameCount : 1 - (fadeAmountPerFrame * frameCount);
            if (frameCount > framesToFade) {
                this.remove();
                if (onComplete) onComplete();
            }
            frameCount++;
        }
    })();
};

const MouseCamera = (renderer, _options) => {
    let canvas = renderer.canvas;
    let options = _options || {};
    let speed = options.speed || 1;
    let buttons = options.buttons || 1;
    let dragging = false;
    let clickX, clickY, dx, dy;
    canvas.onmousemove = (mouseEvent) => {
        if (dragging) {
            let { x, y } = renderer.camera.at;
            dx = (clickX - mouseEvent.offsetX) * speed;
            dy = (clickY - mouseEvent.offsetY) * speed;
            renderer.camera.at = Vec2(x + dx, y + dy);
            clickX = mouseEvent.offsetX;
            clickY = mouseEvent.offsetY;
        }
    }
    canvas.onmousedown = (mouseEvent) => {
        if (mouseEvent.buttons & buttons) {
            dragging = true;
            clickX = mouseEvent.offsetX;
            clickY = mouseEvent.offsetY;;
        }
    }
    canvas.onmouseup = (mouseEvent) => {
        dragging = false;
    }
};