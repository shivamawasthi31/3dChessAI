import { BaseGroup } from "objects/BaseGroup/BaseGroup";
import { DroppableField } from "./types";
import { Id } from "global/types";
import { Body, Box, Vec3 } from "cannon-es";
import {
  centerMiddle,
  convertCannonEsQuaternion,
  convertCannonEsVector,
  convertThreeVector,
} from "utils/general";
import {
  BoxGeometry,
  Color,
  FrontSide,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
} from "three";
import { BLACK_COLOR_FIELD, WHITE_COLOR_FIELD } from "constants/colors";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { ChessBase } from "objects/ChessBase/ChessBase";

export const FIELD_NAME = "Field";

export class ChessBoard extends BaseGroup {
  private size = 8;
  private currentlyDroppable: DroppableField[] = [];
  private lastMoveHighlights: number[] = [];
  private kingDangerHighlight: number | null = null;
  private chessBase: ChessBase;
  private loader: GLTFLoader;

  private boardMatrix: Array<Id[]> = [];

  private useGlassModel: boolean;

  constructor(name: string, loader: GLTFLoader, useGlassModel = true) {
    super(name);
    this.loader = loader;
    this.useGlassModel = useGlassModel;
    this.chessBase = new ChessBase("ChessBase", useGlassModel);
  }

  private createBoardMatrix(): void {
    this.boardMatrix = [];
    let colorBlack = true;

    for (let i = 0; i < this.size; i++) {
      this.boardMatrix.push([]);
      colorBlack = !colorBlack;

      for (let j = 0; j < this.size; j++) {
        const geometry = new PlaneGeometry(1, 1);

        const color = new Color(
          colorBlack ? BLACK_COLOR_FIELD : WHITE_COLOR_FIELD
        );
        color.convertSRGBToLinear();

        const material = new MeshStandardMaterial({
          color,
          side: FrontSide,
          roughness: 0.3,
          metalness: 0.4,
        });
        const plane = new Mesh(geometry, material);

        plane.userData.ground = true;
        plane.userData.droppable = false;

        plane.userData.chessPosition = { row: i, column: j };

        plane.receiveShadow = true;
        plane.position.setX(j * 1);
        plane.position.setZ(i * 1);
        plane.rotation.x = -Math.PI / 2;

        plane.name = `${FIELD_NAME}Row${i}Column${j}`;

        this.boardMatrix[i].push(plane.id);

        this.add(plane);

        colorBlack = !colorBlack;
      }
    }
  }

  private createPsychicsBody() {
    this.body = new Body({
      mass: 0,
      shape: new Box(new Vec3(this.size, this.size, this.size)),
    });
  }

  private initChessBase(): void {
    this.chessBase.initModel(this.loader).then((model) => {
      const chessBase = model.scene;
      if (this.useGlassModel) {
        // Remove oversized Cylinder nodes (230-unit wide decorations)
        const toRemove: Object3D[] = [];
        chessBase.traverse((child: Object3D) => {
          if (child.name.startsWith("Cylinder")) {
            toRemove.push(child);
          }
        });
        toRemove.forEach((c) => c.removeFromParent());

        // Override material to dark reflective
        chessBase.traverse((child: Mesh) => {
          if (!child.isMesh) return;
          const darkColor = new Color("#0a1520");
          darkColor.convertSRGBToLinear();
          child.material = new MeshStandardMaterial({
            color: darkColor,
            metalness: 0.6,
            roughness: 0.2,
          });
          child.receiveShadow = true;
        });

        // board_6 surface is at local Y=1.0; scale 4 → Y offset = 4.0
        // Position Y = -4.05 puts surface at Y = -0.05 (just below procedural squares)
        chessBase.position.set(3.5, -4.05, 3.5);
        chessBase.scale.set(4, 4, 4);
      } else {
        chessBase.position.set(3.5, -0.1, 3.5);
        chessBase.scale.set(16.5, 16, 16.5);
      }
      this.add(chessBase);
    });
  }

