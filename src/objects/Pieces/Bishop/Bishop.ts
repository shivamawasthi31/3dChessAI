import { Piece } from "objects/Pieces/Piece/Piece";
import { PieceOptions } from "objects/Pieces/Piece/types";
import ClassicModel from "assets/Bishop/Bishop.glb";
import GlassModel from "assets/GlassChessSet/Bishop.glb";

export class Bishop extends Piece {
  constructor(name: string, options: PieceOptions) {
    super(name, options.glassModel ? GlassModel : ClassicModel, options);
  }
}
