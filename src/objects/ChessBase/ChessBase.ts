import { BaseObject } from "objects/BaseObject/BaseObject";
import ClassicModel from "assets/ChessBase/ChessBase.glb";
import GlassBoard from "assets/GlassChessSet/Board.glb";

export class ChessBase extends BaseObject {
  constructor(name: string, useGlassModel = true) {
    super(name, useGlassModel ? GlassBoard : ClassicModel);
  }
}