  private createHighlightBox() {
    const geometry = new BoxGeometry(0.95, 0.08, 0.95);
    const color = new Color(0x6c5ce7);
    color.convertSRGBToLinear();
    const material = new MeshStandardMaterial({
      color,
      transparent: true,
      opacity: 0.45,
      roughness: 0.3,
      metalness: 0.6,
      emissive: color,
      emissiveIntensity: 0.8,
    });
    return new Mesh(geometry, material);
  }

  markPlaneAsDroppable(row: number, column: number): void {
    const planeId = this.boardMatrix[row][column];

    const plane = this.getObjectById(planeId) as Mesh;
    plane.userData.droppable = true;

    const highlight = this.createHighlightBox();
    highlight.position.copy(plane.position);
    highlight.position.setY(0.04);

    this.add(highlight);
    this.currentlyDroppable.push({ planeId, circleId: highlight.id });
  }

  clearMarkedPlanes(): void {
    this.currentlyDroppable.forEach((field) => {
      const { circleId } = field;

      const circle = this.getObjectById(circleId);
      const plane = this.getObjectById(field.planeId);
      plane.userData.droppable = false;

      this.remove(circle);
    });

    this.currentlyDroppable = [];
  }

  highlightLastMove(fromRow: number, fromCol: number, toRow: number, toCol: number): void {
    this.clearLastMoveHighlight();

    const color = new Color(0xffa502);
    color.convertSRGBToLinear();

    const addHighlight = (row: number, col: number) => {
      const geometry = new BoxGeometry(0.95, 0.04, 0.95);
      const material = new MeshStandardMaterial({
        color,
        transparent: true,
        opacity: 0.3,
        roughness: 0.5,
        metalness: 0.0,
      });
      const mesh = new Mesh(geometry, material);
      const plane = this.getObjectById(this.boardMatrix[row][col]) as Mesh;
      mesh.position.copy(plane.position);
      mesh.position.setY(0.02);
      this.add(mesh);
      this.lastMoveHighlights.push(mesh.id);
    };

    addHighlight(fromRow, fromCol);
    addHighlight(toRow, toCol);
  }

  clearLastMoveHighlight(): void {
    for (const id of this.lastMoveHighlights) {
      const obj = this.getObjectById(id);
      if (obj) this.remove(obj);
    }
    this.lastMoveHighlights = [];
  }

  highlightKingDanger(row: number, col: number): void {
    this.clearKingDanger();

    const color = new Color(0xff4444);
    color.convertSRGBToLinear();

    const geometry = new BoxGeometry(0.95, 0.06, 0.95);
    const material = new MeshStandardMaterial({
      color,
      transparent: true,
      opacity: 0.5,
      roughness: 0.3,
      metalness: 0.0,
      emissive: color,
      emissiveIntensity: 0.6,
    });
    const mesh = new Mesh(geometry, material);
    const plane = this.getObjectById(this.boardMatrix[row][col]) as Mesh;
    mesh.position.copy(plane.position);
    mesh.position.setY(0.03);
    this.add(mesh);
    this.kingDangerHighlight = mesh.id;
  }

  clearKingDanger(): void {
    if (this.kingDangerHighlight !== null) {
      const obj = this.getObjectById(this.kingDangerHighlight);
      if (obj) this.remove(obj);
      this.kingDangerHighlight = null;
    }
  }

  getFieldId(row: number, column: number): number {
    return this.boardMatrix[row][column];
  }

  getField(row: number, column: number): Object3D {
    const fieldId = this.getFieldId(row, column);

    return this.getObjectById(fieldId);
  }

  init(): Body {
    this.createBoardMatrix();
    centerMiddle(this);
    this.createPsychicsBody();
    this.initChessBase();

    this.body.position.copy(convertThreeVector(this.position));
    this.body.position.y = -this.size;

    this.quaternion.copy(convertCannonEsQuaternion(this.body.quaternion));

    return this.body;
  }

  update() {
    const clonedPosition = this.body.position.clone();
    clonedPosition.y = clonedPosition.y + this.size;

    this.position.copy(convertCannonEsVector(clonedPosition));
    this.quaternion.copy(convertCannonEsQuaternion(this.body.quaternion));
  }
}
