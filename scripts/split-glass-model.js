/**
 * Splits the Sketchfab glass chess board GLB into individual piece GLBs.
 * Usage: node scripts/split-glass-model.js
 */
const { NodeIO } = require("@gltf-transform/core");
const { ALL_EXTENSIONS } = require("@gltf-transform/extensions");
const { cloneDocument, prune, dedup } = require("@gltf-transform/functions");
const path = require("path");

// Node names from the GLB (white instances — one per piece type)
const PIECE_MAP = {
  King: ["king.004_20"],
  Queen: ["queen.001_15"],
  Rook: ["rook_16"],
  Bishop: ["bishop_18"],
  Knight: ["knight_21"],
  Pawn: ["pawn.008_7"],
};

const BOARD_NODES = ["chess BG_0", "board_6", "board.001_3", "Cylinder_4", "Cylinder.001_5"];

const INPUT = path.resolve("/Users/shivamawasthi/Downloads/glass_chess_board.glb");
const OUTPUT_DIR = path.resolve(__dirname, "../src/assets/GlassChessSet");

function collectAllNodes(node) {
  const result = [];
  result.push(node);
  for (const child of node.listChildren()) {
    result.push(...collectAllNodes(child));
  }
  return result;
}

async function main() {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const doc = await io.read(INPUT);
  const root = doc.getRoot();
  const scene = root.listScenes()[0];

  // Print full node tree for debugging
  console.log("=== Full node tree ===");
  const allNodes = [];
  for (const topNode of scene.listChildren()) {
    const nodes = collectAllNodes(topNode);
    for (const n of nodes) {
      const t = n.getTranslation();
      allNodes.push(n);
      console.log(`  "${n.getName()}" mesh=${!!n.getMesh()} children=${n.listChildren().length} pos=[${t.join(",")}]`);
    }
  }

  // Find nodes by name anywhere in the tree
  function findNodeByName(name) {
    return allNodes.find((n) => n.getName() === name);
  }

  // Extract each piece type
  for (const [pieceName, nodeNames] of Object.entries(PIECE_MAP)) {
    const pieceDoc = cloneDocument(doc);
    const pieceScene = pieceDoc.getRoot().listScenes()[0];
    const pieceAllNodes = [];
    for (const topNode of pieceScene.listChildren()) {
      pieceAllNodes.push(...collectAllNodes(topNode));
    }

    // Find the target node in cloned doc
    const targetNames = new Set(nodeNames);
    const targetNode = pieceAllNodes.find((n) => targetNames.has(n.getName()));

    if (!targetNode) {
      console.log(`  WARN: Could not find node for ${pieceName}, skipping`);
      continue;
    }

    // Detach target from its parent, make it a direct child of scene
    // First clear all existing scene children
    for (const child of pieceScene.listChildren()) {
      child.detach();
    }

    // Add target directly to scene at origin
    pieceScene.addChild(targetNode);
    targetNode.setTranslation([0, 0, 0]);

    const t = targetNode.getTranslation();
    console.log(`  ${pieceName}: "${targetNode.getName()}" → origin`);

    await pieceDoc.transform(prune(), dedup());
    const outPath = path.join(OUTPUT_DIR, `${pieceName}.glb`);
    await io.write(outPath, pieceDoc);
    console.log(`  Wrote ${outPath}`);
  }

  // Extract board
  const boardDoc = cloneDocument(doc);
  const boardScene = boardDoc.getRoot().listScenes()[0];
  const boardAllNodes = [];
  for (const topNode of boardScene.listChildren()) {
    boardAllNodes.push(...collectAllNodes(topNode));
  }

  const boardTargetNames = new Set(BOARD_NODES);
  const boardTargets = boardAllNodes.filter((n) => boardTargetNames.has(n.getName()));

  for (const child of boardScene.listChildren()) {
    child.detach();
  }
  for (const target of boardTargets) {
    boardScene.addChild(target);
  }

  await boardDoc.transform(prune(), dedup());
  const boardPath = path.join(OUTPUT_DIR, "Board.glb");
  await io.write(boardPath, boardDoc);
  console.log(`  Wrote ${boardPath}`);

  console.log("\nDone!");
}

main().catch(console.error);
