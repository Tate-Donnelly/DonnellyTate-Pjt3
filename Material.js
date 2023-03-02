class Material {
    material="";
    faceVertices=[];
    faceNormals=[];
    faceTexCoords=[];
    constructor(material,faces){
        this.material=material;
        this.faceVertices=faces.faceVertices;
        this.faceNormals=faces.faceNormals;
        this.faceTexCoords=faces.faceTexCoords;
    }

    /*Loads the face's arrays into the material's arrays*/
    loadArrays(face){
        face.faceNormals.forEach(n=>{this.faceNormals.push(n)});
        face.faceVertices.forEach(v=>{this.faceVertices.push(v)});
        face.faceTexCoords.forEach(t=>{this.faceTexCoords.push(t)});
    }
}