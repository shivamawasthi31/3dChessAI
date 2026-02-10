import { Piece } from "../Piece/Piece";
import { PieceOptions } from "../Piece/types";
import ClassicModel from "assets/Rook/Rook.glb";
import GlassModel from "assets/GlassChessSet/Rook.glb";

export class Rook extends Piece {
  constructor(name: string, options: PieceOptions) {
    super(name, options.glassModel ? GlassModel : ClassicModel, options);
  }
}
