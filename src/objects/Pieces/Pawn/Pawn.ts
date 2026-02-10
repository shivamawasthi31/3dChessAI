import { Piece } from "../Piece/Piece";
import { PieceOptions } from "../Piece/types";
import ClassicModel from "assets/Pawn/Pawn.glb";
import GlassModel from "assets/GlassChessSet/Pawn.glb";

export class Pawn extends Piece {
  constructor(name: string, options: PieceOptions) {
    super(name, options.glassModel ? GlassModel : ClassicModel, options);
  }
}
