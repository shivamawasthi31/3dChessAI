import { Piece } from "../Piece/Piece";
import { PieceOptions } from "../Piece/types";
import ClassicModel from "assets/Queen/Queen.glb";
import GlassModel from "assets/GlassChessSet/Queen.glb";

export class Queen extends Piece {
  constructor(name: string, options: PieceOptions) {
    super(name, options.glassModel ? GlassModel : ClassicModel, options);
  }
}
