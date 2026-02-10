const { NodeIO } = require("@gltf-transform/core");
const { ALL_EXTENSIONS } = require("@gltf-transform/extensions");
const path = require("path");

function collectAllNodes(node) {
  const result = [node];
  for (const child of node.listChildren()) {
    result.push(...collectAllNodes(child));
  }
  return result;
}

async function main() {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.read(path.resolve(__dirname, "../src/assets/GlassChessSet/Board.glb"));
  const scene = doc.getRoot().listScenes()[0];

  const allNodes = [];
  for (const top of scene.listChildren()) {
    allNodes.push(...collectAllNodes(top));
  }

  let globalMin = [Infinity, Infinity, Infinity];
  let globalMax = [-Infinity, -Infinity, -Infinity];

  for (const node of allNodes) {
    const t = node.getTranslation();
    const mesh = node.getMesh();
    console.log(`"${node.getName()}" pos=[${t.map(v => v.toFixed(4))}] hasMesh=${!!mesh}`);
    if (mesh) {
      for (const prim of mesh.listPrimitives()) {
        const pos = prim.getAttribute("POSITION");
        if (pos) {
          const arr = pos.getArray();
          let min = [Infinity, Infinity, Infinity];
          let max = [-Infinity, -Infinity, -Infinity];
          for (let i = 0; i < arr.length; i += 3) {
            for (let k = 0; k < 3; k++) {
              min[k] = Math.min(min[k], arr[i + k]);
              max[k] = Math.max(max[k], arr[i + k]);
            }
          }
          console.log(`  local bounds: min=[${min.map(v=>v.toFixed(4))}] max=[${max.map(v=>v.toFixed(4))}] size=[${max.map((v,i)=>(v-min[i]).toFixed(4))}]`);
          // Approximate global by adding translation
          for (let k = 0; k < 3; k++) {
            globalMin[k] = Math.min(globalMin[k], min[k] + t[k]);
            globalMax[k] = Math.max(globalMax[k], max[k] + t[k]);
          }
        }
      }
    }
  }

  const size = globalMax.map((v, i) => v - globalMin[i]);
  console.log(`\nGlobal bounds (approx):`);
  console.log(`  min=[${globalMin.map(v=>v.toFixed(4))}]`);
  console.log(`  max=[${globalMax.map(v=>v.toFixed(4))}]`);
  console.log(`  size=[${size.map(v=>v.toFixed(4))}]`);
  console.log(`  center=[${globalMin.map((v,i)=>((v+globalMax[i])/2).toFixed(4))}]`);
}
main();
