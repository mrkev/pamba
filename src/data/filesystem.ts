export async function test() {
  const opfsRoot = await navigator.storage.getDirectory();
  console.log(opfsRoot);
}
