import { Link } from "lucide-react";

import { getExternalHref } from "@/lib/external-url";

type TaskTextLinkProps = {
  text: string;
  url: string;
};

export function TaskTextLink({ text, url }: TaskTextLinkProps) {
  const href = getExternalHref(url);
  if (!text) return <span>-</span>;
  if (!href) return <span>{text}</span>;

  return (
    <a
      className="font-medium text-primary underline-offset-4 hover:underline"
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {text}
    </a>
  );
}

export function TaskIconLink({ label, url }: { label: string; url: string }) {
  const href = getExternalHref(url);
  if (!href) {
    return (
      <span
        className="inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground opacity-50"
        aria-label="LiveOps sem link"
      >
        <Link className="h-4 w-4" />
      </span>
    );
  }

  return (
    <a
      className="inline-flex h-10 w-10 items-center justify-center rounded-md text-primary transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
    >
      <Link className="h-4 w-4" />
    </a>
  );
}
