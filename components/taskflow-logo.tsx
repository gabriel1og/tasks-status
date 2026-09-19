import Image from "next/image";

import { cn } from "@/lib/utils";

type TaskFlowLogoProps = {
  className?: string;
  priority?: boolean;
};

/** Renderiza a marca com contraste apropriado ao tema ativo. Ex.: `<TaskFlowLogo className="w-24" />`. */
export function TaskFlowLogo({
  className,
  priority = false,
}: TaskFlowLogoProps) {
  const imageClassName = cn("h-auto", className);

  return (
    <>
      <Image
        src="/logo-light.png"
        alt="TaskFlow"
        width={373}
        height={402}
        priority={priority}
        className={cn(imageClassName, "dark:hidden")}
      />
      <Image
        src="/logo-dark.png"
        alt="TaskFlow"
        width={373}
        height={402}
        priority={priority}
        className={cn(imageClassName, "hidden dark:block")}
      />
    </>
  );
}
