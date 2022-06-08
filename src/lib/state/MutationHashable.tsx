export class MutationHashable {
  _hash: number = 0;

  static getMutationHash(mh: MutationHashable) {
    return mh._hash;
  }

  static mutated(mh: MutationHashable) {
    mh._hash = (mh._hash + 1) % Number.MAX_SAFE_INTEGER;
  }
}
