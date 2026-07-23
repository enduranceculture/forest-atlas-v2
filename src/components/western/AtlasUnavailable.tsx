import { TopoBackdrop } from "../layout/TopoBackdrop";

export function AtlasUnavailable({ message }: { message: string }) {
  return (
    <div className="relative flex min-h-[60vh] items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-spruce">
      <TopoBackdrop />
      <div className="relative z-10 max-w-md p-10 text-center">
        <p className="font-field text-[10px] uppercase tracking-widest text-ember">Atlas unavailable</p>
        <h2 className="mt-3 font-editorial text-2xl text-bone">Forest data failed validation.</h2>
        <p className="mt-3 text-sm text-bone-dim">{message}</p>
      </div>
    </div>
  );
}