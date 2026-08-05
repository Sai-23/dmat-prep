import { LoadingState } from "@/components/shared/loading-state";

export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-6 py-10 lg:px-8">
      <LoadingState />
      <LoadingState />
      <LoadingState />
    </div>
  );
}
