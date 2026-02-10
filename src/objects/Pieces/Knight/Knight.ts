import { Piece } from "../Piece/Piece";
import { PieceOptions } from "../Piece/types";
import ClassicModel from "assets/Knight/Knight.glb";
import GlassModel from "assets/GlassChessSet/Knight.glb";

export class Knight extends Piece {
  constructor(name: string, options: PieceOptions) {
    super(name, options.glassModel ? GlassModel : ClassicModel, options);
  }
}
