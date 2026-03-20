type SegmentedOption<T extends string> = {
  label: string;
  value: T;
};

type SegmentedControlProps<T extends string> = {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  variant?: "light" | "dark";
  fullWidth?: boolean;
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  variant = "light",
  fullWidth = false
}: SegmentedControlProps<T>) {
  const className = [
    "segmented-control",
    variant === "dark" ? "segmented-control--dark" : "segmented-control--light",
    fullWidth ? "segmented-control--full" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className}>
      {options.map((option) => (
        <button
          key={option.value}
          className={option.value === value ? "segmented-control__item is-active" : "segmented-control__item"}
          type="button"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
