export function A({ href }: { href: string }) {
  return (
    <a href={href} style={{ color: "white" }}>
      {href}
    </a>
  );
}
