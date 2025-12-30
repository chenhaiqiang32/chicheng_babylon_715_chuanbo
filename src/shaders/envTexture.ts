export const envTextureVertexShader = `
precision highp float;

attribute vec3 position;
attribute vec2 uv;

varying vec2 vUV;

void main() {
    vUV = uv;
    gl_Position = vec4(position, 1.0);
}
`;

export const envTextureFragmentShader = `
precision highp float;

varying vec2 vUV;
uniform samplerCube cubeTexture;

vec3 toneMapSimple(vec3 color, float exposure) {
    color *= exposure;
    return pow(color / (color + vec3(1.0)), vec3(1.0 / 2.2));
}

void main() {
    float longitude = vUV.x * 2.0 * 3.14159265359 - 3.14159265359; // -π 到 π
    float latitude = (1.0 - vUV.y) * 3.14159265359; // π 到 0 (从下到上)
    
    vec3 direction;
    direction.x = sin(latitude) * cos(longitude);
    direction.y = cos(latitude);
    direction.z = sin(latitude) * sin(longitude);
    
    vec4 hdrColor = textureCube(cubeTexture, direction);

    vec3 ldrColor = toneMapSimple(hdrColor.rgb, 2.0);

    gl_FragColor = vec4(ldrColor, 1.0);
}
`;

