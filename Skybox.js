class Skybox{

    images=["data/skybox_posx.png","data/skybox_posy.png","data/skybox_posz.png",
        "data/skybox_negx.png","data/skybox_negy.png","data/skybox_negz.png"
    ];

    panels=[];

    vertices = [
        vec4(-10.0, -10.0, 10.0, 1.0),
        vec4(-10.0, 10.0, 10.0, 1.0),
        vec4(10.0, 10.0, 10.0, 1.0),
        vec4(10.0,-10.0, 10.0, 1.0),
        vec4(-10.0, -10.0, -10.0, 1.0),
        vec4(-10.0, 10.0, -10.0, 1.0),
        vec4(10.0, 10.0, -10.0, 1.0),
        vec4(10.0, -10.0, -10.0, 1.0)
    ];
    texCoord = [
        vec2(0.0, 1.0),
        vec2(0.0, 1.0),
        vec2(1.0, 1.0),
        vec2(1.0, 0.0)
    ];

    faceVertices=[];
    faceNormals=[];
    faceTexCoords=[];

    skyboxTexture=null;

    textureConfigured=false;

    normals=[
        vec3(-10, 0, 0),
        vec3(10, 0, 0),
        vec3(0, -10, 0),
        vec3(0, 10, 0),
        vec3(0, 0, -10),
        vec3(0, 0, 10)
    ];
    constructor() {

        this.setup();

        this.faceVertices = flatten(this.faceVertices);
        this.faceNormals = flatten(this.faceNormals);
        this.faceTexCoords = flatten(this.faceTexCoords);
        this.panelsReady=false;
    }

    setup(){
        this.makeSide(2, 3, 7, 6, this.normals[0]); // +X side, -X facing
        this.makeSide(5, 4, 0, 1, this.normals[1]); // -X Side, +X facing
        this.makeSide(6, 5, 1, 2, this.normals[2]); // +Y Side, -Y facing
        this.makeSide(3, 0, 4, 7, this.normals[3]); // -Y Side, +Y facing
        this.makeSide(1, 0, 3, 2, this.normals[4]); // +Z side, -Z facing
        this.makeSide(4, 5, 6, 7, this.normals[5]); // -Z Side, +Z facing
        this.images.forEach(img=>{
            let i=new Image;
            i.src=img;
            this.panels.push(i)
        })
        this.panelsReady=true;
    }

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

    makeSide(a, b, c, d, n) {
        this.faceVertices.push(this.vertices[c],this.vertices[b],this.vertices[a]);
        this.faceNormals.push(n);
        this.faceTexCoords.push(this.texCoord[0], this.texCoord[1], this.texCoord[2]);

        this.faceVertices.push(this.vertices[d],this.vertices[c],this.vertices[a]);
        this.faceNormals.push(n);
        this.faceTexCoords.push(this.texCoord[0], this.texCoord[2], this.texCoord[3]);
    }
}