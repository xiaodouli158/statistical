export function LoadingScreen({ label = "加载中..." }: { label?: string }) {
  return (
    <div className="center-panel">
      <div className="panel">
        <p className="muted">{label}</p>
      </div>
    </div>
  );
}
