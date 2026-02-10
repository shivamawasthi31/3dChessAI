import { Piece } from "../Piece/Piece";
import { PieceOptions } from "../Piece/types";
import ClassicModel from "assets/King/King.glb";
import GlassModel from "assets/GlassChessSet/King.glb";

export class King extends Piece {
  constructor(name: string, options: PieceOptions) {
    super(name, options.glassModel ? GlassModel : ClassicModel, options);
  }
}
