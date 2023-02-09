/**
 * A face used in our model. Faces will have three or more vertices.
 */
class Face {

    faceVertices = [];  // The vertices of our face
    faceNormals = [];   // The normals of our face
    faceTexCoords = []; // The texture coordinates of our face (NaN if they don't exist)

    material = null;    // The material used for this face

    constructor(faceVertices, faceNormals, faceTexCoords, material) {

        // Construct the face using fan triangulation
        for (let i = 1; i < faceVertices.length - 1; i++) {
            this.faceVertices.push(
                parseFloat(faceVertices[0]),
                parseFloat(faceVertices[i]),
                parseFloat(faceVertices[i + 1])
            );
            this.faceNormals.push(
                parseFloat(faceNormals[0]),
                parseFloat(faceNormals[i]),
                parseFloat(faceNormals[i + 1])
            );
            this.faceTexCoords.push(
                parseFloat(faceTexCoords[0]),
                parseFloat(faceTexCoords[i]),
                parseFloat(faceTexCoords[i + 1])
            );
        }

        this.material = material;
    }
}