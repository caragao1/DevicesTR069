"use client";

export function ConfirmDeleteForm({
  action,
  confirmMessage,
  label,
  variant = "button",
}: {
  action: (formData: FormData) => void | Promise<void>;
  confirmMessage: string;
  label: string;
  variant?: "button" | "link";
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className={
          variant === "link"
            ? "text-red-600 hover:underline dark:text-red-400"
            : "rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
        }
      >
        {label}
      </button>
    </form>
  );
}
