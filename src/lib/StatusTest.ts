import { JSONOfAuto, number, SNumber, Structured } from "structured-state";
import { EmptyObj } from "../utils/types";

class StatusLoading extends Structured<EmptyObj, typeof StatusLoading> {
  constructor(
    readonly kind: "loading" = "loading",
    readonly progress: SNumber = number(0),
  ) {
    super();
  }
  override replace(): void {}
  override autoSimplify(): EmptyObj {
    return {};
  }
  static construct(_: JSONOfAuto<EmptyObj>) {
    return Structured.create(StatusLoading);
  }

  static of(progress: number) {
    return Structured.create(StatusLoading, "loading", number(progress));
  }
}

class StatusReady extends Structured<EmptyObj, typeof StatusReady> {
  constructor(readonly kind: "ready" = "ready") {
    super();
  }
  override replace(): void {}
  override autoSimplify(): EmptyObj {
    return {};
  }
  static construct(_: JSONOfAuto<EmptyObj>) {
    return Structured.create(StatusReady);
  }

  static of() {
    return Structured.create(StatusReady, "ready");
  }
}

type Status = StatusLoading | StatusReady;
const Status = { Loading: StatusLoading.of, Ready: StatusReady.of };

// TODO: box type to be able to subscribe to x
let x: Status = Status.Loading(0);
x = Status.Ready();
