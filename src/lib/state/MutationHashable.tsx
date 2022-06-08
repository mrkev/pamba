export class MutationHashable {
  _hash: number = 0;
  // _getMutationHash(): number {
  //   return this._hash;
  // }
  // _didMutate() {
  //   this._hash = (this._hash + 1) % Number.MAX_SAFE_INTEGER;
  // }

  static getMutationHash(mh: MutationHashable) {
    return mh._hash;
  }

  static mutated(mh: MutationHashable) {
    mh._hash = (mh._hash + 1) % Number.MAX_SAFE_INTEGER;
  }
}
