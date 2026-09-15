import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function PageHeader({
  title,
  subtitle,
  backHref,
  actions,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {backHref && (
          <Button
            variant="ghost"
            size="icon-sm"
            nativeButton={false}
            render={
              <Link href={backHref} aria-label="Back">
                <ArrowLeft />
              </Link>
            }
          />
        )}
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
