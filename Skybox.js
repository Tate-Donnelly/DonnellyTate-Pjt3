class Skybox{
    constructor() {
    }
    /*
    textureConfigured=false;
    textureID=gl.TEXTURE1;
    ready;
    index=0;
    imagePath=[
        "data/skybox_posx.png",
        "data/skybox_posy.png",
        "data/skybox_posz.png",
        "data/skybox_negx.png",
        "data/skybox_negy.png",
        "data/skybox_negz.png"
    ];
    position=vec3(0.0,0.0,0.0);
    images=[];

    vertices = [
        vec4(-10.0, -10.0, 10.0, 1.0),
        vec4(-10.0, 10.0, 10.0, 1.0),
        vec4(10.0, 10.0, 10.0, 1.0),
        vec4(10.0,-10.0, 10.0, 1.0),
        vec4(-10.0, -10.0, -10.0, 1.0),
        vec4(-10.0, 10.0, -10.0, 10.0),
        vec4(10.0, 10.0, -10.0, 1.0),
        vec4(10.0, -10.0, -10.0, 1.0)
    ];

    minT = 0.0;
    maxT = 1.0;

    normals=[
        vec3(-1, 0, 0),
        vec3(1, 0, 0),
        vec3(0, -1, 0),
        vec3(0, 1, 0),
        vec3(0, 0, -1),
        vec3(0, 0, 1)
    ];

    texCoords = [
        vec2(this.minT, this.minT),
        vec2(this.minT, this.maxT),
        vec2(this.maxT, this.maxT),
        vec2(this.maxT, this.minT)
    ];



    constructor(index) {
        this.index=index;
        this.imagePath.forEach(path=>{
            let image=new Image();
            image.src=path;
            image.crossOrigin="";
            this.images.push(image);
        })
        this.check();
    }

    check(){
        let result=true;
        for(let i=0;i<this.images.length-1;i++){
            result=result && (this.images[i]!==null);
        }
        this.ready=result;
        if(!result) requestAnimationFrame(this.check);
    }

    render(){
        if(!this.ready) return;
        this.configureImage();
        gl.uniform1f(gl.getUniformLocation(program, "shininess"), 10);

        createBuffer(4,'vPosition',flatten(this.vertices));
        createBuffer(4,'vNormal',flatten(this.normals));
        createBuffer(2,'vTexCoord',flatten(this.texCoords));
        gl.drawArrays( gl.TRIANGLES, 0, this.vertices.length );
    }
    configureImage() {
        if(this.textureConfigured) return;
        this.texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.texture);

        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

        gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.images[0]);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.images[1]);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.images[2]);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.images[3]);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.images[4]);
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.images[5]);

        gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        this.textureConfigured=true;
    }*/
}