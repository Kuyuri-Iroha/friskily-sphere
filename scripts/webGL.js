
/**
 * 最小値と最大値の間に数値を圧縮
 * @param {number} num 処理する数値
 * @param {number} min 最小値
 * @param {number} max 最大値
 * @return {number} 圧縮済みの数値
 */
let comp = (num, min, max)=> {
    return Math.max(Math.min(num, max), min);
};


/**
 * HSVAをRGBAに変換
 * @param {number} h hue
 * @param {number} s saturation
 * @param {number} v value
 * @param {number} a alpha
 * @return {array} RGBA
 */
let hsva = (h, s, v, a)=> {
    s = comp(s, 0, 1);
    v = comp(v, 0, 1);
    a = comp(a, 0, 1);

    let th = h % 360;
    let i = Math.floor(th / 60);
    let f = th / 60 - i;
    let m = v * (1 - s);
    let n = v * (1 - s * f);
    let k = v * (1 - s * (1 - f));

    let color = [];
    if(!(0 < s) && !(s < 0))
    {
        color.push(v, v, v, a);
    }
    else
    {
        let r = [v, n, m, m, k, v];
        let g = [k, v, v, n, m, m];
        let b = [m, m, k, v, v, n];
        color.push(r[i], g[i], b[i], a);
    }

    return color;
};

/**
 * Calculate torus shape.
 * @param {number} row 断面円の分割数
 * @param {number} column 全体の分割数
 * @param {number} irad トーラスのパイプの半径
 * @param {number} orad トーラス中心からパイプの中心への距離
 * @return {array} トーラスの頂点座標、頂点色、頂点インデックス
 */
let calcTorus = (row, column, irad, orad)=> {
    let pos = [], col = [], idx = [];

    for(let i=0; i<=row; i++)
    {
        let r = Math.PI * 2 / row * i;
        let rr = Math.cos(r);
        let ry = Math.sin(r);

        for(let j=0; j<=column; j++)
        {
            //Position
            let tr = Math.PI * 2 / column * j;
            let tx = (rr * irad + orad) * Math.cos(tr);
            let ty = ry * irad;
            let tz = (rr * irad + orad) * Math.sin(tr);
            pos.push(tx, ty, tz);

            //Color
            let tc = hsva(360 / column * j, 1, 1, 1);
            col.push(tc[0], tc[1], tc[2], tc[3]);
        }
    }

    //Index
    for(i=0; i<row; i++)
    {
        for(j=0; j<column; j++)
        {
            r = (column + 1) * i + j;
            idx.push(r, r + column + 1, r + 1);
            idx.push(r + column + 1, r + column + 2, r + 1);
        }
    }

    return {pos: pos, col: col, idx: idx};
};


/**
 * Calculate shpere shape.
 * @param {number} row 
 * @param {number} column 
 * @param {number} rad 
 * @param {vector} color 
 * @return {array} スフィアの形状定義
 */
let calcSphere = (row, column, rad, color)=> {
    let pos = [], nor = [],
        col = [], idx = [];
    for(let i=0; i<=row; i++)
    {
        let r = Math.PI / row * i;
        let ry = Math.cos(r);
        let rr = Math.sin(r);
        for(let j=0; j<=column; j++)
        {
            let tr = Math.PI * 2 / column * j;
            let tx = rr * rad * Math.cos(tr);
            let ty = ry * rad;
            let tz = rr * rad * Math.sin(tr);
            let rx = rr * Math.cos(tr);
            let rz = rr * Math.sin(tr);
            let tc = color;
            if(!color)
            {
                tc = hsva(360 / row * i, 1, 1, 1);
            }
            pos.push(tx, ty, tz);
            nor.push(rx, ry, rz);
            col.push(tc[0], tc[1], tc[2], tc[3]);
        }
    }
    let r = 0;
    for(let i=0; i<row; i++)
    {
        for(let j=0; j<column; j++)
        {
            r = (column + 1) * i + j;
            idx.push(r, r + 1, r + column + 2);
            idx.push(r, r + column + 2, r + column + 1);
        }
    }
    return {pos: pos, nor: nor, col: col, idx: idx};
};



/**
 * On document loaded.
 */
let docLoadedFunc = ()=> {
    //canvasエレメントを取得
    let c = document.getElementById('canvas');
    c.width = window.innerWidth;
    c.height = window.innerHeight-240;

    //コンテキストを取得
    let gl = c.getContext('webgl', {antialias: true});

    /**
     * Create shader object.
     * @param {string} id Element ID
     * @return shader object.
     */
    let createShader = (id)=> {
        let shader = null;

        let scriptElem = document.getElementById(id);
        if(!scriptElem) {return;}

        //typeによって生成するシェーダを分岐
        switch(scriptElem.type)
        {
            case 'x-shader/x-vertex':
                shader = gl.createShader(gl.VERTEX_SHADER);
                break;

            case 'x-shader/x-fragment':
                shader = gl.createShader(gl.FRAGMENT_SHADER);
                break;

            default:
                break;
    }

        //ソースコードを割り当ててコンパイル
        gl.shaderSource(shader, scriptElem.text);
        gl.compileShader(shader);

        //コンパイルできたか
        if(gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        {
            return shader;
        }
        else
        {
            alert(gl.getShaderInfoLog(shader));
        }
    }

    /**
     * Create program object.
     * @param {any} vs vertex shader.
     * @param {any} fs fragment shader.
     * @return {any} program object. 
     */
    let createProgram =(vs, fs)=> {
        let program = gl.createProgram();

        //プログラムオブジェクトにシェーダを割り当てる
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);

        //シェーダをリンク
        gl.linkProgram(program);

        //リンクできたか
        if(gl.getProgramParameter(program, gl.LINK_STATUS))
        {
            //プログラムオブジェクトを有効化
            gl.useProgram(program);
            return program;
        }
        else
        {
            alert(gl.getProgramInfoLog(program));
        }
    }

    /**
     * Create VBO.
     * @param {array} data buffer data.
     * @return VBO object.
     */
    let createVBO = (data)=> {
        let vbo = gl.createBuffer();

        //バッファのバインド
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

        //データをセット
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);

        //バッファのバインドを解除
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        return vbo;
    }

    /**
     * Create IBO.
     * @param {array} data buffer data.
     * @return IBO object.
     */
    let createIBO = (data)=> {
        let ibo = gl.createBuffer();

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);

        return ibo;
    }

    /**
     * Set attribute.
     * @param {any} vbo 
     * @param {array} attLoc 
     * @param {array} attSt 
     */
    let setAttribute = (vbo, attLoc, attSt)=> {
        for(let i in vbo)
        {
            gl.bindBuffer(gl.ARRAY_BUFFER, vbo[i]);
            gl.enableVertexAttribArray(attLoc[i]);
            gl.vertexAttribPointer(attLoc[i], attSt[i], gl.FLOAT, false, 0, 0);
        }
    }

    /**
     * ここから実行コード
     */

    let automaton = new Automaton({
        gui: divAutomatonContainer,
        realtime: true,
        loop: true,
        data: `
        {"length":1,"resolution":1000,"params":{"length":[{"time":0,"value":0.9998309178743962,"mode":1,"params":{},"mods":[false,false,false,false]},{"time":0.20015074798619104,"value":3.0531133177191805e-16,"mode":1,"params":{},"mods":[false,false,false,false]},{"time":1,"value":0,"mode":1,"params":{},"mods":[false,false,false,false]}]},"gui":{"snap":{"enable":true,"bpm":"120","offset":"0"}},"v":"1.2.0"}
        `
    });
    let auto = automaton.auto;

    let vertexShader = createShader('vs');
    let fragmentShader = createShader('fs');

    let program = createProgram(vertexShader, fragmentShader);
    
    //Culling & Depth test
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    let attLocation = new Array(2);
    attLocation[0] = gl.getAttribLocation(program, 'position');
    attLocation[1] = gl.getAttribLocation(program, 'color');

    let attStride = new Array(2);
    attStride[0] = 3;
    attStride[1] = 4;

    //Vertex data.
    let sphereData = calcSphere(16, 16, 4.0, null);
    let vertexPosition = sphereData.pos;
    let normal = sphereData.nor;
    let vertexColor = sphereData.col;
    let index = sphereData.idx;
    let transedVertex = vertexPosition.slice();

    let positionVBO = createVBO(vertexPosition);
    let colorVBO = createVBO(vertexColor);
    setAttribute([positionVBO, colorVBO], attLocation, attStride);

    let ibo = createIBO(index);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);

    let uniLocation = gl.getUniformLocation(program, 'mvpMatrix');

    let m = new matIV();
    let mMatrix = m.identity(m.create());
    let vMatrix = m.identity(m.create());
    let pMatrix = m.identity(m.create());
    let tmpMatrix = m.identity(m.create());
    let mvpMatrix = m.identity(m.create());

    //ビュープロジェクション行列
    m.lookAt([0.0, 0.0, 20.0], [0, 0, 0], [0, 1, 0], vMatrix);
    m.perspective(45, c.width / c.height, 0.1, 100, pMatrix);
    m.multiply(pMatrix, vMatrix, tmpMatrix);

    //ループ用即時関数
    let frameCount = 0;
    let copyed = false;
    let animation = ()=> {
        //クリアカラーを指定してクリア
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        let rad = (frameCount % 360) * Math.PI / 180;

        if(frameCount%30 == 0)
        {
            automaton.seek(0.00);
            for(let i=0; i<20; i++)
            {
                let index = Math.floor(Math.random() * (vertexPosition.length-1) / 3) * 3;
                let power = (Math.random() + Math.random() + Math.random()) / 3 * 5;
                transedVertex[index] += (power * normal[index]);
                transedVertex[index+1] += (power * normal[index+1]);
                transedVertex[index+2] += (power * normal[index+2]);
            }
            copyed = true;
            positionVBO = createVBO(transedVertex);
            setAttribute([positionVBO, colorVBO], attLocation, attStride);
        }
        else if(copyed)
        {
            let tempVertex = vertexPosition.slice();
            for(let i=0; i<transedVertex.length/3; i++)
            {
                let index = i*3;
                if(math.distance([0, 0, 0], [vertexPosition[index], vertexPosition[index+1], vertexPosition[index+2]]) < 
                    math.distance([0, 0, 0], [transedVertex[index], transedVertex[index+1], transedVertex[index+2]]))
                {
                    let length = auto("length");
                    tempVertex[index] = vertexPosition[index] + (length * (transedVertex[index]-vertexPosition[index]));
                    tempVertex[index+1] = vertexPosition[index+1] + (length * (transedVertex[index+1]-vertexPosition[index+1]));
                    tempVertex[index+2] = vertexPosition[index+2] + (length * (transedVertex[index+2]-vertexPosition[index+2]));

                    if(frameCount%30 == 29)
                    {
                        transedVertex[index] = vertexPosition[index];
                        transedVertex[index+1] = vertexPosition[index+1];
                        transedVertex[index+2] = vertexPosition[index+2];
                    }
                }
            }
            positionVBO = createVBO(tempVertex);
            setAttribute([positionVBO, colorVBO], attLocation, attStride);
        }

        //モデル01
        m.identity(mMatrix);
        m.rotate(mMatrix, rad, [0, 1, 1], mMatrix);
        m.multiply(tmpMatrix, mMatrix, mvpMatrix);
        gl.uniformMatrix4fv(uniLocation, false, mvpMatrix);
        gl.drawElements(gl.LINE_STRIP, index.length, gl.UNSIGNED_SHORT, 0);

        gl.flush();

        frameCount++;
        automaton.update();

        requestAnimationFrame(animation, 1000/30);
    };
    animation();
};



//イベントリスナー
document.addEventListener('DOMContentLoaded', docLoadedFunc, false);