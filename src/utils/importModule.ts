// todo: make npm module?

const pamba__moduleMap = new Map<string, any>();
(window as any).pamba__moduleMap = pamba__moduleMap;

const cleanup = (script: HTMLScriptElement) => {
  URL.revokeObjectURL(script.src);
  script.remove();
};

async function importFetch(url: string, options?: RequestInit) {
  const existing = pamba__moduleMap.get(url);
  if (existing != null) {
    return existing;
  }

  const response = await fetch(url, options);
  const scriptText = await response.text();
  const objectURL = URL.createObjectURL(new Blob([scriptText], { type: "text/javascript" }));
  try {
    const module = await import(objectURL);
    pamba__moduleMap.set(url, module);
    URL.revokeObjectURL(objectURL);
    return module;
  } catch (e) {
    URL.revokeObjectURL(objectURL);
    throw e;
  }
}

function importModule(url: string) {
  return new Promise(function importModulePromise(res, rej) {
    const absURL = new URL(url, location.toString()).toString();

    const existing = pamba__moduleMap.get(absURL);
    if (existing !== null) {
      res(existing);
    }

    const moduleBlob = new Blob([`import * as m from '${absURL}';`, `window.pamba__moduleMap.set('${absURL}', m);`], {
      type: "text/javascript",
    });

    const scriptElem = document.createElement("script");
    scriptElem.type = "module";
    scriptElem.onerror = function onerror() {
      rej(new Error(`Failed to import: ${url}`));
      cleanup(scriptElem);
    };
    scriptElem.onload = function onload() {
      res(pamba__moduleMap.get(absURL));
      cleanup(scriptElem);
    };
    scriptElem.src = URL.createObjectURL(moduleBlob);
    document.head.appendChild(scriptElem);
  });
}
