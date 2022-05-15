onmessage = function (ev) {
  console.log(ev.data); // prints "hi"
  postMessage("ho"); // sends "ho" back to the creator
};
