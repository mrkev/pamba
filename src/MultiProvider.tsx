import { useMemo } from "react";

function MultiProvider({
  components,
  children,
}: {
  components: React.ComponentType<any>[];
  children: React.ReactNode;
}): React.ReactElement {
  return useMemo(() => {
    let result: React.ReactElement = components.length === 0 ? <>{children}</> : (children as any);
    for (let i = components.length - 1; i > -1; i--) {
      const Component = components[i];
      result = <Component>{result}</Component>;
    }
    return result;
  }, [components, children]);
}

const FooProvider = function (): React.ReactElement | null {
  return null;
};
const BazProvider = function (): React.ReactElement | null {
  return null;
};
const ThisProvider = function (): React.ReactElement | null {
  return null;
};
const ThatProvider = function (): React.ReactElement | null {
  return null;
};

function App() {
  return (
    <MultiProvider
      components={[
        // order matters
        FooProvider,
        BazProvider,
        ThisProvider,
        ThatProvider,
      ]}
    >
      <div>hello</div>
    </MultiProvider>
  );
}
