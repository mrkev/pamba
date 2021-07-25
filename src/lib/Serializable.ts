export class Serializable {
  serialize() {
    for (let key in this) {
      // skip loop if the property is from prototype
      if (!this.hasOwnProperty(key)) continue;

      const val = this[key];
      console.log(val);
    }
  }

  static deserialize(str: string) {
    console.log(this);
    return new this();
  }
}
