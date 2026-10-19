import * as React from "react";
import { cn } from "cn";

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="relative w-full overflow-x-auto" data-slot="table-container">
      <table className={cn("w-full caption-bottom text-sm", className)} data-slot="table" {...props} />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead className={cn("[&_tr]:border-b", className)} data-slot="table-header" {...props} />;
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} data-slot="table-body" {...props} />;
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      className={cn("border-t bg-[var(--gray-2)] font-medium [&>tr]:last:border-b-0", className)}
      data-slot="table-footer"
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      className={cn("border-b border-[var(--gray-6)] transition-colors hover:bg-[var(--gray-2)]", className)}
      data-slot="table-row"
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn("h-11 px-3 text-left align-middle text-sm font-medium text-[var(--gray-12)] whitespace-nowrap", className)}
      data-slot="table-head"
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      className={cn("h-11 px-3 align-middle text-sm whitespace-nowrap", className)}
      data-slot="table-cell"
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption className={cn("mt-4 text-sm text-[var(--gray-11)]", className)} data-slot="table-caption" {...props} />
  );
}

export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow };
