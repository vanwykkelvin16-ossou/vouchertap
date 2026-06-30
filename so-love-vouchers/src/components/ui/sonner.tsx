import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      style={
        {
          "--safe-top": "max(env(safe-area-inset-top), 0.75rem)",
          "--safe-bottom": "max(env(safe-area-inset-bottom), 0.75rem)",
          "--safe-left": "max(env(safe-area-inset-left), 0.75rem)",
          "--safe-right": "max(env(safe-area-inset-right), 0.75rem)",
        } as React.CSSProperties
      }
      offset={{
        top: "calc(env(safe-area-inset-top) + 1rem)",
        bottom: "calc(env(safe-area-inset-bottom) + 1rem)",
        left: "1rem",
        right: "1rem",
      }}
      mobileOffset={{
        top: "calc(env(safe-area-inset-top) + 1rem)",
        bottom: "calc(env(safe-area-inset-bottom) + 1rem)",
        left: "1rem",
        right: "1rem",
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
