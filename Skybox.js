panel1={a:vec4(10.0, 10.0, 10.0, 1.0),
    b:vec4(10.0,-10.0, 10.0, 1.0),
    c:vec4(10.0, -10.0, -10.0, 1.0),
    d:vec4(10.0, 10.0, -10.0, 1.0),
    n:vec3(-10, 0, 0)};
panel2={a:vec4(-10.0, 10.0, -10.0, 1.0),
    b:vec4(-10.0, -10.0, -10.0, 1.0),
    c:vec4(-10.0, -10.0, 10.0, 1.0),
    d:vec4(-10.0, 10.0, 10.0, 1.0),
    n:vec3(10, 0, 0)};
panel3={a:vec4(10.0, 10.0, -10.0, 1.0),
    b:vec4(-10.0, 10.0, -10.0, 1.0),
    c:vec4(-10.0, 10.0, 10.0, 1.0),
    d:vec4(10.0, 10.0, 10.0, 1.0),
    n:vec3(0, -10, 0)};
panel4={a:vec4(10.0,-10.0, 10.0, 1.0),
    b:vec4(-10.0, -10.0, 10.0, 1.0),
    c:vec4(-10.0, -10.0, -10.0, 1.0),
    d:vec4(10.0, -10.0, -10.0, 1.0),
    n:vec3(0, 10, 0)};
panel5={a:vec4(-10.0, 10.0, 10.0, 1.0),
    b:vec4(-10.0, -10.0, 10.0, 1.0),
    c:vec4(15.0,-10.0, 10.0, 1.0),
    d:vec4(15.0, 10.0, 10.0, 1.0),
    n:vec3(0, 0, -10)};
panel6={a:vec4(-10.0, -10.0, -10.0, 1.0),
    b:vec4(-10.0, 10.0, -10.0, 1.0),
    c:vec4(10.0, 10.0, -10.0, 1.0),
    d:vec4(10.0, -10.0, -10.0, 1.0),
    n:vec3(0, 0, 10)};
class Skybox{

    images=["data/skybox_posx.png","data/skybox_posy.png","data/skybox_posz.png",
        "data/skybox_negx.png","data/skybox_negy.png","data/skybox_negz.png"
    ];

    panels=[];
    texCoord = [
        vec2(0.0, 10.0),
        vec2(0.0, 10.0),
        vec2(10.0, 10.0),
        vec2(10.0, 0.0)
    ];

    faceVertices=[];
    faceNormals=[];
    faceTexCoords=[];

    skyboxTexture=null;

    textureConfigured=false;

    constructor() {
        this.setup();
        this.faceVertices = flatten(this.faceVertices);
        this.faceNormals = flatten(this.faceNormals);
        this.faceTexCoords = flatten(this.faceTexCoords);
    }

    setup(){
        this.makeSkyBox()
        this.images.forEach(img=>{
            let i=new Image;
            i.src=img;
            this.panels.push(i)
        })
    }

    /*Configures the skybox's texture*/
    configureTextures(){
        if(this.textureConfigured) return;
        this.skyboxTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.skyboxTexture);

        // Set behavior for s-t texture coordinates outside the 0.0-1.0 range
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        // Specify point-sampling behavior
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        // Specify the array of the two-dimensional texture elements
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.panels[0]);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.panels[1]);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.panels[2]);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.panels[3]);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.panels[4]);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.panels[5]);

        gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        this.textureConfigured=true;
    }

    /*Render's the skybox*/
    render(){
        gl.uniform1f(gl.getUniformLocation(program, "skybox"), true);
        this.configureTextures();
        gl.uniform1f(gl.getUniformLocation(program, "shininess"), 10);

        createBuffer(4,'vPosition',flatten(this.faceVertices));
        createBuffer(4,'vNormal',flatten(this.faceNormals));
        createBuffer(2,'vTexCoord',flatten(this.faceTexCoords));
        gl.drawArrays( gl.TRIANGLES, 0, this.faceVertices.length );
        gl.uniform1f(gl.getUniformLocation(program, "skybox"), false);
    }



    /*Make's the Skybox's cube*/
    makeSkyBox(){
        this.makeSide(panel1);
        this.makeSide(panel2);
        this.makeSide(panel3);
        this.makeSide(panel4);
        this.makeSide(panel5);
        this.makeSide(panel6);
    }

    makeSide(panel) {
        this.faceVertices.push(panel.c,panel.b,panel.a);
        this.faceNormals.push(panel.n);
        this.faceTexCoords.push(this.texCoord[0], this.texCoord[1], this.texCoord[2]);

        this.faceVertices.push(panel.d,panel.c,panel.a);
        this.faceNormals.push(panel.n);
        this.faceTexCoords.push(this.texCoord[0], this.texCoord[2], this.texCoord[3]);
    }
}